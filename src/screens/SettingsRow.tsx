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

/** A 56 px settings row ruled with --gold-line: label at the left, value or control at the right. */
export function SettingsRow({ label, children, below, htmlFor, className = '' }: Props) {
  const labelClass = 'font-display shrink-0 text-[10px] tracking-[0.35em] text-bone-dim'
  return (
    <div className={`border-b border-[var(--gold-line)] ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-4 py-1.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        <div className="flex min-w-0 items-center justify-end gap-2">{children}</div>
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
  suffix?: string
  width?: number
  label: string
}

/** A 44 px numeric field for a settings row: obsidian-800, right aligned Cormorant 19 px, unit inside. */
export function SmallInput({ id, value, onChange, onCommit, suffix, width = 112, label }: SmallInputProps) {
  return (
    <span className="relative inline-block" style={{ width }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        onFocus={(e) => e.target.select()}
        className={`num h-11 w-full rounded-[4px] border border-obsidian-600 bg-obsidian-800 pl-3 text-right font-body text-[19px] font-medium text-bone outline-none transition-colors duration-150 focus:border-[var(--gold-focus)] ${
          suffix ? 'pr-10' : 'pr-3'
        }`}
      />
      {suffix ? (
        <span aria-hidden="true" className="num pointer-events-none absolute inset-y-0 right-3 flex items-center font-body text-[14px] text-bone-dim">
          {suffix}
        </span>
      ) : null}
    </span>
  )
}
