/**
 * THE STOIC BLOCK (polish-spec 6.1, from the ring row to 8 px above the tab bar). One line a day from
 * src/lib/stoic.ts, centred in whatever room the frame leaves:
 *
 *   ▚▚▚ meander ▚▚▚       96 px, centred
 *   (14 px)
 *   We suffer more often in imagination than in reality.     Cormorant 400 italic 19 px bone-dim, max 2 lines at 326 px
 *   (10 px)
 *   ──                    24 x 1 gold-400
 *   (8 px)
 *   SENECA                Cinzel 700 12 px 0.12em bone-dim
 *
 * The block grows into the free space (flex 1 from a 0 basis, never pushing the stage), so the
 * monument's scale budget holds. Its floor steps with the frame: a tall frame (780 px and up, safe
 * areas included, so a real 390 x 844 phone) always keeps 108 px, the meander and the rule; a short
 * frame (iPhone SE, 360 x 640) keeps 67 px. When the room is tight the meander steps out first, then
 * the small rule, and the lines close up; the words and the author always stay. MonumentLayer budgets
 * the same step (stoicMinFor) when it scales the stage.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Meander } from '../components/ornaments'
import { stoicLineForDay } from '../lib/stoic'

/** room needed with the meander (two lines), and with tight gaps */
const ROOMY = 108
const SNUG = 86
/** the floor on a tall frame: room for the meander and the rule */
export const STOIC_MIN_TALL = ROOMY
/** the floor on a short frame */
export const STOIC_MIN_SHORT = 67
/** frame height (safe areas included) from which the tall floor applies */
export const TALL_FRAME = 780

/**
 * The stoic floor for a frame. The monument scales against the same chrome budget
 * (MonumentLayer: header 40 + ring row 132 + this + air 16 + bar 56, plus the safe areas).
 */
export function stoicMinFor(frameH: number): number {
  return frameH >= TALL_FRAME ? STOIC_MIN_TALL : STOIC_MIN_SHORT
}

export function TodayStoic({ today }: { today: string }) {
  const line = stoicLineForDay(today)
  const ref = useRef<HTMLElement>(null)
  const [room, setRoom] = useState<'roomy' | 'snug' | 'tight'>('roomy')
  const [frameH, setFrameH] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const frame = el.parentElement
    const measure = () => {
      if (frame && frame.clientHeight) setFrameH(frame.clientHeight)
      const h = el.clientHeight
      if (!h) return
      setRoom(h >= ROOMY ? 'roomy' : h >= SNUG ? 'snug' : 'tight')
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (frame) ro.observe(frame)
    return () => ro.disconnect()
  }, [])

  const tight = room === 'tight'
  return (
    <figure
      ref={ref}
      data-intro="stoic"
      data-testid="tp-stoic"
      data-room={room}
      className="flex flex-col items-center justify-center px-8 text-center"
      style={{ flex: '1 1 0px', minHeight: stoicMinFor(frameH) }}
    >
      {room === 'roomy' ? <Meander width={96} className="mb-[14px] shrink-0" /> : null}
      <blockquote
        className={`font-body line-clamp-2 max-w-[326px] text-[19px] font-normal italic text-bone-dim [text-wrap:balance] ${tight ? 'leading-[1.15]' : 'leading-[1.35]'}`}
      >
        {line.text}
      </blockquote>
      {tight ? null : <span aria-hidden="true" className="mt-[10px] h-px w-6 shrink-0 bg-gold-400" />}
      <figcaption className={`label inscribed shrink-0 ${tight ? 'mt-1.5' : 'mt-2'}`} style={{ marginRight: '-0.12em' }}>
        {line.author}
      </figcaption>
    </figure>
  )
}
