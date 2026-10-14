/**
 * BODY · one progress photo in a tall sheet: the full image, its long date as the title, a note, and
 * three hairline actions (SHARE, COMPARE, a two-step DELETE in ember). Also home to the object URL hook
 * the grid and the compare sheet use, and the dialog marker for test hooks.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Columns2, Download, Share2, Trash2 } from 'lucide-react'
import { Input, Sheet, useToast } from '../components/ui'
import { formatDayLong } from '../lib/day'
import { deletePhoto, getPhotoBlob, photoObjectURL, updatePhotoNote, type PhotoMeta } from '../lib/photos'

/** A second tap inside this window deletes. */
const DELETE_ARM_MS = 3500
/** photos.ts keeps notes to 120 characters. */
const NOTE_MAX = 120

/**
 * An object URL for one stored photo: made when the component mounts (or the id changes), revoked when
 * it unmounts or moves on. A URL that resolves after its cleanup ran is revoked at once, so none leak.
 */
export function usePhotoURL(id: string | null, kind: 'thumb' | 'full'): string | null {
  const [made, setMade] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    if (!id) return
    let alive = true
    let url: string | null = null
    photoObjectURL(id, kind).then(
      (u) => {
        if (!u) return
        if (!alive) {
          URL.revokeObjectURL(u)
          return
        }
        url = u
        setMade({ id, url: u })
      },
      () => {
        /* an unreadable photo keeps its empty tile */
      },
    )
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, kind])
  return made && made.id === id ? made.url : null
}

/**
 * The Sheet primitive owns the role="dialog" panel and takes no data attributes, so a child marks the
 * nearest dialog with the test id when it mounts (the TodaySheet pattern).
 */
export function markDialog(testId: string): (el: HTMLElement | null) => void {
  return (el) => {
    el?.closest('[role="dialog"]')?.setAttribute('data-testid', testId)
  }
}

const markViewer = markDialog('tp-photo-viewer')

/** `temperance-2026-10-12.webp` */
export function photoFileName(day: string, type: string): string {
  const ext = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg'
  return `temperance-${day}.${ext}`
}

/** Web Share with the file where the platform takes files, otherwise an <a download> of the blob. */
async function deliverPhoto(blob: Blob, meta: PhotoMeta): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const type = blob.type || meta.type || 'image/jpeg'
  const name = photoFileName(meta.day, type)
  const nav = navigator as Navigator & { canShare?(data: ShareData): boolean }
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function' && typeof File === 'function') {
    const file = new File([blob], name, { type })
    let can = false
    try {
      can = nav.canShare({ files: [file] })
    } catch {
      can = false
    }
    if (can) {
      try {
        await nav.share({ files: [file] })
        return 'shared'
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
        // anything else (a lost gesture, a refused type): fall through to the download
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

type ActionProps = {
  icon: ReactNode
  label: string
  onClick(): void
  tone?: 'gold' | 'ember'
  armed?: boolean
  busy?: boolean
  disabled?: boolean
  testId: string
  confirmTestId?: string
}

/** One of the three 56 px hairline actions: icon over a Cinzel 10 px label. */
function Action({ icon, label, onClick, tone = 'gold', armed = false, busy = false, disabled = false, testId, confirmTestId }: ActionProps) {
  const ember = tone === 'ember'
  return (
    <button
      type="button"
      data-testid={testId}
      data-armed={armed ? '' : undefined}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[4px] border transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${
        ember
          ? armed
            ? 'border-ember bg-[rgba(255,90,31,0.08)] text-ember'
            : 'border-[rgba(255,90,31,0.35)] text-ember-text'
          : 'border-[var(--gold-line-strong)] text-gold-400 hover:bg-[var(--gold-line)]'
      }`}
    >
      <span aria-hidden="true" className="flex h-[18px] items-center">
        {icon}
      </span>
      <span data-testid={armed ? confirmTestId : undefined} className={`font-display inscribed text-[10px] ${armed ? 'tracking-[0.4em]' : 'tracking-[0.3em]'}`}>
        {armed ? 'Delete?' : label}
      </span>
    </button>
  )
}

type BodyProps = {
  photo: PhotoMeta
  /** COMPARE needs a second photo to pick */
  canCompare: boolean
  /** the sheet's close handler calls this to save a note still being typed */
  flush: MutableRefObject<() => void>
  onCompare(photo: PhotoMeta): void
  onDeleted(photo: PhotoMeta): void
  onNoteSaved(id: string, note: string | undefined): void
}

/** Mounted only while the sheet is, so the full image URL lives exactly as long as the sheet. */
function ViewerBody({ photo, canCompare, flush, onCompare, onDeleted, onNoteSaved }: BodyProps) {
  const toast = useToast((s) => s.show)
  const url = usePhotoURL(photo.id, 'full')

  // the blob is read ahead so SHARE hands it over inside the tap (Safari drops the gesture across a slow await)
  const blob = useRef<Blob | null>(null)
  useEffect(() => {
    let alive = true
    getPhotoBlob(photo.id, 'full').then(
      (b) => {
        if (alive) blob.current = b
      },
      () => {
        /* SHARE reads it again on tap */
      },
    )
    return () => {
      alive = false
      blob.current = null
    }
  }, [photo.id])

  // ---------- note: saved on blur, on Enter, when the sheet closes, and at the latest on unmount ----------
  const [note, setNote] = useState(photo.note ?? '')
  const draft = useRef(photo.note ?? '')
  const saved = useRef((photo.note ?? '').trim())
  const commit = useCallback(() => {
    const next = draft.current.trim().slice(0, NOTE_MAX)
    if (next === saved.current) return
    saved.current = next
    updatePhotoNote(photo.id, next).then(
      () => onNoteSaved(photo.id, next || undefined),
      () => toast({ text: 'That note could not be saved.', tone: 'warn' }),
    )
  }, [photo.id, onNoteSaved, toast])
  useLayoutEffect(() => {
    flush.current = commit
  }, [flush, commit])
  useEffect(() => () => flush.current(), [flush])

  // ---------- delete: first tap arms (DELETE?), the second within 3.5 s deletes ----------
  const [armed, setArmed] = useState(false)
  const armTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(armTimer.current), [])
  const disarm = () => {
    window.clearTimeout(armTimer.current)
    setArmed(false)
  }
  const tapDelete = () => {
    if (!armed) {
      setArmed(true)
      window.clearTimeout(armTimer.current)
      armTimer.current = window.setTimeout(() => setArmed(false), DELETE_ARM_MS)
      return
    }
    disarm()
    saved.current = draft.current.trim().slice(0, NOTE_MAX) // nothing left to save for a deleted photo
    deletePhoto(photo.id).then(
      () => onDeleted(photo),
      () => toast({ text: 'That photo could not be removed.', tone: 'warn' }),
    )
  }

  // ---------- share ----------
  const [sharing, setSharing] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function'
  const share = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const b = blob.current ?? (await getPhotoBlob(photo.id, 'full'))
      if (!b) {
        toast({ text: 'That photo could not be read.', tone: 'warn' })
        return
      }
      await deliverPhoto(b, photo)
    } catch {
      toast({ text: 'That photo could not be shared.', tone: 'warn' })
    } finally {
      setSharing(false)
    }
  }

  const ratio = photo.w > 0 && photo.h > 0 ? photo.w / photo.h : 3 / 4
  const long = formatDayLong(photo.day)

  return (
    <div
      ref={markViewer}
      className="contents"
      onClickCapture={(e) => {
        // any other tap in the sheet disarms a pending delete
        if (armed && !(e.target as HTMLElement).closest('[data-delete]')) disarm()
      }}
    >
      <div
        data-testid="tp-photo-viewer-image"
        className={`relative mx-auto mt-1 overflow-hidden rounded-[2px] ${url ? '' : 'bg-obsidian-800'}`}
        style={{ aspectRatio: `${ratio}`, width: `min(100%, calc(60svh * ${ratio.toFixed(4)}))` }}
      >
        {url ? <img src={url} alt={`Progress photo, ${long}`} className="absolute inset-0 h-full w-full object-contain" /> : null}
      </div>

      <Input
        data-testid="tp-photo-note"
        aria-label="Note"
        placeholder="Note"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => {
          draft.current = e.target.value
          setNote(e.target.value)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        className="mt-4"
      />

      <ul className="mt-3 grid grid-cols-3 gap-2 pb-1">
        <li>
          <Action
            testId="tp-photo-share"
            icon={canShare ? <Share2 size={18} strokeWidth={1.5} /> : <Download size={18} strokeWidth={1.5} />}
            label="Share"
            busy={sharing}
            onClick={() => void share()}
          />
        </li>
        <li>
          <Action
            testId="tp-photo-viewer-compare"
            icon={<Columns2 size={18} strokeWidth={1.5} />}
            label="Compare"
            disabled={!canCompare}
            onClick={() => onCompare(photo)}
          />
        </li>
        <li data-delete="">
          <Action
            testId="tp-photo-delete"
            confirmTestId="tp-photo-delete-confirm"
            icon={<Trash2 size={18} strokeWidth={1.5} />}
            label="Delete"
            tone="ember"
            armed={armed}
            onClick={tapDelete}
          />
        </li>
      </ul>
    </div>
  )
}

type Props = {
  photo: PhotoMeta
  open: boolean
  /** false with a single photo: COMPARE has nothing to pair with */
  canCompare: boolean
  onClose(): void
  onCompare(photo: PhotoMeta): void
  onDeleted(photo: PhotoMeta): void
  onNoteSaved(id: string, note: string | undefined): void
}

/**
 * The viewer sheet. Portalled to <body> like the TODAY sheet: <main> is its own stacking context, so a
 * sheet left inside it would sit under the tab bar and the shard strips.
 */
export function HistoryPhotoViewer({ photo, open, canCompare, onClose, onCompare, onDeleted, onNoteSaved }: Props) {
  const flush = useRef<() => void>(() => {})
  const close = useCallback(() => {
    flush.current()
    onClose()
  }, [onClose])
  const sheet = (
    <Sheet open={open} onClose={close} title={formatDayLong(photo.day)} height="tall" closeLabel="Close photo">
      <ViewerBody photo={photo} canCompare={canCompare} flush={flush} onCompare={onCompare} onDeleted={onDeleted} onNoteSaved={onNoteSaved} />
    </Sheet>
  )
  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body)
}
