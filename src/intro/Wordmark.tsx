import type { Ref } from 'react'

export const WORD = 'TEMPERANCE'

/**
 * The opening wordmark: Cinzel 700, 28 px, tracking 0.5em, gold, centred at y 400 of the frame.
 * Each letter is its own span so the timeline can chisel them in one by one with clip-path.
 * The letters start fully clipped inline so there is no flash before the fonts gate.
 * The trailing tracking is balanced with padding so the FLIP to the header lands centred.
 */
export function Wordmark({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Temperance"
      className="font-display inscribed absolute left-0 right-0 flex justify-center text-[28px] font-bold leading-none tracking-[0.5em] text-gold-400"
      style={{ top: 'calc(400 / 844 * 100% - 14px)', paddingLeft: '0.5em', willChange: 'transform' }}
    >
      {WORD.split('').map((ch, i) => (
        <span key={i} data-letter aria-hidden="true" className="inline-block" style={{ clipPath: 'inset(0 0 100% 0)' }}>
          {ch}
        </span>
      ))}
    </div>
  )
}
