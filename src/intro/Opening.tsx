import { useRef } from 'react'
import { useOpening } from './useOpening'
import { Wordmark } from './Wordmark'

/**
 * THE OPENING overlay (docs/design-spec.md section 5). A fixed layer at z 70 that never takes a
 * touch: `pointer-events: none` on the whole thing so the LOG keystone and the tab bar are live from
 * frame 0 (a tap on the keystone skips through the window listener and opens the sheet through its
 * own onClick). The SKIP label is the only interactive element. Inside the overlay an invisible box
 * mirrors the app frame (430 px slab on desktop) so the wordmark sits at the frame's y 400, not the
 * window's. Everything else the opening touches lives in the screens and is reached by data-intro.
 */
export function Opening() {
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const { variant, state, skip } = useOpening(wordmarkRef)
  const playing = state === 'playing' && variant !== 'none'

  return (
    <div
      data-testid="tp-opening"
      data-state={state}
      aria-hidden={!playing}
      className={`pointer-events-none fixed inset-0 z-[var(--z-opening)] ${playing ? '' : 'hidden'}`}
    >
      {playing ? (
        <div className="relative mx-auto h-dvh w-full max-w-[430px] md:h-[min(100vh,932px)]">
          {variant === 'full' ? <Wordmark ref={wordmarkRef} /> : null}
          <button
            type="button"
            aria-label="Skip"
            onClick={skip}
            className="font-display inscribed pointer-events-auto absolute right-5 flex h-11 min-w-11 items-center justify-end rounded-[4px] px-2 text-[10px] leading-none tracking-[0.4em] text-bone-mute cursor-pointer"
            style={{ bottom: 'calc(64px + var(--safe-bottom) + 12px)', marginRight: '-0.4em' }}
          >
            Skip
          </button>
        </div>
      ) : null}
    </div>
  )
}
