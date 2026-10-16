import type { CSSProperties } from 'react'

type Props = {
  /** filled gold (the newest row, the usual pick) instead of an outline on the void */
  solid?: boolean
  /** edge length in px before the 45 degree turn. Default 5 (the spec mark). */
  size?: number
  className?: string
  style?: CSSProperties
  /** when it means something (the goal marker), give it a label; otherwise it is decorative */
  label?: string
}

/**
 * Rhombus, polish-spec 3.3 item 2: a 5 px square turned 45 degrees, 1 px gold-400 edge on the void,
 * or solid gold-400. Uses: the strong SectionHeading rule terminal, the TODAY goal marker, flank
 * plaque ends, the newest-row mark (solid), the usual quick pick, the header streak, settings group
 * headings.
 *
 *   <Rhombus />          outline
 *   <Rhombus solid />    the row mark
 */
export function Rhombus({ solid, size = 5, className = '', style, label }: Props) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`rhombus ${solid ? 'solid' : ''} ${className}`}
      style={size === 5 ? style : { width: size, height: size, ...style }}
    />
  )
}
