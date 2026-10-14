/**
 * BODY · WEIGHT. The latest weigh-in in brushed gold beside two stat stones (7 DAY TREND, TO TARGET),
 * the 90 day chart, the LOG WEIGHT row and the last ten weigh-ins with their change. One weigh-in per
 * local day: logging again today replaces today's. Weights are kg to one decimal and ride in the backup.
 */
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Minus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Button, IconButton, Input, SectionHeading, decimalInputProps, useToast } from '../components/ui'
import type { WeightEntry } from '../lib/types'
import { formatDayLabel } from '../lib/day'
import { parseNumber } from '../lib/units'
import { vibrate } from '../lib/motion'
import { useStore } from '../store/useStore'
import { kgToTarget, latestWeight, weightTrend, weightsByDay, weightsInWindow } from '../store/selectors'
import { HistoryWeightChart, formatKg } from './HistoryWeightChart'

/** Days drawn on the chart. */
export const WEIGHT_WINDOW_DAYS = 90
/** Rows under RECENT WEIGH-INS. */
export const RECENT_WEIGH_INS = 10

export type KgDirection = 'down' | 'up' | 'level'

/** Direction and size of a change in kg, rounded to one decimal. Null in, null out. */
export function kgChange(delta: number | null): { dir: KgDirection; kg: number } | null {
  if (delta === null || !Number.isFinite(delta)) return null
  const r = Math.round(delta * 10) / 10
  if (r === 0) return { dir: 'level', kg: 0 }
  return { dir: r < 0 ? 'down' : 'up', kg: Math.abs(r) }
}

/** The trend stone: `down 0.8 kg`, `up 0.4 kg`, `level`; null until there are two weeks to compare. */
export function trendText(delta: number | null): string | null {
  const c = kgChange(delta)
  if (!c) return null
  return c.dir === 'level' ? 'level' : `${c.dir} ${formatKg(c.kg)} kg`
}

/** A weigh-in row: `0.4 kg down`, `0.2 kg up`, `level`; empty for the first weigh-in there is. */
export function changeText(delta: number | null): string {
  const c = kgChange(delta)
  if (!c) return ''
  return c.dir === 'level' ? 'level' : `${formatKg(c.kg)} kg ${c.dir}`
}

/** `Logged · 84.3 kg`, or `Updated · 84.3 kg` when the day already had a weigh-in. */
export function loggedText(kg: number, replaced: boolean): string {
  return `${replaced ? 'Updated' : 'Logged'} · ${formatKg(kg)} kg`
}

export type RecentWeighIn = { entry: WeightEntry; change: number | null }

/** The last `n` weigh-ins newest first, each with its change from the weigh-in before it (null for the first ever). */
export function recentWeighIns(weights: readonly WeightEntry[], n = RECENT_WEIGH_INS): RecentWeighIn[] {
  const sorted = weightsByDay(weights)
  const out: RecentWeighIn[] = []
  for (let i = sorted.length - 1; i >= 0 && out.length < n; i--) {
    const prev = i > 0 ? sorted[i - 1] : null
    out.push({ entry: sorted[i], change: prev ? Math.round((sorted[i].kg - prev.kg) * 10) / 10 : null })
  }
  return out
}

// ---------- the hero and the stones ----------

/**
 * Stone value: Cinzel 20 px bone, like the ledger's stat stones. One line at 390 px (`DOWN 0.8 kg` is about
 * 160 px in a 216 px stone); allowed to wrap rather than spill on a 320 px phone.
 */
const VALUE = 'font-display inscribed num flex min-w-0 items-center justify-center gap-1.5 text-[20px] leading-[1.1] tracking-[0.02em] text-bone'
/** The unit beside a stone value, lowercase, as the ledger's `kcal`. */
const UNIT = 'normal-case text-[9px] tracking-[0.1em] text-bone-dim'
/** The quiet line a stone shows when it has nothing to say yet. */
const QUIET = 'font-body text-[14px] italic leading-[1.35] text-bone-dim'

function KgValue({ kg }: { kg: number }) {
  return (
    <span className="flex items-baseline gap-1">
      <span>{formatKg(kg)}</span>
      <span className={UNIT}> kg</span>
    </span>
  )
}

type StoneProps = {
  testId: string
  label: string
  children: ReactNode
  className?: string
  attrs?: Record<`data-${string}`, string | number>
}

/** Value over a Cinzel 9 px label. The label comes first in the DOM so it reads first. */
function Stone({ testId, label, children, className = '', attrs }: StoneProps) {
  return (
    <div data-testid={testId} {...attrs} className={`flex min-h-[72px] flex-col-reverse items-center justify-center gap-1.5 px-3 py-3 text-center ${className}`}>
      <dt className="font-display text-[9px] tracking-[0.3em] text-bone-dim">{label}</dt>
      {children}
    </div>
  )
}

function TrendStone({ delta }: { delta: number | null }) {
  const c = kgChange(delta)
  const Icon = c?.dir === 'down' ? TrendingDown : c?.dir === 'up' ? TrendingUp : Minus
  return (
    <Stone testId="tp-weight-trend" label="7 day trend" attrs={{ 'data-delta': delta ?? '', 'data-dir': c?.dir ?? '' }}>
      {c ? (
        <dd className={VALUE}>
          <Icon size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-bone-dim" />
          {c.dir === 'level' ? (
            <span>level</span>
          ) : (
            <span className="flex items-baseline gap-1">
              <span>
                {c.dir} {formatKg(c.kg)}
              </span>
              <span className={UNIT}> kg</span>
            </span>
          )}
        </dd>
      ) : (
        <dd className={QUIET}>No trend yet.</dd>
      )}
    </Stone>
  )
}

function TargetStone({ toTarget, targetKg, className }: { toTarget: number | null; targetKg: number | undefined; className?: string }) {
  const hasTarget = typeof targetKg === 'number' && targetKg > 0
  let label = 'To target'
  let body: ReactNode
  if (!hasTarget) {
    body = <dd className={QUIET}>Set a target in Settings.</dd>
  } else if (toTarget === null) {
    // a target and no weigh-in yet: show the target itself
    label = 'Target'
    body = (
      <dd className={VALUE}>
        <KgValue kg={targetKg} />
      </dd>
    )
  } else if (Math.round(toTarget * 10) === 0) {
    label = 'Target'
    body = <dd className={VALUE}>at target</dd>
  } else {
    label = toTarget > 0 ? 'Above target' : 'Below target'
    body = (
      <dd className={VALUE}>
        <KgValue kg={Math.abs(toTarget)} />
      </dd>
    )
  }
  return (
    <Stone testId="tp-weight-target" label={label} className={className} attrs={{ 'data-kg': toTarget ?? '' }}>
      {body}
    </Stone>
  )
}

/** The latest weigh-in: Cinzel 700 36 px brushed gold, `kg` in Cinzel 12 px gold-400, its day under it. */
function WeightHero({ latest, today }: { latest: WeightEntry | null; today: string }) {
  if (!latest) {
    return (
      <p data-testid="tp-weight-latest" className="max-w-[132px] font-body text-[17px] italic leading-[1.35] text-bone-dim">
        No weigh-ins yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p data-testid="tp-weight-latest" data-kg={latest.kg} className="flex items-baseline gap-1.5 whitespace-nowrap">
        {/* gradient text: no inscription shadow on it (spec section 3) */}
        <span className="font-display gold-text text-[36px] font-bold leading-none tracking-[-0.01em]">{formatKg(latest.kg)}</span>{' '}
        <span className="font-display inscribed normal-case text-[12px] tracking-[0.1em] text-gold-400">kg</span>
      </p>
      <span className="font-display text-[10px] tracking-[0.28em] text-bone-dim">{formatDayLabel(latest.day, today)}</span>
    </div>
  )
}

// ---------- the rows ----------

function WeighInRow({ item, today, onDelete }: { item: RecentWeighIn; today: string; onDelete(w: WeightEntry): void }) {
  const { entry, change } = item
  const label = formatDayLabel(entry.day, today)
  const text = changeText(change)
  return (
    <li
      data-testid={`tp-weight-row-${entry.id}`}
      data-day={entry.day}
      data-kg={entry.kg}
      className="flex min-h-[52px] items-center gap-3 border-b border-[var(--gold-line)]"
    >
      {/* 96 px: MON 12 OCT and YESTERDAY run about 90 px at 10 px with 0.28em tracking */}
      <span className={`font-display w-[96px] shrink-0 whitespace-nowrap text-[10px] tracking-[0.28em] ${entry.day === today ? 'text-gold-300' : 'text-bone-dim'}`}>{label}</span>
      <span className="flex min-w-0 flex-1 items-baseline gap-3">
        <span className="font-display inscribed num whitespace-nowrap text-[16px] tracking-[0.02em] text-gold-400">
          {formatKg(entry.kg)}
          <span className="normal-case text-[11px]"> kg</span>
        </span>
        {text ? <span className="num truncate font-body text-[13px] text-bone-dim">{text}</span> : null}
      </span>
      <IconButton
        label={`Delete weigh-in, ${label}`}
        data-testid={`tp-weight-delete-${entry.id}`}
        onClick={() => onDelete(entry)}
        className="-mr-2 shrink-0"
      >
        <Trash2 size={18} strokeWidth={1.5} />
      </IconButton>
    </li>
  )
}

// ---------- the section ----------

export function HistoryWeight({ today }: { today: string }) {
  const weights = useStore((s) => s.weights)
  const targetKg = useStore((s) => s.settings.targetWeightKg)
  const addWeight = useStore((s) => s.addWeight)
  const deleteWeight = useStore((s) => s.deleteWeight)
  const toast = useToast((s) => s.show)

  const latest = useMemo(() => latestWeight(weights), [weights])
  const trend = useMemo(() => weightTrend(weights, today), [weights, today])
  const windowed = useMemo(() => weightsInWindow(weights, today, WEIGHT_WINDOW_DAYS), [weights, today])
  const recent = useMemo(() => recentWeighIns(weights), [weights])
  const toTarget = kgToTarget(latest, targetKg)

  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // the store write is synchronous; the hero, stones, chart and rows update on it
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const kg = parseNumber(draft)
    const replaced = useStore.getState().weights.some((w) => w.day === today)
    const entry = kg === null ? null : addWeight(kg, today)
    if (!entry) {
      input.current?.focus()
      return
    }
    toast({ text: loggedText(entry.kg, replaced) })
    setDraft('')
    vibrate(8)
    input.current?.blur()
  }

  const remove = (w: WeightEntry) => {
    deleteWeight(w.id)
    toast({
      text: `Removed · ${formatKg(w.kg)} kg`,
      action: {
        label: 'Undo',
        icon: 'undo',
        onClick: () => {
          const s = useStore.getState()
          const back = s.addWeight(w.kg, w.day, w.at)
          if (back && w.note) s.updateWeight(back.id, { note: w.note })
        },
      },
    })
  }

  return (
    <section aria-label="Weight">
      <div className="rise-in rise-in-1">
        <SectionHeading rule="strong">Weight</SectionHeading>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 pt-4">
          <WeightHero latest={latest} today={today} />
          <dl className="rounded-[4px] bg-obsidian-900" style={{ boxShadow: '0 0 0 1px var(--bone-08)' }}>
            <TrendStone delta={trend.delta} />
            <TargetStone toTarget={toTarget} targetKg={targetKg} className="border-t border-[var(--bone-08)]" />
          </dl>
        </div>
      </div>

      <div className="rise-in rise-in-2 pt-5">
        <HistoryWeightChart weights={windowed} today={today} targetKg={targetKg} />
      </div>

      <form className="rise-in rise-in-3 flex items-center gap-3 pt-5" onSubmit={submit} noValidate>
        <Input
          ref={input}
          {...decimalInputProps}
          data-testid="tp-weight-input"
          aria-label="Weight in kilograms"
          enterKeyHint="done"
          suffix="kg"
          placeholder={latest ? formatKg(latest.kg) : '80.0'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="gold" data-testid="tp-weight-log" className="shrink-0">
          Log weight
        </Button>
      </form>

      {recent.length ? (
        <div className="rise-in rise-in-3 pt-6">
          <SectionHeading rule="strong" right={weights.length > RECENT_WEIGH_INS ? `Last ${RECENT_WEIGH_INS}` : undefined}>
            Recent weigh-ins
          </SectionHeading>
          <ul>
            {recent.map((item) => (
              <WeighInRow key={item.entry.id} item={item} today={today} onDelete={remove} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
