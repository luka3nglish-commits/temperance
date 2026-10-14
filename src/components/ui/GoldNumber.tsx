import { formatInt } from '../../lib/units'

type Props = {
  value: number
  /** ember gradient (over the line) */
  ember?: boolean
  /** Cinzel size: px number or any CSS length expression (min(), clamp()), default 96 */
  size?: number | string
  className?: string
  /** aria label, defaults to the plain number */
  label?: string
}

/**
 * Brushed gold Cinzel number with fixed digit cells (no jitter while counting) and a 1 px chisel shadow.
 * Two text layers, no filters. Thousands grouped with a thin space cell.
 */
export function GoldNumber({ value, ember, size = 96, className = '', label }: Props) {
  const text = formatInt(Math.abs(Math.round(value)))
  const cells = text.split('').map((ch, i) => (
    <span key={i} className={ch === ' ' ? 'sep' : undefined}>
      {ch}
    </span>
  ))
  return (
    <span
      className={`gold-num font-display font-bold leading-[1.08] tracking-[-0.01em] ${ember ? 'ember' : ''} ${className}`}
      style={{ fontSize: size }}
      role="text"
      aria-label={label ?? text.replace(/ /g, '')}
    >
      <span className="gold-shadow digits" aria-hidden="true">
        {cells}
      </span>
      <span className="gold-face digits" aria-hidden="true">
        {cells}
      </span>
    </span>
  )
}
