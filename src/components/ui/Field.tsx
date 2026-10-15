import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { vibrate } from '../../lib/motion'

/**
 * Field and Input, polish-spec 4.2. Inputs are carved stone (`.tablet-inset`): you write into them.
 *
 * Input: h 56, padding 0 16 px, value Cormorant 600 22 px `.num` bone, caret gold-400, placeholder
 * bone-mute, border `--bone-edge` (3.18:1) at rest, gold-300 plus a 1 px gold-300 ring on focus.
 * `suffix` (kcal, g, kg) sits inside at right 16 px in Cormorant 500 16 px bone-soft lowercase.
 * `invalid` turns the border ember and, when it flips on, shakes 140 ms and vibrates 10 ms.
 * `disabled` dims the border and the value. `fieldSize`: `sm` h 44 (settings rows), `md` h 56
 * (default), `lg` h 64 with a 28 px value (CALORIES).
 *
 * Field: a Cinzel 700 12 px label 8 px above the input, an optional right slot on the label row
 * (`labelRight`, label style; give it a colour class to tint it), or `labelInside` for the 56 px
 * macro thirds (label top 8 px left 12 px, value on the bottom).
 *
 *   <Field label="Calories" fieldSize="lg" suffix="kcal" {...decimalInputProps} value={k} onChange={...} />
 *   <Field label="Protein" labelInside suffix="g" {...decimalInputProps} value={p} onChange={...} />
 */

export type FieldSize = 'sm' | 'md' | 'lg'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** unit text drawn inside the field at the right, e.g. kcal, g */
  suffix?: ReactNode
  invalid?: boolean
  /** sm 44, md 56 (default), lg 64 with a 28 px value */
  fieldSize?: FieldSize
  /** class for the wrapper's inner input (rarely needed) */
  inputClassName?: string
  /** an inside label (Field's `labelInside` uses it) */
  innerLabel?: ReactNode
}

const HEIGHT: Record<FieldSize, string> = {
  sm: 'h-11 text-[22px]',
  md: 'h-14 text-[22px]',
  lg: 'h-16 text-[28px]',
}

/** Carved input: Cormorant 600 22 px, bone-edge border, gold-300 on focus. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { suffix, invalid, fieldSize = 'md', className = '', inputClassName = '', innerLabel, disabled, ...rest },
  ref,
) {
  const wrap = useRef<HTMLDivElement>(null)
  const was = useRef(!!invalid)
  useEffect(() => {
    if (invalid && !was.current) {
      const el = wrap.current
      if (el) {
        el.classList.remove('shake')
        void el.offsetWidth
        el.classList.add('shake')
      }
      vibrate(10)
    }
    was.current = !!invalid
  }, [invalid])

  return (
    <div ref={wrap} className={`relative ${className}`} onAnimationEnd={(e) => e.currentTarget.classList.remove('shake')}>
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`field-input tablet-inset ${HEIGHT[fieldSize]} ${invalid ? 'is-invalid' : ''} ${disabled ? 'is-disabled' : ''} ${suffix ? 'pr-14' : ''} ${
          innerLabel ? 'pt-[18px] pl-3' : ''
        } ${inputClassName}`}
        {...rest}
      />
      {innerLabel ? <span className="label pointer-events-none absolute left-3 top-2">{innerLabel}</span> : null}
      {suffix ? <span className={`field-suffix num ${innerLabel ? 'pt-[18px] right-3' : ''}`}>{suffix}</span> : null}
    </div>
  )
})

type FieldProps = InputProps & {
  label: string
  /** optional right-aligned text in the label row (label style; add a colour class to tint it) */
  labelRight?: ReactNode
  /** draw the label inside the field (macro thirds) instead of above it */
  labelInside?: boolean
}

/** Label (Cinzel 700 12 px, 0.12em, bone-dim) 8 px above an Input, or inside it with `labelInside`. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, labelRight, labelInside, id, className = '', ...rest }, ref) {
  const auto = useId()
  const inputId = id ?? auto
  if (labelInside) {
    return (
      <div className={className}>
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Input ref={ref} id={inputId} innerLabel={<span aria-hidden="true">{label}</span>} {...rest} />
      </div>
    )
  }
  return (
    <div className={className}>
      <div className="mb-2 flex min-h-3 items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="label">
          {label}
        </label>
        {labelRight ? <span className="label">{labelRight}</span> : null}
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
