import { Minus, Plus } from 'lucide-react'

/**
 * DEPRECATED: use PortionField. Kept, restyled to the PortionField's carved surface, until Phase C
 * deletes it (once `grep -rn "Stepper" src/screens src/components/MealForm*` is empty).
 * A 56 px stepper with 44 px minus and plus targets and the value in Cormorant 600 22 px.
 */

type Props = {
  value: number
  onChange(value: number): void
  min?: number
  max?: number
  step?: number
  label?: string
  /** how to print the value, default: 1, 1.5, 2 */
  format?(v: number): string
  className?: string
  testId?: string
}

const defaultFormat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, ''))

export function Stepper({ value, onChange, min = 0.5, max = 4, step = 0.5, label = 'Portion', format = defaultFormat, className = '', testId }: Props) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  return (
    <div role="group" data-testid={testId} aria-label={label} className={`tablet-inset flex h-14 items-stretch justify-between ${className}`}>
      <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={dec} disabled={value <= min} className="portion-step w-11 shrink-0">
        <Minus size={20} strokeWidth={1.5} />
      </button>
      <output className="num flex min-w-0 flex-1 items-center justify-center font-body text-[22px] font-semibold text-bone">{format(value)}</output>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={inc} disabled={value >= max} className="portion-step w-11 shrink-0">
        <Plus size={20} strokeWidth={1.5} />
      </button>
    </div>
  )
}
