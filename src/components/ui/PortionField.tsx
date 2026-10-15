import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { AmountUnit } from '../../lib/types'
import { cleanAmount, formatAmountNumber, portionMin, stepAmount } from '../../lib/portion'
import { parseNumber } from '../../lib/units'
import { vibrate } from '../../lib/motion'

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
}

const REPEAT_DELAY = 380
const REPEAT_EVERY = 70

/**
 * PORTION: any amount, typed or stepped. The middle is a real input (decimal keypad) so a portion
 * can be 1.3 serves or 183 g; minus and plus step on a grid (quarter serves, 5 / 10 / 25 g) and
 * repeat while held. A typed value is committed on blur or Enter; nonsense reverts.
 */
export function PortionField({ value, unit, onChange, label = 'Portion', max, className = '', testId, onEnter }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number>(0)
  const latest = useRef(value)
  latest.current = value

  const ceiling = max ?? (unit === 'serve' ? 100 : 100000)
  const min = portionMin(unit)
  const shown = draft ?? formatAmountNumber(value)

  const commit = (raw: string) => {
    const n = parseNumber(raw)
    const v = n === null ? null : cleanAmount(Math.min(n, ceiling), unit)
    setDraft(null)
    if (v !== null && v !== latest.current) onChange(v)
  }

  const step = (direction: 1 | -1) => {
    const next = Math.min(ceiling, stepAmount(latest.current, unit, direction))
    if (next !== latest.current) {
      latest.current = next
      onChange(next)
      vibrate(4)
    }
  }

  const stopRepeat = () => {
    window.clearTimeout(timer.current)
    timer.current = 0
  }
  const startRepeat = (direction: 1 | -1) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (draft !== null) commit(draft)
    step(direction)
    const loop = (delay: number) => {
      timer.current = window.setTimeout(() => {
        step(direction)
        loop(Math.max(35, delay * 0.9))
      }, delay)
    }
    timer.current = window.setTimeout(() => loop(REPEAT_EVERY), REPEAT_DELAY)
  }
  useEffect(() => stopRepeat, [])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget.value)
      input.current?.blur()
      onEnter?.()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      step(-1)
    } else if (e.key === 'Escape') {
      setDraft(null)
      input.current?.blur()
    }
  }

  const unitMark = unit === 'serve' ? '×' : unit
  const lname = label.toLowerCase()

  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      data-unit={unit}
      data-value={value}
      className={`portion-field relative flex h-14 items-stretch rounded-[4px] border border-obsidian-600 bg-obsidian-800 ${className}`}
    >
      <button
        type="button"
        aria-label={`Less ${lname}`}
        data-testid={testId ? `${testId}-less` : undefined}
        onPointerDown={startRepeat(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), step(-1))}
        disabled={value <= min}
        className="flex w-11 shrink-0 cursor-pointer items-center justify-center text-bone-dim transition-colors duration-150 hover:text-bone active:scale-[0.92] disabled:opacity-30"
      >
        <Minus size={18} strokeWidth={1.5} />
      </button>
      <label className="flex min-w-0 flex-1 items-center justify-center gap-1">
        <span className="sr-only">{`${label} amount`}</span>
        {unit === 'serve' ? (
          <span aria-hidden="true" className="font-display text-[13px] text-gold-400">
            {unitMark}
          </span>
        ) : null}
        <input
          ref={input}
          data-testid={testId ? `${testId}-input` : undefined}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={shown}
          onFocus={(e) => {
            setDraft(formatAmountNumber(value))
            requestAnimationFrame(() => e.target.select())
          }}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 7))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          className="num w-full min-w-0 bg-transparent text-center font-display text-[17px] text-bone outline-none"
          style={{ maxWidth: `${Math.max(2, shown.length) + 0.5}ch` }}
        />
        {unit !== 'serve' ? (
          <span aria-hidden="true" className="font-body text-[15px] text-bone-dim">
            {unitMark}
          </span>
        ) : null}
      </label>
      <button
        type="button"
        aria-label={`More ${lname}`}
        data-testid={testId ? `${testId}-more` : undefined}
        onPointerDown={startRepeat(1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), step(1))}
        disabled={value >= ceiling}
        className="flex w-11 shrink-0 cursor-pointer items-center justify-center text-bone-dim transition-colors duration-150 hover:text-bone active:scale-[0.92] disabled:opacity-30"
      >
        <Plus size={18} strokeWidth={1.5} />
      </button>
    </div>
  )
}
