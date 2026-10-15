/**
 * BODY · PROGRESS PHOTOS. A three column grid of photos kept on this device only (IndexedDB, never in the
 * JSON backup), newest first. ADD PHOTO opens the camera; a tile opens the viewer; COMPARE picks two
 * tiles and lays them side by side.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button, EmptyLine, EmptyState, SectionHeading, useToast } from '../components/ui'
import { formatDayLabel, formatDayLong } from '../lib/day'
import { addPhoto, listPhotos, photosSupported, type PhotoMeta } from '../lib/photos'
import { useStore } from '../store/useStore'
import { HistoryPhotoViewer, usePhotoURL } from './HistoryPhotoViewer'
import { HistoryPhotoCompare } from './HistoryPhotoCompare'

/** `Added · 1 photo`, `Added · 3 photos`. */
export function addedText(n: number): string {
  return `Added · ${n} ${n === 1 ? 'photo' : 'photos'}`
}

/** What a failed save says: the fact, not an apology. */
export function photoErrorText(err: unknown): string {
  if (err && typeof err === 'object' && (err as { name?: unknown }).name === 'QuotaExceededError') return 'Storage is full. The photo was not saved.'
  if (typeof DOMException === 'function' && err instanceof DOMException) return 'That photo could not be saved.'
  if (err instanceof Error && err.message) return err.message
  return 'That photo could not be saved.'
}

type TileProps = {
  photo: PhotoMeta
  today: string
  selecting: boolean
  /** 1 or 2 when picked for COMPARE, else 0 */
  mark: number
  onTap(photo: PhotoMeta): void
}

/** A square thumbnail with its date on a bottom gradient. The object URL lives and dies with the tile. */
function PhotoTile({ photo, today, selecting, mark, onTap }: TileProps) {
  const url = usePhotoURL(photo.id, 'thumb')
  return (
    <li>
      <button
        type="button"
        data-testid={`tp-photo-${photo.id}`}
        data-selected={mark ? String(mark) : undefined}
        aria-label={`Photo, ${formatDayLong(photo.day)}`}
        aria-pressed={selecting ? mark > 0 : undefined}
        onClick={() => onTap(photo)}
        className="press relative block aspect-square w-full cursor-pointer overflow-hidden rounded-[2px] bg-obsidian-800"
        style={{ boxShadow: '0 0 0 1px #2A2A33, 0 0 0 2px rgba(0,0,0,0.8)' }}
      >
        {url ? <img src={url} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : null}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,rgba(5,5,7,0.9),rgba(5,5,7,0.55)_45%,rgba(5,5,7,0))]" />
        <span aria-hidden="true" className="font-display num absolute inset-x-2 bottom-2 truncate text-[12px] font-bold uppercase leading-none tracking-[0.08em] text-bone">
          {formatDayLabel(photo.day, today)}
        </span>
        {mark ? (
          <>
            <span aria-hidden="true" className="absolute inset-0 rounded-[2px] shadow-[inset_0_0_0_2px_#E6CB78]" />
            <span aria-hidden="true" className="font-display gold-fill engraved absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-[2px] text-[12px] font-bold leading-none">
              {mark}
            </span>
          </>
        ) : selecting ? (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 h-6 w-6 rounded-[2px] border border-[var(--gold-edge)] bg-[rgba(5,5,7,0.55)]" />
        ) : null}
      </button>
    </li>
  )
}

export function HistoryPhotos({ today }: { today: string }) {
  const supported = useMemo(() => photosSupported(), [])
  const weights = useStore((s) => s.weights)
  const kgByDay = useMemo(() => new Map(weights.map((w) => [w.day, w.kg] as const)), [weights])
  const toast = useToast((s) => s.show)

  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const list = await listPhotos()
      if (!alive.current) return
      setPhotos(list)
      setFailed(false)
      setSelected((cur) => cur.filter((id) => list.some((p) => p.id === id)))
    } catch {
      if (!alive.current) return
      setPhotos([])
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    if (supported) void reload()
    return () => {
      alive.current = false
    }
  }, [supported, reload])

  // ---------- add ----------
  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = '' // the same photo can be picked again
    if (!files.length) return
    setBusy(true)
    let added = 0
    let error: string | null = null
    for (const file of files) {
      try {
        await addPhoto(file)
        added++
      } catch (err) {
        error = photoErrorText(err)
      }
    }
    await reload()
    if (alive.current) setBusy(false)
    if (error && added) toast({ text: `${addedText(added)} · one could not be read`, tone: 'warn' })
    else if (error) toast({ text: error, tone: 'warn' })
    else if (added) toast({ text: addedText(added) })
  }

  // ---------- the viewer (keeps its last photo through the close transition) ----------
  const viewing = viewId && photos ? (photos.find((p) => p.id === viewId) ?? null) : null
  const lastViewed = useRef<PhotoMeta | null>(null)
  if (viewing) lastViewed.current = viewing
  const closeViewer = useCallback(() => setViewId(null), [])
  const onDeleted = useCallback(
    (p: PhotoMeta) => {
      setViewId(null)
      setPhotos((cur) => (cur ? cur.filter((x) => x.id !== p.id) : cur))
      setSelected((cur) => cur.filter((id) => id !== p.id))
      toast({ text: 'Removed · 1 photo' })
    },
    [toast],
  )
  const onNoteSaved = useCallback((id: string, note: string | undefined) => {
    setPhotos((cur) => (cur ? cur.map((p) => (p.id === id ? { ...p, note } : p)) : cur))
  }, [])
  const compareFrom = useCallback((p: PhotoMeta) => {
    setSelecting(true)
    setSelected([p.id])
    setViewId(null)
  }, [])

  // ---------- compare (keeps its last pair through the close transition) ----------
  const pair = useMemo<readonly [PhotoMeta, PhotoMeta] | null>(() => {
    if (selected.length !== 2 || !photos) return null
    const a = photos.find((p) => p.id === selected[0])
    const b = photos.find((p) => p.id === selected[1])
    return a && b ? [a, b] : null
  }, [selected, photos])
  const lastPair = useRef<readonly [PhotoMeta, PhotoMeta] | null>(null)
  if (pair) lastPair.current = pair
  const closeCompare = useCallback(() => {
    setComparing(false)
    setSelected([])
    setSelecting(false)
  }, [])

  const count = photos?.length ?? 0
  const canCompare = count >= 2
  // select mode only means something with two photos to pick from
  const inSelect = selecting && canCompare

  const toggleSelecting = () => {
    if (inSelect) {
      setSelecting(false)
      setSelected([])
    } else {
      setSelecting(true)
      setSelected([])
    }
  }

  const tapTile = (p: PhotoMeta) => {
    if (!inSelect) {
      setViewId(p.id)
      return
    }
    const next = selected.includes(p.id) ? selected.filter((id) => id !== p.id) : [...selected, p.id].slice(-2)
    setSelected(next)
    if (next.length === 2) setComparing(true)
  }

  return (
    <section data-testid="tp-photos" aria-label="Progress photos">
      <SectionHeading right={count ? String(count) : undefined}>Progress photos</SectionHeading>

      {!supported ? (
        <EmptyLine className="pt-4">Photos are not available in this browser.</EmptyLine>
      ) : (
        <>
          <input
            ref={fileInput}
            data-testid="tp-photo-add"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onPick(e)}
          />

          {photos !== null && !failed && count === 0 ? (
            <div className="pt-4">
              <EmptyState
                action={
                  <Button variant="hairline" size="sm" icon={<ImagePlus size={16} strokeWidth={1.5} />} data-testid="tp-photo-add-button" disabled={busy} aria-busy={busy || undefined} onClick={() => fileInput.current?.click()}>
                    {busy ? 'Saving...' : 'Add photo'}
                  </Button>
                }
              >
                No photos yet.
              </EmptyState>
              <p className="hint pt-3 text-center">Photos stay on this device and are not in the backup.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-4">
              {canCompare ? (
                <Button variant="hairline" size="sm" className="!px-2" data-testid="tp-photo-compare" aria-pressed={inSelect} onClick={toggleSelecting}>
                  {inSelect ? 'Cancel' : 'Compare'}
                </Button>
              ) : (
                <span aria-hidden="true" />
              )}
              <Button variant="hairline" size="sm" className="!px-2" data-testid="tp-photo-add-button" disabled={busy} aria-busy={busy || undefined} onClick={() => fileInput.current?.click()}>
                {busy ? 'Saving...' : 'Add photo'}
              </Button>
            </div>
          )}

          {inSelect ? (
            <p className="hint pt-3" aria-live="polite">
              {selected.length ? 'Choose one more.' : 'Choose two photos.'}
            </p>
          ) : null}

          {photos === null ? null : failed ? (
            <EmptyLine className="pt-4">Photos could not be opened.</EmptyLine>
          ) : count === 0 ? null : (
            <ul data-testid="tp-photo-grid" className="grid grid-cols-3 gap-2 pt-4">
              {photos.map((p) => (
                <PhotoTile key={p.id} photo={p} today={today} selecting={inSelect} mark={inSelect ? selected.indexOf(p.id) + 1 : 0} onTap={tapTile} />
              ))}
            </ul>
          )}

          {lastViewed.current ? (
            <HistoryPhotoViewer
              key={lastViewed.current.id}
              photo={lastViewed.current}
              open={viewing !== null}
              canCompare={canCompare}
              onClose={closeViewer}
              onCompare={compareFrom}
              onDeleted={onDeleted}
              onNoteSaved={onNoteSaved}
            />
          ) : null}
          {lastPair.current ? <HistoryPhotoCompare pair={lastPair.current} open={comparing && pair !== null} onClose={closeCompare} today={today} kgByDay={kgByDay} /> : null}
        </>
      )}
    </section>
  )
}
