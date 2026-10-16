import type { Ref } from 'react'

export const WORD = 'TEMPERANCE'

/**
 * The opening wordmark (docs/polish-spec.md sections 2.2 and 5.5): Cinzel 700, 30 px, tracking
 * 0.42em, in the gold text gradient, centred in the stage where the shaft of light falls. Each
 * letter is its own span so the timeline can chisel them in one by one with clip-path (a child's
 * clip-path does not clip a parent's background-clip: text, so each letter carries the gradient,
 * sized to the whole word and offset by the letter's position: --ww and --lx, measured by the
 * timeline once the font is in). One sheen crosses the word (--sheen-p, 1.3 to -0.3).
 * The letters start fully clipped inline so there is no flash before the fonts gate. The trailing
 * tracking is balanced with padding so the FLIP to the header lands centred.
 */
const STYLE = `
.tp-wordmark { --ww: 300px; --sheen-p: 1.3; }
.tp-wordmark [data-letter] {
  color: transparent;
  background-image:
    linear-gradient(105deg, transparent 40%, rgba(255, 248, 230, 0.55) 50%, transparent 60%),
    var(--gold-grad-text, linear-gradient(100deg, #B8902E 0%, #C9A24A 20%, #D8B45A 38%, #EBD08A 46%, #FFF3CF 50%, #F6E3A1 54%, #D8B45A 66%, #C29A42 82%, #B8902E 100%));
  background-size: calc(var(--ww) * 2.6) 100%, calc(var(--ww) * 2.2) 100%;
  background-repeat: no-repeat;
  background-position: calc(var(--ww) * -1.6 * var(--sheen-p) - var(--lx, 0px)) 0, calc(var(--ww) * -0.6 - var(--lx, 0px)) 0;
  -webkit-background-clip: text;
  background-clip: text;
}
`

export function Wordmark({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Temperance"
      className="tp-wordmark font-display absolute left-0 right-0 flex justify-center font-bold leading-none"
      style={{
        // the stage centre, just under the gold line, scaled with the stage on short phones
        top: 'calc(var(--goal-y, 263px) + (var(--plinth-y, 507px) - var(--goal-y, 263px)) * 0.166 - 15px)',
        fontSize: 30,
        letterSpacing: '0.42em',
        paddingLeft: '0.42em',
        willChange: 'transform',
      }}
    >
      <style>{STYLE}</style>
      {WORD.split('').map((ch, i) => (
        <span key={i} data-letter aria-hidden="true" className="inline-block" style={{ clipPath: 'inset(0 0 100% 0)' }}>
          {ch}
        </span>
      ))}
    </div>
  )
}
