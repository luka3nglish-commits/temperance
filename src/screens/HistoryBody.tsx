/**
 * HISTORY · BODY: WEIGHT, then PROGRESS PHOTOS. Scrolls inside <main> like the ledger, same 20 px
 * gutters, and the same mount-only entrance stagger (the weight blocks take 60 to 240 ms, photos 300 ms).
 */
import { HistoryWeight } from './HistoryWeight'
import { HistoryPhotos } from './HistoryPhotos'

export function HistoryBody({ today }: { today: string }) {
  return (
    <div data-testid="tp-body" className="px-5 pt-5">
      <HistoryWeight today={today} />
      <div className="rise-in rise-in-4 pt-8">
        <HistoryPhotos today={today} />
      </div>
    </div>
  )
}
