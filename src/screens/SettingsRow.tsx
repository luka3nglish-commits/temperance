import type { ReactNode } from 'react'

type Props = {
  /** short uppercase label, Cinzel 10 px tracking 0.35em */
  label: string
  /** the value (Cormorant 19 px) or a control, right aligned */
  children?: ReactNode
  /** an optional second line under the row: inline confirms, notes */
  below?: ReactNode
  /** when the control is a single input, its id so the label focuses it */
  htmlFor?: string
  className?: string
}

/**
 * A 56 px settings row ruled with --gold-line: label at the left, value or control at the right.
 * A control too wide for a narrow phone (three segments, three inputs) drops under the label
 * instead of overflowing; the row grows and the control stays right aligned.
 */
export function SettingsRow({ label, children, below, htmlFor, className = '' }: Props) {
  const labelClass = 'font-display shrink-0 whitespace-nowrap text-[10px] tracking-[0.35em] text-bone-dim'
  return (
    <div className={`border-b border-[var(--gold-line)] ${className}`}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{children}</div>
      </div>
      {below ? <div className="pb-3">{below}</div> : null}
    </div>
  )
}

/** A plain value in a row: Cormorant 19 px bone. */
export function SettingsValue({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`num font-body text-[19px] font-medium text-bone ${className}`}>{children}</span>
}

/** A sentence in a row: Cormorant 15 px bone-dim. */
export function SettingsNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`font-body text-[15px] leading-[1.4] text-bone-dim ${className}`}>{children}</p>
}

type SmallInputProps = {
  id: string
  value: string
  onChange(value: string): void
  onCommit(): void
  /** unit drawn inside at the right (kcal, kJ) */
  suffix?: string
  /** a one-letter Cinzel mark drawn inside at the left (P, C, F) */
  prefix?: string
  width?: number
  label: string
  testId?: string
  /** the phone keypad: whole numbers (default) or a decimal point too (kg to one decimal) */
  inputMode?: 'numeric' | 'decimal'
}

/** A 44 px numeric field for a settings row: obsidian-800, right aligned Cormorant 19 px, unit inside. */
export function SmallInput({ id, value, onChange, onCommit, suffix, prefix, width = 112, label, testId, inputMode = 'numeric' }: SmallInputProps) {
  return (
    <span className="relative inline-block" style={{ width }}>
      <input
        id={id}
        data-testid={testId}
        type="text"
        inputMode={inputMode}
        pattern={inputMode === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
        autoComplete="off"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        onFocus={(e) => e.target.select()}
        className={`num h-11 w-full rounded-[4px] border border-obsidian-600 bg-obsidian-800 text-right font-body text-[19px] font-medium text-bone outline-none transition-colors duration-150 focus:border-[var(--gold-focus)] ${
          suffix ? 'pr-10' : 'pr-2'
        } ${prefix ? 'pl-5' : 'pl-3'}`}
      />
      {prefix ? (
        <span aria-hidden="true" className="font-display pointer-events-none absolute inset-y-0 left-2 flex items-center text-[9px] tracking-[0.2em] text-bone-dim">
          {prefix}
        </span>
      ) : null}
      {suffix ? (
        <span aria-hidden="true" className="num pointer-events-none absolute inset-y-0 right-3 flex items-center font-body text-[14px] text-bone-dim">
          {suffix}
        </span>
      ) : null}
    </span>
  )
}
