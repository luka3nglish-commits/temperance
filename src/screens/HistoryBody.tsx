/**
 * HISTORY · BODY: WEIGHT, then PROGRESS PHOTOS (polish-spec 6.5). Scrolls inside <main> like the ledger,
 * same 20 px gutters. WEIGHT carries the screen's one strong gold rule; PROGRESS PHOTOS a quiet one.
 */
import { HistoryWeight } from './HistoryWeight'
import { HistoryPhotos } from './HistoryPhotos'

export function HistoryBody({ today }: { today: string }) {
  return (
    <div data-testid="tp-body" className="px-5 pt-1">
      <HistoryWeight today={today} />
      <div className="pt-10">
        <HistoryPhotos today={today} />
      </div>
    </div>
  )
}
