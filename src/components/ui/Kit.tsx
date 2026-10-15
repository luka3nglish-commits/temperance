import { useState } from 'react'
import { RotateCcw, SquarePlus, Upload, X } from 'lucide-react'
import { Button, IconButton } from './Button'
import { Field, decimalInputProps } from './Field'
import { Segmented } from './Segmented'
import { PortionField, PortionPicks } from './PortionField'
import { Toggle } from './Toggle'
import { SectionHeading, EmptyLine, EmptyState } from './SectionHeading'
import { Tablet } from './Tablet'
import { StatStones, StatStone } from './StatStone'
import { Chip, ChipRow } from './Chip'
import { GoldNumber, ValueUnit } from './GoldNumber'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Meander, Rhombus, Laurel } from '../ornaments'
import type { AmountUnit } from '../../lib/types'

/**
 * DEV ONLY: every primitive in every state on one scrolling page, for the screen agents and the
 * visual tour. Open http://127.0.0.1:<port>/temperance/#kit on the dev server. App.tsx mounts it only
 * when `import.meta.env.DEV` and the hash is #kit, so it never ships.
 */
export default function Kit() {
  const [basis, setBasis] = useState<AmountUnit>('g')
  const [amount, setAmount] = useState(180)
  const [serves, setServes] = useState(1.5)
  const [preview, setPreview] = useState<number | null>(null)
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const [mode, setMode] = useState<'quick' | 'build'>('quick')
  const [armed, setArmed] = useState(false)
  const [sheet, setSheet] = useState(false)
  const kcal = Math.round((97 * (preview ?? amount)) / 100)

  return (
    <div className="relative z-[var(--z-inscriptions)] h-full overflow-y-auto px-5 pt-[calc(var(--safe-top)+24px)] pb-40 scrollbar-none" data-testid="tp-kit">
      <h1 className="title-screen mb-2">The kit</h1>
      <Meander width={120} align="left" className="mb-8" />

      <SectionHeading rule="strong">Portion</SectionHeading>
      <div className="mt-4 mb-2 flex h-5 items-baseline justify-between">
        <span className="label">Portion</span>
        <span className="inline-flex items-baseline">
          <ValueUnit value={kcal} unit="kcal" tone="gold" />
          <span className="hint">&nbsp;· P 16</span>
        </span>
      </div>
      <PortionField testId="kit-portion" unit={basis} value={amount} onChange={setAmount} onPreview={setPreview} />
      <PortionPicks testId="kit-portion" unit={basis} value={amount} usual={180} onChange={setAmount} />
      <div className="mt-4">
        <Segmented<AmountUnit>
          label="Basis"
          size="lg"
          value={basis}
          onChange={(v) => {
            setBasis(v)
            setAmount(v === 'serve' ? 1 : v === 'g' ? 100 : 250)
          }}
          options={[
            { value: 'serve', label: 'Per serve' },
            { value: 'g', label: 'Per 100 g' },
            { value: 'ml', label: 'Per 100 ml' },
          ]}
        />
      </div>
      <div className="mt-4">
        <PortionField testId="kit-serves" unit="serve" value={serves} onChange={setServes} />
        <PortionPicks testId="kit-serves" unit="serve" value={serves} onChange={setServes} />
      </div>

      <SectionHeading className="mt-10" right={3}>
        Fields
      </SectionHeading>
      <div className="mt-4 grid gap-4">
        <Field label="Name" placeholder="Meal" />
        <Field label="Calories" labelRight={<span className="text-gold-300 tracking-[0.08em]">Per 100 g</span>} fieldSize="lg" suffix="kcal" placeholder="0" {...decimalInputProps} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein" labelInside suffix="g" placeholder="0" {...decimalInputProps} />
          <Field label="Carbs" labelInside suffix="g" defaultValue="62" {...decimalInputProps} />
          <Field label="Fat" labelInside suffix="g" invalid defaultValue="x" {...decimalInputProps} />
        </div>
        <Field label="Disabled" disabled defaultValue="84.1" suffix="kg" />
      </div>

      <SectionHeading className="mt-10">Buttons</SectionHeading>
      <div className="mt-4 grid gap-3">
        <Button variant="gold" full>
          Log
        </Button>
        <Button variant="gold" full disabled>
          Log
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="hairline">Edit</Button>
          <Button variant="hairline" aria-pressed>
            Active
          </Button>
          <Button variant="hairline" size="sm" icon={<Upload size={16} strokeWidth={1.5} />}>
            Import
          </Button>
          <Button variant="hairline" disabled>
            Disabled
          </Button>
          <Button variant="danger" armed={armed} icon={<X size={16} strokeWidth={1.5} />} onClick={() => setArmed((a) => !a)}>
            {armed ? 'Erase all?' : 'Erase all'}
          </Button>
          <Button variant="ghost">Back</Button>
        </div>
        <div className="flex gap-2">
          <IconButton label="Log">
            <SquarePlus size={22} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Close" disabled>
            <X size={22} strokeWidth={1.5} />
          </IconButton>
          <Button variant="hairline" size="sm" onClick={() => useToast.getState().show({ text: 'Logged · 180 g · 175 kcal', action: { label: 'Undo', icon: 'undo', onClick: () => {} } })}>
            Toast
          </Button>
          <Button variant="hairline" size="sm" onClick={() => setSheet(true)}>
            Sheet
          </Button>
        </div>
      </div>

      <SectionHeading className="mt-10">Switches</SectionHeading>
      <div className="mt-4 grid gap-3">
        <Segmented<'quick' | 'build'> label="Mode" value={mode} onChange={setMode} options={[{ value: 'quick', label: 'Quick' }, { value: 'build', label: 'Build' }]} />
        <Segmented<'quick' | 'build'> label="Sort" size="sm" value={mode} onChange={setMode} options={[{ value: 'quick', label: 'A to Z' }, { value: 'build', label: 'Most' }]} />
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="Save to library" checked={on} onChange={setOn} />
          <Toggle label="Off" checked={off} onChange={setOff} />
          <Toggle label="Disabled" checked={false} disabled onChange={() => {}} />
        </div>
      </div>

      <SectionHeading className="mt-10">Chips</SectionHeading>
      <ChipRow className="mt-4">
        <Chip icon={<RotateCcw size={16} strokeWidth={1.5} />} label="Repeat" trailing="1 951 kcal" maxWidth={190} />
        <Chip label="Oats and whey" active />
        <Chip label="Chicken and rice bowl" />
        <Chip label="Shake" disabled />
      </ChipRow>

      <SectionHeading className="mt-10">Stone</SectionHeading>
      <StatStones className="mt-4">
        <StatStone caption="Avg 7 days" value="2 015" unit="kcal" highlight />
        <StatStone caption="Under" value="7 of 7" />
        <StatStone caption="Streak" value="12" ornament={<Laurel />} />
      </StatStones>
      <Tablet bracketed className="mt-4">
        <div className="flex items-baseline justify-between">
          <div>
            <GoldNumber value={84} text="84.1" size={44} brush={false} />
            <span className="unit text-[22px]"> kg</span>
            <p className="label mt-2">Today</p>
          </div>
          <ValueUnit value="0.9" unit="kg" size={22} />
        </div>
      </Tablet>
      <ul className="mt-4">
        {[
          ['Greek yoghurt', '180 g', '3:20 pm · P 16 · C 7 · F 9', 175, true],
          ['Chicken and rice bowl', '', '12:55 pm · P 69 · C 70 · F 18', 743, false],
        ].map(([name, portion, meta, k, mark]) => (
          <li key={String(name)} className="row-rule row-press grid h-[60px] grid-cols-[14px_1fr_auto_44px] items-center">
            <span className="flex justify-start">{mark ? <Rhombus solid /> : null}</span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-baseline">
                <span className="truncate font-body text-[19px] font-medium text-bone">{name}</span>
                {portion ? <span className="num shrink-0 font-body text-[16px] font-medium text-bone-soft">&nbsp;· {portion}</span> : null}
              </span>
              <span className="meta block truncate">{meta}</span>
            </span>
            <ValueUnit value={Number(k)} unit="kcal" tone={mark ? 'gold' : 'bone'} />
            <IconButton className="row-action" label="Log again">
              <SquarePlus size={22} strokeWidth={1.5} />
            </IconButton>
          </li>
        ))}
      </ul>
      <EmptyLine className="mt-4">Nothing logged yet.</EmptyLine>
      <EmptyState
        className="mt-4"
        action={
          <>
            <Button variant="hairline" size="sm">
              New meal
            </Button>
            <Button variant="hairline" size="sm">
              New ingredient
            </Button>
          </>
        }
      >
        Nothing saved yet.
      </EmptyState>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Log" height="auto" footer={<Button variant="gold" full>Log</Button>}>
        <PortionField testId="kit-sheet-portion" unit="g" value={amount} onChange={setAmount} />
        <PortionPicks testId="kit-sheet-portion" unit="g" value={amount} usual={180} onChange={setAmount} />
        <div className="h-40" />
      </Sheet>
    </div>
  )
}
