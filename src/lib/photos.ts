/**
 * Progress photos, on this device only. Images are too big for localStorage and are not part of
 * the JSON backup; they live in IndexedDB (`temperance-photos`), downscaled on the way in so a
 * year of photos stays small: the full image at most 1600 px on its long edge, plus a 360 px
 * thumbnail for the grid. Every call is defensive: no IndexedDB means `photosSupported()` is false
 * and the callers show a one-line note instead.
 */
import { newId } from './id'
import { localDayKey } from './day'

export type PhotoMeta = {
  id: string
  /** local day key YYYY-MM-DD */
  day: string
  /** epoch ms */
  at: number
  note?: string
  /** full image size in px */
  w: number
  h: number
  /** full image bytes */
  bytes: number
  type: string
}

type PhotoRecord = PhotoMeta & { full: Blob; thumb: Blob }

const DB_NAME = 'temperance-photos'
const DB_VERSION = 1
const STORE = 'photos'
export const MAX_EDGE = 1600
export const THUMB_EDGE = 360

export function photosSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && typeof HTMLCanvasElement !== 'undefined'
  } catch {
    return false
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('day', 'day', { unique: false })
        store.createIndex('at', 'at', { unique: false })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB failed to open'))
    req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        let result: T | undefined
        const req = run(store)
        if (req) req.onsuccess = () => (result = req.result)
        t.oncomplete = () => resolve(result as T)
        t.onerror = () => reject(t.error ?? new Error('IndexedDB transaction failed'))
        t.onabort = () => reject(t.error ?? new Error('IndexedDB transaction aborted'))
      }),
  )
}

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; w: number; h: number; close(): void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      return { draw: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
    } catch {
      /* fall through to the img element */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That file is not an image.'))
      el.src = url
    })
    return { draw: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function scaled(src: CanvasImageSource, w: number, h: number, maxEdge: number): Promise<{ blob: Blob; w: number; h: number; type: string }> {
  const k = Math.min(1, maxEdge / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * k))
  const ch = Math.max(1, Math.round(h * k))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const g = canvas.getContext('2d')
  if (!g) throw new Error('Canvas is not available.')
  g.drawImage(src, 0, 0, cw, ch)
  let blob = await toBlob(canvas, 'image/webp', 0.86)
  let type = 'image/webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg', 0.88)
    type = 'image/jpeg'
  }
  if (!blob) throw new Error('Could not encode the photo.')
  return { blob, w: cw, h: ch, type }
}

/** Downscale and store a photo. Resolves to its metadata. */
export async function addPhoto(file: Blob, opts: { day?: string; note?: string; now?: number } = {}): Promise<PhotoMeta> {
  if (!photosSupported()) throw new Error('Photos are not available on this device.')
  const now = opts.now ?? Date.now()
  const img = await decode(file)
  try {
    const full = await scaled(img.draw, img.w, img.h, MAX_EDGE)
    const thumb = await scaled(img.draw, img.w, img.h, THUMB_EDGE)
    const meta: PhotoMeta = {
      id: newId(),
      day: opts.day ?? localDayKey(new Date(now)),
      at: now,
      note: opts.note?.trim().slice(0, 120) || undefined,
      w: full.w,
      h: full.h,
      bytes: full.blob.size,
      type: full.type,
    }
    const record: PhotoRecord = { ...meta, full: full.blob, thumb: thumb.blob }
    await tx('readwrite', (store) => {
      store.put(record)
    })
    return meta
  } finally {
    img.close()
  }
}

/** Metadata for every photo, newest first (no blobs). */
export async function listPhotos(): Promise<PhotoMeta[]> {
  if (!photosSupported()) return []
  const all = await tx<PhotoRecord[]>('readonly', (store) => store.getAll())
  return (all ?? [])
    .map(({ full: _f, thumb: _t, ...meta }) => meta)
    .sort((a, b) => b.at - a.at)
}

/** The image bytes for one photo. */
export async function getPhotoBlob(id: string, kind: 'full' | 'thumb' = 'full'): Promise<Blob | null> {
  if (!photosSupported()) return null
  const rec = await tx<PhotoRecord | undefined>('readonly', (store) => store.get(id))
  return rec ? rec[kind] : null
}

export async function updatePhotoNote(id: string, note: string): Promise<void> {
  const rec = await tx<PhotoRecord | undefined>('readonly', (store) => store.get(id))
  if (!rec) return
  const next: PhotoRecord = { ...rec, note: note.trim().slice(0, 120) || undefined }
  await tx('readwrite', (store) => {
    store.put(next)
  })
}

export async function deletePhoto(id: string): Promise<void> {
  if (!photosSupported()) return
  await tx('readwrite', (store) => {
    store.delete(id)
  })
}

/** Total bytes of full images, for the settings footer. */
export async function photoStorageBytes(): Promise<number> {
  const list = await listPhotos()
  return list.reduce((s, p) => s + p.bytes, 0)
}

/** Object URL for a photo blob; the caller revokes it. */
export async function photoObjectURL(id: string, kind: 'full' | 'thumb' = 'thumb'): Promise<string | null> {
  const blob = await getPhotoBlob(id, kind)
  return blob ? URL.createObjectURL(blob) : null
}
