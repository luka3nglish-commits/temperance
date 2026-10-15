import type { ReactNode } from 'react'

/**
 * StatStones, polish-spec 4.10: one bracketed raised tablet split into equal cells (three on
 * HISTORY), 96 px tall. Cell dividers 1 px rgba(231,225,210,0.10) inset 16 px vertically. Each cell
 * is a 40 px value row (values share a baseline) and a one-line caption 8 px under it.
 * Value Cinzel 700 24 px bone (gold-300 when `highlight`), unit Cormorant 500 15 px bone-soft,
 * caption Cinzel 700 12 px 0.1em bone-dim. `ornament` is drawn centred behind the value (the laurel).
 * An empty value shows a bone-mute middle dot.
 *
 *   <StatStones>
 *     <StatStone caption="Avg 7 days" value="2 015" unit="kcal" highlight testId="tp-stat-avg" />
 *     <StatStone caption="Under" value="7 of 7" testId="tp-stat-under" />
 *     <StatStone caption="Streak" value="12" ornament={<Laurel />} testId="tp-stat-streak" />
 *   </StatStones>
 */

type StoneProps = {
  caption: ReactNode
  /** the figure; null or '' draws a bone-mute middle dot */
  value: ReactNode
  /** lowercase unit after the figure */
  unit?: string
  /** gold-300 value (the screen's focal stone) */
  highlight?: boolean
  /** drawn centred behind the value (the laurel on STREAK) */
  ornament?: ReactNode
  testId?: string
  className?: string
  /** extra data attributes go on the cell */
  data?: Record<`data-${string}`, string | number | undefined>
}

export function StatStone({ caption, value, unit, highlight, ornament, testId, className = '', data }: StoneProps) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div data-testid={testId} {...data} className={`stat-stone relative grid min-w-0 grid-rows-[40px_auto] items-end justify-items-center px-1 text-center ${className}`}>
      <dt className="label row-start-2 mt-2 max-w-full truncate tracking-[0.1em]">{caption}</dt>
      <dd className="relative row-start-1 flex items-baseline justify-center whitespace-nowrap">
        {ornament ? <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{ornament}</span> : null}
        {empty ? (
          <span className="font-display relative text-[24px] font-bold leading-none text-bone-mute">·</span>
        ) : (
          <>
            <span className={`font-display num relative text-[24px] font-bold leading-[1.1] tracking-[0.02em] ${highlight ? 'text-gold-300' : 'text-bone'}`}>{value}</span>
            {unit ? <span className="unit relative">{' '}{unit}</span> : null}
          </>
        )}
      </dd>
    </div>
  )
}

/** The row: one bracketed tablet, equal cells, hairline dividers inset 16 px. */
export function StatStones({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <dl
      data-testid={testId}
      className={`tablet bracketed grid h-24 auto-cols-fr grid-flow-col content-center [&>.stat-stone+.stat-stone]:before:absolute [&>.stat-stone+.stat-stone]:before:inset-y-4 [&>.stat-stone+.stat-stone]:before:left-0 [&>.stat-stone+.stat-stone]:before:w-px [&>.stat-stone+.stat-stone]:before:bg-[rgba(231,225,210,0.10)] [&>.stat-stone+.stat-stone]:before:content-[''] ${className}`}
    >
      {children}
    </dl>
  )
}
