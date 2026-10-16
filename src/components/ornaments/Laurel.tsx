type Props = {
  /** rendered width in px; the drawing is 28 x 14 units. Default 56 (so 56 x 28). */
  width?: number
  className?: string
  /** default 0.7 (behind the HISTORY streak value) */
  opacity?: number
}

const LEAVES: ReadonlyArray<readonly [number, number]> = [
  [11.69, 12.27],
  [8.89, 10.87],
  [6.41, 8.99],
  [4.25, 6.63],
  [2.67, 4.24],
]

function Sprig() {
  return (
    <g>
      <path d="M14 13Q6 11 2 3" />
      {LEAVES.map(([cx, cy]) => (
        <ellipse key={cx} cx={cx} cy={cy} rx="2.2" ry="0.9" fill="#B8902E" stroke="none" transform={`rotate(-40 ${cx} ${cy})`} />
      ))}
    </g>
  )
}

/**
 * Laurel, polish-spec 3.3 item 4. Used ONCE in the app: behind the HISTORY STREAK value, 56 x 28 px
 * at opacity 0.7. Two mirrored sprigs in gold-500: stem stroke 0.6, leaves filled (outlined leaves read as chain links at
 * phone size). Decorative.
 *
 *   <span className="relative inline-grid place-items-center">
 *     <Laurel className="absolute" />
 *     <span>12</span>
 *   </span>
 */
export function Laurel({ width = 56, className = '', opacity = 0.7 }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 28 14"
      width={width}
      height={width / 2}
      className={className}
      style={{ opacity }}
      fill="none"
      stroke="#B8902E"
      strokeWidth="0.6"
    >
      <Sprig />
      <g transform="matrix(-1 0 0 1 28 0)">
        <Sprig />
      </g>
    </svg>
  )
}
