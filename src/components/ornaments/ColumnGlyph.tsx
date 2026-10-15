type Props = {
  className?: string
  /** rendered width in px; height follows the 40 x 48 drawing. Default 40. */
  width?: number
}

/**
 * Column glyph for empty states, polish-spec 3.3 item 6: a fluted column on a two-step base,
 * gold-600 stroke 1, no fill, 40 x 48 px. EmptyState draws it; use it alone only for a custom empty.
 */
export function ColumnGlyph({ className = '', width = 40 }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 40 48"
      width={width}
      height={(width * 48) / 40}
      className={className}
      fill="none"
      stroke="#9C7B33"
      strokeWidth="1"
    >
      <rect x="4" y="6" width="32" height="3" />
      <rect x="10" y="9" width="20" height="30" />
      <path d="M15 10V38M20 10V38M25 10V38" />
      <rect x="6" y="39" width="28" height="3" />
      <rect x="2" y="42" width="36" height="3" />
    </svg>
  )
}
