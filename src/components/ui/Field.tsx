import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** unit text drawn inside the field at the right, e.g. kcal, g */
  suffix?: ReactNode
  invalid?: boolean
}

/** 56 px obsidian input, Cormorant 500 20 px, gold hairline on focus. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ suffix, invalid, className = '', ...rest }, ref) {
  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        className={`num h-14 w-full rounded-[4px] border bg-obsidian-800 px-4 font-body text-[20px] font-medium text-bone placeholder:text-bone-mute outline-none transition-colors duration-150 focus:border-[var(--gold-focus)] ${
          invalid ? 'border-[rgba(255,90,31,0.6)]' : 'border-obsidian-600'
        } ${suffix ? 'pr-14' : ''}`}
        {...rest}
      />
      {suffix ? (
        <span className="num pointer-events-none absolute inset-y-0 right-4 flex items-center font-body text-[15px] text-bone-dim">{suffix}</span>
      ) : null}
    </div>
  )
})

type FieldProps = InputProps & {
  label: string
  /** optional right-aligned text in the label row */
  labelRight?: ReactNode
}

/** Label (Cinzel 10 px, tracking 0.35em) 6 px above an Input. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, labelRight, id, className = '', ...rest }, ref) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={inputId} className="font-display text-[10px] tracking-[0.35em] text-bone-dim">
          {label}
        </label>
        {labelRight ? <span className="font-display text-[10px] tracking-[0.3em] text-bone-dim">{labelRight}</span> : null}
      </div>
      <Input ref={ref} id={inputId} {...rest} />
    </div>
  )
})

/** Props for a decimal number field on a phone keypad. */
export const decimalInputProps = {
  type: 'text' as const,
  inputMode: 'decimal' as const,
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  pattern: '[0-9]*[.,]?[0-9]*',
}
