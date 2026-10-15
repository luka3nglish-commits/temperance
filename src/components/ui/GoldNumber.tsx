import type { CSSProperties } from 'react'
import { formatInt } from '../../lib/units'

/**
 * GoldNumber and ValueUnit, polish-spec 3.2 and 4.11.
 *
 * GoldNumber: the hero foil. Cinzel 700 with fixed digit cells (no jitter while counting), three
 * layers, no filters: a 1 px chisel shadow below, a 1 px light lip above (`.gold-hi`, high tier
 * only) and the face in `--gold-grad-text` (darkest stop #B8902E) with the brushed-metal layer on
 * top. `brush={false}` drops the brush (the 44 px weight hero). `ember` swaps to the ember gradient
 * (over the line). Thousands grouped with a thin-space cell. Gold gradient text only at 32 px and up.
 *
 *   <GoldNumber value={1272} size={96} />
 *   <GoldNumber value={84.1} size={44} brush={false} />   (pass a string via `text` for decimals)
 *
 * ValueUnit: any number with its unit in a row or a stone. Number Cinzel 700 (bone, or gold-300 with
 * tone="gold"), a thin space, then the unit in Cormorant 500 lowercase bone-soft at 60 percent of the
 * figure, never under 15 px. Tabular, nowrap. The unit is outside the Cinzel span so it stays lowercase.
 *
 *   <ValueUnit value={175} unit="kcal" />                  16 px bone
 *   <ValueUnit value="2 015" unit="kcal" size={24} tone="gold" />
 */

type Props = {
  value: number
  /** draw this text instead of the grouped integer (e.g. "84.1") */
  text?: string
  /** ember gradient (over the line) */
  ember?: boolean
  /** brushed metal layer (hero number only); false for the weight hero. Default true. */
  brush?: boolean
  /** Cinzel size: px number or any CSS length expression (min(), clamp()), default 96 */
  size?: number | string
  className?: string
  /** aria label, defaults to the plain number */
  label?: string
}

export function GoldNumber({ value, text: textProp, ember, brush = true, size = 96, className = '', label }: Props) {
  const text = textProp ?? formatInt(Math.abs(Math.round(value)))
  const cells = text.split('').map((ch, i) => (
    <span key={i} className={ch === ' ' || ch === ' ' ? 'sep' : ch === '.' || ch === ',' ? 'dot' : undefined}>
      {ch}
    </span>
  ))
  return (
    <span
      className={`gold-num font-display font-bold leading-[1.08] tracking-[-0.01em] ${ember ? 'ember' : ''} ${brush ? '' : 'no-brush'} ${className}`}
      style={{ fontSize: size }}
      role="text"
      aria-label={label ?? text.replace(/[  ]/g, '')}
    >
      <span className="gold-shadow digits" aria-hidden="true">
        {cells}
      </span>
      <span className="gold-hi digits" aria-hidden="true">
        {cells}
      </span>
      <span className="gold-face digits" aria-hidden="true">
        {cells}
      </span>
    </span>
  )
}

type ValueUnitProps = {
  /** a number (grouped with a thin space) or preformatted text */
  value: number | string
  /** lowercase unit: kcal, kJ, g, ml, kg; omit for a bare number */
  unit?: string
  /** figure size in px, default 16 (row kcal); 17 week list, 22 to 24 stones */
  size?: number
  /** bone (data) or gold-300 (the marked row, a focal value) */
  tone?: 'bone' | 'gold' | 'dim'
  className?: string
  /** unit size override in px (default max(15, round(size * 0.6))) */
  unitSize?: number
  /** letter-spacing of the figure, default 0.02em */
  tracking?: string
  testId?: string
  /** spoken form, e.g. "175 kilocalories"; defaults to the visible text */
  label?: string
  style?: CSSProperties
}

const TONE = { bone: 'text-bone', gold: 'text-gold-300', dim: 'text-bone-dim' } as const

export function ValueUnit({ value, unit, size = 16, tone = 'bone', className = '', unitSize, tracking = '0.02em', testId, label, style }: ValueUnitProps) {
  const figure = typeof value === 'number' ? formatInt(Math.round(value)) : value
  const u = unitSize ?? Math.max(15, Math.round(size * 0.6))
  return (
    <span
      data-testid={testId}
      aria-label={label}
      className={`num inline-flex items-baseline whitespace-nowrap ${className}`}
      style={style}
    >
      <span className={`font-display font-bold leading-none ${TONE[tone]}`} style={{ fontSize: size, letterSpacing: tracking }}>
        {figure}
      </span>
      {unit ? (
        <span className="unit" style={{ fontSize: u }}>
          {' '}
          {unit}
        </span>
      ) : null}
    </span>
  )
}
