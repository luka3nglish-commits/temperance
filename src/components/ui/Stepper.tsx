import { Minus, Plus } from 'lucide-react'

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

/** 56 px stepper with 44 px minus and plus targets. Used for PORTION. */
export function Stepper({ value, onChange, min = 0.5, max = 4, step = 0.5, label = 'Portion', format = defaultFormat, className = '', testId }: Props) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100))
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100))
  return (
    <div
      role="group"
      data-testid={testId}
      aria-label={label}
      className={`flex h-14 items-center justify-between rounded-[4px] border border-obsidian-600 bg-obsidian-800 ${className}`}
    >
      <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={dec} disabled={value <= min} className="flex h-11 w-11 items-center justify-center text-bone-dim hover:text-bone disabled:opacity-30 cursor-pointer">
        <Minus size={18} strokeWidth={1.5} />
      </button>
      <output className="num font-display text-[15px] text-bone">{format(value)}</output>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={inc} disabled={value >= max} className="flex h-11 w-11 items-center justify-center text-bone-dim hover:text-bone disabled:opacity-30 cursor-pointer">
        <Plus size={18} strokeWidth={1.5} />
      </button>
    </div>
  )
}
