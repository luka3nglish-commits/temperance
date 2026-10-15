import type { ReactNode } from 'react'
import { Input, Tablet } from '../components/ui'
import { Rhombus } from '../components/ornaments'

/** The fixed right column every value control sits in (polish-spec 6.6): 168 px, right aligned, 44 px tall. */
export const SETTINGS_COL = 168

type GroupProps = {
  /** the Roman numeral (ornament only): I, II, III */
  numeral: string
  /** the plain word: Goals, Display, Data */
  title: string
  /** heading id, for aria-labelledby */
  id: string
  testId?: string
  children: ReactNode
}

/**
 * A settings group: a raised, bracketed stone tablet (padding 4 px 16 px 8 px) headed by a rhombus and
 * `I · GOALS` in Cinzel 700 12 px gold-300, 16 px from the top, a `--rule` 12 px under it, then the
 * rows divided by `--rule`.
 */
export function SettingsGroup({ numeral, title, id, testId, children }: GroupProps) {
  return (
    <Tablet as="section" bracketed flush testId={testId} aria-labelledby={id} className="px-4 pt-1 pb-2">
      <h2 id={id} className="label flex items-center gap-2.5 border-b border-[var(--rule)] pt-4 pb-3 text-gold-300">
        <Rhombus />
        <span>
          {numeral} · {title}
        </span>
      </h2>
      <div className="divide-y divide-[var(--rule)]">{children}</div>
    </Tablet>
  )
}

type Props = {
  /** short uppercase label, Cinzel 700 12 px 0.12em bone-dim (wraps on a narrow phone) */
  label: string
  /** the value control (input, toggle, two-way segmented, single button) */
  children?: ReactNode
  /** an optional line under the row: inline confirms, notes */
  below?: ReactNode
  /** when the control is a single input, its id so the label focuses it */
  htmlFor?: string
  /**
   * `column` (default): the control sits in the fixed 168 px right column. `stack`: the label on its
   * own line and the control full width beneath (three-way segmented, wide confirms).
   */
  layout?: 'column' | 'stack'
  testId?: string
  className?: string
}

/**
 * One settings row, min-h 60 with 14 px top and bottom. Two layouts only: the label left with the
 * control in the fixed 168 px right column, or the label above a full-width control.
 */
export function SettingsRow({ label, children, below, htmlFor, layout = 'column', testId, className = '' }: Props) {
  const labelEl = htmlFor ? (
    <label htmlFor={htmlFor} className="label block leading-[1.35]">
      {label}
    </label>
  ) : (
    <span className="label block leading-[1.35]">{label}</span>
  )
  return (
    <div data-testid={testId} className={`py-3.5 ${className}`}>
      {layout === 'stack' ? (
        <div className="flex min-h-8 flex-col gap-3">
          {labelEl}
          {children}
        </div>
      ) : (
        <div className="flex min-h-8 items-center gap-3">
          <div className="min-w-0 flex-1">{labelEl}</div>
          <div className="flex shrink-0 items-center justify-end" style={{ width: SETTINGS_COL }}>
            {children}
          </div>
        </div>
      )}
      {below ? <div className="pt-3">{below}</div> : null}
    </div>
  )
}

/** A sentence in a row or under it: Cormorant 600 15 px bone-soft (the hint floor). */
export function SettingsNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`hint ${className}`}>{children}</p>
}

type SmallInputProps = {
  id: string
  value: string
  onChange(value: string): void
  onCommit(): void
  /** unit drawn inside at the right (kcal, kJ, kg, g) */
  suffix?: string
  /**
   * a Cinzel label drawn inside the field (PROTEIN, CARBS, FAT): the 56 px macro third, the same
   * carved box as the LOG sheet's macro fields; the value sits on the bottom, left aligned
   */
  innerLabel?: string
  label: string
  testId?: string
  /** the phone keypad: whole numbers (default) or a decimal point too (kg to one decimal) */
  inputMode?: 'numeric' | 'decimal'
  className?: string
}

/**
 * A carved numeric field for a settings row (the shared Input). In the right column: 44 px
 * (`fieldSize="sm"`), value right aligned in Cormorant 600 22 px, the unit inside at the right.
 * With `innerLabel`: the 56 px macro third, label inside at the top, value and unit below.
 * Commits on blur or Enter; focusing selects the value so a new number replaces it.
 */
export function SmallInput({ id, value, onChange, onCommit, suffix, innerLabel, label, testId, inputMode = 'numeric', className = '' }: SmallInputProps) {
  return (
    <Input
      id={id}
      data-testid={testId}
      type="text"
      inputMode={inputMode}
      pattern={inputMode === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      fieldSize={innerLabel ? 'md' : 'sm'}
      innerLabel={innerLabel ? <span aria-hidden="true">{innerLabel}</span> : undefined}
      suffix={suffix}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      onFocus={(e) => e.target.select()}
      inputClassName={innerLabel ? 'pr-7!' : 'text-right'}
      className={className}
    />
  )
}
