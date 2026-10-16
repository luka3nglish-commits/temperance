# UI kit (polish v2)

The shared primitives, classes and tokens for every screen. Values come from `docs/polish-spec.md` sections 2 to 4 and 7; this sheet says what to reach for and how. Import components from `src/components/ui` and ornaments from `src/components/ornaments`. See every primitive in every state on the dev server at `http://127.0.0.1:<port>/temperance/#kit` (dev only, `src/components/ui/Kit.tsx`).

Rules that hold everywhere: nothing under 12 px; no letter-spacing over 0.2em below 13 px; text at least 4.5:1 on its real background; control edges at least 3:1; no italic for numbers; every Cormorant numeral carries `.num`; units are lowercase Cormorant, never inside a Cinzel span; gold gradient text only at 32 px and up (smaller gold is flat `text-gold-300`); no raw hex in screens except the SVG paints the spec lists.

## Tokens

| Want | Use |
| --- | --- |
| Names, values, inputs | `text-bone` |
| Every Cinzel label, inactive tab, icon | `text-bone-dim` (`#D3CDC2`) |
| Cormorant meta, units, hints, sublines (15 px and up only) | `text-bone-soft` (`#B9B3A9`) |
| Placeholders, disabled, untracked, version line | `text-bone-mute` (`#9C9791`) |
| Gold text under 32 px, focus | `text-gold-300` |
| Strokes, fills, marks | `gold-400` |
| Over the line (with the flame) | `text-ember-text` (`#FF9972`) |
| Section rule, tab bar edge, dividers inside controls | `border-[var(--gold-line)]` (0.42) |
| The one lead rule per screen | `var(--gold-line-strong)` (or `SectionHeading rule="strong"`) |
| Row rules between list rows | `border-[var(--rule)]` (0.16) or `.row-rule` |
| Border of a gold control | `var(--gold-edge)` |
| Border of an input at rest | `var(--bone-edge)` |
| Danger border | `var(--ember-edge)` |
| Sheet and hero scrim | `var(--scrim)` (0.74) |
| Surfaces | `bg-obsidian-950` page, `bg-obsidian-900` sheet, `bg-slab` chips and toast; tablet stops `tablet-hi/mid/lo`, inset `inset-hi/lo` |
| Gold for text and fills | `var(--gold-grad-text)` (darkest stop `#B8902E`); `var(--gold-grad)` is decoration only |
| Macro colours (arc and swatch only, never text) | `protein`, `carbs`, `fat` (`#8E7243`) |

Removed: `--bone-08` and `--gold-focus`. Use `--rule` for row rules and `--color-gold-300` for focus.

Motion tokens: `--ease-spring` (overshoot, falls back to `--ease-sheet`), `--ease-press`, `--ease-stone`, `--ease-cut`; `--t-press-in` 70 ms, `--t-press-out` 300 ms, `--t-sheet-in` 420 ms, `--t-tab-out` 120 ms, `--t-tab-in` 260 ms, `--t-indicator` 360 ms, `--t-roll` 560 ms, `--t-row-in` 420 ms, `--t-row-stagger` 35 ms, `--t-new-row` 900 ms, `--t-row-out` 220 ms, `--t-toast-in` 320 ms, `--t-ghost` 440 ms, `--t-shockwave` 480 ms, `--t-always` 1600 ms.

## Type classes

All are in `@layer components`, so a utility on the same element wins (`label text-gold-300` is gold).

| Class | Role |
| --- | --- |
| `.label` | Cinzel 700 12 px 0.12em bone-dim uppercase: labels, eyebrows, captions, settings rows, flank labels |
| `.label-tab` | Cinzel 700 12 px 0.06em (tab labels) |
| `.eyebrow` | Cinzel 700 13 px 0.22em bone-dim (REMAINING, EATEN, OVER THE LINE) |
| `.title-screen` | Cinzel 700 18 px 0.2em bone (LIBRARY, SETTINGS, the month) |
| `.title-sheet` | Cinzel 700 16 px 0.2em bone |
| `.meta` | Cormorant 600 16 px bone-soft, tabular (macros, times, deltas) |
| `.hint` | Cormorant 600 15 px bone-soft (the floor: hints, footnotes, counts) |
| `.unit` | Cormorant 500 15 px bone-soft lowercase (set the size to 60 percent of the figure, never under 15) |
| `.empty-line` | Cormorant 500 italic 17 px bone-soft |
| `.num` | lining tabular numerals for Cormorant |
| `.inscribed` | the 1 px cut shadow on Cinzel that is not gradient text |

## Materials and ornament classes

| Class | What | Example |
| --- | --- | --- |
| `.tablet` | raised stone: informs (stat stones, settings groups, empty states, toast) | `<div className="tablet bracketed p-4">` |
| `.tablet-inset` | carved stone: you type into it (inputs, wells); gold-300 border and ring on `:focus-within` | |
| `.bracketed` (`.lg`) | gold corner brackets on `::after`, composes with `.tablet` and `.gold-border` | |
| `.gold-fill` + `.engraved` | engraved gold surface with a dark label (keystone, LOG; the Button does this for you) | |
| `.gold-text` | gradient gold text, 32 px and up only | |
| `.gold-border` | gradient gold hairline frame (active chip, active pick) | |
| `.gold-glow` | radial gold glow, put it on a sibling element, never a filter | |
| `.meander` | 6 px Greek key band (width it yourself or use `<Meander>`) | |
| `.rhombus` (`.solid`) | the 5 px mark (or `<Rhombus>`) | |
| `.row-rule` | a 1 px `--rule` line on `::after` at the bottom of a row (the stagger draws it) | |
| `.row-press` | the pressed row wash (gold 0.08 in 0 ms, out 300 ms) | |
| `.row-new` | the 900 ms gold wash on a row that just arrived (kept under reduced motion) | |
| `.rhombus.is-new` | the mark on a row that just arrived scales 0 to 1 over 240 ms | |
| `.rhombus.is-flash` | after a one-tap log (recents, quick-add, favourite chips) the row's rhombus flashes `#FFF7DA` and swells 1 to 1.4 to 1 over 300 ms; toggle the class off and on to replay | |
| `.row-action` | on the row's IconButton: its SquarePlus turns 90 degrees while pressed (or while `.is-done`), 200 ms | `<IconButton className="row-action" ...>` |
| `.press` | press timing (in 70 ms, out 300 ms spring) and `scale(var(--press-scale, 0.97))` on `:active`; reduced motion keeps colour only | |
| `.tp-stagger` | on a list: children rise in 35 ms apart (capped at 8), row rules draw 80 ms later; use `useStaggerOnce(tab)` to run it once per session per tab; inside a Sheet it starts after 120 ms | `<ul className={useStaggerOnce('library')}>` |
| `.shake` | 140 ms shake (invalid input) | |
| `.chip-row` | sideways scrolling row with a faded right edge | |

## Components

### Button, IconButton (`Button.tsx`)

| Prop | Values |
| --- | --- |
| `variant` | `gold` (THE action: h 56, engraved gold; disabled = an engraved empty outline that sweeps to gold when enabled), `hairline` (h 48, gold edge, gold-300 label; `aria-pressed` shows the active frame), `ghost` (min 44 x 44, bone-dim), `danger` (alias `ember`; h 48, ember edge and label) |
| `size` | `sm` h 44, `md` h 48 (56 for gold), `lg` h 56 |
| `icon`, `trailing` | leading or trailing icon, 16 px stroke 1.5 |
| `full` | full width |
| `armed` | danger only: the second tap of a two-step delete (pass the confirm copy as children) |

Never add `disabled:opacity-*`; disabled states are designed in. Gold buttons light up from the press point by themselves.

```tsx
<Button variant="gold" full type="submit" disabled={!canLog} data-testid="tp-log-submit">Log</Button>
<Button variant="hairline" size="sm" icon={<Share2 size={16} strokeWidth={1.5} />}>Export</Button>
<Button variant="danger" size="sm" armed={armed} onClick={tap}>{armed ? 'Erase everything' : 'Erase all'}</Button>
<IconButton label="Close"><X size={22} strokeWidth={1.5} /></IconButton>
```

### Field, Input, decimalInputProps (`Field.tsx`)

Carved input: h 56, Cormorant 600 22 px `.num`, bone-edge border, gold-300 border and ring on focus. `suffix` draws the unit inside at the right. `invalid` turns the border ember and shakes and buzzes once when it flips on. `disabled` dims border and value. `fieldSize`: `sm` h 44 (settings rows), `md` h 56, `lg` h 64 with a 28 px value (CALORIES). `Field` adds the Cinzel label 8 px above (`labelRight` for a right slot in label style, tint it with a class) or `labelInside` for the 56 px macro thirds.

```tsx
<Field label="Calories" labelRight={<span className="text-gold-300 tracking-[0.08em]">Per 100 g</span>} fieldSize="lg" suffix="kcal" {...decimalInputProps} data-testid="tp-log-kcal" value={k} onChange={...} />
<Field label="Protein" labelInside suffix="g" {...decimalInputProps} data-testid="tp-log-protein" value={p} onChange={...} />
```

### PortionField, PortionPicks (`PortionField.tsx`)

The owner asked for this one. 64 px carved field: minus | typed amount + unit | plus. Type any amount (decimal keypad, commits on blur or Enter, nonsense reverts with a shake), or step on a grid with minus and plus (hold to repeat: 380 ms, then 70 ms easing to 35 ms; each changed digit wipes in). Unit word: `g`, `ml`, `serve` (1 or less) or `serves`; no times sign. The steppers never take focus from the input, so the keyboard stays up. Focus turns the border and unit gold-300.

| Prop | Meaning |
| --- | --- |
| `value`, `unit`, `onChange` | the amount in servings (`serve`), grams or millilitres |
| `testId` | the group; the input is `${testId}-input`, buttons `-less` and `-more` |
| `onPreview(n)` | every parseable keystroke, null when unparseable or on blur: drive a live result line |
| `onEnter()` | Enter in the amount (the LOG sheet logs on it); pair with `enterKeyHint="go"` |
| `onFocus()` | the input gained focus (scroll the PORTION block into view) |
| `label`, `max` | accessible group name (default Portion), a ceiling |

`PortionPicks`: four 40 px chips 8 px under the field. Sets: serve 0.5, 1, 1.5, 2; g 100, 150, 200, 250; ml 150, 250, 330, 500. `usual` is marked with a solid rhombus and replaces the first pick when it is outside the set (`aria-label="Usual, 180 grams"`). The pick equal to the value is framed in gold. Ids `${testId}-pick-<value>` (e.g. `tp-log-portion-pick-100`). Taps never close the keyboard.

Put the basis on the label row above the field (left PORTION, right the live result), never inside it.

```tsx
<div className="mb-2 flex h-5 items-baseline justify-between">
  <span className="label">Portion</span>
  <span data-testid="tp-log-result"><ValueUnit value={kcal} unit="kcal" tone="gold" /><span className="hint"> · P 16</span></span>
</div>
<PortionField testId="tp-log-portion" unit={basis} value={amount} onChange={setAmount} onPreview={setPreview} enterKeyHint="go" onEnter={submit} />
<PortionPicks testId="tp-log-portion" unit={basis} value={amount} usual={meal?.usual} onChange={setAmount} />
```

`Stepper` was removed; use `PortionField` and `PortionPicks`.

### Segmented (`Segmented.tsx`)

Carved well with a gold edge, equal segments, Cinzel 700 12 px 0.1em; active gold-200 on a gold wash; a 2 px gold indicator travels under the active segment. `size`: `sm` h 32 (44 px hit), `md` h 44 (default), `lg` h 40 full width (the basis switch). `full` stretches any size. Options may carry `testId` and `disabled`. Type the generic when the options are literals: `<Segmented<Basis> ...>`.

```tsx
<Segmented<Basis> label="Basis" size="lg" testId="tp-log-basis" value={basis} onChange={setBasis}
  options={[{ value: 'serve', label: 'Per serve', testId: 'tp-log-basis-serve' }, { value: 'g', label: 'Per 100 g', testId: 'tp-log-basis-g' }, { value: 'ml', label: 'Per 100 ml', testId: 'tp-log-basis-ml' }]} />
<Segmented size="sm" label="Sort" value={sort} onChange={setSort} options={[{ value: 'alpha', label: 'A to Z' }, { value: 'logged', label: 'Most' }]} />
```

### Toggle (`Toggle.tsx`)

48 x 28 carved track with a gold edge, 20 px knob; on: engraved gold knob slides 22 px, the track takes a gold wash. Props `checked`, `onChange`, `label`, `hideLabel`, `disabled`, `testId`.

```tsx
<Toggle testId="tp-log-save-library" label="Save to library" checked={save} onChange={setSave} />
```

### Chip, ChipRow (`Chip.tsx`)

h 40 (`size="sm"` h 32 with a 44 px hit), slab fill, gold edge, max 168 px with the label truncated (`maxWidth` to override). `label` Cinzel 700 12 px gold-300; `trailing` energy in Cormorant 500 15 px bone-soft; `icon` 16 px; `active` frames it in gold. `ChipRow` scrolls sideways and fades its right edge.

```tsx
<ChipRow testId="tp-fav-chips">
  <Chip testId="tp-repeat-yesterday" icon={<RotateCcw size={16} strokeWidth={1.5} />} label="Repeat" trailing="1 951 kcal" maxWidth={190} onClick={repeat} />
  <Chip testId={`tp-fav-chip-${m.id}`} label={m.name} onClick={() => log(m.id)} />
</ChipRow>
```

### SectionHeading, EmptyLine, EmptyState (`SectionHeading.tsx`)

`SectionHeading`: title in `.label`, an optional right slot (a string or number renders as `.hint .num`, a node renders as is), 10 px below a rule: quiet `--rule` by default, `rule="strong"` for the screen's one gold lead rule (ends in a rhombus), `rule="none"`. `icon` renders gold-400 (pass 16 px). `as="h3"` for nested headings.

`EmptyLine`: a one-line empty inside a section. `EmptyState`: a whole-section empty: bracketed tablet, column glyph, an italic sentence, an optional `action` row of hairline buttons.

```tsx
<SectionHeading rule="strong" icon={<FolderHeart size={16} strokeWidth={1.5} />}>Favourites</SectionHeading>
<SectionHeading right={<Segmented size="sm" ... />}>Meals</SectionHeading>
<SectionHeading right="Last 12">Recent</SectionHeading>
<EmptyLine testId="tp-recent-empty">Nothing logged yet.</EmptyLine>
<EmptyState action={<><Button variant="hairline" size="sm">New meal</Button><Button variant="hairline" size="sm">New ingredient</Button></>}>Nothing saved yet.</EmptyState>
```

### Tablet (`Tablet.tsx`)

`<Tablet as="section" bracketed inset lg flush testId>`: raised stone by default, `inset` for carved, `bracketed` for corner brackets (`lg` bigger), padding 16 px 18 px unless `flush`.

```tsx
<Tablet as="section" bracketed aria-labelledby="goals" className="px-4 pt-1 pb-2">...</Tablet>
```

### StatStones, StatStone (`StatStone.tsx`)

One bracketed tablet, equal cells, 96 px. Each stone: `value` (Cinzel 700 24 px bone, `highlight` for gold-300), `unit`, `caption` (label style), `ornament` drawn behind the value (the laurel), `testId`, `data` (extra `data-*`). An empty value draws a bone-mute middle dot.

```tsx
<StatStones>
  <StatStone testId="tp-stat-avg" caption="Avg 7 days" value="2 015" unit="kcal" highlight />
  <StatStone testId="tp-stat-under" caption="Under" value="7 of 7" />
  <StatStone testId="tp-stat-streak" caption="Streak" value="12" ornament={<Laurel />} />
</StatStones>
```

### ValueUnit, GoldNumber (`GoldNumber.tsx`)

`ValueUnit`: a figure in Cinzel 700 (`tone` bone, gold or dim) plus a thin space and a lowercase Cormorant unit at 60 percent of the figure (min 15 px). `size` default 16 (row kcal); 17 week list; 22 to 24 stones. Numbers are grouped with a thin space.

`GoldNumber`: the hero foil (chisel shadow, light lip, brushed gradient face). `size` (px or CSS), `ember`, `brush={false}` for the 44 px weight hero, `text` to draw a preformatted string such as `84.1`.

```tsx
<ValueUnit value={entry.macros.kcal} unit="kcal" tone={newest ? 'gold' : 'bone'} />
<GoldNumber value={84} text="84.1" size={44} brush={false} />
```

### Sheet, useSheets, useKeyboardUp (`Sheet.tsx`)

Props unchanged (`open`, `onClose`, `onClosed`, `title`, `headerRight`, `footer`, `height`, `closeLabel`, `contentId`, `testId`) plus `ornament` (the 72 px meander under the title, on by default when there is a title). Lit panel, gold top edge, gold grab bar, 420 ms spring rise with an underfill, 0.74 scrim with no blur, drag down to dismiss (30 percent or 0.5 px/ms), footer with a fade instead of a rule (rows dissolve under it). `useSheets((s) => s.open)` is the number of open sheets.

### Toast (`Toast.tsx`)

`useToast.getState().show({ text, action?, duration?, tone?, id? })`. One at a time; `show` replaces. Docks at the top while any sheet (or the LOG or TODAY sheet) is open, else above the tab bar. `dismiss(id?)` dismisses (only the named toast when `id` is given). `idle()` is true when no toast is showing and no sheet is open: check it before a prompt that must never interrupt (the install prompt).

```ts
useToast.getState().show({ text: 'Logged · 180 g · 175 kcal', action: { label: 'Undo', icon: 'undo', onClick: undo } })
if (useToast.getState().idle()) useToast.getState().show({ id: 'install', text: 'Keep it on the home screen.', action: { label: 'Install', onClick: install }, duration: 8000 })
```

### Press helpers (`press.ts`), stagger (`stagger.ts`)

`lightAt(el, x, y)` and `lightAtPointer(e)` light a gold surface from the press point (the element needs `.press-light` and a `<span className="press-light-spot" aria-hidden="true" />` child). `useStaggerOnce(tab?)` returns `'tp-stagger'` the first time a tab mounts this session (always inside a sheet when called with no key), `''` otherwise and under reduced motion.

## Ornaments (`src/components/ornaments`)

At most two ornament kinds per screen (HISTORY may add the laurel as a third).

| Component | Use |
| --- | --- |
| `<Meander width={96} align="center" />` | 96 px above the stoic line; 72 px under sheet titles (the Sheet draws it); 120 px above the settings footer |
| `<Rhombus solid? size? label? />` | the 5 px mark: newest row, usual pick, goal marker (with a `label`), streak, flank plaque ends, settings group headings |
| `<Laurel />` | once: behind the HISTORY STREAK value, 56 x 28 at 0.7 |
| `<ColumnGlyph />` | empty states (EmptyState draws it) |

## List row recipe (polish-spec 4.11)

```tsx
<li className="row-rule row-press grid h-[60px] grid-cols-[14px_1fr_auto_44px] items-center">
  <span>{newest ? <Rhombus solid /> : null}</span>
  <span className="min-w-0">
    <span className="flex min-w-0 items-baseline">
      <span className="truncate font-body text-[19px] font-medium text-bone">{name}</span>
      {label ? <span className="num shrink-0 font-body text-[16px] font-medium text-bone-soft">&nbsp;· {label}</span> : null}
    </span>
    <span className="meta block truncate">3:20 pm · P 16 · C 7 · F 9</span>
  </span>
  <ValueUnit value={kcal} unit="kcal" tone={newest ? 'gold' : 'bone'} />
  <IconButton className="row-action" label={`Log ${name} again`}><SquarePlus size={22} strokeWidth={1.5} /></IconButton>
</li>
```

`label` is `portionLabel(entry)` from `src/lib/portion.ts`: `''` for one serve, `180 g`, `250 ml`, `1.5 serves`, `0.5 serve`, never a times sign. `portionAria(entry)` gives the spoken form (`180 grams`).

## Shell (owned by SYSTEM)

- `TabBar`: the bar, the travelling indicator, the LOG keystone (`aria-label="Log a meal"`, `data-intro="keystone"`), and the 40 px fade above the bar on the scrolling tabs. Screens keep `paddingBottom` from App; do not add another fade.
- `Backdrop`: the warm key pool under the goal line, the floor pool, the falloff and the grain on every tab. Screens paint no page background of their own (headers may fade to `#050507`).
- `Shards`: the fractured edges; the opening may tween `--shard-glint` on `[data-intro=shards]` (rest 0.4).
- `App`: tab transition (out 120 ms, in 260 ms with a 14 px slide from the side you came from, one gold and ember wipe).
