import { useEffect, useState } from 'react'
import { Button, Segmented, Toggle, useToast } from '../components/ui'
import type { EnergyUnit, HeroFigure, MacroTargets, MotionPref, OpeningPref } from '../lib/types'
import { fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { requestTiltPermission } from '../lib/tilt'
import { useStore } from '../store/useStore'
import { SettingsNote, SettingsRow, SmallInput } from './SettingsRow'
import { SettingsData } from './SettingsData'
import { SettingsFooter } from './SettingsFooter'
import { SettingsSafeMode } from './SettingsSafeMode'

const UNIT_OPTIONS = [
  { value: 'kcal', label: 'kcal' },
  { value: 'kJ', label: 'kJ' },
] as const satisfies readonly { value: EnergyUnit; label: string }[]

const HERO_OPTIONS = [
  { value: 'remaining', label: 'Remaining' },
  { value: 'eaten', label: 'Eaten' },
] as const satisfies readonly { value: HeroFigure; label: string }[]

/** LOCKED mapping (spec section 13): SYSTEM = 'system', REDUCED = 'on' (forces reduced), FULL = 'off' (forces full). */
const MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'Reduced' },
  { value: 'off', label: 'Full' },
] as const satisfies readonly { value: MotionPref; label: string }[]

const OPENING_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'full', label: 'Full daily' },
  { value: 'off', label: 'Off' },
] as const satisfies readonly { value: OpeningPref; label: string }[]

const MACRO_KEYS = ['protein', 'carbs', 'fat'] as const
const MACRO_LETTER: Record<keyof MacroTargets, string> = { protein: 'P', carbs: 'C', fat: 'F' }

/** The store keeps weights above 0 and under 500 kg; anything else it would drop. */
const MAX_KG = 500

/** The TARGET WEIGHT field for a stored target: kg to one decimal (`82.5`, `80.0`), empty when there is none. */
export function weightDraftFor(kg: number | undefined): string {
  return typeof kg === 'number' && Number.isFinite(kg) && kg > 0 ? kg.toFixed(1) : ''
}

export type TargetWeightCommit = { kind: 'clear' } | { kind: 'set'; kg: number } | { kind: 'keep' }

/**
 * What a committed TARGET WEIGHT draft means: empty clears the target, a weight the store accepts
 * sets it (to one decimal), anything else (0, 800, letters) keeps the stored target as it was.
 */
export function parseTargetWeight(draft: string): TargetWeightCommit {
  if (draft.trim() === '') return { kind: 'clear' }
  const n = parseNumber(draft)
  if (n === null) return { kind: 'keep' }
  const kg = Math.round(n * 10) / 10
  if (!(kg > 0) || kg >= MAX_KG) return { kind: 'keep' }
  return { kind: 'set', kg }
}

/**
 * SETTINGS. A quiet column of 56 px rows ruled with --gold-line, in the order of spec section 13
 * (TARGET WEIGHT sits under MACRO TARGETS), then the data rows (export, import, erase) and the
 * footer. Entrance stagger on mount only.
 */
export function SettingsScreen() {
  const settings = useStore((s) => s.settings)
  const setGoalKcal = useStore((s) => s.setGoalKcal)
  const setTargets = useStore((s) => s.setTargets)
  const setTargetWeight = useStore((s) => s.setTargetWeight)
  const setUnit = useStore((s) => s.setUnit)
  const setHero = useStore((s) => s.setHero)
  const setTilt = useStore((s) => s.setTilt)
  const setMotion = useStore((s) => s.setMotion)
  const setOpening = useStore((s) => s.setOpening)
  const resetIntro = useStore((s) => s.resetIntro)
  const toast = useToast((s) => s.show)

  const { goalKcal, targets, unit } = settings

  // DAILY GOAL: a draft in the display unit, re-seeded when the stored goal or the unit changes
  const seedGoal = () => String(Math.round(toDisplayEnergy(goalKcal, unit)))
  const [goalDraft, setGoalDraft] = useState(seedGoal)
  useEffect(() => {
    setGoalDraft(String(Math.round(toDisplayEnergy(goalKcal, unit))))
  }, [goalKcal, unit])
  const commitGoal = () => {
    const n = parseNumber(goalDraft)
    if (n !== null && n > 0) setGoalKcal(fromInputEnergy(n, unit))
    else setGoalDraft(seedGoal())
  }

  // MACRO TARGETS: three drafts, each committed on its own; 0 is allowed and hides that ghost arc
  const [targetDraft, setTargetDraft] = useState<Record<keyof MacroTargets, string>>({
    protein: String(targets.protein),
    carbs: String(targets.carbs),
    fat: String(targets.fat),
  })
  useEffect(() => {
    setTargetDraft({ protein: String(targets.protein), carbs: String(targets.carbs), fat: String(targets.fat) })
  }, [targets.protein, targets.carbs, targets.fat])
  const commitTarget = (k: keyof MacroTargets) => {
    const n = parseNumber(targetDraft[k])
    if (n !== null) setTargets({ [k]: Math.round(n) })
    else setTargetDraft((d) => ({ ...d, [k]: String(targets[k]) }))
  }

  // TARGET WEIGHT: kg to one decimal; an empty field clears it
  const targetWeightKg = settings.targetWeightKg
  const [weightDraft, setWeightDraft] = useState(() => weightDraftFor(targetWeightKg))
  useEffect(() => {
    setWeightDraft(weightDraftFor(targetWeightKg))
  }, [targetWeightKg])
  const commitWeight = () => {
    const next = parseTargetWeight(weightDraft)
    if (next.kind === 'clear') setTargetWeight(null)
    else if (next.kind === 'set') setTargetWeight(next.kg)
    // re-seed from the store: the effect above does not run when the stored value did not change
    setWeightDraft(weightDraftFor(useStore.getState().settings.targetWeightKg))
  }

  const onTilt = (on: boolean) => {
    if (!on) {
      setTilt(false)
      return
    }
    // the permission request must start inside the tap (iOS); the answer lands when it lands
    const ask = requestTiltPermission()
    void ask.then((granted) => {
      setTilt(granted)
      if (!granted) toast({ text: 'Motion access was not allowed.', tone: 'warn' })
    })
  }

  const replayOpening = () => {
    resetIntro()
    toast({ text: 'The opening will play next launch.' })
  }

  return (
    <section data-testid="tp-settings" aria-label="Settings" className="px-5 pb-6">
      <header className="rise-in sticky top-0 z-10 -mx-5 flex h-14 items-center justify-center bg-obsidian-950/95 px-5 backdrop-blur-[20px]" style={{ marginTop: 'var(--safe-top)' }}>
        <h1 className="font-display inscribed text-[14px] tracking-[0.35em] text-bone">Settings</h1>
      </header>

      <SettingsSafeMode />

      <div className="rise-in rise-in-1">
        <SettingsRow label="Daily goal" htmlFor="set-goal">
          <SmallInput
            id="set-goal"
            testId="tp-settings-goal"
            label={`Daily goal in ${unitLabel(unit)}`}
            value={goalDraft}
            onChange={setGoalDraft}
            onCommit={commitGoal}
            suffix={unitLabel(unit)}
            width={132}
          />
        </SettingsRow>

        <SettingsRow label="Macro targets">
          <div role="group" aria-label="Macro targets in grams" className="flex items-center gap-1.5">
            {MACRO_KEYS.map((k) => (
              <SmallInput
                key={k}
                id={`set-target-${k}`}
                testId={`tp-settings-target-${k}`}
                label={`${k} target in grams`}
                value={targetDraft[k]}
                onChange={(v) => setTargetDraft((d) => ({ ...d, [k]: v }))}
                onCommit={() => commitTarget(k)}
                prefix={MACRO_LETTER[k]}
                width={68}
              />
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label="Target weight" htmlFor="set-target-weight">
          <SmallInput
            id="set-target-weight"
            testId="tp-settings-target-weight"
            label="Target weight in kilograms"
            value={weightDraft}
            onChange={setWeightDraft}
            onCommit={commitWeight}
            suffix="kg"
            width={112}
            inputMode="decimal"
          />
        </SettingsRow>

        <SettingsRow label="Units">
          <span data-testid="tp-settings-unit" className="contents">
            <Segmented size="md" label="Energy unit" value={unit} options={UNIT_OPTIONS} onChange={setUnit} />
          </span>
        </SettingsRow>

        <SettingsRow label="Hero figure">
          <span data-testid="tp-settings-hero" className="contents">
            <Segmented size="md" label="Hero figure" value={settings.hero} options={HERO_OPTIONS} onChange={setHero} />
          </span>
        </SettingsRow>
      </div>

      <div className="rise-in rise-in-2">
        <SettingsRow label="Gold follows tilt">
          <span data-testid="tp-settings-tilt" className="contents">
            <Toggle label="Gold follows tilt" hideLabel checked={settings.tilt} onChange={onTilt} />
          </span>
        </SettingsRow>

        <SettingsRow label="Motion">
          <span data-testid="tp-settings-motion" className="contents">
            <Segmented size="md" label="Motion" value={settings.motion} options={MOTION_OPTIONS} onChange={setMotion} />
          </span>
        </SettingsRow>

        <SettingsRow label="Opening">
          <span data-testid="tp-settings-opening" className="contents">
            <Segmented size="md" label="Opening" value={settings.opening} options={OPENING_OPTIONS} onChange={setOpening} />
          </span>
        </SettingsRow>

        <SettingsRow label="Replay opening">
          <Button variant="hairline" size="sm" data-testid="tp-settings-replay" onClick={replayOpening}>
            Replay
          </Button>
        </SettingsRow>

        <SettingsRow label="Days">
          <SettingsNote>Days reset at local midnight.</SettingsNote>
        </SettingsRow>
      </div>

      <div className="rise-in rise-in-3">
        <SettingsData />
      </div>

      <div className="rise-in rise-in-4">
        <SettingsFooter />
      </div>
    </section>
  )
}
