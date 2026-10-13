export type SegmentedOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange(value: T): void
  label?: string
  className?: string
  /** 32 px inscribed switch (default) or 44 px tall for settings rows */
  size?: 'sm' | 'md'
}

/** Inscribed segmented switch: gold hairline, active = gold text with a 2 px gold underline. */
export function Segmented<T extends string>({ value, options, onChange, label, className = '', size = 'sm' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-[4px] border border-[var(--gold-line-strong)] ${className}`}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative font-display tracking-[0.25em] text-[11px] px-3 transition-colors duration-150 cursor-pointer ${
              size === 'sm' ? 'h-8' : 'h-11'
            } ${i > 0 ? 'border-l border-[var(--gold-line)]' : ''} ${active ? 'text-gold-300' : 'text-bone-dim hover:text-bone'}`}
          >
            {o.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-2 bottom-0 h-[2px] bg-gold-400 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0'}`}
            />
          </button>
        )
      })}
    </div>
  )
}
