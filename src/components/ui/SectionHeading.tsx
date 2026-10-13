import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** small lucide icon beside the heading */
  icon?: ReactNode
  /** right-aligned slot (count, ALL, LAST 12) */
  right?: ReactNode
  /** strong gold rule under the heading (library sections) or the quiet 16% rule */
  rule?: 'strong' | 'quiet' | 'none'
  className?: string
}

/** Cinzel 10 px tracking 0.4em bone-dim heading over a gold rule. */
export function SectionHeading({ children, icon, right, rule = 'strong', className = '' }: Props) {
  return (
    <div
      className={`flex items-end justify-between pb-2 ${
        rule === 'strong' ? 'border-b border-[var(--gold-line-strong)]' : rule === 'quiet' ? 'border-b border-[var(--gold-line)]' : ''
      } ${className}`}
    >
      <h2 className="font-display inline-flex items-center gap-2 text-[10px] tracking-[0.4em] text-bone-dim">
        {icon}
        {children}
      </h2>
      {right ? <div className="font-display text-[10px] tracking-[0.3em] text-bone-dim">{right}</div> : null}
    </div>
  )
}

/** One-line empty state in Cormorant italic. */
export function EmptyLine({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`font-body italic text-[15px] text-bone-dim ${className}`}>{children}</p>
}
