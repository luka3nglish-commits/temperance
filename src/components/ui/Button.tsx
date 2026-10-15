import type { ButtonHTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { lightAtPointer } from './press'

/**
 * Button and IconButton, polish-spec 4.1. Cinzel 700 uppercase labels; every variant has rest,
 * hover (fine pointers only), pressed (in 70 ms, out 300 ms on the spring), focus (the global 2 px
 * gold-300 ring) and disabled. Disabled never uses opacity.
 *
 * Variants
 * - `gold`: THE action of a screen or sheet (LOG, LOG WEIGHT, SAVE). h 56, the engraved gold fill,
 *   label 15 px 0.24em #17110A. Pressed: scale 0.97, inset shadow, a light from the press point.
 *   Disabled: an engraved empty outline (#121218, gold edge, label #9C9791) that sweeps away left to
 *   right over 220 ms when the button enables. Pass `disabled` (or `aria-disabled` for a button that
 *   must stay focusable).
 * - `hairline`: secondary actions (EDIT, EXPORT, ADD PHOTO). h 48, transparent, 1 px gold edge
 *   (3.64:1), label 14 px 0.16em gold-300. `aria-pressed="true"` shows the active frame.
 * - `ghost`: tertiary (BACK, LATER). min 44 x 44, no border, label bone-dim.
 * - `danger` (alias `ember`): destructive. h 48, ember edge, ember-text label. `armed` is the second
 *   tap of a two-step delete (ember wash, full ember border; pass the confirm copy as children).
 *
 * Sizes: `sm` h 44 (settings rows, inline), `md` h 48 (h 56 for gold), `lg` h 56.
 *
 *   <Button variant="gold" full type="submit" disabled={!canLog}>Log</Button>
 *   <Button variant="hairline" size="sm" icon={<Upload size={16} strokeWidth={1.5} />}>Import</Button>
 *   <Button variant="danger" armed={armed} onClick={tap}>{armed ? 'Erase everything' : 'Erase all'}</Button>
 */

export type ButtonVariant = 'gold' | 'hairline' | 'ghost' | 'danger' | 'ember'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** leading icon, 16 to 20 px, stroke 1.5 */
  icon?: ReactNode
  /** trailing icon or text */
  trailing?: ReactNode
  full?: boolean
  /** danger only: the armed second tap */
  armed?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  gold: 'btn-gold press-light',
  hairline: 'btn-hairline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  ember: 'btn-danger',
}

function heightFor(variant: ButtonVariant, size: ButtonSize): string {
  if (size === 'sm') return 'h-11 px-4'
  if (size === 'lg' || variant === 'gold') return 'h-14 px-5'
  if (variant === 'ghost') return 'px-3'
  return 'h-12 px-5'
}

/** Cinzel uppercase button. `gold` is for the one primary action on a screen. */
export function Button({
  variant = 'hairline',
  size = 'md',
  icon,
  trailing,
  full,
  armed,
  className = '',
  children,
  type = 'button',
  onPointerDown,
  ...rest
}: Props) {
  const gold = variant === 'gold'
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (gold && !rest.disabled && rest['aria-disabled'] !== true && rest['aria-disabled'] !== 'true') lightAtPointer(e)
    onPointerDown?.(e)
  }
  return (
    <button
      type={type}
      onPointerDown={down}
      className={`btn press ${VARIANT[variant]} ${heightFor(variant, size)} ${full ? 'w-full' : ''} ${armed ? 'is-armed' : ''} ${className}`}
      {...rest}
    >
      {gold ? <span className="press-light-spot" aria-hidden="true" /> : null}
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children !== undefined && children !== null && children !== false ? <span className="min-w-0">{children}</span> : null}
      {trailing ? <span className="inline-flex shrink-0">{trailing}</span> : null}
    </button>
  )
}

/**
 * A 44 x 44 icon-only button with an accessible label (also its tooltip). Icon bone-dim at rest,
 * bone on hover, gold-300 with a faint gold wash when pressed, bone-mute when disabled. Icons 22 px
 * for row actions, 18 px inline, stroke 1.5.
 *
 *   <IconButton label="Close"><X size={22} strokeWidth={1.5} /></IconButton>
 */
export function IconButton({ label, className = '', children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type={type} aria-label={label} title={label} className={`icon-btn press ${className}`} {...rest}>
      {children}
    </button>
  )
}
