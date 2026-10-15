/**
 * BODY · two progress photos side by side at equal height, the older on the left, each with its date and
 * the weigh-in from that day when there is one. Equal height without measuring: each figure grows in
 * proportion to its aspect ratio from a zero basis, so width / ratio comes out the same for both.
 */
import { createPortal } from 'react-dom'
import { Sheet, ValueUnit } from '../components/ui'
import { formatDayLabel, formatDayLong } from '../lib/day'
import type { PhotoMeta } from '../lib/photos'
import { formatKg } from './HistoryWeightChart'
import { markDialog, usePhotoURL } from './HistoryPhotoViewer'

const markCompare = markDialog('tp-photo-compare-view')
const GAP_PX = 8

/** Width over height; 3:4 when the stored size is missing. */
export function photoRatio(p: Pick<PhotoMeta, 'w' | 'h'>): number {
  return p.w > 0 && p.h > 0 ? p.w / p.h : 3 / 4
}

/** The pair oldest first, so the comparison reads left to right in time. */
export function chronological(pair: readonly [PhotoMeta, PhotoMeta]): [PhotoMeta, PhotoMeta] {
  return pair[0].at <= pair[1].at ? [pair[0], pair[1]] : [pair[1], pair[0]]
}

function CompareFigure({ photo, ratio, today, kg }: { photo: PhotoMeta; ratio: number; today: string; kg: number | undefined }) {
  const url = usePhotoURL(photo.id, 'full')
  return (
    <figure data-testid={`tp-photo-compare-${photo.id}`} className="m-0 min-w-0" style={{ flex: `${ratio.toFixed(4)} 1 0px` }}>
      <div
        className={`relative w-full overflow-hidden rounded-[2px] ${url ? '' : 'bg-obsidian-800'}`}
        style={{ aspectRatio: `${ratio}`, boxShadow: '0 0 0 1px #2A2A33, 0 0 0 2px rgba(0,0,0,0.8)' }}
      >
        {url ? <img src={url} alt={`Progress photo, ${formatDayLong(photo.day)}`} className="absolute inset-0 h-full w-full object-cover" /> : null}
      </div>
      <figcaption className="mt-2.5 flex flex-col gap-1.5">
        <span className="label truncate">{formatDayLabel(photo.day, today)}</span>
        {kg !== undefined ? (
          <span data-kg={kg}>
            <ValueUnit value={formatKg(kg)} unit="kg" size={17} />
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}

/** Mounted only while the sheet is, so the two full image URLs live exactly as long as the sheet. */
function CompareBody({ pair, today, kgByDay }: { pair: readonly [PhotoMeta, PhotoMeta]; today: string; kgByDay: ReadonlyMap<string, number> }) {
  const [a, b] = chronological(pair)
  const ra = photoRatio(a)
  const rb = photoRatio(b)
  return (
    <div
      ref={markCompare}
      className="mx-auto flex w-full items-start pt-1 pb-2"
      // the row never grows past the width at which both images reach 60svh tall
      style={{ gap: GAP_PX, maxWidth: `calc(60svh * ${(ra + rb).toFixed(4)} + ${GAP_PX}px)` }}
    >
      <CompareFigure photo={a} ratio={ra} today={today} kg={kgByDay.get(a.day)} />
      <CompareFigure photo={b} ratio={rb} today={today} kg={kgByDay.get(b.day)} />
    </div>
  )
}

type Props = {
  pair: readonly [PhotoMeta, PhotoMeta]
  open: boolean
  onClose(): void
  today: string
  /** kg by day key, from the weigh-ins */
  kgByDay: ReadonlyMap<string, number>
}

/** Portalled to <body> for the same reason as the viewer: <main> is its own stacking context. */
export function HistoryPhotoCompare({ pair, open, onClose, today, kgByDay }: Props) {
  const sheet = (
    <Sheet open={open} onClose={onClose} title="Compare" height="auto" closeLabel="Close compare">
      <CompareBody pair={pair} today={today} kgByDay={kgByDay} />
    </Sheet>
  )
  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body)
}
