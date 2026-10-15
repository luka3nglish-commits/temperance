import type { ReactNode } from 'react'
import { ColumnGlyph } from '../ornaments/ColumnGlyph'

/**
 * SectionHeading, EmptyLine and EmptyState, polish-spec 4.7 and 4.8.
 *
 * SectionHeading: title left (Cinzel 700 12 px 0.12em bone-dim), an optional right slot (a count in
 * Cormorant 600 15 px bone-soft `.num`, or a small control such as a Segmented sm), and 10 px below
 * a rule. `rule` defaults to the quiet `--rule` hairline; `rule="strong"` is the ONE gold lead rule
 * of a screen (`--gold-line-strong`) and ends in a rhombus; `rule="none"` draws nothing. An optional
 * leading icon renders 16 px gold-400 (pass a lucide icon at size 16, stroke 1.5).
 *
 *   <SectionHeading rule="strong" icon={<FolderHeart size={16} strokeWidth={1.5} />}>Favourites</SectionHeading>
 *   <SectionHeading right={meals.length}>Meals</SectionHeading>
 *
 * EmptyLine: a one-line empty inside a section, Cormorant 500 italic 17 px bone-soft.
 *
 * EmptyState: a whole-section empty. A raised bracketed tablet, the column glyph, a sentence in
 * Cormorant 500 italic 18 px bone-soft, and an optional action row (hairline buttons, h 44).
 *
 *   <EmptyState action={<Button variant="hairline" size="sm">New meal</Button>}>Nothing saved yet.</EmptyState>
 */

type Props = {
  children: ReactNode
  /** small lucide icon beside the heading (16 px), drawn gold-400 */
  icon?: ReactNode
  /** right-aligned slot (a count, LAST 12, or a small control) */
  right?: ReactNode
  /** quiet `--rule` hairline (default), the screen's one strong gold rule with a rhombus, or none */
  rule?: 'strong' | 'quiet' | 'none'
  className?: string
  /** heading level, default h2 */
  as?: 'h2' | 'h3'
  id?: string
}

export function SectionHeading({ children, icon, right, rule = 'quiet', className = '', as: H = 'h2', id }: Props) {
  const rightIsText = typeof right === 'string' || typeof right === 'number'
  return (
    <div className={`relative pb-2.5 ${className}`}>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <H id={id} className="label inline-flex items-center gap-2">
          {icon ? <span className="inline-flex text-gold-400">{icon}</span> : null}
          {children}
        </H>
        {right !== undefined && right !== null && right !== false ? (
          rightIsText ? <span className="hint num">{right}</span> : <div className="flex items-center">{right}</div>
        ) : null}
      </div>
      {rule !== 'none' ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: rule === 'strong' ? 'var(--gold-line-strong)' : 'var(--rule)' }}
        >
          {rule === 'strong' ? <span className="rhombus absolute -right-[3px] -bottom-[3px]" /> : null}
        </span>
      ) : null}
    </div>
  )
}

/** One-line empty state in Cormorant 500 italic 17 px bone-soft (never bone-mute). */
export function EmptyLine({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <p data-testid={testId} className={`empty-line ${className}`}>
      {children}
    </p>
  )
}

type EmptyStateProps = {
  /** the sentence, e.g. "Nothing saved yet." */
  children: ReactNode
  /** optional action row under the sentence (hairline buttons, h 44) */
  action?: ReactNode
  /** hide the column glyph */
  noGlyph?: boolean
  className?: string
  testId?: string
}

/** Whole-section empty: a bracketed tablet with the column glyph, a sentence and an optional action. */
export function EmptyState({ children, action, noGlyph, className = '', testId }: EmptyStateProps) {
  return (
    <div data-testid={testId} className={`tablet bracketed flex w-full flex-col items-center px-6 py-7 text-center ${className}`}>
      {noGlyph ? null : <ColumnGlyph className="mb-4" />}
      <p className="font-body text-[18px] font-medium italic leading-[1.35] text-bone-soft">{children}</p>
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  )
}
