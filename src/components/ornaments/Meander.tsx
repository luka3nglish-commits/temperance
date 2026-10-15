import type { CSSProperties } from 'react'

type Props = {
  /** px width; the pattern tiles 12 x 6 and fades out at both ends. Default 96. */
  width?: number
  /** left, centre or right in its line box. Default centre. */
  align?: 'left' | 'center' | 'right'
  className?: string
  style?: CSSProperties
}

/**
 * Meander (Greek key), polish-spec 3.3 item 1. A 6 px band of the `.meander` tile in gold-400 at
 * opacity 0.55, masked to fade at both ends. Decorative (aria-hidden).
 *
 * Uses: 96 px centred 14 px above the stoic line; 72 px left-aligned 8 px under every sheet title
 * (the Sheet draws that one itself); 120 px centred above the settings footer.
 *
 *   <Meander width={96} />            centred
 *   <Meander width={72} align="left" />
 */
export function Meander({ width = 96, align = 'center', className = '', style }: Props) {
  const margin = align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0'
  return <span aria-hidden="true" className={`meander ${className}`} style={{ width, margin, ...style }} />
}
