import type { CSSProperties } from 'react'

/**
 * Segmented switch, polish-spec 4.4. A carved well with a 1 px gold edge, equal-width segments
 * divided by `--gold-line`, Cinzel 700 12 px 0.1em labels (bone-dim; the active one gold-200 on a
 * gold wash). One 2 px gold-400 indicator travels under the active segment (360 ms on the spring),
 * computed from the index, so it needs no layout measurement.
 *
 * Sizes: `sm` h 32 (44 px hit area), `md` h 44 (default), `lg` h 40 and full width (the basis switch).
 * `full` stretches any size to the container. An option may carry its own `testId` and `disabled`.
 *
 *   <Segmented label="Basis" size="lg" value={basis} onChange={setBasis} testId="tp-log-basis"
 *     options={[{ value: 'serve', label: 'Per serve', testId: 'tp-log-basis-serve' }, ...]} />
 */

export type SegmentedOption<T extends string> = { value: T; label: string; testId?: string; disabled?: boolean }

type Props<T extends string> = {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange(value: T): void
  label?: string
  className?: string
  /** sm 32 (hit 44), md 44 (default), lg 40 full width */
  size?: 'sm' | 'md' | 'lg'
  /** stretch to the container width */
  full?: boolean
  testId?: string
}

const HEIGHT = { sm: 'h-8', md: 'h-11', lg: 'h-10' } as const

/** Inscribed segmented switch: carved well, gold edge, a travelling gold indicator under the active segment. */
export function Segmented<T extends string>({ value, options, onChange, label, className = '', size = 'md', full, testId }: Props<T>) {
  const n = Math.max(1, options.length)
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const stretch = full || size === 'lg'
  const indicator: CSSProperties = {
    width: `calc(${100 / n}% - 20px)`,
    transform: `translateX(calc(${index} * (100% + 20px)))`,
  }
  return (
    <div
      role="radiogroup"
      data-testid={testId}
      aria-label={label}
      className={`seg ${stretch ? 'grid w-full' : 'inline-grid'} ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={o.testId}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`seg-option press ${HEIGHT[size]} ${
              size === 'sm' ? 'before:absolute before:inset-x-0 before:-top-1.5 before:-bottom-1.5 before:content-[""]' : ''
            } ${stretch ? '' : 'px-4'}`}
          >
            {o.label}
          </button>
        )
      })}
      {options.some((o) => o.value === value) ? <span aria-hidden="true" className="seg-indicator" style={indicator} /> : null}
    </div>
  )
}
