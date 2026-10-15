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
 * monument's scale budget holds. When the room is tight (a real 844 px phone with its safe areas gives
 * it about 67 px) the meander steps out first, then the small rule, and the lines close up; the words
 * and the author always stay.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { Meander } from '../components/ornaments'
import { stoicLineForDay } from '../lib/stoic'

/** room needed with the meander (two lines), and with tight gaps */
const ROOMY = 108
const SNUG = 86
/** the monument scales against a fixed chrome budget (MonumentLayer: 303 px = header 40 + ring row 132 + this + air 64) */
export const STOIC_MIN = 67

export function TodayStoic({ today }: { today: string }) {
  const line = stoicLineForDay(today)
  const ref = useRef<HTMLElement>(null)
  const [room, setRoom] = useState<'roomy' | 'snug' | 'tight'>('roomy')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const h = el.clientHeight
      if (!h) return
      setRoom(h >= ROOMY ? 'roomy' : h >= SNUG ? 'snug' : 'tight')
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
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
      style={{ flex: '1 1 0px', minHeight: STOIC_MIN }}
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
