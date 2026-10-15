import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Chip and ChipRow, polish-spec 4.6. A small gold-edged slab that acts: favourite meals, REPEAT.
 * h 40 (`size="sm"` h 32 with a 44 px hit area), radius 4, #16161C fill, 1 px `--gold-edge`,
 * padding 0 14 px, max 168 px wide with the name truncated. Label Cinzel 700 12 px 0.1em gold-300;
 * an optional trailing energy in Cormorant 500 15 px bone-soft (lowercase unit). Active
 * (`active` or `aria-pressed`): a gold gradient frame on a gold wash, label gold-200. Pressed: gold
 * wash, scale 0.97. Disabled: dim edge, bone-mute label.
 *
 * ChipRow: a horizontal row that scrolls and fades its right 28 px.
 *
 *   <ChipRow testId="tp-fav-chips">
 *     <Chip icon={<RotateCcw size={16} strokeWidth={1.5} />} label="Repeat" trailing="1 951 kcal" testId="tp-repeat-yesterday" onClick={repeat} />
 *     <Chip label="Oats and whey" onClick={() => log(id)} testId={`tp-fav-chip-${id}`} />
 *   </ChipRow>
 */

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: ReactNode
  /** trailing energy or count, e.g. "612 kcal" (Cormorant, lowercase) */
  trailing?: ReactNode
  /** leading icon, 16 px stroke 1.5 */
  icon?: ReactNode
  active?: boolean
  size?: 'md' | 'sm'
  testId?: string
  /** override the 168 px cap (REPEAT runs about 170 px) */
  maxWidth?: number
}

export function Chip({ label, trailing, icon, active, size = 'md', testId, maxWidth, className = '', style, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      data-testid={testId}
      aria-pressed={active === undefined ? undefined : active}
      className={`chip press ${size === 'sm' ? 'chip-sm' : ''} ${active ? 'is-active gold-border' : ''} ${className}`}
      style={maxWidth ? { maxWidth, ...style } : style}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span className="chip-label">{label}</span>
      {trailing !== undefined && trailing !== null ? <span className="chip-trail">{trailing}</span> : null}
    </button>
  )
}

/** A sideways-scrolling chip row with its right edge faded (mask). */
export function ChipRow({ children, className = '', testId, label }: { children: ReactNode; className?: string; testId?: string; label?: string }) {
  return (
    <div data-testid={testId} role={label ? 'group' : undefined} aria-label={label} className={`chip-row ${className}`}>
      {children}
    </div>
  )
}
