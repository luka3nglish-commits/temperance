import type { HTMLAttributes, ReactNode } from 'react'

/**
 * Tablet, polish-spec 3.1 and 4.9: the stone panel.
 * - default: raised (`.tablet`), it informs. Gradient #17171E to #0D0D12, a 1 px #2A2A33 edge, a light
 *   top lip and a soft drop shadow (raised is only 1.14:1 against the page, so the edge and shadow
 *   carry it). Grain on the high tier.
 * - `inset`: carved (`.tablet-inset`), for a well that holds controls.
 * - `bracketed`: gold corner brackets (`lg` for the photo viewer frame).
 * Padding 16 px 18 px unless `flush`. Divide internal rows with `border-[var(--rule)]` or `.row-rule`.
 *
 *   <Tablet as="section" bracketed aria-labelledby="goals">...</Tablet>
 */

type TabletTag = 'div' | 'section' | 'article' | 'aside' | 'li' | 'ul' | 'ol' | 'dl' | 'form' | 'figure' | 'header' | 'footer'

type Props = HTMLAttributes<HTMLElement> & {
  as?: TabletTag
  inset?: boolean
  bracketed?: boolean
  /** larger 14 px brackets */
  lg?: boolean
  /** no padding (the caller lays out its own rows) */
  flush?: boolean
  testId?: string
  children?: ReactNode
}

export function Tablet({ as = 'div', inset, bracketed, lg, flush, testId, className = '', children, ...rest }: Props) {
  const As = as as 'div'
  return (
    <As
      data-testid={testId}
      className={`${inset ? 'tablet-inset' : 'tablet'} ${bracketed ? 'bracketed' : ''} ${bracketed && lg ? 'lg' : ''} ${flush ? '' : 'px-[18px] py-4'} ${className}`}
      {...rest}
    >
      {children}
    </As>
  )
}
