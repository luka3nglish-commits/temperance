/**
 * BODY · WEIGHT (polish-spec 6.5). A bracketed stone tablet: the latest weigh-in in gold foil beside two
 * stones (7 DAY TREND, TO TARGET); the 90 day chart; the LOG WEIGHT row; the last ten weigh-ins with
 * their change. Before the first weigh-in: one empty-state tablet, then the input row. One weigh-in per
 * local day: logging again today replaces today's. Weights are kg to one decimal and ride in the backup.
 */
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Minus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Button, EmptyState, GoldNumber, IconButton, Input, SectionHeading, Tablet, ValueUnit, decimalInputProps, useStaggerOnce, useToast } from '../components/ui'
import { Rhombus } from '../components/ornaments'
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

/** A weigh-in row (the kg sits on the value beside it): `0.4 down`, `0.2 up`, `level`; empty for the first weigh-in. */
export function changeText(delta: number | null): string {
  const c = kgChange(delta)
  if (!c) return ''
  return c.dir === 'level' ? 'level' : `${formatKg(c.kg)} ${c.dir}`
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

// ---------- the panel: the hero and two stones ----------

/**
 * Stone value: Cinzel 700 22 px bone (polish-spec 6.5), the unit lowercase Cormorant beside it. It eases
 * down to 18 px on a 360 px phone so `DOWN 0.9 kg` stays inside the tablet.
 */
const VALUE = 'font-display num flex min-w-0 items-baseline gap-1.5 whitespace-nowrap text-[clamp(18px,5.4vw,22px)] font-bold leading-[1.1] tracking-[0.02em] text-bone'
/** What a stone says when it has nothing to say yet. */
const QUIET = 'hint leading-[1.3]'

type StoneProps = {
  testId: string
  label: string
  /** a 14 px icon before the caption (the trend direction) */
  icon?: ReactNode
  children: ReactNode
  className?: string
  attrs?: Record<`data-${string}`, string | number>
}

/** Value over its caption (Cinzel 700 12 px 0.1em). The caption comes first in the DOM so it reads first. */
function Stone({ testId, label, icon, children, className = '', attrs }: StoneProps) {
  return (
    <div data-testid={testId} {...attrs} className={`flex min-h-[64px] min-w-0 flex-col-reverse justify-center gap-2 py-2 ${className}`}>
      <dt className="label flex min-w-0 items-center gap-1.5 tracking-[0.1em]">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      {children}
    </div>
  )
}

function TrendStone({ delta }: { delta: number | null }) {
  const c = kgChange(delta)
  const Icon = c?.dir === 'down' ? TrendingDown : c?.dir === 'up' ? TrendingUp : Minus
  return (
    <Stone
      testId="tp-weight-trend"
      label="7 day trend"
      icon={c ? <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-gold-400" /> : undefined}
      attrs={{ 'data-delta': delta ?? '', 'data-dir': c?.dir ?? '' }}
    >
      {c ? (
        <dd className={VALUE}>
          {c.dir === 'level' ? (
            <span className="uppercase">level</span>
          ) : (
            <span className="flex items-baseline uppercase">
              {c.dir} {formatKg(c.kg)}
              <span className="unit ml-1">kg</span>
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
    label = 'Target'
    body = (
      <dd className={VALUE}>
        {formatKg(targetKg)}
        <span className="unit">{' '}kg</span>
      </dd>
    )
  } else if (Math.round(toTarget * 10) === 0) {
    label = 'Target'
    body = <dd className={`${VALUE} uppercase`}>at target</dd>
  } else {
    label = toTarget > 0 ? 'Above target' : 'Below target'
    body = (
      <dd className={VALUE}>
        {formatKg(Math.abs(toTarget))}
        <span className="unit">{' '}kg</span>
      </dd>
    )
  }
  return (
    <Stone testId="tp-weight-target" label={label} className={className} attrs={{ 'data-kg': toTarget ?? '' }}>
      {body}
    </Stone>
  )
}

/** The latest weigh-in: Cinzel 700 44 px gold foil (no brush), `kg` in Cormorant 22 px, its day under it. */
function WeightHero({ latest, today }: { latest: WeightEntry; today: string }) {
  const kg = formatKg(latest.kg)
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <p data-testid="tp-weight-latest" data-kg={latest.kg} aria-label={`${kg} kg`} className="flex items-baseline whitespace-nowrap">
        <GoldNumber value={latest.kg} text={kg} size={44} brush={false} label={`${kg} kilograms`} />
        <span className="unit ml-1.5" style={{ fontSize: 22 }}>
          kg
        </span>
      </p>
      <span className={`label ${latest.day === today ? 'text-gold-300' : ''}`}>{formatDayLabel(latest.day, today)}</span>
    </div>
  )
}

// ---------- the rows ----------

function WeighInRow({ item, today, onDelete }: { item: RecentWeighIn; today: string; onDelete(w: WeightEntry): void }) {
  const { entry, change } = item
  const label = formatDayLabel(entry.day, today)
  const text = changeText(change)
  const isToday = entry.day === today
  return (
    <li
      data-testid={`tp-weight-row-${entry.id}`}
      data-day={entry.day}
      data-kg={entry.kg}
      className="row-rule grid h-14 grid-cols-[14px_minmax(0,1fr)_auto_auto_44px] items-center"
    >
      <span className="flex items-center">{isToday ? <Rhombus solid /> : null}</span>
      <span className={`font-display num truncate text-[12px] font-bold uppercase leading-none tracking-[0.08em] ${isToday ? 'text-gold-300' : 'text-bone-dim'}`}>{label}</span>
      <ValueUnit value={formatKg(entry.kg)} unit="kg" tone={isToday ? 'gold' : 'bone'} />
      <span className="meta min-w-[76px] whitespace-nowrap pl-3 text-right">{text}</span>
      <IconButton
        label={`Delete weigh-in, ${label}`}
        data-testid={`tp-weight-delete-${entry.id}`}
        onClick={() => onDelete(entry)}
        className="text-bone-mute active:text-ember-text"
      >
        <Trash2 size={20} strokeWidth={1.5} />
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
  const stagger = useStaggerOnce('history-weigh-ins')

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
        onClick: () => useStore.getState().restoreWeight(w),
      },
    })
  }

  return (
    <section aria-label="Weight">
      <SectionHeading rule="strong">Weight</SectionHeading>

      {latest ? (
        <>
          <Tablet bracketed className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 !p-[18px]">
            <WeightHero latest={latest} today={today} />
            <dl className="min-w-0 border-l border-[rgba(231,225,210,0.10)] pl-4">
              <TrendStone delta={trend.delta} />
              <TargetStone toTarget={toTarget} targetKg={targetKg} className="border-t border-[var(--rule)]" />
            </dl>
          </Tablet>
          <div className="pt-6">
            <HistoryWeightChart weights={windowed} today={today} targetKg={targetKg} />
          </div>
        </>
      ) : (
        <EmptyState testId="tp-weight-latest" className="mt-4">
          No weigh-ins yet.
        </EmptyState>
      )}

      <form className="grid grid-cols-2 gap-3 pt-6" onSubmit={submit} noValidate>
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
          className="min-w-0"
        />
        <Button type="submit" variant="gold" full data-testid="tp-weight-log" className="!px-2">
          Log weight
        </Button>
      </form>

      {recent.length ? (
        <div className="pt-8">
          <SectionHeading right={weights.length > RECENT_WEIGH_INS ? `Last ${RECENT_WEIGH_INS}` : undefined}>Recent weigh-ins</SectionHeading>
          <ul className={stagger}>
            {recent.map((item) => (
              <WeighInRow key={item.entry.id} item={item} today={today} onDelete={remove} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
