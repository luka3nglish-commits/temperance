import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { AmountUnit } from '../../lib/types'
import { cleanAmount, formatAmountLong, formatAmountNumber, portionMin, serveWord, stepAmount } from '../../lib/portion'
import { parseNumber } from '../../lib/units'
import { vibrate } from '../../lib/motion'

/**
 * PORTION, polish-spec 4.3. Any amount, typed or stepped, in one 64 px carved field:
 *
 *   [ -  |      180 g      |  + ]
 *
 * - The middle is a real input (decimal keypad): Cormorant 600 30 px bone, the unit beside it on one
 *   baseline in Cormorant 500 18 px bone-soft: `g`, `ml`, `serve` (1 or less) or `serves`. No times sign.
 *   A typed value commits on blur or Enter; nonsense reverts with a shake and a 10 ms buzz.
 *   `onPreview(n)` fires on every parseable keystroke (null when unparseable or on blur) so a live
 *   result line can follow the typing before it commits.
 * - Minus and plus are 64 x 64 targets (22 px icons, bone-dim; pressed gold-300 on a gold wash, icon
 *   scale 0.9). They step on a grid (quarter serves; 5 g under 50, 10 g under 500, then 25 g) and
 *   repeat while held: 380 ms, then every 70 ms easing to 35 ms. While held the middle shows a gold
 *   hairline and each changed digit wipes in (120 ms). Minus at the minimum turns #5E5A54 (no opacity).
 *   They never steal focus from the input, so the keyboard stays up while stepping.
 * - Focus: the border and the unit turn gold-300.
 *
 * Test ids: `testId` on the group, `${testId}-input`, `${testId}-less`, `${testId}-more`.
 * Put the basis on the label row above it, never inside; put `PortionPicks` 8 px under it.
 *
 *   <PortionField testId="tp-log-portion" unit="g" value={amount} onChange={setAmount}
 *     onPreview={setPreview} enterKeyHint="go" onEnter={submit} />
 *   <PortionPicks testId="tp-log-portion" unit="g" value={amount} usual={meal.usual} onChange={setAmount} />
 */

type Props = {
  /** the amount: servings for 'serve', grams for 'g', millilitres for 'ml' */
  value: number
  unit: AmountUnit
  onChange(value: number): void
  /** accessible name of the group, e.g. "Portion" */
  label?: string
  max?: number
  className?: string
  /** data-testid on the group; the input gets `${testId}-input`, the buttons `-less` and `-more` */
  testId?: string
  /** fired when Enter is pressed in the amount (the log form submits on it) */
  onEnter?(): void
  /** fired on every parseable keystroke with the cleaned amount, null when unparseable or on blur */
  onPreview?(n: number | null): void
  /** the keyboard's enter key: 'done' (default) or 'go' in the LOG sheet */
  enterKeyHint?: 'done' | 'go' | 'next' | 'enter'
  /** fired when the amount input gains focus (scroll the PORTION block into view) */
  onFocus?(): void
  /** reserved; one size ships (64) */
  size?: 'md'
}

const REPEAT_DELAY = 380
const REPEAT_EVERY = 70
const REPEAT_FLOOR = 35

/** "g", "ml", "serve" at 1 or less, "serves" above */
export function unitWord(unit: AmountUnit, amount: number): string {
  return unit === 'serve' ? serveWord(amount) : unit
}

export function PortionField({ value, unit, onChange, label = 'Portion', max, className = '', testId, onEnter, onPreview, enterKeyHint = 'done', onFocus }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [held, setHeld] = useState<0 | 1 | -1>(0)
  const field = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number>(0)
  const latest = useRef(value)
  latest.current = value

  const ceiling = max ?? (unit === 'serve' ? 100 : 100000)
  const min = portionMin(unit)
  const shown = draft ?? formatAmountNumber(value)

  // the digits drawn over the input while it is not being edited: a changed digit (counted from the
  // right) gets a new key, so only it remounts and wipes in
  const prevShown = useRef(shown)
  useEffect(() => {
    prevShown.current = shown
  })
  const prev = prevShown.current
  const digits = shown.split('').map((ch, i) => {
    const fromRight = shown.length - 1 - i
    const before = prev[prev.length - 1 - fromRight]
    const changed = before !== ch && prev !== shown
    return { ch, key: `${fromRight}-${ch}`, changed }
  })

  const shake = () => {
    const el = field.current
    if (el) {
      el.classList.remove('shake')
      void el.offsetWidth
      el.classList.add('shake')
    }
    vibrate(10)
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    const n = parseNumber(trimmed)
    const v = n === null ? null : cleanAmount(Math.min(n, ceiling), unit)
    setDraft(null)
    onPreview?.(null)
    if (v === null) {
      if (trimmed !== '' && trimmed !== formatAmountNumber(latest.current)) shake()
      return
    }
    if (v !== latest.current) onChange(v)
  }

  const stopRepeat = () => {
    window.clearTimeout(timer.current)
    timer.current = 0
    setHeld(0)
  }

  const step = (direction: 1 | -1): boolean => {
    const next = Math.min(ceiling, stepAmount(latest.current, unit, direction))
    if (next === latest.current) return false
    latest.current = next
    onChange(next)
    vibrate(4)
    return true
  }

  const startRepeat = (direction: 1 | -1) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (draft !== null) commit(draft)
    setHeld(direction)
    if (!step(direction)) {
      window.setTimeout(() => setHeld(0), 120)
      return
    }
    const loop = (delay: number) => {
      timer.current = window.setTimeout(() => {
        if (!step(direction)) return stopRepeat()
        loop(Math.max(REPEAT_FLOOR, delay * 0.9))
      }, delay)
    }
    timer.current = window.setTimeout(() => loop(REPEAT_EVERY), REPEAT_DELAY)
    // a button that disables at the limit never sees its own pointerup
    window.addEventListener('pointerup', stopRepeat, { once: true })
    window.addEventListener('pointercancel', stopRepeat, { once: true })
  }
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.removeEventListener('pointerup', stopRepeat)
      window.removeEventListener('pointercancel', stopRepeat)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget.value)
      input.current?.blur()
      onEnter?.()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDraft(null)
      step(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDraft(null)
      step(-1)
    } else if (e.key === 'Escape') {
      setDraft(null)
      onPreview?.(null)
      input.current?.blur()
    }
  }

  const lname = label.toLowerCase()
  const unitText = unitWord(unit, draft !== null ? (parseNumber(draft) ?? value) : value)

  const stepButton = (direction: 1 | -1) => {
    const less = direction === -1
    return (
      <button
        type="button"
        aria-label={`${less ? 'Less' : 'More'} ${lname}`}
        data-testid={testId ? `${testId}-${less ? 'less' : 'more'}` : undefined}
        tabIndex={focused ? -1 : undefined}
        onPointerDown={startRepeat(direction)}
        onPointerUp={stopRepeat}
        onPointerLeave={() => timer.current && stopRepeat()}
        onPointerCancel={stopRepeat}
        onMouseDown={(e) => e.preventDefault()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), step(direction))}
        disabled={less ? value <= min : value >= ceiling}
        className={`portion-step ${held === direction ? 'is-held' : ''}`}
      >
        {less ? <Minus size={22} strokeWidth={1.5} /> : <Plus size={22} strokeWidth={1.5} />}
      </button>
    )
  }

  return (
    <div
      ref={field}
      role="group"
      aria-label={label}
      data-testid={testId}
      data-unit={unit}
      data-value={value}
      onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove('shake')}
      className={`portion-field tablet-inset ${held ? 'is-holding' : ''} ${className}`}
    >
      {stepButton(-1)}
      <span aria-hidden="true" className="portion-divider" />
      <label className="portion-middle">
        <span className="sr-only">{`${label} amount`}</span>
        <span className="portion-value">
          <input
            ref={input}
            data-testid={testId ? `${testId}-input` : undefined}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            size={1}
            enterKeyHint={enterKeyHint}
            value={shown}
            onFocus={(e) => {
              setFocused(true)
              setDraft(formatAmountNumber(value))
              const el = e.target
              requestAnimationFrame(() => el.select())
              onFocus?.()
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.,]/g, '').slice(0, 7)
              setDraft(raw)
              if (onPreview) {
                const n = parseNumber(raw)
                onPreview(n === null ? null : cleanAmount(Math.min(n, ceiling), unit))
              }
            }}
            onBlur={(e) => {
              setFocused(false)
              commit(e.target.value)
            }}
            onKeyDown={onKeyDown}
          />
          <span aria-hidden="true" className="portion-mirror">
            {digits.map((d) => (
              <span key={d.key} className={d.changed ? 'is-new' : undefined}>
                {d.ch}
              </span>
            ))}
          </span>
        </span>
        <span aria-hidden="true" className="portion-unit">
          {unitText}
        </span>
      </label>
      <span aria-hidden="true" className="portion-divider" />
      {stepButton(1)}
    </div>
  )
}

// ---------- quick picks ----------

/** The four picks per unit (polish-spec 4.3). */
export const PORTION_PICKS: Record<AmountUnit, readonly number[]> = {
  serve: [0.5, 1, 1.5, 2],
  g: [100, 150, 200, 250],
  ml: [150, 250, 330, 500],
}

type PicksProps = {
  unit: AmountUnit
  /** the current amount; the pick equal to it is framed in gold */
  value: number
  onChange(value: number): void
  /** the meal's usual amount: marked with a solid rhombus; outside the set it replaces the first pick */
  usual?: number
  /** the PortionField's testId: picks get `${testId}-pick-<value>` */
  testId?: string
  /** override the four values */
  picks?: readonly number[]
  className?: string
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

/**
 * PortionPicks, polish-spec 4.3: four 40 px chips in one row 8 px under the PortionField, equal
 * widths. Number Cinzel 700 13 px bone-dim plus the unit in Cormorant 500 15 px (serve picks show the
 * number only). The pick equal to the value is framed in gold on a gold wash (number gold-200). A tap
 * sets the value, buzzes 6 ms and never steals focus (the keyboard stays up). The usual amount carries
 * a 5 px solid rhombus and reads "Usual, 180 grams".
 */
export function PortionPicks({ unit, value, onChange, usual, testId, picks, className = '' }: PicksProps) {
  const base = picks ?? PORTION_PICKS[unit]
  const hasUsual = typeof usual === 'number' && Number.isFinite(usual) && usual > 0
  const values = hasUsual && !base.some((p) => near(p, usual)) ? [usual, ...base.slice(1)] : [...base]
  return (
    <div role="group" aria-label="Quick amounts" className={`portion-picks ${className}`}>
      {values.map((v) => {
        const active = near(v, value)
        const isUsual = hasUsual && near(v, usual)
        const n = formatAmountNumber(v)
        const spoken = formatAmountLong(v, unit)
        return (
          <button
            key={v}
            type="button"
            data-testid={testId ? `${testId}-pick-${n}` : undefined}
            aria-pressed={active}
            aria-label={isUsual ? `Usual, ${spoken}` : spoken}
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate(6)
              if (!near(v, value)) onChange(v)
            }}
            className={`portion-pick ${active ? 'is-active gold-border' : ''}`}
          >
            {isUsual ? <span aria-hidden="true" className="rhombus solid" /> : null}
            <span aria-hidden="true" className="portion-pick-num">
              {n}
            </span>
            {unit !== 'serve' ? (
              <span aria-hidden="true" className="portion-pick-unit">
                {unit}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
