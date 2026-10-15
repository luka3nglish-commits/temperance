import { useRef } from 'react'
import { useOpening } from './useOpening'
import { Wordmark } from './Wordmark'

/**
 * THE OPENING overlay (docs/design-spec.md section 5). A fixed layer at z 70 that never takes a
 * touch: `pointer-events: none` on the whole thing so the LOG keystone and the tab bar are live from
 * frame 0 (a tap on the keystone skips through the window listener and opens the sheet through its
 * own onClick). The SKIP pill is the only interactive element. Inside the overlay an invisible box
 * mirrors the app frame (430 px slab on desktop) so the wordmark sits in the frame's stage, not the
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
          {/* the SKIP pill (polish-spec 5.5): 44 px tall, clear of the keystone, readable at 12 px */}
          <button
            type="button"
            aria-label="Skip"
            onClick={skip}
            className="font-display pointer-events-auto absolute flex h-11 items-center justify-center rounded-[4px] px-4 text-[12px] font-bold uppercase leading-none tracking-[0.12em] text-bone-dim cursor-pointer"
            style={{
              bottom: 'calc(var(--safe-bottom) + 84px)',
              right: 20,
              border: '1px solid var(--bone-edge, rgba(231, 225, 210, 0.4))',
              background: 'rgba(5, 5, 7, 0.55)',
            }}
          >
            Skip
          </button>
        </div>
      ) : null}
    </div>
  )
}
