import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'gold' | 'hairline' | 'ghost' | 'ember'
export type ButtonSize = 'md' | 'sm'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** leading icon, 16 to 20 px */
  icon?: ReactNode
  full?: boolean
}

const base =
  'font-display inline-flex items-center justify-center gap-2 select-none rounded-[4px] transition-[transform,opacity,background-color] duration-150 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap'

const variants: Record<ButtonVariant, string> = {
  gold: 'gold-fill text-obsidian-900 tracking-[0.3em] text-[14px]',
  hairline: 'bg-transparent text-gold-400 tracking-[0.3em] text-[14px] border border-[var(--gold-line-strong)] hover:bg-[var(--gold-line)]',
  ghost: 'bg-transparent text-bone-dim tracking-[0.3em] text-[12px] hover:text-bone',
  ember: 'bg-transparent text-ember-text tracking-[0.3em] text-[12px] border border-[rgba(255,90,31,0.35)]',
}

const sizes: Record<ButtonSize, string> = {
  md: 'h-14 px-5',
  sm: 'h-11 px-4',
}

/** Cinzel uppercase button. `gold` is for the one primary action on a screen. */
export function Button({ variant = 'hairline', size = 'md', icon, full, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}

/** A 44 px square icon-only button with an accessible label. */
export function IconButton({ label, className = '', children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-[4px] text-bone-dim transition-colors duration-150 hover:text-bone active:scale-[0.94] cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
