/**
 * THE STOIC LINE (spec section 14): y 671 to 735, 64 px. One line a day from src/lib/stoic.ts.
 * Cormorant italic 17 px bone-dim, centred, at most two lines at 326 px, then a 24 x 1 px gold rule
 * and the author in Cinzel 9 px tracking 0.3em. Never bold, never boxed.
 */
import { stoicLineForDay } from '../lib/stoic'

export function TodayStoic({ today }: { today: string }) {
  const line = stoicLineForDay(today)
  return (
    <figure data-intro="stoic" data-testid="tp-stoic" className="flex h-16 shrink-0 flex-col items-center justify-center px-8 text-center">
      <blockquote className="font-body line-clamp-2 max-w-[326px] text-[17px] italic leading-[1.35] text-bone-dim">{line.text}</blockquote>
      <span aria-hidden="true" className="mt-1 h-px w-6 shrink-0 bg-gold-400" />
      <figcaption className="font-display inscribed mt-1 text-[9px] leading-none tracking-[0.3em] text-bone-dim" style={{ marginRight: '-0.3em' }}>
        {line.author}
      </figcaption>
    </figure>
  )
}
