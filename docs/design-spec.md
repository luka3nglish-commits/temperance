# TEMPERANCE design spec

Final, implementable spec. Synthesised from the winning concept (THE STELE) with the judges' REQUIRED grafts folded in as LOCKED rules, plus the engineering findings from the Pad King, OMA HQ and mobile R3F readers. This file is the source of truth for colours, type, layout, motion and scene numbers (`CLAUDE.md`). Every number here is for a 390 x 844 phone unless stated. Lines marked LOCKED are not optional.

Owning paths per section follow `CLAUDE.md` file ownership: scene `src/scene/**`, opening `src/intro/**`, home `src/screens/Today*`, log `src/screens/Log*` and `src/components/MealForm*`, library `src/screens/Library*`, history and settings `src/screens/History*` and `src/screens/Settings*`, primitives `src/components/ui/**`.

## 1 Direction

The column is the page. One obsidian monument on a plinth under a gold goal line, with every number, arc and word cut into the stone around it; nothing on the home screen is a card or a form.
Every logged meal is a strike: the column slams up in one hit with dust and a 4 px shake, the brushed gold number ticks down, the ring re-cuts. Past the gold line the stone breaks and ember bleeds through the cracks.
Severe, dark, quiet. Obsidian and gold only, Roman inscription type, no greens, no blues, no pure white, no helper text, and logging never waits on motion.

## 2 Colour tokens

Tailwind 4 `@theme` tokens and `:root` variables in `src/index.css`. Dark only (`color-scheme: dark` on `:root` and `<meta name="color-scheme" content="dark">`). `index.html` `theme-color` and the `vite.config.ts` manifest `background_color` and `theme_color` are all `#050507`; no test checks that they agree. Contrast figures below are the comments carried in `index.css` (composites on `#0B0B0F`); the measured tables live in `docs/polish-spec.md` 2.1.

```css
@theme {
  --font-display: "Cinzel", "Cinzel Fallback", Georgia, serif;
  --font-body: "Cormorant Garamond", "Cormorant Fallback", Georgia, serif;

  /* obsidian: the stone, deepest to lightest */
  --color-obsidian-950: #050507; /* the void: page, canvas clear */
  --color-obsidian-900: #0b0b0f; /* sheets, bars */
  --color-obsidian-800: #121218; /* raised slab, disabled gold button */
  --color-obsidian-700: #1a1a21; /* skeleton rows */
  --color-obsidian-600: #26262e; /* neutral hairlines */

  /* material system: raised tablet stops, carved inset stops, slab */
  --color-tablet-hi: #17171e;
  --color-tablet-mid: #111117;
  --color-tablet-lo: #0d0d12;
  --color-inset-hi: #08080b;
  --color-inset-lo: #0e0e13;
  --color-slab: #16161c; /* toast, chips */

  /* bone: the only neutrals for text */
  --color-bone: #e7e1d2;      /* names, values, inputs: 15.06:1 */
  --color-bone-dim: #d3cdc2;  /* every Cinzel label, inactive tabs, icons: 12.42:1 */
  --color-bone-soft: #b9b3a9; /* Cormorant 15 px and up only: meta, subline, units, hints: 9.43:1 */
  --color-bone-mute: #9c9791; /* placeholders, disabled, untracked, version line: 6.78:1 */

  /* gold ladder */
  --color-gold-100: #fff7da;
  --color-gold-200: #f6e3a1; /* active segment text, highlight */
  --color-gold-300: #e6cb78; /* all gold text under 32 px, focus ring */
  --color-gold-400: #d8b45a; /* strokes, fills, marks; text only 16 px bold and up */
  --color-gold-500: #b8902e; /* text-gradient floor */
  --color-gold-600: #9c7b33; /* ornaments only, never text */
  --color-gold-700: #7a5e22;
  --color-gold-800: #5c4418;

  /* ember: over the line */
  --color-ember: #ff5a1f;      /* number gradient, borders, icons, never small text */
  --color-ember-deep: #b3300a;
  --color-ember-text: #ff9972; /* OVER labels and deltas, always with the flame: 9.40:1 */

  /* macro ring, monochrome gold by value (arc and swatch only, never text) */
  --color-protein: #f2d98a;
  --color-carbs: #b8923e;
  --color-fat: #8e7243;

  /* scene and shard flats */
  --color-dust: #9a8e7a;
  --color-shard-a: #1c1c22;
  --color-shard-b: #0a0a0d;
  --color-shard-c: #2a2a31;
}

/* --tilt-x is deliberately NOT a registered @property (the iOS crash, section 20) */

:root {
  /* alpha tokens (Tailwind theme colours cannot carry alpha) */
  --gold-line: rgba(216, 180, 90, 0.42);        /* 2.58:1: section rules, tab bar top edge, dividers inside controls */
  --gold-line-strong: rgba(216, 180, 90, 0.55); /* 3.64:1: one lead rule per screen, sheet top edge */
  --gold-edge: rgba(216, 180, 90, 0.55);        /* 3.64:1: borders of gold controls */
  --bone-edge: rgba(231, 225, 210, 0.46);       /* 3.43 to 3.63:1 as rendered on tablets: borders of inputs and the PortionField at rest */
  --rule: rgba(231, 225, 210, 0.16);            /* decorative: row rules between list rows */
  --bone-rule: rgba(231, 225, 210, 0.36);       /* ring groove hairlines */
  --ember-edge: rgba(255, 90, 31, 0.7);         /* 3.54:1: danger button border */
  --ember-glow: rgba(255, 90, 31, 0.45);
  --scrim: rgba(5, 5, 7, 0.74);                 /* sheet scrim and the hero number scrim */

  /* tilt-driven light: -1 to 1, 0 at rest; written only while a tilt source is live (src/lib/tilt.ts) */
  --tilt-x: 0;
  --tilt-angle: calc(var(--tilt-x) * 18deg);

  /* text and fills: darkest stop #B8902E */
  --gold-grad-text: linear-gradient(calc(100deg + var(--tilt-angle)),
    #b8902e 0%, #c9a24a 20%, #d8b45a 38%, #ebd08a 46%, #fff3cf 50%, #f6e3a1 54%, #d8b45a 66%, #c29a42 82%, #b8902e 100%);
  /* decoration only (goal line DOM fallback, gradient borders), never under text */
  --gold-grad: linear-gradient(calc(100deg + var(--tilt-angle)),
    #5c4418 0%, #9c7b33 22%, #d8b45a 42%, #fff7da 50%, #f6e3a1 56%, #d8b45a 70%, #7a5e22 100%);
  --gold-border: linear-gradient(calc(120deg + var(--tilt-angle)),
    #7a5e22 0%, #d8b45a 45%, #fff7da 50%, #d8b45a 55%, #5c4418 100%);
  --ember-grad: linear-gradient(calc(100deg + var(--tilt-angle)),
    #b3300a 0%, #ff5a1f 45%, #ffb088 50%, #ff5a1f 55%, #7a2208 100%);
  --gold-brush: url("data:image/svg+xml,..."); /* 256 x 64 feTurbulence 0.004 0.55, 3 octaves, seed 3, alpha -0.45 0.27 */
  --grain-uri: url("data:image/svg+xml,...");  /* 160 x 160 feTurbulence 0.85, 2 octaves, seed 7, alpha 0.035 */
}
```

`--gold-grain` is gone. `--gold-focus` and `--bone-08` are deleted: focus is `--color-gold-300`, a row rule is `--rule`. `--bone-rule` is defined but unread: `TodayRing.tsx` hard-codes the same `rgba(231, 225, 210, 0.36)` as `GROOVE`. `--ember-glow` feeds the high-tier `drop-shadow` on the SVG monument crack and the colonnade over bars.

Gold usage. `--gold-grad-text` fills every gold surface and gold text. The CSS classes `.gold-num .gold-face` (with `--gold-brush` on top, `background-size: 256px 64px, 220% 100%`), `.gold-text`, `.gold-fill`, `.btn-gold`, the on toggle knob and `.sheet-grab` each set `background-size: 220% 100%; background-repeat: no-repeat; background-position: calc(50% + var(--tilt-x) * 50%) 0` (the seam fix; no `* 60%` remains in `src`). Two surfaces size the gradient to the whole figure instead: the odometer face strips (`calc(var(--num-w) * 2.2) 1.08em`, `repeat-y`, offset per cell by `--slot-x`, still following `--tilt-x`) and the opening wordmark letters (`calc(var(--ww) * 2.2) 100%`, offset per letter by `--lx`, a sheen layer on top, not tilt driven). Low tier (`html.no-grain`, set by `src/scene/tier.ts` when the tier is not high) drops the brush layer and hides `.gold-hi`. `.gold-fill` and `.btn-gold` text is `#17110a`; `.btn-gold` carries `text-shadow: 0 1px 0 rgba(255, 240, 200, 0.45)` itself, `.gold-fill` does not, and the keystone LOG label adds it with `.engraved`. `.gold-glow` is `radial-gradient(50% 50% at 50% 50%, rgba(216, 180, 90, 0.35), transparent 70%)` on a sibling element. Safe mode (`html[data-fx="0"]`, section 15): `.gold-num .gold-face` and `.gold-text` drop the clipped background and paint flat `#d8b45a` (ember-text on `.gold-num.ember`), `.gold-fill` becomes the fixed `linear-gradient(100deg, #9c7b33 0%, #d8b45a 45%, #f6e3a1 55%, #b8902e 100%)` with no tilt term, and `.gold-border::before` becomes a plain 1 px `rgba(216, 180, 90, 0.55)` border with no mask.

Stone surfaces (raw hex in `index.css`, matching the tablet tokens):

| Class | Fill | Edge | Shadow |
| --- | --- | --- | --- |
| `.tablet` (raised, informs) | `linear-gradient(180deg, #17171e 0%, #111117 55%, #0d0d12 100%)`, plus `--grain-uri` tiled 160 px unless `.no-grain` | 1 px `#2a2a33` | `inset 0 1px 0 rgba(231,225,210,0.07), inset 0 -1px 0 rgba(0,0,0,0.55), 0 1px 0 rgba(216,180,90,0.06), 0 14px 28px -14px rgba(0,0,0,0.85)` |
| `.tablet-inset` (carved, you type into it) | `linear-gradient(180deg, #08080b 0%, #0e0e13 100%)` | 1 px `--bone-edge`; `#e6cb78` on `:focus-within`, `rgba(255,90,31,0.7)` `.is-invalid`, `rgba(231,225,210,0.16)` `.is-disabled` | `inset 0 2px 4px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(231,225,210,0.04), 0 1px 0 rgba(231,225,210,0.05)`; on focus the shadow becomes `inset 0 2px 4px rgba(0,0,0,0.7), 0 0 0 1px #e6cb78` |
| `.seg`, `.toggle-track` | the inset gradient | 1 px `--gold-edge` | `inset 0 2px 4px rgba(0,0,0,0.6)`; `.seg` adds `0 1px 0 rgba(231,225,210,0.05)` |
| `.sheet-panel` | `linear-gradient(180deg, #15151b 0px, #0b0b0f 160px)` | `0 -1px 0 rgba(216,180,90,0.55)` | `inset 0 1px 0 rgba(255,247,218,0.1), 0 -30px 60px rgba(0,0,0,0.7)` |
| `.tabbar` | `linear-gradient(180deg, #0e0e13, #0b0b0f)`, `backdrop-filter: blur(20px)` | top 1 px `--gold-line` | none |

Three.js colours (`COL` in `src/scene/tokens.ts`): column `#121218`, plinth `#121217`, key light `#FFE9B8`, rim light `#C8B07A`, fresnel rim `#C9A961`, sweep light `#FFF4D6`, ember light `#FF6A2B`, goal line `#F6E3A1`, goal core `#EBD08A`, goal flash `#FFF7DA`, goal glow `#D8B45A`, capital `#D8B45A`, capital emissive `#F6E3A1`, dust `#9A8E7A`, smoke `#8E826E`, mote `#FFE3A8`, spark `#FF8C42`, fog `#050507`, ember `#FF5A1F`, ambient `#3A3428`, painted environment `#FFF1CC` / `#8C7A5A` / `#FF6A2B`; crack emissive `EMBER_EMISSIVE = [2.5, 0.875, 0.3]` (`vec3(1.0, 0.35, 0.12) * 2.5`). LOCKED by `src/scene/tokens.test.ts` ("three.js colours are the spec hexes"): column, plinth, ambient, goal line, goal flash, ember, dust, spark and fog, and every `COL` value is uppercase `#RRGGBB`.

Desktop field behind the 430 px slab (`src/App.tsx`, 768 px and up): `#040406` with `radial-gradient(60% 50% at 50% 40%, rgba(216,180,90,0.06), transparent 70%)`.

## 3 Typography scale

Fonts: Cinzel 400 and 700; Cormorant Garamond 400, 500, 600 and 400 italic. `scripts/copy-fonts.mjs` copies six latin `woff2` files from `@fontsource/cinzel` and `@fontsource/cormorant-garamond` into `public/fonts/` (`cinzel-400`, `cinzel-700`, `cormorant-400`, `cormorant-500`, `cormorant-600`, `cormorant-400-italic`); it runs as `prebuild` and exits 1 when a source file is missing. `src/index.css` declares each with `@font-face { src: url("/fonts/<name>.woff2") }`: `font-display: block` for Cinzel 700, `swap` for the rest. `index.html` preloads five with `<link rel="preload" as="font" type="font/woff2" crossorigin href="%BASE_URL%fonts/...">` (Cinzel 700 and 400, Cormorant 500, 400, 400 italic); Cormorant 600 is never preloaded. `src/main.tsx` imports no `@fontsource` CSS. Size-adjusted fallbacks: `"Cinzel Fallback"` and `"Cormorant Fallback"` are `local("Georgia")` at `size-adjust: 92%` and `104%`. Body: Cormorant 18 px, line 1.45, `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility`.

Every UI Cinzel role is 700: `.font-display` sets the family and uppercase (unlayered) and `font-weight: 700` in `@layer components`, so a weight utility still wins. No element renders Cinzel at 400; the file is copied and preloaded but unused.

Type classes (`index.css`, `@layer components`, so a utility on the same element wins):

| Class | Family | Weight | Size | Line | Tracking | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| `.label` | Cinzel | 700 | 12 px | 1 | 0.12em | bone-dim |
| `.label-tab` | Cinzel | 700 | 12 px | 1 | 0.06em | inherits |
| `.eyebrow` | Cinzel | 700 | 13 px | 1 | 0.22em | bone-dim |
| `.title-screen` | Cinzel | 700 | 18 px | 1.1 | 0.2em | bone |
| `.title-sheet` | Cinzel | 700 | 16 px | 1.1 | 0.2em | bone |
| `.btn` (hairline, ghost, danger) | Cinzel | 700 | 14 px | 1 | 0.16em | gold-300 / bone-dim / ember-text |
| `.btn-gold` | Cinzel | 700 | 15 px | 1 | 0.24em | `#17110a` engraved |
| `.seg-option`, `.chip-label` | Cinzel | 700 | 12 px | 1 | 0.1em | bone-dim, active gold-200; chip gold-300 |
| `.portion-pick-num` | Cinzel | 700 | 13 px | 1 | 0.04em | bone-dim, active gold-200 |
| `.meta` | Cormorant | 600 | 16 px | 1.35 | 0 | bone-soft, tabular |
| `.hint` | Cormorant | 600 | 15 px | 1.4 | 0 | bone-soft, tabular |
| `.unit` | Cormorant | 500 | 15 px | 1 | 0 | bone-soft, `text-transform: none` |
| `.empty-line` | Cormorant | 500 italic | 17 px | 1.35 | 0 | bone-soft |
| `.chip-trail`, `.portion-pick-unit` | Cormorant | 500 | 15 px | 1 | 0 | bone-soft |
| `.field-input` | Cormorant | 600 | 22 px (`fieldSize` lg 28 px) | 1.2 | 0 | bone, tabular; placeholder bone-mute |
| `.field-suffix` | Cormorant | 500 | 16 px | | 0 | bone-soft |
| `.portion-value` | Cormorant | 600 | 30 px | 1.2 | 0 | bone, tabular |
| `.portion-unit` | Cormorant | 500 | 18 px | 1.2 | 0 | bone-soft, gold-300 on focus |

Roles set in components and screens:

| Role | Family | Weight | Size | Tracking | Colour | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Hero number | Cinzel | 700 | 96 px; 88 px over; short phone 72 px, 66 px over; `max(32px, min(base, fit))` | -0.01em, line 1.08 | `--gold-grad-text` + brush, `--ember-grad` over | `TodayNumber.tsx`, `TodayOdometer.tsx` |
| Weight hero | Cinzel | 700 | 44 px, unit 22 px | -0.01em | `GoldNumber brush={false}` | `HistoryWeight.tsx` |
| Wordmark, opening | Cinzel | 700 | 30 px | 0.42em | per-letter `--gold-grad-text` with a sheen | `intro/Wordmark.tsx` |
| Wordmark, header | Cinzel | 700 | 14 px (0.2em under 372 px wide) | 0.3em | gold-300 flat, `.inscribed` | `TodayHeader.tsx` |
| Header date, streak | Cinzel | 700 | 12 px `.label`; streak 14 px 0.02em gold-300 | | | `TodayHeader.tsx` |
| Subline under the hero | Cormorant | 500 roman | 18 px | 0 | bone-soft, ember-text over | `TodayNumber.tsx` |
| Flank values | Cinzel | 700 | 24 px (20 px on short phones) | 0.02em | bone | `TodayFlanks.tsx` |
| Ring centre | Cinzel | 700 | 22 px | 0 | gold-300 flat | `TodayRing.tsx` |
| Ring letters P C F (SVG), chart text | Cinzel | 700 | 12 px (`letterUnits`, `CHART_FONT_PX`) | 0.04em ring and chart y axis; chart x axis and target label 0.06em | bone-dim, gold-300 | `TodayRing.tsx`, `HistoryWeightChart.tsx` |
| Ring readout value, share | Cormorant | 600 | 20 px, 16 px | 0 | bone, bone-soft (gold-300 active) | `TodayRing.tsx` |
| Stone value | Cinzel | 700 | 24 px, unit `.unit` 15 px | 0.02em | bone, gold-300 `highlight` | `StatStone.tsx` |
| Row value (`ValueUnit`) | Cinzel | 700 | 16 px default, 17 px week list; unit `max(15, round(size * 0.6))` | 0.02em | bone, gold-300, bone-dim | `GoldNumber.tsx` |
| List names | Cormorant | 500 | 19 px; portion suffix 16 px bone-soft | 0 | bone | `LibraryRow.tsx`, `LogRecents.tsx` |
| Stoic line | Cormorant | 400 italic | 19 px, line 1.35 (1.15 tight), max 2 lines at 326 px | 0 | bone-dim; author `.label` | `TodayStoic.tsx` |
| Empty state sentence | Cormorant | 500 italic | 18 px, line 1.35 | 0 | bone-soft | `SectionHeading.tsx` |
| Toast text | Cormorant | 600 | 17 px, line 1.3 | 0 | bone | `Toast.tsx` |
| Search input | Cormorant | 600 | 20 px | 0 | bone | `LibrarySearch.tsx` |

Rules. No `text-[9px]`, `text-[10px]` or `text-[11px]` remains in `src`; the smallest text is 12 px. Every Cormorant numeral carries `.num` (`font-variant-numeric: lining-nums tabular-nums`); `.meta`, `.hint`, `.field-input`, `.portion-value` set it themselves. Units are lowercase Cormorant in their own span, never inside a Cinzel span. Cinzel digits are proportional: `.digits` lays them in `inline-grid` cells of `0.62em` (`.sep` thin space `0.28em`, `.dot` decimal `0.3em`). Thousands grouping is a thin space U+2009 in `formatInt` (`src/lib/units.ts`), LOCKED by `src/lib/units.test.ts` ("formats with thin-space grouping"). Inscription cut is the `.inscribed` class, applied per element (not automatic): `text-shadow: 0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,247,218,0.06)`.

Gradient text, no `filter` on the number. `GoldNumber` markup: `<span class="gold-num" role="text" aria-label="1272"><span class="gold-shadow digits">…</span><span class="gold-hi digits">…</span><span class="gold-face digits">…</span></span>`. `.gold-num { position: relative; display: inline-block; contain: paint }`; `.gold-shadow` absolute, `translateY(1px)`, `rgba(0,0,0,0.55)`; `.gold-hi` absolute, `translateY(-1px)`, `rgba(255,247,218,0.14)`, hidden on low tier; `.gold-face` carries the gradient (section 2) with `background-clip: text; color: transparent; will-change: background-position`. `.no-brush` and `.no-grain` drop the brush; `.ember` swaps to `--ember-grad`. The hero uses the same layers per odometer cell. `.gold-text` exists for gold text at 32 px and up but no screen uses it; gold under 32 px is flat `text-gold-300`.

## 4 Spacing + layout grid

Base unit 4 px. Side gutters 20 px (`px-5`) on every screen header and body and inside sheets; the side shard strips (64 px boxes from `--safe-top + 40px` to `--safe-bottom + 56px`) carry shallow shards under that gutter. Field label to input 8 px (`mb-2`). Tablet padding 16 px 18 px (`Tablet`, unless `flush`); settings groups `px-4 pt-1 pb-2`. SectionHeading rule 10 px under the title (`pb-2.5`). Section gap 32 px on LIBRARY (`gap-8`) and HISTORY (`pt-8` per section); settings group tablets 16 px apart (`gap-4`).

| Element | Height | Source |
| --- | --- | --- |
| Library rows | 60 px | `LibraryRow.tsx` `h-[60px]` |
| Recents, TODAY sheet rows, week rows | 56 px | `h-14` |
| Settings rows | min 60 px (14 px top and bottom + 32 px), control column 168 px | `SettingsRow.tsx` |
| Inputs | 56 px (`fieldSize` sm 44, lg 64) | `Field.tsx` |
| PortionField | 64 px, steppers 64 x 64 | `.portion-field` |
| Portion picks, chips | 40 px (chip sm 32 with a 44 px hit area) | `.portion-pick`, `.chip` |
| Segmented | md 44 (default), lg 40, sm 32 with a 44 px hit area | `Segmented.tsx` |
| Buttons | gold 56, hairline and danger 48, `size` sm 44 or lg 56, ghost min 44 x 44 | `Button.tsx` |
| Toggle | track 48 x 28, knob 20 x 20, hit min 44 | `.toggle-track` |
| Icon button | 44 x 44 | `.icon-btn` |
| Sheet header row | 56 px | `Sheet.tsx` |
| Toast | min 56 px | `Toast.tsx` |
| Tab bar | 56 px plus `--safe-bottom`; keystone 78 x 64 | `TabBar.tsx` |

Tap targets 44 px minimum. Radius ladder: 2 px (toggle knob, grab bar, marks), 3 px (PortionField step cells inside the 4 px well), 4 px (inputs, buttons, chips, tablets, segmented, toast: stone, not pills), 16 px (sheet top corners only). One exception: the macro ring's tap target is `rounded-full`.

Hairlines, all 1 CSS px:

| Token | Where |
| --- | --- |
| `--gold-line` (0.42) | tab bar top edge, segmented dividers, toast action divider, the HISTORY day sheet list top, the BUILD totals bar |
| `--gold-line-strong` (0.55) | the one lead rule per screen (`SectionHeading rule="strong"`, rhombus terminal), toast edge, sheet top edge (as `0 -1px 0` shadow) |
| `--rule` (0.16) | row rules (`.row-rule`), quiet SectionHeading rule, settings dividers |
| `--bone-edge` (0.46) | inputs and PortionField at rest |
| `--gold-edge` (0.55) | segmented, chips, portion picks, hairline buttons, toggle track, disabled gold button cover |
| `--ember-edge` (0.7) | danger buttons, warn toast |
| `--gold-border` mask (`.gold-border::before`) | active chip, active portion pick |
| `rgba(231,225,210,0.10)` | stat stone cell dividers, inset 16 px |

Frames (`src/App.tsx`). Every width: one column `max-w-[430px] h-dvh overflow-hidden`, centred. TODAY is a fixed frame (`main` `overflow-hidden`, no page scroll); LIBRARY, HISTORY and SETTINGS scroll inside `main` with `paddingBottom: calc(56px + var(--safe-bottom) + 24px)`. The TODAY stage is `flex: 0 1 460px` with a 280 px floor at every height, so it gives first on short phones; under `(max-height: 699px)` the hero also drops to 72 px and the plaques tighten (`TodayScreen.tsx`); narrow phones `(max-width: 371px)` take the compact ring row. Desktop `md` (768 px and up): the column becomes a slab `h-[min(100vh,932px)]` with `box-shadow: 0 0 0 1px #1A1A21, 0 0 0 2px rgba(216,180,90,0.06), 0 40px 120px rgba(0,0,0,0.8)` on the `#040406` field; shard strips are absolute inside the slab, so they hug it.

Z-index ladder (`:root`): `--z-backdrop` 0, `--z-canvas` 1, `--z-inscriptions` 10, `--z-tabbar` 30, `--z-shards` 40, `--z-sheet` 50, `--z-toast` 60, `--z-opening` 70. Sheets portal to `<body>` because `main` is a z 10 stacking context. Safe areas: `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` from `env(safe-area-inset-*, 0px)`. Keyboard: `Sheet.tsx` installs once a `visualViewport` resize and scroll listener plus a window resize listener that write `--vv-h` (default `100svh`) and `--vv-top` on `:root` and toggle `html.keyboard-up` under 620 px. Scene anchors `--goal-y` (default 263 px) and `--plinth-y` (default 507 px) are rewritten by `MonumentLayer.tsx` on mount, renderer change, scale change, window and `visualViewport` resize, and by `ColumnScene.tsx` when the camera comes to rest (section 6).

## 5 Opening sequence

Owner `src/intro/**`: `Opening.tsx` (overlay), `useOpening.ts` (variant, hide, skip, finish), `timeline.ts` (`buildFull`, `buildShort`, `buildFade`), `targets.ts`, `Wordmark.tsx`. One GSAP timeline per launch, built inside one `gsap.context` that is reverted when it completes, is skipped or unmounts; `clearTargetStyles` then strips `opacity`, `clip-path`, `transform`, `translate`, `--tilt-x` and `will-change`, so the final frame is pure CSS. The monument is reached through `getMonumentHandle()` at call time (`src/scene/handle.ts`); `MonumentLayer` runs every `play*`, `sweepOnce` and `shake` in a `queueMicrotask`, so the scene's tweens stay outside the opening's context and its revert never rewinds them. The timeline has a fixed length: `ready()` is called and never awaited. LOCKED (guard `src/intro/opening.test.ts`): `FULL_MS` 1900, `SHORT_MS` 700, `FADE_MS` 240, `RISE_AT_MS + RISE_MS` = 1100, `GHOST_AT_MS` 420 and `GHOST_AT_MS + GHOST_MS` = 860, every target hidden by opacity except `number`, which the cut variants clip.

Overlay (`Opening.tsx`): `fixed inset-0`, `z-[var(--z-opening)]` (70), `pointer-events-none` (guard `Opening.test.tsx`), `aria-hidden` unless playing, class `hidden` once done. Inside, a box that mirrors the app frame (`max-w-[430px] h-dvh`, `md:h-[min(100vh,932px)]`) holds the wordmark (full variant only) and the SKIP pill.

Targets (`TARGET_NAMES`, 15 `data-intro` names, a missing one is skipped): colonnade and shaft (`Temple.tsx`), wordmark, date, streak (`TodayHeader.tsx`), label, number, subline (`TodayNumber.tsx`), flanks, goal-label (`TodayFlanks.tsx`), ring, ring-readouts (`TodayRing.tsx`), stoic (`TodayStoic.tsx`), tabbar (`TabBar.tsx`), shards (`Shards.tsx`). The layout effect hides them before the first paint (`gsap.set` in the context): `number` `clip-path: inset(100% 0 0 0)` in full and short, everything else `opacity: 0`; the fade variant uses opacity for all. The next `requestAnimationFrame` builds and plays the timeline and marks `tp:opening-start` (t = 0). The landing shake targets `[data-stage]` (`queryStage`).

Full opening, 1900 ms (`buildFull`). Fades are opacity 0 to 1 on `EASE.stone` (`tp-stone`, 0.16, 1, 0.3, 1); "rises N px" adds `y` N to 0.

| Shot | ms | What happens |
| --- | --- | --- |
| S0 Temple | 0 to 900 | Colonnade rises 6 px over 900. Shaft of light fades over 700 from 120. |
| S1 Wordmark | 0 or the fonts gate | Letters chiselled in, one sheen, FLIP to the header (below). |
| S2 Shards | 120 to 720 | Strips fade over 300 linear from 120. Glint sweep: x -1 to 1 over 600 `power1.inOut` from 120 writes `--tilt-x` on the shards root and `emitTilt(x)` (the glint gradients follow the `tilt` event, section 8). `releaseTilt` at 720 hands the glint back to `tilt.ts` (eased 0.18 per frame, or `emitTilt(0)` when no loop runs). `--shard-glint` is not tweened and stays at 0.4. |
| S3 Line | 300 to 1220 | `playGoalLine(720)` at 300: `mon.goalX` 0 to 1 over 720 `EASE.stone` (the 3D line draws on through `uDraw`, section 7; the SVG scales the line X), `mon.goalFade` 0 to 1 over 300 `power1.inOut` from 420 (collar and glow; SVG ring opacity 0.7 x goalFade). Goal label fades over 200 at 1020. |
| Ghost | 420 to 860 | `playGhostReveal(440)` at 420: `mon.ghost` 0 to 1, `EASE.stone`, the glass ghost revealed upward from the plinth. |
| S4 Rise | 420 to 1120 | `playOpeningRise(680)` at 420. Camera set to `CAMERA_OPEN` (`[0, 0.35, 6.0]`, fov 34, lookY 0.6), dollies to `CAMERA_REST` (`[0, 0.9, 8.4]`, fov 28, lookY 1.67) over 680 `EASE.stone`, then `onCameraRest` rewrites `--goal-y` (section 6). `rotY` 0, `crack` 0, `mon.h` 0; charge glint on at 480 (ember when H > `GOAL_Y`); `mon.h` 0 to 1.015 H over 520 `EASE.hit` (480 to 1000), then H over 120 `EASE.settle`. Only the shaft and capital follow `mon.h` (capital scale `min(1, R / H_MIN)`, `H_MIN` 0.36); plinth, Attic base and fillets stand from frame 0. Hold `680 + MS.always` = 2280 ms (section 7). |
| Landing | 1000 | From the rise: trauma 0.75, `burst` (dust; fov punch -0.5 over 130 and back over 130; `reflectK` 1.5 over 60, back over 200; glint off over 200; shockwave 0 to 1 over 480; section 7), the DOM shaft flare (`[data-tp-flare]`, 0 to 0.5 at 60 ms, back to 0 at 380 ms), `shakeStage`, `sweepOnce(400)` and, on an over day, `uCrack` 0 to target over 700 `EASE.stone`. From the timeline: `land(stage, 0.75)` calls `handle.shake(0.75)` and toggles `.shake` (`stageShake`, `--t-shake` 140 ms, at most 3 px). Every toggle restarts the same keyframe. |
| Sweep | 960 to about 1400 | Timeline `sweepOnce(400)` at 960: `theta` +2.1 rad, `EASE.stone`. The landing's `sweepOnce(400)` at 1000 kills it and adds 2.1 from the advanced `theta`, so the pass ends about 1400 and travels more than 2.1 rad. |
| S5 Cut | 1060 to 1700 | Label 1060 (160). Number `clip-path` `inset(100% 0 0 0)` to `inset(0% 0 0 0)`, 320 `EASE.cut` (`tp-cut`, 0.7, 0, 0.2, 1) from 1100, cut upward; `--tilt-x` -1 to 1 on it over 600 `power1.inOut` from 1100. Date 1100 (160), streak 1100 (200), subline 1300 (200), flanks 1340 (200). |
| S6 Ring | 1380 to 1900 | Ring opacity over 200 linear at 1380. Each `path[data-arc]` draws `strokeDashoffset` from its length (`pathLength` if set, else `getTotalLength()`; the ring sets none) to 0 over 360 `EASE.stone` at 1380, 1460, 1540; when no arc path has a length, `clip-path: circle(0% at 50% 50%)` to `circle(75% at 50% 50%)` over 360 `EASE.stone` at 1380. Readouts 1500 (200). |
| S7 Word | 1600 to 1900 | Tab bar rises 8 px over 240 from 1600; stoic rises 6 px over 280 from 1620. A no-op call pins the end at 1900. |

Wordmark (`Wordmark.tsx`). `role="img"` `aria-label="Temperance"`, 10 letter spans, Cinzel 700 30 px, `leading-none`, tracking 0.42em balanced by `padding-left: 0.42em`, centred, `top: calc(var(--goal-y, 263px) + (var(--plinth-y, 507px) - var(--goal-y, 263px)) * 0.166 - 15px)` (288.5 px at the defaults, just under the line). Each letter clips its own background to text: the sheen `linear-gradient(105deg, transparent 40%, rgba(255, 248, 230, 0.55) 50%, transparent 60%)` at `--ww` x 2.6 over `--gold-grad-text` at `--ww` x 2.2, both offset by the letter's `--lx`, so one gradient runs across the word (`--ww` 300 px until measured). Letters start inline at `clip-path: inset(0 0 100% 0)`. Start: at 0 when `document.fonts.check('700 30px Cinzel')` is true at build; else when `document.fonts.ready` or the 300 ms cap (`FONTS_CAP_MS`) wins, at `min(tl.time(), 300)`, and never once the opening has ended. Letters open to `inset(0% 0 0 0)`, 180 `EASE.cut`, 40 stagger, the last starting at start + 360 and done at start + 540. `--sheen-p` 1.3 to -0.3 over 900 `power1.inOut` from the start. FLIP at `max(680, start + 540)`, 420 `EASE.stone`: x, y and scale from the overlay and header slot rects (scale = slot height / overlay height, clamped 0.2 to 1; x 0, y -312, scale 0.43 when the slot is missing or unmeasured), tracking and padding close to 0.3em; at its end the overlay goes to opacity 0 and the header wordmark to 1. It lands at 1100 with the fonts in, 1260 at the cap.

Shader readiness. Canvas and SVG monument (section 15) read the same `mon` (section 7), so every beat plays on whichever is shown. `MonumentLayer`, `EARLY_JOIN_MS` 600: scene ready within 600 ms of the layer mounting shows the canvas at once and hides the SVG with no transition; ready later, the SVG plays the opening and the canvas crossfades in over 200 ms `--ease-stone` (the SVG fades 200 ms, then `visibility: hidden`) once `introDone` is set. If nothing has placed the column, `setInstant` places it when `introDone` is set or 2600 ms after mount (`PLACE_FALLBACK_MS`).

Skip. A window `pointerdown` or `keydown`, or the SKIP pill, runs `tl.progress(1, true)` (callbacks suppressed: no rise, dust or shake), then finishes with `setInstant()`. Pill: `<button aria-label="Skip">`, `h-11` (44 px), `px-4`, radius 4 px, Cinzel 700 12 px uppercase 0.12em bone-dim, `1px solid var(--bone-edge)`, `rgba(5, 5, 7, 0.55)` fill, `bottom: calc(var(--safe-bottom) + 84px); right: 20px`, the only `pointer-events-auto` element. Touches pass through the overlay from frame 0: a tap on the LOG keystone skips on `pointerdown` and opens the sheet on `click`. The keystone is not visible yet: it sits inside the `tabbar` target (its own `data-intro="keystone"` is not in `TARGET_NAMES`), at opacity 0 until 1600 (full) or 450 (short).

Finish (complete or skip, once): revert and clear, `setInstant()` on a skip, `startIdle()`, `markIntroPlayed()` (`introCount + 1`) for the full variant only, skipped or not (guard `Opening.test.tsx`), `writeSeen()`, mark `tp:opening-done`, set `html[data-intro-done="true"]` and `useUI.introDone`. Full and short hold the tilt relay (`suspendTilt`) from play until their shard sweep ends.

Variant (`decideVariant`, once per launch, guard `opening.test.ts`), checked in this order:

| Variant | When | Length |
| --- | --- | --- |
| none | already played this launch, boot guard `data-intro="0"`, launch tab not TODAY, or `introCount > 0` with `sessionStorage` `temperance.seen` under 600 000 ms old (and not in the future) | 0: `setInstant`, `startIdle`, done |
| fade | reduced motion (system, or Settings MOTION Reduced) | 240 |
| full | `introCount` 0 (first launch, or after REPLAY OPENING) or OPENING Full daily | 1900 |
| fade | OPENING Off | 240 |
| short | OPENING Short (the default) | 700 |

Only a full play raises `introCount`, so with reduced motion and `introCount` 0 every launch, inside the 10 minute window too, plays the 240 ms crossfade. REPLAY OPENING calls `resetIntro()` (`introCount` 0) and toasts `The opening will play next launch.` `temperance.seen` is written at finish and refreshed on `pagehide` and whenever the page goes hidden.

Short opening, 700 ms (`buildShort`): at 0 `setInstant()` (column at H, camera at rest, no rise), then `playGoalLine(300)` (`goalFade` over 125 from 50) and `playGhostReveal(300)`. Shards fade 200 linear, glint sweep 500, released at 500. From 0: colonnade rises 6 px over 400, shaft 400, header wordmark, date and streak 200. `sweepOnce(400)` at 100. Label 150 (160); number cut 300 `EASE.cut` and `--tilt-x` sweep 500, both from 150. Subline and flanks 250 (200), goal label 300 (160). Ring 300, arcs 240 each, 60 stagger (last ends 660); readouts 400 (200). Stoic rises 6 px, tab bar 8 px, both 250 from 450. No dust, no shake.

Fade, 240 ms (`buildFade`): `setInstant()` at 0, every target opacity 0 to 1 together, `power1.out`. No rise, dust, shake or sweep; tilt is not held.

Boot guard (`src/lib/boot.ts`, the `tp-boot` script in `index.html`). `data-intro="0"` (any safe level, or `?intro=0`, kept for the tab in `sessionStorage` `temperance.flags`) gives none. `data-sweep="0"` (any safe level, or `?sweep=0`) drops the number and shard `--tilt-x` sweeps (the cut and the fades still run) and `startTilt` installs nothing. `index.html` preloads `cinzel-700`, `cinzel-400`, `cormorant-500`, `cormorant-400` and `cormorant-400-italic` (woff2). `scripts/verify-marks.mjs` prints `tp:opening-start` and `tp:opening-done` (`verify-variants.mjs` prints the difference); no script asserts a budget.

## 6 Home screen

Owner `src/screens/Today*`. One fixed frame, no scroll (`<main>` is `overflow-hidden` on TODAY). `TodayScreen.tsx` stacks five rows under `padding-top: var(--safe-top)`: header 40, stage `flex: 0 1 460px` (min 280), ring row 132, stoic `flex: 1 1 0` (min 67), spacer `flex: 0 0 calc(64px + var(--safe-bottom))` (tab bar 56 plus 8 px air). The non-stage rows total 303 px, the same chrome budget `MonumentLayer` subtracts before it scales the monument: `k = clamp((frame - safe-top - safe-bottom - 303) / 460, 0.55, 1)`, `transform: scale(k)` from the top centre. `--goal-y` and `--plinth-y` are written on mount, window and `visualViewport` resize, scale change and camera rest: projected from world Y 2.0 and 0 with the rest camera (`camera.project`, `ColumnScene.tsx`) while the 3D scene is up, else by the monument layer from its design values `safe-top + 216k` and `safe-top + 460k` (`STAGE_PLINTH_Y` 460 minus `GOAL_Y * PX_PER_UNIT` = 2.0 x 122); `:root` defaults are 263 px and 507 px. Everything in the stage is positioned from those two variables, so the inscriptions stay registered with a scaled monument. Values below are for 390 x 844 with safe areas 47 and 34 (k = 1):

| y (px) | Height | Element |
| --- | --- | --- |
| 0 to 47 | 47 | Top safe area. The top shard strip lives here (section 8). |
| 47 to 87 | 40 | HEADER (`TodayHeader.tsx`), grid `1fr auto 1fr`, 20 px gutters. Left: date `.label` (Cinzel 700 12 px 0.12em bone-dim, uppercase by CSS, reads `THU 15 OCT`). Centre: TEMPERANCE Cinzel 700 14 px 0.3em gold-300 `.inscribed` (0.2em under 372 px wide). Right: streak button 44 px tall, min 44 wide, `rhombus 12 rhombus` with 7 px gaps, number Cinzel 700 14 px 0.02em gold-300, `aria-label="Streak 12 days"` (`1 day` singular), tap opens HISTORY. At a zero streak an empty `aria-hidden` 44 x 44 span keeps the wordmark centred. No settings gear. |
| 87 to 547 | 460 | STAGE (`data-stage`, `data-intro="stage"`). The monument layer (canvas, SVG fallback, temple) sits behind at `top: var(--safe-top)`, 513 px tall, its bottom 28 px masked to transparent. Inscriptions are DOM over it; the stage's only paint is the number scrim. |
| 87 to 247 | 160 | HERO (`TodayNumber.tsx`), a bottom-anchored column whose bottom sits 16 px above the line. Eyebrow `.eyebrow` (Cinzel 700 13 px 0.22em bone-dim, h 18): REMAINING, EATEN when `settings.hero` is `'eaten'`, OVER THE LINE in ember-text with a 14 px `Flame` whenever remaining is negative. 2 px gap. The number (odometer, below). 4 px gap. Sub-line h 22, Cormorant 500 18 px roman bone-soft `.num`: `51% of goal` (`round(eaten / goal * 100)`, 0 without a goal), the same whichever figure the hero shows; over, ember-text with `text-shadow: 0 0 2px #050507, 0 0 10px #050507, 0 0 18px rgba(5, 5, 7, 0.9)`. Scrim behind, from the stage top to the line: `radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)`. |
| 263 | 0 | GOAL LINE (3D, section 7). DOM marker `tp-goal-label`: a 7 x 7 box at `top: calc(var(--goal-y) - 3.5px); right: 20px` holding one outline rhombus, `role="img"`, `aria-label="Goal 2 600 kcal"`, no text. |
| 443 to 495 | 52 | FLANK PLAQUES (`TodayFlanks.tsx`), top `--plinth-y - 64px`, inset 20 px. Left x 20 to 124 left aligned (a button, opens the TODAY sheet), right x 266 to 370 right aligned. Label `.label` over value Cinzel 700 24 px 0.02em bone `.num`, then a 44 x 1 rule `linear-gradient(90deg, rgba(216, 180, 90, 0.55), rgba(216, 180, 90, 0.08))` (270deg on the right) fading toward the column with a 5 px gap and an outline rhombus on the column side; the three spread with `justify-between`. Left reads EATEN (`tp-eaten-value`); with the hero swapped and remaining not negative it reads LEFT and the remaining figure (`tp-left-value`). Right reads GOAL (`tp-goal-value`). |
| 547 to 679 | 132 | MACRO RING ROW (section 9). Ring 120 px at x 20, y 553. Readouts x 160 to 370, three 44 px rows from the top of the 132 px row. Tapping the ring opens the TODAY sheet. |
| 679 to 746 | 67 | STOIC BLOCK (`TodayStoic.tsx`, section 14), content centred, 32 px side padding. Measured with a `ResizeObserver`: at 108 px or more a 96 px meander sits 14 px above the line; at 86 px or more a 24 x 1 gold-400 rule sits 10 px under it; below 86 px (`tight`) both drop and the leading closes from 1.35 to 1.15. Line Cormorant 400 italic 19 px bone-dim, max 2 lines (`line-clamp-2`) at 326 px; author `.label` 8 px under (6 px tight). Its floor is 108 px on a frame of at least 780 px (safe areas included) and 67 px below, and the 3D stage budgets the same value (`MonumentLayer`), so a 390 x 844 phone shows the meander and the rule. |
| 746 to 844 | 98 | Spacer under the tab bar: bar 754 to 810 (56), keystone 746 to 810 (78 x 64, rises 8 px), bottom safe area 810 to 844. Bar: `TabBar.tsx`, gradient `#0E0E13` to `#0B0B0F`, 1 px `--gold-line` top, five 20 percent slots, icons 24 px stroke 1.5 over `.label-tab` (Cinzel 700 12 px 0.06em) bone-dim; active label gold-300, icon gold-400 lifted 2 px; a 24 x 2 gold-400 indicator rides the top edge (360 ms `--ease-stone`). |

Hero size. `max(32px, min(base, (room - gap - chrome - 8px) / 1.08))` where room is `--goal-y - safe-top - 40px`, base 96 (88 over), chrome 46. Over the line the gap becomes `min(37px, (--plinth-y - --goal-y) * 0.1516) + 7px` (`OVER_MAX_PX` 37 from `src/scene/tokens.ts`, so 44 at full scale) and the block ends 44 px above the line. Tapping the number swaps the hero (`setHero`). Each `log` pulse sweeps the foil once: WAAPI on the number wrapper, `--tilt-x` -1 to 1 at offset 0.82 then back to the current value, 600 ms `cubic-bezier(0.16, 1, 0.3, 1)`; skipped under reduced motion.

Odometer (`TodayOdometer.tsx`). Digits in 0.62em cells (thin space 0.28em), each 1.08em tall with `overflow: hidden`. Inside, a 20 glyph strip (0 to 9 twice) moves by `translateY(calc(var(--d) * -1.08em + 0.13em))`; the 0.13em drop centres Cinzel's high figures in the cell. Transition `transform 560ms cubic-bezier(0.2, 0.9, 0.2, 1)` delayed 28 ms per digit counted from the right. A falling number rolls down, a rising one rolls up (`rollPlan`). A wrapping digit never reverses: falling, it first snaps 10 up into the second half without transition and rolls down from there; rising, it rolls on into the second half. Any strip that lands at index 10 or more snaps back 10 without transition on a timer at `560 + i * 28 + 40` ms (no `transitionend`). The 16 percent edge mask (`#000 16%, #000 84%`) is applied only while rolling. A new leading digit clips in from the bottom, 320 ms `--ease-cut`. Three stacked strips per cell: a black 0.55 shadow 1 px down, a `rgba(255, 247, 218, 0.14)` lip 1 px up (high tier only), and the face clipped to `--gold-grad-text` (`--ember-grad` over), sized to the whole number and offset per cell so the light runs across the cells and follows `--tilt-x`. `--gold-brush` rides the face on the high tier, never on ember. Reduced motion: no roll, opacity 0.35 to 1 over 120 ms. `aria-label` is the plain digits.

Short phones (height 699 px or less): number base 72 (66 over), chrome 39, eyebrow h 16, sub-line h 20 with a 2 px gap, plaques h 46 at `--plinth-y - 56px` with 20 px values. Narrow (width 371 px or less): the compact ring row (section 9).

TODAY sheet (`TodaySheet.tsx`, from EATEN or the ring). `Sheet` titled TODAY with the day's total as `ValueUnit` on the right, auto height. Today's entries newest first in 56 px rows ruled `.row-rule`, grid `14px 1fr 44px`: a solid rhombus on the newest row only; name Cormorant 500 19 px bone (truncates) plus ` · 180 g` from `portionLabel` in Cormorant 500 16 px bone-soft (never truncates); meta `.meta` `3:20 pm · P 16 · C 7 · F 9`; kcal `ValueUnit`, gold on the newest row; a 44 px `Trash2` 22 px button, ember-text when pressed. Swipe left: axis locks after 6 px, travel capped at 140 px, a DELETE `.label` in ember-text fades in behind, release past 88 px slides the row out (200 ms) and folds it (height and opacity to 0, 220 ms `--ease-stone`). Delete calls `deleteEntry` and toasts `Removed · 612 kcal` with UNDO (`restoreEntry`). Rows run the list stagger on open; a row that arrives while the sheet is open gets `.row-new`. Empty: `Nothing logged yet.`

Entry editor (`TodayEntryEdit.tsx`, tap a row; the sheet title becomes EDIT and the footer a gold SAVE). BACK ghost button and the entry time (`.hint`) in a 44 px row; NAME `Field` 12 px below; 16 px; PORTION `.label` row, with `was 180 g` (`.hint`) on the right only once the amount changed; `PortionField` in the recorded portion's unit (`entry.portion`, else servings); `PortionPicks` 8 px below, the linked meal's `usual` marked when its unit matches; 16 px; CALORIES `Field` size lg; 12 px; PROTEIN, CARBS, FAT thirds with inner labels. All four numbers rescale live by `(preview ?? amount) / startAmount` until any one of them is typed; from then on all four hold their values (`typed` snapshots the set). Save passes `{ name, macros, portion }` when the entry has a portion, else `{ name, macros, servings }`, to `updateEntry`.

Tab switch (`App.tsx`): the outgoing screen fades 120 ms linear, the incoming one runs `tpTabIn` (opacity 0 and `translateX(dir * 14px)` to rest, 260 ms `--ease-stone`), and `.tp-sweep` (`linear-gradient(100deg, transparent 30%, rgba(216, 180, 90, 0.28) 46%, rgba(255, 90, 31, 0.1) 54%, transparent 68%)`, 300 percent wide) wipes once over 460 ms. Reduced motion swaps the screen at once, no wipe. The monument layer is mounted once at the app root; off TODAY it is `visibility: hidden` with the ticker stopped.

## 7 Column scene

Owner `src/scene/**`. Every canvas goes through `SafeCanvas` (section 15). LOCKED: nothing else under `src/` imports `Canvas` from `@react-three/fiber` or renders a bare `<Canvas`; guard `src/scene/canvas-lint.test.ts`.

Layer. `MonumentLayer` is mounted once at the app root: absolute, `top: var(--safe-top)`, full frame width (390 on the reference phone), 513 px tall, `z-[var(--z-canvas)]`, `pointer-events-none`, `aria-hidden`. Off TODAY it is `visibility: hidden` (never `display: none`) with the ticker stopped. Short phones: the root scales by `k = clamp(available / 460, 0.55, 1)` from `50% 0`, where `available` = frame height minus the safe areas minus (40 + 124 + 64 + 19 + 56); projected px are multiplied by `k`. The root carries `mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - 28px), transparent 100%)`, so canvas, SVG and temple all fade over the bottom 28 px. Children in z order: `TempleBack`, the canvas wrapper, `FallbackMonument`, `TempleFront`.

Canvas. `<Canvas dpr={[1, dprMax]} resize={{ offsetSize: true }} gl={makeRenderer} shadows={false} frameloop="never" flat={false} camera={{ fov: 28, near: 0.1, far: 40, position: [0, 0.9, 8.4] }} style={{ touchAction: 'pan-y', position: 'absolute', inset: 0 }}>`; `dprMax` follows the live tier. Renderer parameters: `antialias` per tier, `alpha: true`, `powerPreference: 'high-performance'`, `stencil: false`, `depth: true`, `failIfMajorPerformanceCaveat: true`, `preserveDrawingBuffer: false`. Early renderer: a rAF from the first commit builds the `WebGLRenderer` on R3F's own canvas before the first paint, enables `KHR_parallel_shader_compile` and `EXT_texture_filter_anisotropic`, sizes the drawing buffer to the container's offset size at `min(max(1, devicePixelRatio || 2), settings.dprMax)` (mount settings), marks `tp:gl-context`, and hands it to R3F through the `gl` factory (R3F owns and disposes it). `renderer.debug.checkShaderErrors` is on in dev only. `onCreated`: `NeutralToneMapping`, `toneMappingExposure = T.exposure` (1.0), `setClearColor(0x000000, 0)`, `shadowMap.enabled = false`. Scene fog `FogExp2(#050507, 0.03)`. No environment map, no PMREM, no Lightformer, no postprocessing, no shadows on any tier. All scene 2D canvases are CPU backed (`willReadFrequently: true`).

Programs (5 by design, not tested; after the gate `window.__tp.programs` holds the live `gl.info.programs` count): obsidian (`tp-obsidian|refl`), gold (`|gold`), tpFx (`tp-fx`), dust (`ShaderMaterial`), basic-map (inscription and contact shadow).

Frameloop. `never` until the gate finishes: one `gl.compileAsync(object, camera, scene)` per program, ranked obsidian, gold, fx, dust, basic-map, one rAF between chunks, then one `compileAsync(scene, camera)` sweep; marks `tp:gl-env-done` (no env work), `tp:gl-compile-start`, `tp:gl-compile-done`, then one `advance()` while still `never` and `tp:gl-first-frame`. Every program compiles here: the ember point light is mounted at intensity 0 and the dust mesh draws its motes from the start. After the gate: `always` inside hold windows, `demand` otherwise. Holds (`hold(ms)`, ignored under reduced motion): each strike `MS.always` 1600 ms (LOCKED, guard `strike.test.ts`); opening rise `ms + 1600`; goal line `ms + 100`; ghost, sweep and crack `ms + 50`; shake 500; smooth settle `ms + 100`; removal 1000. In `demand` the ticker (`ticker.ts`) calls `invalidate()` at 24 fps (12 low) only while idle is wanted, TODAY is shown, `document.visibilityState === 'visible'`, the root is on screen (IntersectionObserver, threshold 0) and fewer than 90 s have passed since the last `pointerdown` or `keydown`; the ticker is enabled only in WebGL mode and never under reduced motion. Any `pointerdown` or `keydown`, becoming visible, or showing TODAY invalidates once. The root carries `data-live` while the ticker runs. Every gsap tween on `mon` has `onUpdate: invalidate`. drei `PerformanceMonitor` (`ms={100} iterations={6} flipflops={3}`) is mounted only inside `always` windows (section 15).

Camera. Rest `[0, 0.9, 8.4]` fov 28 lookAt `[0, 1.67, 0]`; opening start `[0, 0.35, 6.0]` fov 34 lookAt `[0, 0.6, 0]` (`CAMERA_REST`, `CAMERA_OPEN`). Each frame at priority -1: `Monument.tick(dt)` with `dt` clamped to 0.1, then `position = (s * 0.033 * sin(97t), camY + s * 0.024 * sin(113t + 1.3), camZ)`, `lookAt(0, lookY, 0)`, `rotation.z += s * 0.012 * sin(89t)` with `s = trauma^2`, `fov = mon.fov + mon.fovPunch`. `--goal-y` and `--plinth-y` come from a scratch camera at rest projecting `(0, 2, 0)` and `(0, 0, 0)`, times `k`, plus the layer top; written at mount, on resize and when the dolly lands. Dev tunables on `window.__tune` (`T`: exposure 1.0, key 22, rim 2.5, sweep 9, ember 6, ambient 0.22, envIntensity 1, follow 0.4, turn 0.035): key, rim, sweep, ember, follow and turn are read each frame; exposure once in `onCreated`, ambient at mount; `envIntensity` is read by nothing.

Units. 1 world unit = one column metre, 122 px per unit vertically, stage plinth top y 460, stage goal y 216 (`tokens.ts`).

| Name | Value |
| --- | --- |
| `heightFor` | `H = 0.36 + 1.64 * (eaten / goal)`, clamped to `H_MAX` 2.86; `H_MIN` 0.36 (base 0.24 + capital 0.12); exactly 2.0 at goal |
| `crackFor` | `clamp((eaten - goal) / (0.25 * goal), 0, 1)` |
| `renderH` | `h <= 2 ? h : 2 + 0.30 * (1 - exp(-(h - 2) / 0.30))`; crown at most 0.30 u (`OVER_MAX_PX` 37) above the line |
| `shaftTop` | `R - 0.12` (the capital takes the top 0.12 of the drawn height `R = renderH(mon.h)`) |

LOCKED, guard `tokens.test.ts`: `heightFor` (`H_MIN` 0.36 on an empty or negative day, 1.18 at half, 2.0 at goal, clamped to `H_MAX`, finite at goal 0), `crackFor` (0 at goal, 0.2 at 5 percent over, 1 at 25 percent), `renderH` (identity to 2, under 2.3001 at 10, monotonic), `OVER_MAX_PX` 37, and the `COL` hexes for column, plinth, ambient, goalLine, goalFlash, ember, dust, spark and fog. Strikes tween raw `mon.h`; every renderer draws `renderH(mon.h)`.

Temple (`Temple.tsx`, DOM and inline SVG, 0 GPU programs, stage coordinates, identical on tier none).

| Part | Spec |
| --- | --- |
| Colonnade far | SVG `viewBox 0 0 390 513` `xMidYMax slice`. Wall `#0F0E13` from y 150 to 520 with 9 even-odd arches (x0 = 2 + 44i, opening 34, radius 17, springing y 250, foot 520). Arch haze: vertical gradient y 140 to 470, `rgb(122,96,56)` at 0 / 0.10 (offset 0.485) / 0; ember twin `rgb(255,90,31)` 0.08 swaps in over 700 ms on `[data-over]`. Group opacity 0.55. |
| Colonnade near | Architrave y 30, 22 tall, `#0B0B0E`. Columns at x 22, 70, 320, 368, widths 30, 26, 26, 30, y 40 to 520, horizontal gradient `#08080B 0, #17161C 0.45, #1E1C22 0.6, #08080B 1` (mirrored on the right), 1.5 px rim `rgba(255,220,160,0.10)` on the shaft side. |
| Colonnade mask | `linear-gradient(180deg, transparent 0, #000 25%, #000 70%, rgba(0,0,0,0.3) 100%)`. Parallax (high tier, not reduced): near `translate3d(calc(var(--tilt-x) * -7px), 0, 0)`, far `-2.5px`. |
| Shaft | `div.tp-shaft` 520 x 560 at `left 50%, top 0, margin-left -260px`; `conic-gradient(from 168deg at 50% -168px, transparent 0deg, rgba(255,231,182,0.10) 8deg, rgba(255,236,196,0.16) 12deg, rgba(255,231,182,0.10) 16deg, transparent 24deg)`; mask `rgba(0,0,0,0.68) 0, #000 80px, #000 429px, transparent 560px`. Opacity 0.85; `tpShaftBreath` 0.85 to 1 to 0.85, 8 s ease-in-out infinite, running only under `[data-live]`. |
| Flare | `div.tp-shaft-flare[data-tp-flare]`, same box, brighter cone (0.22 / 0.34 / 0.22 at 9 / 12 / 15 deg), opacity 0. Each landing: WAAPI 380 ms, 0 to 0.5 by 60 ms, back to 0 (not when hidden or reduced). |
| Pool | Top 420, 120 tall, full width, `radial-gradient(42% 50% at 50% 35%, rgba(216,180,90,0.09), rgba(216,180,90,0) 70%)`. |
| Goal haze | `TempleFront`, above the canvas: top 216, 240 tall, `radial-gradient(38% 100% at 50% 0%, rgba(246,227,161,0.07), rgba(246,227,161,0) 72%)`, no blend mode. |

Opening targets `data-intro="colonnade"` and `data-intro="shaft"` sit on the wrappers. Reduced motion: shaft static at opacity 1, no parallax.

Plinth (`Plinth.tsx`, static). Die `BoxGeometry(1.30, 0.24, 1.30)` at Y -0.12 (top at Y 0); step `(1.66, 0.09, 1.66)` at Y -0.285; step `(2.02, 0.08, 2.02)` at Y -0.37. One obsidian material `#121217`, roughness 0.35, `fluteOn 0`, f0 0.10, reflect 0.8, rim 0.08. Gilded arrises: 8 bars `1.30 x 0.008 x 0.008` on the die's four top and four bottom edges, merged, gold. TEMPERANTIA: canvas 1024 x 128 (512 x 64 low), drawn after `Promise.race([document.fonts.load('700 80px Cinzel'), 300 ms])` and again when the font lands (upload only); letters one by one at 0.2em tracking, cap height 72 percent, fill gradient `#7A5C22 0, #E9CF86 0.45, #F6E3A1 0.55, #8A6A2A 1`, stroke `rgba(0,0,0,0.6)` at `max(1, H / 64)`; `PlaneGeometry(1.10, 0.13)` at `[0, -0.125, 0.6515]`, `MeshBasicMaterial` map, transparent, `depthWrite false`, `polygonOffset` factor -1, FrontSide. Contact shadow: `PlaneGeometry(2.8, 2.8)` flat at Y -0.412, 64 px radial `shadow` texture, `#000000`, transparent, opacity 0.8, `depthWrite false`, `renderOrder -1`, FrontSide.

Column (`Column.tsx`). Shaft `CylinderGeometry(0.36, 0.36, 1, 160, 1)` (80 low), translated +0.5 so the base is the origin, shared by `base` (`scale.y = min(top, 2)`) and `overflow` inside the `break` group (`scale.y = max(0, top - 2)`), with `top = shaftTop(R)`; a mesh under 0.0005 is hidden. `break` sits at `position.y = min(top, 2)`, `position.x = 0.03 * crack`, `rotation.z = -0.0436 * crack` (2.5 degrees) and carries the capital. Shaft material: obsidian `#121218`, roughness 0.22, `fluteOn 1`, f0 0.30, reflect 1.6, rim 0.28. Attic base (static, stands from frame 0): `LatheGeometry` 64 segments (32 low), profile `[r, y]` `[0,0] [0.50,0] [0.512,0.018] [0.515,0.045] [0.505,0.072] [0.480,0.088] [0.440,0.094] [0.410,0.105] [0.398,0.125] [0.410,0.145] [0.440,0.150] [0.452,0.162] [0.458,0.180] [0.448,0.198] [0.420,0.208] [0.380,0.212] [0.366,0.222] [0.360,0.240]`, obsidian `#121218`, roughness 0.22, `fluteOn 0`, f0 0.30, reflect 1.6, rim 0.18. Gold fillets `TorusGeometry(0.513, 0.010, 8, 96)` at Y 0.045 and `(0.456, 0.009, 8, 96)` at Y 0.180, merged. Base, fillets, shaft and ghost sit in the turn group (`rotation.y = mon.rotY`); the shockwave and the ember glow do not.

Capital (`Capital.tsx`), a child of `break` at local Y `max(0, top - 2)`. Echinus `LatheGeometry` `max(24, round(lathe * 0.75))` segments (48 high, 24 low), profile `[0.36,0] [0.375,0.012] [0.40,0.03] [0.43,0.05] [0.45,0.065] [0.455,0.075]`, plus astragal `TorusGeometry(0.37, 0.016, 10, 96)` at local Y -0.01, merged, own gold material. Abacus `BoxGeometry(0.98, 0.045, 0.98)` with its top at local 0.12, obsidian (`fluteOn 0`, rim 0.18) sharing the shaft's crack uniforms. Group scale `min(1, R / 0.36) * mon.capScale`, so it sinks into the base during the rise. Strike: emissive 0 to 0.8 (150 ms `power2.out`) to 0 (150 ms `power2.in`); scale 1 to 1.06 (110 ms `power2.out`) to 1 (110 ms `--ease-settle`).

Obsidian material (`createObsidianMaterial`). One `MeshStandardMaterial` class, `metalness 0`, `toneMapped false`, same `onBeforeCompile` and `customProgramCacheKey` on every instance (shaft, abacus, base, plinth); uniforms are per material, assigned by reference with `Object.assign(shader.uniforms, ...)`; never `clone()`.

| Uniform | Value |
| --- | --- |
| `uCrack` | `mon.crack` |
| `uGoalY` | 2.0 |
| `uTime` | `mon.crackTime`, ticks only while crack > 0 and motion is not reduced |
| `uDepth` | int, 1 high (3D voronoi, 27 taps), 0 low (2D, 9 taps); a live downgrade lowers it |
| `uScale` | 6.0 |
| `uFlute` | 0.014 (both tiers) |
| `uFluteOn` | 1 shaft, 0 everything else |
| `uFluteDepth` | 0.55 |
| `uEmber` | `(2.5, 0.875, 0.3)` linear |
| `uTurn` | `mon.rotY`, removed from `vWorldPos` so the crack field stays on the stone |
| `uGlintY` / `uGlintOn` / `uGlintCol` | `top - 0.04` / `mon.glintOn` / `#F6E3A1`, `#FF6A2B` when the strike crosses |
| `uF0` / `uReflect` / `uRim` | per material (above); `uReflectTint` 0, `uRimColor` `#C9A961` |

Vertex (after `#include <begin_vertex>`), only when `uFluteOn > 0.5`: `f = 0.5 - 0.5 * cos(20a)` with `a = atan(z, x)`; `transformed -= radial * uFlute * f` (scallop deepest at the flute centre); entasis `transformed.xz *= 1.0 - 0.08 * smoothstep(0.5, 2.0, worldY)`; varyings `vFluteXZ`, `vSide = 1 - step(0.5, abs(objectNormal.y))`, `vTanV = normalize(normalMatrix * (-sin a, 0, cos a))`. `vWorldPos` is the world position rotated by `-uTurn`. Fragment: the crack block runs only `if (uCrack > 0.001 && vWorldPos.y > uGoalY - 0.05)`: `above = smoothstep(uGoalY - 0.02, uGoalY + 0.06, y)`, `p3 = vWorldPos * uScale` (uDepth 1) or `p2 = vec2(atan(z, x) * 0.36, y) * uScale` (uDepth 0), `tpVoro` (3 x 3 x (2 * uDepth + 1) cells, loop bounds from the uniform, so WebGL2 only), `edge = 1 - smoothstep(0, 0.06 + 0.04 * uCrack, F2 - F1)`, `climb = smoothstep(0, 1, uCrack * 1.6 - (y - uGoalY) * 0.6)`, `c = above * uCrack * edge * climb`; diffuse to `vec3(0.02)`, roughness to 1, normal `+ 0.6 * c * (dFdx(F1), dFdy(F1), 0)`, emissive `+ c * uEmber * (0.8 + 0.2 * sin(uTime * 3 + F1 * 20))`. Per-pixel flutes after the crack normal, on side faces of the shaft: `w = fract(a * 20 / 2pi) - 0.5`, `fillet = smoothstep(0.40, 0.46, |w|)`, `facing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0, 1)`, `normal += vTanV * (-2 * w * uFluteDepth * (1 - fillet) * smoothstep(0.08, 0.35, facing))`. Glint: `+ uGlintCol * 0.35 * exp(-((y - uGlintY) / 0.06)^2) * uGlintOn`. Reflection (before `#include <opaque_fragment>`): `env = tpEnvSample(reflect(-geometryViewDir, normal) in world)`, `F = mix(uF0, 1, (1 - nv)^5)`, `outgoingLight += env * uReflect * F * (1 - c) + uRimColor * (1 - nv)^3 * uRim * (1 - c)`.

Environment texture (`environment.ts`). One 256 x 128 equirect canvas, `SRGBColorSpace`, `RepeatWrapping` on S, `LinearFilter`, no mips; sampled at `u = atan(z, x) / 2pi + 0.5`, `v = asin(y) / pi + 0.5`. The shaft only reflects rows 0.43H to 0.54H; a normal at angle phi reflects `u = 0.75 - phi / pi`. Painted in this order: base gradient `#0e0e13 0, #0b0b10 0.5, #0a0807 1`; key band `glow(W * 0.5, H * 0.14, W * 0.62, H * 0.16, '#fff1cc', 0.95)`; S-CENTRE `vstrip(192, 28, 0.30H to 0.66H, '#6c604f', 1.0)`; S-KEY `vstrip(156, 9, 0.30H to 0.66H, '#fff3dc', 1.0)`; S-FILL `vstrip(220, 6, 0.32H to 0.64H, '#ffe6be', 0.6)`; S-RIM `vstrip(64, 40, 0.28H to 0.70H, '#d9bc80', 0.7)`. `vstrip` stops 0 / 0.3 / 0.7 / 1 with a 20 percent top and bottom feather (`destination-in`).

Gold (`createGoldMaterial`): `MeshStandardMaterial` `#D8B45A`, metalness 1, roughness 0.22, emissive `#F6E3A1` at 0, reflection strength 1.4, tint 1, f0 1.0, no rim; tone mapped. Separate instances on fillets, capital and arrises; only the capital pulses.

tpFx (`fxMaterial.ts`). One `ShaderMaterial`, `DoubleSide`, `fog false`, transparent, `depthWrite false`, `toneMapped false`, `AdditiveBlending` with `premultipliedAlpha: true`; the fragment writes alpha = its brightest channel. `uMode` 0 ghost, 1 line and collar, 2 radial glow (`uBill` billboards a unit plane by `uBillScale`) or ring band (`uRing`). Default `uGold #D8B45A`, `uFlashCol` and `uHot #FFF7DA`.

Goal line (`GoalLine.tsx`). `PlaneGeometry(6.0, 0.10)` at `[0, 2.0, 0]`, mode 1: `yy = (vUv.y - 0.5) * 0.10 / 0.006`, `core = exp(-yy^2)`, `glow = exp(-|yy| * 0.22) * 0.18 * edge` (`edge` fades the outer 30 percent of the plane height), `glint = max(0, 1 - |x - uSweepX| / 0.45)^3`, sparkle `uSparkle * step(0.985, hash(floor(x * 90), floor(uTime * 6))) * 0.6`, `c = uGold * (core * (0.85 + 0.9 glint + spark) + glow * (1 + 1.5 glint))`, flash `mix(c, uFlashCol * (core + glow) * 1.4, uFlash)`, draw `c *= step(vUv.x, uDraw)` plus hot tip `uHot * exp(-((vUv.x - uDraw) * 60)^2) * 2 * core` while drawing. `uDraw = 0.2 + 0.6 * mon.goalX` (1 when done: the frustum shows about uv 0.23 to 0.77); `uSweepX = mon.shimmerX ?? 2.4 * mon.tiltX` (0 reduced); `uTime` frozen at 0 reduced; `uSparkle` 1 high, 0 low. Collar: `RingGeometry(0.47, 0.545, 96)` flat at Y 2.0, mode 1 ring, circle radius 0.5075, half width 0.006, glow at a quarter, overall 0.65, no glint, alpha `mon.goalFade`. Glow: mode 2 billboard at `[0, 2.0, 0.5]`, scale `[2.4, 0.22]`, `#D8B45A`, alpha `(0.36 + 0.5 * flash) * goalFade`. Crossing flash: `flash` 1 held 90 ms, then 0 over 500 ms `power2.out`.

Ghost (`Ghost.tsx`). `CylinderGeometry(0.372, 0.372, 2.0, 80, 1, true)` translated +1.0, mode 0, `renderOrder 1`, same entasis: `above = smoothstep(uH + 0.004, uH + 0.05, y)`, `rev = 1 - smoothstep(uReveal * 2 - 0.04, uReveal * 2, y)`, `c = uGold * (edge * 0.19 + fres * 0.015 + arris * (0.012 + 0.045 * fres)) * above * rev * top * uAlpha` (`uAlpha` 1) with `fres = (1 - nv)^2.2`, `edge = (1 - nv)^5`, `arris = (0.5 + 0.5 cos(20 atan))^24`, `top = 1 - 0.4 * smoothstep(1.75, 2.0, y)`. `uH = shaftTop(R)`, `uReveal = mon.ghost` (0 at mount, 1 after the opening or `setInstant`). Hidden when `mon.ghost <= 0.001` or `top >= 1.97`.

Shockwave (`Shockwave.tsx`). `RingGeometry(0.9, 1.0, 96)` flat at Y 0.004, mode 2 ring band, scale 0.55 to 1.9 over 480 ms `power3.out`, alpha `0.55 * (1 - p)^2`, `#D8B45A` or `#FF6A2B` when crossing; visible only while `0 <= p < 1`.

Ember glow: mode 2 billboard at `[0, 2.08, 0.30]`, scale `[1.0, 0.5] * (1 + 0.05 * sin(emberPulse * pi))` (2 s period), `#FF5A1F`, alpha `0.65 * crack`, visible while crack > 0.001.

Lights (`Lights.tsx`). `ambientLight #3A3428` 0.22. Key `spotLight #FFE9B8` 22, decay 2, angle 0.5, penumbra 0.8, at `[2.2, 2.6, 3.2]` targeting `[0, 1.2, 0]`. Rim `directionalLight #C8B07A` 2.5 from `[-2.6, 1.3, -2.2]`. Sweep `pointLight #FFF4D6` 9, distance 7, decay 2, at `[3.2 sin(t'), 3.4, 3.2 cos(t')]`, `t' = mon.theta + 0.4 * mon.tiltX`, theta starting at 0.6. Ember `pointLight #FF6A2B`, distance 2.2, decay 2, at `[0, 2.05, 0.6]`, intensity `6 * crack` (mounted at 0). `mon.tiltX` comes from the `tilt` event (live tilt, or the 9 s gold sweep relayed by `tilt.ts`); a tilt sample does not invalidate.

Strike (`strike.ts`, one `Monument` per layer, read by both renderers). The layer subscribes to the store: a new `pulse` sets targets from `totalKcal`; if the LOG sheet is open the slam waits for `logOpen` to go false or 220 ms, whichever comes first; before the column is placed a pulse only moves the target (the opening picks it up); off TODAY it settles silently. `kind: 'log'`: glint on; `h` to `1.015 * H1` over 170 ms `--ease-hit`, then to `H1` over 120 ms `--ease-settle`; at 170 ms: `trauma = 1`, dust burst, impact, capital pulse, stage shake, shaft flare, `vibrate(18)` (crossing: `navigator.vibrate([12, 40, 24])` via the local `buzz`), goal flash if crossing. Impact: `fovPunch` 0 to -0.5 over 130 ms `power2.out` and back over 130 ms `--ease-settle`; `uReflect` x1.5 (1.6 to 2.4) over 60 ms and back over 200 ms on the shaft and base; glint off over 200 ms; shockwave. A strike within 600 ms of the last one retargets and fires no second burst (a crossing still flashes). Crack: crossing blooms at 170 ms over 700 ms `--ease-stone`, otherwise from the start over 700 ms; the ember light follows. `kind: 'remove'`: sink to `H1` over 600 ms `--ease-stone`, then a shimmer `uSweepX` +3 to -3 over 300 ms `power1.inOut`; no dust, no shake; crack to 0 over 600 ms below the line, else to its target. A non-pulse change (goal, import, day rollover) eases over 600 ms `--ease-stone` while shown, silently otherwise. The store write, number, ring and recents never wait.

Shake. `trauma = max(0, trauma - dt * 2.4)` in `tick`; camera offsets as above. DOM: `shakeStage()` toggles `.shake` on `[data-stage]` (`stageShake`, 140 ms linear: 3/-2, -3/2, 2/-1, -2/1 px, back to 0). The opening landing uses trauma 0.75.

Dust (`Dust.tsx`, one `InstancedMesh`). `PlaneGeometry(0.05, 0.05)`, `frustumCulled false`, `renderOrder 3`, `ShaderMaterial` transparent, `depthWrite false`, `NormalBlending`, 64 px `soft` radial map, billboarded (`mv.xy += position.xy * size / 0.05`); seeds from a fixed LCG. Instance order: motes (40 high, 16 low), smoke (12, 6), foot grit then top sparks from the dust count (220 high: 160 + 60; 90 low: 65 + 25). Drawn count = motes, plus smoke and `min(dust, bus.dustCount)` for 1.6 s after a burst; lowering the count trims sparks first.

| Kind | Origin | Velocity | Life, size | Alpha, colour |
| --- | --- | --- | --- | --- |
| 0 foot | radius 0.50 to 0.75, Y 0.02 | out 0.8 to 1.6, up 0.6 to 1.4, gravity -2.2 | 0.7 to 1.1 s, 0.03 to 0.09 | `(1 - t / life) * 0.55`, `#9A8E7A` |
| 1 spark (crossing only) | radius 0.2, Y `renderH(burstTop)` | out 0.3 to 0.8, up 1.2 to 2.0, gravity -1.6 | 1.0 to 1.4 s, 0.02 to 0.05 | `1 - t / life`, `#FF8C42` |
| 2 smoke | radius 0.45 to 0.7, Y 0.03 | out 0.25 to 0.45, up 0.10 to 0.25, `centre = origin + vel * (1 - exp(-2.2t)) / 2.2` | 1.3 to 1.6 s, 0.18 to 0.55 | `(1 - t / life)^1.5 * 0.16`, `#8E826E` |
| 3 mote | `y = mod(s * 4 - uMoteTime * 0.045, 4) - 0.1`, x within `max(0.15, 1.094 - 0.2126y)`, z -0.6 to 1.4 | drifts down | always, 0.010 to 0.024 | `0.5 * (0.55 + 0.45 sin(1.1 uMoteTime + 7 * seed))`, faded at both ends, `#FFE3A8` |

Grit and smoke brighten in the shaft: `1 + 1.2 * (1 - smoothstep(0.3, 1.1, |x|))`. `t = uTime - uBurst - lifeOffset` (offset 0 to 0.12 s); size 0 outside `0 <= t <= life`. Motes advance only on rendered frames.

Idle. While idle is wanted and TODAY is shown: `rotY += 0.035 * dt` (one turn per 180 s), `theta += 2pi / 14 * dt`; frames come from the ticker. Deep idle (another tab, hidden, 90 s without input, reduced motion): no ticker, one `invalidate()` per change.

Over goal. The crown grows toward the 0.30 u asymptote, `break` tilts to 2.5 degrees as crack reaches 1, cracks climb from the line, ember glow and light come up, the ghost hides, the root gets `data-over` (arch haze to ember). All of it reverses on delete.

Reduced motion. Strikes and the opening snap to H, crack set at once, no dust, smoke, shockwave, glint, fov punch, shake, flare or idle turn; theta 0.6; `uTime` frozen; goal line glint at 0; motes drawn but frozen; ghost at rest; no hold windows, so `demand` with one `invalidate()` per change.

Resilience. `webglcontextlost`: `preventDefault`, remount the canvas by key once with the SVG covering; a second loss within 30 s switches to the SVG for the session (section 15). Measurement switches (`debugFlags.ts`): `?tp-noenv` (no reflection injection), `?tp-nocrack` (no obsidian injection), `?tp-chunks` (`tp:gl-chunk-<program>` marks), `?tp-notemple`, `?tp-nomask`; `?tp-std` is parsed and read nowhere.

## 8 Fractured edges overlay technique

Owner `src/components/ui/Shards.tsx` (data `shards-data.ts`, generator `scripts/shards.mjs`). Four strip SVGs (top, bottom, left, right), never one full-screen SVG, so a glint update repaints four thin strips. `App.tsx` renders `<Shards />` inside the 430 px frame: the root is `absolute inset-0`, `pointer-events: none`, `aria-hidden`, z 40 (`--z-shards`), so on a phone the strips hug the viewport and on desktop the slab. Each strip is a wrapper div that takes the placement and an SVG that fills it with `slice` aspect, so a smaller box crops the stone and never stretches it:

| Strip | viewBox | Aspect | Box |
| --- | --- | --- | --- |
| top | `0 0 390 64` | `xMidYMin slice` | top 0, full width, height `max(var(--safe-top), 12px)`, last 6 px masked to transparent |
| bottom | `0 0 390 64` | `xMidYMax slice` | bottom 0, full width, height `calc(var(--safe-bottom) + 6px)` |
| left | `0 0 64 844` | `xMinYMid slice` | 64 px wide, from `safe-top + 40px` to `safe-bottom + 56px` (between the header band and the tab bar) |
| right | `0 0 64 844` | `xMaxYMid slice` | as left, on the right edge |

Shards. Generated once by `scripts/shards.mjs` (mulberry32, seed `7e4d1a5c`) and committed as `shards-data.ts`, so the stone is identical every launch. 7 across the top, 13 down the left, 15 down the right, 3 at each bottom corner; each 4 to 6 points, two flush on the screen edge. Generator depth bounds: top 10 to 44 deepening toward the right, sides 6 to 18 (left deepening toward the bottom, right toward the top), bottom left 8 to 16, bottom right 6 to 13. Actual depths at this seed: top 12 to 22, left 7 to 15, right 7 to 17, bottom 9 to 14; for ordering the test asserts only that the last top shard is deeper than the first, the last left shard at least as deep as the first, the first right shard at least as deep as the last, and the deepest bottom shard on the left. Glint runs follow the inner edge only where its outward normal faces the top left light: segments whose normal has positive x are dropped on the top and bottom strips, positive y on the sides. LOCKED by `src/components/ui/shards-data.test.ts`: the counts 7, 13, 15 and 6, 4 to 6 points, facet ids 0 to 5, at least one glint run per shard, the depth bounds, exactly two flush points, glint normals, and 3 or 4 facet lines on any shard deeper than 24 px. At this seed no shard is deeper than 22 px, so every `lines` array is empty. Layers per strip, no runtime filters:
1. Fill: six `linearGradient` facets at 18, 72, 126, 180, 234 and 288 degrees, stops `#1C1C22 0%`, `#0A0A0D 55%`, `#2A2A31 100%`; each polygon uses one (`nextFacet` never gives the same facet as the shard before it).
2. Fracture: every glint polyline drawn first in `#000` at `stroke-opacity 0.6`, width 1.5, round joins and caps.
3. Glint: the same polylines, width 0.8, stroked with a `userSpaceOnUse` gradient (stops `#F6E3A1` at opacity 0, 0.48 `#F6E3A1`, 0.5 `#FFF7DA`, 0.52 `#F6E3A1`, 1 at opacity 0), group opacity `var(--shard-glint, 0.4)`. Facet lines inside the shards would draw here at 0.18, clipped to the shards (none at this seed).
4. Specular: a band 140 units long across the strip's long axis (64 deep), `#E7E1D2` 0 to 0.16 to 0, clipped to the shard shapes, moved by `translateX(calc(var(--tilt-x) * 120px))` (`translateY` on the sides).

Light (`src/lib/tilt.ts`, started once by `App.tsx`). At rest nothing runs: `--tilt-x` sits at 0 (the `:root` rule), with no animation, no rAF loop, no computed-style read and no event. A loop throttled to 30 Hz (15 Hz on the low tier) runs only while a source is live; it writes `--tilt-x` (-1 to 1, 4 decimals) and `--tilt-angle` (`x * 18deg`) on `:root` as plain custom properties and dispatches a window `tilt` CustomEvent with the value. Each strip listens and sets its glint gradient's `x1`/`x2` (top, bottom) or `y1`/`y2` (sides) to `a = L * (tilt * 1.2 - 0.6)`, `a + L`, with L 390 or 844. Sources: on fine pointers (`(hover: hover) and (pointer: fine)`), the mouse position over `min(innerWidth, 430)` centred; on phones, `DeviceOrientation` `gamma / 30`, clamped, lerped 0.12 per frame, listened to only while Settings GOLD FOLLOWS TILT is on (iOS asks with `requestTiltPermission` inside the tap); there is no offer under the toast. When samples stop for 2500 ms (`LIVE_TIMEOUT`) the light eases back to 0 and the loop ends by itself; it pauses while the document is hidden. There is no auto sweep: the old `goldSweep` keyframe on `:root` and the registered `@property --tilt-x` were removed by the iOS crash hotfix (section 20); `src/lib/tilt.test.ts` asserts that `index.css` has no `.auto-sweep` rule and that the class is never set. `data-sweep="0"` (section 15) disables the loop entirely. `suspendTilt` holds the relay while the opening drives the glint through `emitTilt`; on release the glint eases back to the resting light at 0.18 per frame in a short finite pass. Reduced motion (system or `.reduce-motion`): `--tilt-x` rests at 0, user tilt still allowed. The number, gold borders, shard specular, backdrop key pool and temple parallax read the same variable; the shard glints and the 3D sweep light follow it through the `tilt` event.

Polished centre. Page vignette on `body::after` (`index.css`): `radial-gradient(120% 90% at 50% 38%, transparent 50%, rgba(0, 0, 0, 0.65) 100%)`, fixed, `pointer-events: none`, z 0. `Backdrop.tsx`, fixed full screen at z 0 under the frame, four static layers: (1) key pool, a 96vmax square centred at x 50 percent and y `calc(var(--goal-y) + 40px)`, `radial-gradient(closest-side, rgba(255,247,218,0.09) 0%, rgba(216,180,90,0.055) 34%, rgba(122,94,34,0.024) 62%, transparent 100%)`, following `var(--tilt-x) * 7vw` only while tilt is live and carrying no `will-change`; (2) floor pool `radial-gradient(60% 22% at 50% var(--plinth-y), rgba(216,180,90,0.08), transparent 70%)`; (3) floor falloff `radial-gradient(80% 50% at 50% 100%, rgba(0,0,0,0.5), transparent 70%)`; (4) grain, a 160 px `feTurbulence` tile (`baseFrequency 0.85`, 2 octaves, seed 7) as a data-URI image at opacity 0.055. Reduced motion keeps all four; the key pool stops following the tilt. Desktop (768 px and up): field `#040406` with `radial-gradient(60% 50% at 50% 40%, rgba(216,180,90,0.06), transparent 70%)`, slab `box-shadow: 0 0 0 1px #1A1A21, 0 0 0 2px rgba(216,180,90,0.06), 0 40px 120px rgba(0,0,0,0.8)`, height `min(100vh, 932px)`.

Safe mode (section 15). `data-fx="0"` drops the backdrop key pool. Level 2 (`data-bare="1"`) renders no backdrop and no shards at all (`Backdrop` and `Shards` return null), removes the `body::after` vignette and the desktop field's radial background image (`#root > div`): the plain obsidian page.

## 9 Macro ring geometry

Owner `src/screens/TodayRing.tsx`. SVG `viewBox 0 0 120 120` at 120 px (96 px compact), centre (60, 60), painted in this order: inner bezel circle r 41, `radialGradient` `#121218` to `#0B0B0F`, stroke `rgba(216, 180, 90, 0.35)` 0.6; track r 50, `#0A0A0D`, width 7; groove hairlines at r 46.5 and 53.5, `rgba(231, 225, 210, 0.36)` (the `GROOVE` constant, hard-coded; the `--bone-rule` token holds the same value but is unread), width 0.75. Three arcs as explicit `<path>` arcs from angles (`arcPath`, never dashoffset), width 7, `stroke-linecap butt`, clockwise from `RING_START` -87 degrees (-90 plus a 3 degree half gap), protein, carbs, fat, a 6 degree gap after each (342 shared). Each arc is a `linearGradient` `userSpaceOnUse` from (10, 10) to (110, 110): protein `#FFF1C4` to `#E6C670`, carbs `#D2AE55` to `#9C7B33`, fat `#A88A55` to `#8E7243`. Split by calorie contribution (`macroEnergySplit` in `src/lib/macros.ts`: `protein * 4`, `carbs * 4`, `fat * 9` over their sum), `deg = 342 * share`. A zero macro draws no arc but keeps its gap. Empty day: three 114 degree arcs in `#2A2A33`, no ticks, no letters, centre `0` in bone-dim. LOCKED by `src/screens/TodayRing.test.tsx`: the 114 / 6 / -87 layout closing the circle, the kept gap, the 4/4/9 split, the 342 progress arc, `arcPath` shapes, the empty-day colour and grooves, 12 px letters, the compact mode.

Ticks and letters at each arc's midpoint (only the focused macro's in progress mode): a tick from r 54.5 to 59.5 in the swatch colour (protein `#F2D98A`, carbs `#B8923E`, fat `#8E7243`), width 1.2, drawn only when the arc is longer than 0.5 degrees; the letter P, C or F at r 66.5, Cinzel 700, 0.04em, bone-dim, or bone-mute when its arc is 0.5 degrees or less, `fontSize = letterUnits(size)` = `12 * 120 / size` units, so 12 px at 120 and 15 units at 96. Tip glint (not under reduced motion, not on the empty day): an r 1.5 `#FFF7DA` dot at each arc end, opacity 1 while that arc is still tweening (120 ms in) and 0 after (300 ms out); `drop-shadow(0 0 4px rgba(246, 227, 161, 0.6))` on the high tier only. Motion: on each change the six angles tween over 520 ms `--ease-stone` in rAF (`useTweened`), then each path `d` is rewritten; reduced motion snaps.

Centre (DOM over the SVG): protein grams Cinzel 700 22 px gold-300 `.inscribed` with `g` as `.unit` (Cormorant 500 15 px bone-soft), over PROTEIN `.label` 6 px below at 0.1em (0.04em compact). Readouts (`TodayRingRow`, x 160 to 370, three 44 px rows from the top of the 132 px row, parts 10 px apart): a 12 x 2 swatch with a 1 px `rgba(255, 247, 218, 0.3)` top highlight; label `.label` at 0.1em, 70 px wide (64 compact), gold-300 when active; grams Cormorant 600 20 px bone `.num` plus `.unit` `g`; right aligned Cormorant 600 16 px bone-soft: `of 180 g` when that macro has a target, else its energy share `31%` (`0%` on an empty day). Tapping a readout with a target set flips the ring to single-macro progress mode: one arc of `grams / target` (capped at 342 degrees) in that macro's gradient, the other two collapsed, the row's right column reads the percent of target in gold-300, the centre reads `142 g` over `OF 180`; a second tap or 6 s (restarted by any change to the totals) returns. A macro without a target has no progress mode. There are no target ghost arcs. Compact (`(max-width: 371px)`): ring 96 px, readouts from x 132, the right column becomes `sr-only`, and macros with a target get a 2 px underline whose bottom sits 7 px below the grams (`-bottom-[7px]`), `--rule` track filled `rgba(216, 180, 90, 0.6)` to `grams / target`. Tapping the ring opens the TODAY sheet. The 56 px ring in the HISTORY day sheet is a separate component (`MiniRing`, section 12).

## 10 Log form + recents

Owner `src/screens/Log*`, `src/components/MealForm*`; the sheet is `src/components/ui/Sheet.tsx`, the portion control `src/components/ui/PortionField.tsx`. The LOG keystone opens `LogSheet`: the form, the sticky footer (chips over LOG), RECENT underneath; tap a recent to re-log.

Sheet. Panel `linear-gradient(180deg, #15151B 0px, #0B0B0F 160px)` with a 1 px `rgba(216,180,90,0.55)` top edge, 16 px top corners, max width 430, 20 px side padding, a 48 px `#0B0B0F` underfill so the spring never shows a gap. Grab bar 40 x 3 `--gold-grad-text`, 10 px from the top. Header 56 px: LOG in `.title-sheet` (Cinzel 700 16 px 0.2em bone) over a 72 px meander; right a Segmented md `Quick` | `Build` and the close `X` 22 px in 44 px. Height `min(92svh, calc(var(--vv-h) - var(--safe-top) - 80px))`, which keeps a lane for the top-docked toast; the 430 px frame behind is inert while any sheet is open; under a 620 px visual viewport it pins to it (`top: var(--vv-top)`, `height: var(--vv-h)`). In 420 ms `--ease-spring`, out 200 ms, scrim 0.74 over 320 ms; reduced motion a 160 ms fade. Drag the grab bar or header down (8 px to start): release closes past 30 percent of the height or above 0.5 px/ms (last 80 ms), else springs back. The footer has no rule; rows dissolve under a 20 px fade.

QUICK (`MealFormQuick.tsx`), y from the top of the content column:

| y | Height | Element |
| --- | --- | --- |
| 0 to 12 | 12 | NAME label (`.label`: Cinzel 700 12 px 0.12em bone-dim) |
| 20 to 76 | 56 | NAME (`tp-log-name`), placeholder `Meal`, max 80 |
| 92 to 132 | 40 | Basis switch, Segmented lg: `Per serve`, `Per 100 g`, `Per 100 ml` (`tp-log-basis`, `-serve`, `-g`, `-ml`) |
| 148 to 160 | 12 | CALORIES label; right the basis tag `PER 100 G` gold-300 0.08em (`tp-log-basis-tag`), fades in 160 ms `--ease-cut` |
| 168 to 232 | 64 | CALORIES (`tp-log-kcal`), value Cormorant 600 28 px, suffix `kcal` or `kJ` |
| 248 to 304 | 56 | PROTEIN, CARBS, FAT thirds, 12 px gaps, label inside, suffix `g` |
| 324 | 1 | `--rule` |
| 341 to 361 | 20 | PORTION label; right the live result (`tp-log-result`) |
| 369 to 433 | 64 | PortionField (`tp-log-portion`, `-input`, `-less`, `-more`) |
| 441 to 481 | 40 | PortionPicks (`tp-log-portion-pick-<value>`) |
| 493 to 529 | 36 | Hint (`tp-log-hint`, always rendered) left, SAVE TO LIBRARY toggle (`tp-log-save-library`) right; the toggle wraps under the hint when narrow |
| 553 | | RECENT |

Name suggestions add a 40 px chip row (each chip has a 3 px hit extension to 44 px) 8 px under NAME while typing. Fields are `.tablet-inset` (border `--bone-edge`, focus `#E6CB78` border and ring), Cormorant 600 22 px `.num` bone, placeholder `0`, `inputmode="decimal"`, `enterKeyHint="go"`; only digits, `.` and `,` get in; each typed character buzzes 8 ms. Typed kJ is divided by 4.184 on save. A QUICK prefill focuses CALORIES after 340 ms.

Basis. The typed numbers are label numbers and never convert. Switching resets the amount to 1 serve, 100 g or 250 ml (`BASIS_DEFAULT`), or to the source meal's `usual` on its own basis (`switchBasis`). `QuickDraft` holds `basis` and `amount`; amounts are cleaned (`cleanAmount`: serve to 3 decimals, max 100; g and ml to 1 decimal, max 100 000), never snapped.

Live result. Hidden until calories parse: what LOG adds, serve `kcal x amount`, g or ml `kcal x amount / 100` (`quickResult`), following each keystroke through `onPreview`. `ValueUnit` gold (Cinzel 700 16 px gold-300, U+2009, unit Cormorant 500 15 px bone-soft) then ` · P 16` in `.hint`; counts over 380 ms (instant under reduced motion) with a 300 ms gold glow.

PortionField. h 64, grid `64px 1px 1fr 1px 64px`. Minus and plus 64 x 64, 22 px icons bone-dim; pressed or held gold-300 on `rgba(216,180,90,0.10)`, icon scale 0.9; minus at the minimum `#5E5A54`. Dividers inset 14 px, `rgba(216,180,90,0.42)` fading out. Value Cormorant 600 30 px bone, unit 6 px after it Cormorant 500 18 px bone-soft: `g`, `ml`, `serve` (1 or less), `serves`. Steps: 0.25 serve; 5 g under 50, 10 g under 500, then 25 g; minimum 0.25 serve or 1. Hold repeats after 380 ms, every 70 ms easing to 35 ms, with a `rgba(216,180,90,0.45)` inner hairline and a 120 ms wipe on each changed digit. Typed values commit on blur or Enter; nonsense reverts with `.shake` (140 ms) and a 10 ms buzz. The buttons never take focus from the input. Focus: border and unit gold-300.

PortionPicks. Four 40 px chips, 8 px gaps, 1 px `--gold-edge`; number Cinzel 700 13 px 0.04em bone-dim plus unit Cormorant 500 15 px (serve picks: number only). Active: `.gold-border`, `rgba(216,180,90,0.12)`, number gold-200. Sets: serve `0.5, 1, 1.5, 2`; g `100, 150, 200, 250`; ml `150, 250, 330, 500`. A `usual` outside the set replaces the first pick and carries a 5 px solid rhombus (`Usual, 180 grams`). Tap buzzes 6 ms; the keyboard stays up.

Hint and save. The hint (`.hint`, Cormorant 600 15 px bone-soft) is empty unless typed calories differ from the 4/4/9 sum by more than 8 percent: `Macros add to 526 kcal.` Never blocks. SAVE TO LIBRARY is on for a new non-empty name, off for an empty name or a library meal's name; an explicit tap wins.

Keyboard. Focusing the amount scrolls the PORTION block `scrollIntoView({ block: 'end' })` next frame and again at 320 ms (`scroll-margin-bottom: 12px`). Enter in the amount commits, then submits. LOCKED: calories alone enable LOG (`MealForm.test.ts`, `needs calories alone to log`); an empty name is stored as `Meal` (`store-extra.test.ts`, `logQuick cleans the name and clamps silly servings`).

Name suggestions (`LogSuggestions.tsx`, not a datalist): up to 5 chips from the 40 newest recents, distinct by name, matched by `matchesQuery`, hidden on a single exact match; trailing `180 g · 175 kcal`, max width 260. Tap fills the draft with the basis and amount eaten (`draftForEntry`) and focuses CALORIES.

BUILD (`MealFormBuild.tsx`). INGREDIENT (right `3 added`); search 48 px with `search` 18 px gold-500, placeholder `Search` (disabled, `No ingredients saved yet`, with an empty library); up to 6 hits, 48 px rows, `per 100 g · 165 kcal` at the right; Enter adds the first; none: `Nothing by that name.` Component rows min-h 64, grid `minmax(0,1fr) 96px auto 44px`: name 19 px over the macro line (bone-mute plus REMOVED when the ingredient is gone), a 44 px amount with its unit, kcal `ValueUnit`, `X` 22 px. No rows: `Add ingredients to build a meal.` Totals bar 48 px between `--gold-line` rules: kcal `ValueUnit` gold, then ` · P 42 · C 78 · F 14` in `.meta`. Then MEAL NAME and SAVE TO LIBRARY.

Footer. The chip row (`.chip-row`, 8 px gaps, sideways scroll, right 28 px masked) hides while the keyboard is up. First REPEAT (`tp-repeat-yesterday`) when yesterday holds an entry: `rotate-ccw` 16 px gold-400, `REPEAT`, trailing `1 951 kcal`, max width 200; one tap copies all of yesterday onto today in one write (`repeatDay`), toast `Logged · 2 140 kcal · yesterday's meals`, UNDO removes the copies; a second tap during the close is ignored. Then up to 8 favourites by last use (`favouritesByUse`): 40 px, `#16161C`, `--gold-edge`, name Cinzel 700 12 px 0.1em gold-300, max 168 px, no trailing energy; tap = `logMeal(id)` at the usual amount. LOG: gold, full width, 56 px, Cinzel 700 15 px 0.24em `#17110A`; disabled (no calories, or no BUILD amount above 0): `#121218` with a `--gold-edge` outline and label `#9C9791`, never opacity.

Submit. Store writes are synchronous. A QUICK draft still holding exactly what a library meal filled in (name, basis, numbers within 0.6 kcal and 0.06 g), on the meal's own basis (no `per`, or a g or ml `per`; a meal with a serve `per` falls through to `logQuick`), calls `logMeal(id, basis === 'serve' ? amount : { amount, unit: basis })`, which also stores the amount as the meal's `usual`. Otherwise `logQuick` with `servings: amount` (serve) or `per: { amount: 100, unit }, amount` (g, ml) and `saveToLibrary`. BUILD: `logQuick({ name, macros, servings: 1, components, saveToLibrary })`. The sheet closes, the strike plays from the store `pulse`, the toast reads `Logged · 180 g · 175 kcal` (`Logged · 612 kcal` for one serve) with UNDO (`deleteEntry`) for 4 s; `closeLog` runs first, so it settles in the lane above the tab bar (a toast docks at the top only while a sheet stays open). Never a confirm dialog. If persistence failed the entry stays in memory and the toast reads `Saved for this session only. Export now.` (ember edge, 8 s) with EXPORT, which opens the SETTINGS tab.

RECENT (`LogRecents.tsx`). Heading RECENT with the strong gold rule, right `Last 12` in `.hint`. Source `recentEntries(entries, 12, settings.hiddenRecents)`: the last 12 distinct `name + per-serving kcal` pairs (`recentKey`) across all days, newest first. Rows 56 px, grid `14px minmax(0,1fr) auto 44px`, ruled `--rule`: a 5 px solid rhombus on the newest row only; name Cormorant 500 19 px bone, truncating, then ` · 180 g` (Cormorant 500 16 px bone-soft, never truncates); `.meta` `P 16 · C 7 · F 9`; kcal `ValueUnit`, gold-300 on the newest; `square-plus` 22 px, gold-300 and turned 90 degrees while pressed. Tap = `relogEntry` (the exact snapshot), close, toast, strike. Long press 450 ms = prefill QUICK with it. Swipe left past 72 px = hide (folds 220 ms; key kept in `settings.hiddenRecents`, last 200). Right click opens EDIT FIRST | HIDE; Delete or Backspace hides, `E` edits first. Rows stagger in on open; a row logged since the last open washes gold 900 ms and its rhombus scales in 240 ms. Empty: `Nothing logged yet.` (Cormorant 500 italic 17 px bone-soft).

TODAY sheet (`TodaySheet.tsx`, from EATEN or the ring): today's entries newest first, the same 56 px rows with `3:20 pm · P 16 · C 7 · F 9` and a 44 px trash; swipe left past 88 px deletes (folds 220 ms), toast `Removed · 612 kcal` with UNDO (`restoreEntry`); tap edits the snapshot (`updateEntry`). The kJ setting applies to every number.

## 11 Library + favourites folder

Owner `src/screens/Library*`. Header and search stay put over a fade, `linear-gradient(180deg, #050507 0%, #050507 70%, rgba(5,5,7,0) 100%)`, padding-bottom 16 px. Header 56 px: LIBRARY `.title-screen` (Cinzel 700 18 px 0.2em bone); right a 44 px `plus` 22 px gold-300 that opens the ADD sheet (NEW MEAL, NEW INGREDIENT: 64 px rows, Cinzel 700 14 px 0.16em gold-300, a `.hint` note each). Search: `.tablet-inset` 48 px, `search` 18 px gold-500, Cormorant 600 20 px, placeholder `Search`, a 44 px clear `X`; it filters all three sections. Sections 32 px apart; lists stagger in once per session.

Rows (`LibraryRow.tsx`), every list: 60 px, grid `1fr 44px 44px`, ruled `--rule`, `content-visibility: auto` (plain `ul`, no virtualisation). The body is one button that opens the detail sheet: a 14 px mark gutter, the name Cormorant 500 19 px bone (truncating) with the energy `ValueUnit` bone on the same line, and the `.meta` line (Cormorant 600 16 px bone-soft, whole grams) under both. Then the star (20 px in 44: off bone-dim; on gold-400, fill `rgba(216,180,90,0.28)`) and, on meal rows, `square-plus` 22 px: one tap logs the usual amount (`logMeal(id)`, 8 ms buzz, toast with UNDO), a solid rhombus flashes in the gutter (300 ms) and the plus holds at 90 degrees gold-300 for 900 ms. Long press 450 ms anywhere (10 px of movement cancels) toggles the favourite. Ingredient rows keep an empty action cell so the kcal column lines up.

FAVOURITES (`tp-fav-folder`): favourite meals and ingredients together, last used first, then name. `SectionHeading` with `folder-heart` 16 px gold-400 and the screen's one strong gold rule. Right: `ALL 12` / `FEWER` when there are more than 8, and a 18 px chevron to collapse (state in `localStorage` key `temperance.fav.collapsed`). Hidden when nothing is marked; a search with no match reads `Nothing matches.` Favourite meals also get the one-tap plus. The same meals, by last use, feed the LOG chips.

MEALS: heading with the count (`8`, `.hint`) and a Segmented sm `A TO Z` | `MOST` (`tp-meals-sort`); it takes the strong rule only when the folder is hidden. A TO Z = `libraryMeals` (favourites first, then alphabetical); MOST = `useCount` descending, then name. Meta `P 69 · C 70 · F 18`, led by the basis for a per-amount meal (`per 100 g · P 9 · C 4 · F 5`). Empty `No meals yet.`, no match `Nothing matches.` INGREDIENTS: the count; meta `per 100 g · P 31 · C 0 · F 4`; value = kcal per basis; no plus (logged from the detail sheet). Empty `No ingredients yet.`

Detail sheet (`LibraryDetailSheet.tsx`, title `Meal detail` or `Ingredient`). Name Cormorant 500 26 px bone, a 14 px gold-400 star when favourite. A `.tablet` of numbers scaling live with the amount: kcal `ValueUnit` 32 px gold-300, PROTEIN, CARBS, FAT `ValueUnit` 20 px bone. 20 px under it the PORTION label row with the basis right (`per 100 g · 97 kcal`, `.hint`), the PortionField and PortionPicks (section 10). Meal: unit `meal.per?.unit ?? 'serve'`, start `meal.usual ?? meal.per?.amount ?? 1`, its usual marked on the picks. Ingredient: unit `per.unit`, start the basis amount; picks `1, 2, 3, 4` times the basis when it is a serve or under 50 (olive oil per 10 ml: `10, 20, 30, 40`). Actions 24 px below: LOG gold full width 56 px, `180 g · 175 kcal` centred under it in `.hint`; EDIT and FAVOURITE hairline 56 px side by side; DELETE danger, half width, centred: the first tap arms `DELETE?` for 3.5 s, any other tap disarms, the second deletes with toast `Removed · Greek yoghurt` (no UNDO). Note Cormorant 500 italic 16 px bone-soft: `Edits change future logs only. Past days keep their numbers.` (ingredients add `and saved meals`). Meal LOG `logMeal(meal.id, meal.per ? { amount, unit } : amount)`, which makes the amount its new `usual`; ingredient LOG `logQuick({ name, macros, per, amount })`, so the entry records `180 g`. A built meal lists BUILT FROM under the actions (amounts and kcal scaled by the portion, `removed from the library` for a gone ingredient) with a BUILD link that reopens it in the LOG sheet.

Editor (`LibraryEditor.tsx`, tall sheet, SAVE gold in the footer, disabled until valid). Meal: KIND `Numbers` | `Built` (new meals only); NAME. Numbers: the 40 px basis switch (a meal saved per 30 g shows `Per 30 g`); switching never converts the numbers and resets USUAL to 1, 100 or 250 (or the meal's own on its own basis); CALORIES 64 px with the basis tag; macro thirds; the 8 percent hint. Built: component rows with a 44 x 132 px amount, gold totals, ADD INGREDIENT search. Then USUAL: right `one tap logs 175 kcal`, a PortionField bound to `usual`. Foot: `Past days keep their numbers.` (edits) and a FAVOURITE toggle. Save calls `addQuickMeal`, `addBuiltMeal` or `updateMeal(id, { name, macros or components, favourite, per, usual })`. Ingredient: NAME; COUNTED PER, a 44 x 104 px amount beside Segmented `G` | `ML` | `SERVE`; CALORIES; thirds; hint; foot `Saved meals keep their numbers.`

Empty library: search, folder and sort hidden; one EmptyState 48 px under the header (`.tablet.bracketed`, `ColumnGlyph`, `Nothing saved yet.` Cormorant 500 italic 18 px bone-soft) with two hairline 44 px buttons 8 px apart, `+ MEAL` and `+ INGREDIENT`.

Snapshots: editing or deleting a meal or ingredient never touches entries; built meals keep their component snapshots.

## 12 History

Owner `src/screens/History*`. Two modes behind LEDGER | BODY: Segmented md 44 px in a 168 px slot, centred (`tp-history-mode`), remembered in `localStorage` key `temperance.history.mode`. The sticky header is `#050507` with its bottom 24 px fading out. LEDGER adds a 56 px month row: `chevron-left` and `chevron-right` 18 px in 44 px targets around `October 2026` in `.title-screen` (Cinzel 700 18 px 0.2em bone).

THE COLONNADE (`HistoryColonnade.tsx`). A strip 180 px tall: 154 px of column, a 6 px stylobate (1 px `rgba(216,180,90,0.42)`, 3 px `#121218`, 2 px `#0B0B0F`), 20 px of day numbers. Days from `historyDays(entries, anchor, 30)`; the anchor is today, the chevrons move it to the end of the previous or next month (back disabled when nothing is older, forward disabled at today). Columns 22 px wide with 8 px gaps (tap target 30 x 180), newest at the right, weeks snapped with `x proximity`, 20 px gutters faded by a mask. The goal is a fixed hairline `rgba(216,180,90,0.8)` at 60 percent of the column (92 px), labelled `GOAL` Cinzel 700 12 px 0.08em gold-300 at the right gutter. Height `round(eaten / goal x 92)`, floor 4, cap 154 (`columnHeight`).

| Part | Value |
| --- | --- |
| Shaft | horizontal `#15151B`, `#24242C` 0.45, `#3A3A44` 0.75, `#1C1C24` (lit from the right) |
| Flutes | at 30, 50, 70 percent, `#E7E1D2` at 0.07, 0.12, 0.05 |
| Cap | 2 px `#D8B45A` |
| Today | `#D8B45A` to `#B8902E`, flutes `#5A4518`, cap `#E6CB78`, a 40 px glow `radial-gradient(50% 50% at 50% 100%, rgba(216,180,90,0.45), transparent 70%)` |
| Over | shaft to the line, then an ember tip (`#FFB088`, `#FF5A1F` 0.3, `#B3300A`, min 5 px) with a `#FFB088` cap; `drop-shadow(0 0 3px var(--ember-glow))` on high tier only |
| Untracked | 4 px stub `#22222A` at 0.6 |
| Day number | Cinzel 700 12 px; gold-300 today, bone-dim tracked, bone-mute untracked |

Columns rise once, `scaleY` 0 to 1 over 500 ms `--ease-stone`, 22 ms apart from the right. Nothing ever logged: 14 ghost stubs at 0.3 and `The ledger opens with your first meal.` (Cormorant 500 italic 18 px bone-soft). Tap a day: the day sheet.

Stat stones (`HistoryStones.tsx`): one `.tablet.bracketed` row 96 px, three equal cells; value Cinzel 700 24 px over a Cinzel 700 12 px caption. `AVG 7 DAYS` (`2 015 kcal`, gold-300, mean of the logged days), `UNDER` (`5 of 7`, logged days at or under the goal), `STREAK` (Arabic, `disciplineStreak`, laurel behind at 0.7). Nothing logged in the window: `·` in bone-mute; STREAK reads `0` once anything was ever logged.

THIS WEEK (`HistoryWeek.tsx`): strong gold rule, right `7 days`. The last 7 days newest first, rows 56 px, grid `14px 72px 96px 1fr auto` (the kcal right aligned in its own column, P in its own column): rhombus on today; `THU 15` Cinzel 700 12 px 0.08em (gold-300 today); `ValueUnit` 17 px (gold-300 today) and `P 117` in `.meta`; the delta Cinzel 700 12 px 0.08em, `272 LEFT` bone-dim or `flame` 14 px and `340 OVER` ember-text. Untracked day: `Nothing logged.` bone-mute. An empty week is one row `Nothing logged this week.` Then EARLIER (`To 90 days`): logged days 7 to 89 days back. Tap a row: it opens inline (420 ms `--ease-stone`) to the 56 px ring, readouts, its entries and OPEN DAY. Then MONTHS (`Before 90 days`): older logged days grouped by month, 56 px rows: `OCT 2026`, the average per logged day, a 48 x 6 bar against a tick at 60 percent, `5 of 9 under`; tap opens its days.

Day sheet (`HistoryDaySheet.tsx`). Title `Today`, `Yesterday` or `Mon 13 Oct`; header right the day total, `ValueUnit` 17 px gold-300. A 56 px ring (arcs only, flat `#F2D98A`, `#B8923E`, `#8E7243`), readouts and the delta. Entries newest first, 56 px rows `14px minmax(0,1fr) auto 44px`: name with ` · 180 g`, `.meta` `3:20 pm · P 16 · C 7 · F 9`, kcal, `trash-2` 22 px. Swipe left over an ember field, release past 72 px deletes; trash deletes too. Toast `Removed · 612 kcal`, UNDO puts the snapshot back (`restoreEntry`). Only that day changes. Empty: `Nothing logged yet.`

BODY (`HistoryBody.tsx`). WEIGHT (strong rule): a `.tablet.bracketed`, padding 18, the latest weigh-in in `GoldNumber` 44 px without brush plus `kg` 22 px, its day under it; right two stones, `7 DAY TREND` (`DOWN 0.9 kg`, `UP 0.4 kg`, `LEVEL`, or `No trend yet.`) and `ABOVE TARGET` / `BELOW TARGET` (`4.1 kg`), `TARGET` (`AT TARGET` when the latest, to 0.1 kg, equals it) or, with no target set, `TO TARGET` over `Set a target in Settings.`; values Cinzel 700 `clamp(18px, 5.4vw, 22px)`. Chart (`HistoryWeightChart.tsx`): 90 days, height 160, plot insets left 30, right 6, top 12, bottom 26, gridlines `rgba(231,225,210,0.06)` 0.5 px every whole kg (every 2, 5, 10, 20 or 50 kg when a kilogram is under 4 px), labels at least 18 px apart in Cinzel 700 12 px `#D3CDC2`, target gold-400 at 0.6 dashed `4 4` with `TARGET 80.0` gold-300, area `rgba(216,180,90,0.16)` to 0, line 1.5 px gold-400, the last point a 4 px gold-200 dot in an 8 px `rgba(216,180,90,0.25)` halo. No weigh-ins: EmptyState `No weigh-ins yet.`, no stones, no chart. Input row: kg input and LOG WEIGHT (gold), `1fr 1fr`, 12 px gap, 56 px; one weigh-in per day, a second replaces it (`Logged · 84.3 kg`, `Updated · 84.3 kg`). RECENT WEIGH-INS: the last 10, 56 px rows `14px minmax(0,1fr) auto auto 44px`, kg `ValueUnit` (gold-300 today), change `0.4 down` in `.meta`, `trash-2` 20 px bone-mute; toast `Removed · 84.1 kg` with UNDO. PROGRESS PHOTOS: COMPARE and ADD PHOTO, a 3-column grid with 8 px gaps, tiles framed `0 0 0 1px #2A2A33, 0 0 0 2px rgba(0,0,0,0.8)` with the day (`TODAY`, `MON 12 OCT`) Cinzel 700 12 px 0.08em bone on a 48 px gradient; empty: `No photos yet.` with ADD PHOTO. Photos live in IndexedDB, outside the backup.

Goal: every day compares against the current `settings.goalKcal`; there is no per-day goal.

## 13 Settings

Owner `src/screens/Settings*`. Reached from the tab bar. Sticky header 64 px, SETTINGS `.title-screen` centred, fading from `#050507` at 55 percent. At safe level 1 or 2 (section 15) a SAFE MODE tablet heads the column (`SettingsSafeMode.tsx`, `tp-safe-mode`, `aria-label="Safe mode"`): `.tablet.bracketed`, padding 12 px 18 px 16 px (no `flush`, so the Tablet's own `px-[18px]` outranks the `px-4` it is given), a `SectionHeading` with a 16 px `ShieldAlert` and SAFE MODE, the line `The 3D column and moving gold are off because the app stopped on this phone.` (Cormorant 500 17 px bone, leading 1.4), and a full-width hairline TRY FULL MODE (`tp-safe-mode-full`, size sm) 16 px below. TRY FULL MODE (`tryFullMode`) removes `temperance.safe` and `temperance.boot` from `localStorage` and `temperance.flags` from `sessionStorage`, then reloads on `?safe=0`. Nothing renders at level 0. Then three groups 16 px apart, each a `.tablet.bracketed` with padding 4 px 16 px 8 px, headed inside by a rhombus and `I · GOALS`, `II · DISPLAY`, `III · DATA` (`.label`, gold-300, 16 px top padding, a `--rule` 12 px under it). Rows min-h 60 (14 px top and bottom), divided by `--rule`, label Cinzel 700 12 px 0.12em bone-dim. Two layouts (`SettingsRow`): `column`, the control in a 168 px right column (`SETTINGS_COL`); `stack`, the label above a full-width control. Column inputs are 44 px carved fields, Cormorant 600 22 px right aligned, unit inside (the macro thirds are 56 px, label inside, value left); all select on focus, commit on blur or Enter, and revert when unusable. Buttons are 44 px and fill the column.

| Row | Layout | Control | Store |
| --- | --- | --- | --- |
| DAILY GOAL | column | input in the display unit, `fromInputEnergy` on commit | `setGoalKcal` |
| MACRO TARGETS | stack | three 56 px thirds, PROTEIN, CARBS, FAT inside, suffix `g`; 0 hides that ghost arc | `setTargets` |
| TARGET WEIGHT | column | kg, one decimal; empty clears; 0 or 500 and over keep the old value | `setTargetWeight` |
| UNITS | column | Segmented `KCAL` / `KJ`; display only, x 4.184 on output, kcal stored | `setUnit` |
| HERO FIGURE | stack | Segmented `REMAINING` / `EATEN` | `setHero` |
| GOLD FOLLOWS TILT | column | Toggle; on calls `requestTiltPermission()` inside the tap; refused: `Motion access was not allowed.` | `setTilt` |
| MOTION | stack | `SYSTEM` / `REDUCED` / `FULL` = `'system'` / `'on'` (forces reduced) / `'off'` (forces full) | `setMotion` |
| OPENING | stack | `SHORT` / `FULL DAILY` / `OFF` | `setOpening` |
| REPLAY OPENING | column | `REPLAY` (`rotate-ccw`): `introCount` to 0, toast `The opening will play next launch.` | `resetIntro` |
| INSTALL | column | only while installable, `INSTALL` (`house-plus`) | `runInstall` |
| EXPORT | column | `EXPORT` (`share-2`, or `download` without `navigator.canShare`): `temperance-YYYY-MM-DD.json` through the share sheet when `canShare({ files })`, else a download; toast `Exported · <file>`. iOS outside the app adds `Safari clears unused sites after 7 days. Install the app or keep a backup.` | `exportData` |
| IMPORT | column | `IMPORT` (`upload`) picks a JSON file; a valid backup opens a carved panel under the row: name, `12 meals · 48 entries`, a cancel `X`, `MERGE` / `REPLACE`, then a confirm (`IMPORT`, or armed danger `REPLACE EVERYTHING` under `Replace clears what is on this device first.`); toast `Imported · 12 meals · 48 entries`. A bad file: an inline line and a warn toast `That file is not a Temperance backup.` (4 s) | `importData` |
| ERASE ALL | column, then stack | danger `ERASE` (`x`); the first tap arms for 6 s: full-width `ERASE EVERYTHING` and an `X` to keep; the second erases the store and the photos, toast `Erased.` | `resetAll` |

Footer, centred: a 120 px meander; `.hint` lines `Data lives on this device.`, `Days reset at local midnight.`, `12 photos · 8.4 MB. Photos stay on this device and are not in the backup.` (count only when there are photos); the sources line Cormorant 500 15 px bone-soft `Long, Gummere, Carter, Higginson translations, public domain`; `TEMPERANCE · V0.1.0 · <hash>` in `.label` 0.08em bone-mute (`__APP_VERSION__`, `__BUILD_HASH__`).

Install (`SettingsInstall.tsx`). Installable: not standalone, and a captured `beforeinstallprompt` or iOS. Besides the row, one toast-lane prompt, never a floating card: after the opening, 20 s on SETTINGS or LIBRARY, only when no toast is showing and no sheet is open (retry every 4 s), once a session: `Keep it on the home screen.` with INSTALL for 8 s (iOS `Share, then Add to Home Screen.`, no action). Showing it snoozes it 14 days (`localStorage` key `temperance.install.snoozed`); a declined install snoozes too. The row ignores the snooze.

Schema. `SCHEMA_VERSION` 4, persisted as `temperance.v1` with `version` 4; `migrate` passes data through and `merge` fills settings from `DEFAULT_SETTINGS` (goal 2500, targets 180 / 250 / 80 g, `kcal`, motion `'system'`, opening `'short'`, hero `'remaining'`, tilt false, `hiddenRecents` empty). v2 added `opening`, `hero`, `tilt`, `hiddenRecents`; v3 `weights`, `targetWeightKg`; v4 `Meal.per`, `Meal.usual`, `LogEntry.portion`, all optional so older backups import unchanged. `Settings.name` is stored and never shown. No `goalByDay`. A failed write sets `persistFailed` and the data stays in memory (section 10). Progress photos live in IndexedDB, outside the export.

## 14 Daily stoic line

Data `src/lib/stoic.ts`; one consumer, `TodayStoic.tsx`, the stoic block on TODAY between the ring row and the bottom spacer over the tab bar (72 px plus the safe bottom: bar 56, keystone rise 8, air 8) (layout in section 6): a `figure` (`data-intro="stoic"`, `data-room` roomy, snug or tight), the line in a `blockquote` Cormorant 400 italic 19 px bone-dim, centred, `line-clamp-2` at max 326 px, `text-wrap: balance`, leading 1.35 (1.15 tight); the author in a `figcaption` `.label .inscribed` (Cinzel 700 12 px 0.12em bone-dim) 8 px under (6 px tight). The 96 px meander shows only at a block height of 108 px or more, the 24 x 1 gold-400 rule only at 86 px or more; its floor is 108 px on frames of 780 px and taller (safe areas included), so a 390 x 844 phone shows them; shorter frames get 67 px and line and author only. It rises in with the opening's S7 (section 5). Nowhere else: no notification, no modal, never bold, never boxed.

Pick (`stoicLineForDay(dayKey)`). The key is `useToday()` (local day, rolls over at midnight). `parseDayKey` gives local midnight; `daysSinceEpoch = floor((getTime() - getTimezoneOffset() * 60000) / 86400000)`; the index is `((daysSinceEpoch % 30) + 30) % 30` (30 = `STOIC_LINES.length`). Same line all day, the next line the next day, one full cycle every 30 days.

Sources, public-domain translations only (file header): George Long (Meditations 1862, Discourses 1877), Richard Gummere (Letters to Lucilius, Loeb 1917 to 1925), Elizabeth Carter (Enchiridion 1758), Thomas Higginson (1865). The SETTINGS footer credits them (section 13).

LOCKED (guard `src/lib/stoic.test.ts`): exactly 30 lines; every author non-empty; every text under 100 characters; no U+2013, U+2014 or `!`, and no spaced hyphen ` - `; two consecutive days (2026-10-13, 2026-10-14) give different lines. Line 28 uses U+2019 in `heaven’s`.

| # | Line | Author |
| --- | --- | --- |
| 1 | Confine thyself to the present. | Marcus Aurelius |
| 2 | Let not future things disturb thee. | Marcus Aurelius |
| 3 | Look within. Within is the fountain of good. | Marcus Aurelius |
| 4 | Adapt thyself to the things with which thy lot has been cast. | Marcus Aurelius |
| 5 | Death hangs over thee. While thou livest, while it is in thy power, be good. | Marcus Aurelius |
| 6 | Do not act as if thou wert going to live ten thousand years. | Marcus Aurelius |
| 7 | Be like the promontory against which the waves continually break. | Marcus Aurelius |
| 8 | That which is not good for the swarm, neither is it good for the bee. | Marcus Aurelius |
| 9 | Nothing happens to any man which he is not formed by nature to bear. | Marcus Aurelius |
| 10 | No longer talk about the kind of man that a good man ought to be, but be such. | Marcus Aurelius |
| 11 | It is not the man who has too little, but the man who craves more, that is poor. | Seneca |
| 12 | We suffer more often in imagination than in reality. | Seneca |
| 13 | Begin at once to live, and count each separate day as a separate life. | Seneca |
| 14 | Until we have begun to go without them, we fail to realize how unnecessary many things are. | Seneca |
| 15 | No man can have a peaceful life who thinks too much about lengthening it. | Seneca |
| 16 | Hunger costs but little; squeamishness costs much. | Seneca |
| 17 | Indulge the body only so far as is needful for good health. | Seneca |
| 18 | The body should be treated more rigorously, that it may not be disobedient to the mind. | Seneca |
| 19 | While we are postponing, life speeds by. | Seneca |
| 20 | First, to have what is necessary, and, second, to have what is enough. | Seneca |
| 21 | Some things are in our control and others not. | Epictetus |
| 22 | Men are disturbed not by the things which happen, but by the opinions about the things. | Epictetus |
| 23 | Never say of anything, I have lost it; but, I have restored it. | Epictetus |
| 24 | No man is free who is not master of himself. | Epictetus |
| 25 | First say to yourself what you would be; and then do what you have to do. | Epictetus |
| 26 | It is impossible for a man to learn what he thinks he already knows. | Epictetus |
| 27 | If you want to improve, be content to be thought foolish with regard to external things. | Epictetus |
| 28 | Practise yourself, for heaven’s sake, in little things, and thence proceed to greater. | Epictetus |
| 29 | It is difficulties which show what men are. | Epictetus |
| 30 | Only the educated are free. | Epictetus |

## 15 Non-WebGL fallback + GPU tiering

Owner `src/scene/SafeCanvas.tsx`, `src/scene/webgl.ts`, `src/scene/tier.ts`, `src/scene/FallbackMonument.tsx`. Detection at boot (`probeWebGL`, cached for the page, throwaway context released with `WEBGL_lose_context`): LOCKED, the 3D path requires `canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' })` (hard-coded guard: `probeWebGL` asks only for webgl2; `probeTier` and `canUseWebGL()` in `SafeCanvas.tsx` refuse the canvas when `probeWebGL().ok` is false), because the crack shader's loop bounds come from a uniform (GLSL ES 3.00). A `null` context, an exception, or a software renderer (`UNMASKED_RENDERER_WEBGL`, else `RENDERER`, matching `/swiftshader|llvmpipe|software|basic render/i`) gives tier none and the SVG monument. `SafeCanvas` decides before `<Canvas>` mounts and reports `onFallback('no-webgl')` in a microtask; a class error boundary wraps the canvas and reports `onFallback('error')`. LOCKED: `<Canvas` and `import { Canvas } from '@react-three/fiber'` appear only in `SafeCanvas.tsx`; guard `src/scene/canvas-lint.test.ts`. Context loss: the first remounts the canvas by key with the SVG covering; a second within 30 s calls `onFallback('context-loss')`. An error or a second loss sets tier none for the session (none is never cached). Settings MOTION = REDUCED does not force the fallback.

THE SVG MONUMENT (`FallbackMonument.tsx`, same `mon` as the 3D, no React state per frame). Stage 390 x 513, plinth top y 460, goal y 216, 122 px per unit vertically, 123 px per unit horizontally at the column's depth. Drawn height `R = renderH(mon.h)`.

| Part | Spec |
| --- | --- |
| Plinth | Die and two steps projected through the rest camera (plain math). Tops: step 3 `#211E19`, step 2 `#26221C`, die `#4A3F2A` to `#6B5C3B` vertical gradient. Fronts `#121218` to `#0B0B0F`. Gold arrises: 1 px `#E6CB78` at 0.9 round the die top and along the die's bottom front edge. TEMPERANTIA as SVG text, Cinzel 700 12 px, letter-spacing 2 px, `#D8B45A`, on the die face. Contact shadow ellipse rx 190, ry 30, `#000` 0.8 to 0. Static from frame 0. |
| Shaft | Rect 88 px wide (`2 * 0.36 * 123`) from the goal line to the front foot, `scaleY(min(R - 0.12, 2) / 2)` from y 460. Gradient `#0C0C10 0, #2A2A33 0.22, #121218 0.45, #8A8578 0.64, #1A1A21 0.72, #0C0C10 1`. 10 flute lines 1 px at `-cos(a) * 44`, alternating `#FFF3DC` 0.13 and `#000` 0.24. Rims 1.5 px `rgba(217,188,128,0.55)` at both edges. |
| Attic base | Path from the 3D lathe profile, gradient `#0C0C10 / #24242C 0.25 / #141419 0.5 / #5C584F 0.66 / #1A1A21 0.76 / #0C0C10`. Two fillet arcs, stroke `#D8B45A` 1.2 at 0.85. Static. |
| Capital | At the shaft top, scale `min(1, R / 0.36) * capScale`: astragal bar and echinus in a gold gradient `#7A5C22 / #E9CF86 0.45 / #F6E3A1 0.6 / #8A6A2A`, abacus `0.98 * 123` wide with a 1 px `#E6CB78` top line at 0.5. |
| Crown | Over the line: a shaft group `0.18 * 122` px tall, `scaleY(upper / 0.18)`, `rotate(-2.5 * crack deg)` and `translate(3.6 * crack px)` about the line. |
| Cracks | 7 jagged paths above the line, clipped to the crown, stroke `#FF5A1F` 1.2, `pathLength 1` draw-on by `stroke-dashoffset` over `--t-crack` (700 ms) `--ease-stone`; `ceil(crack * 7)` visible (at least 1 when crack > 0); `drop-shadow(0 0 6px var(--ember-glow))` unless `data-tier` is `low` (so on under tier none). Ember ellipse rx 62, ry 30 at y 206, opacity `0.65 * crack`, `mix-blend-mode: screen`. |
| Goal line | Rect 1.5 px `#EBD08A` across the stage at y 216, `drop-shadow(0 0 6px rgba(246,227,161,0.45))`, `scaleX(mon.goalX)` from the left. Flash adds `drop-shadow((6 + 8f) px, alpha 0.35 + 0.5f)`. Collar ellipse rx 61.5, ry 7, stroke `#F6E3A1` 1 px, opacity `0.7 * goalFade`. |
| Ghost | 92 px rect, horizontal fill `#D8B45A` at 0.16 edges / 0.03 centre; edge lines 1.25 px at 0.5; four lines at x plus or minus `0.31 * 46` and `0.81 * 46` at 0.14. Clipped from `yOf(2 * mon.ghost)` down to the crown; hidden when `mon.ghost <= 0.001` or `R >= 1.97`. |
| Light band | 40 px rect `rgba(255,244,214,0.14)` peak, clipped to the shaft. Its `tpBandSweep` animation uses `var(--t-light-sweep)`, which `src/index.css` does not define, so the band sits still at the column centre. |
| Dust | 12 spans, 6 px `#9A8E7A`, in one row at top 456 (plinth top minus 4), x `cos(a) * r` from the centre with `a = 2pi * i / 12 + 0.3` and `r` 64 / 80 / 96 px, hidden until a landing, then `tpDustRise` 800 ms `--ease-stone` (delays 0 to 120 ms, scale to 0.4, opacity 0.6 to 0). Not under reduced motion. |

Strikes play from the same `mon` tweens as the 3D (170 ms hit to 1.015, 120 ms settle, 600 ms sink). Shake: the root gets `.shake` when trauma jumps by more than 0.3 (not under reduced motion), plus `shakeStage()` on `[data-stage]`. Joining: if the canvas compiles within 600 ms of the layer mounting it shows at once and the SVG is hidden; later, the SVG plays the opening and the canvas crossfades in over 200 ms `--ease-stone` once the opening is done. The SVG is the `SafeCanvas` boundary fallback only when no layer bus exists (`standalone`, a still of the store). It sits inside the same DOM temple (section 7); the shaft does not breathe in SVG mode (the ticker, which sets `data-live`, runs only in WebGL mode). `tp-column` carries `data-h`, the raw `mon.h`.

GPU tiering (`tier.ts`). Low and high are cached in `localStorage` `temperance.tier` as `{ tier, at }` for 30 days; none is never cached. Order at boot: WebGL probe, then cache, then heuristic; a heuristic low is cached at once, a heuristic high waits for the frame probe.

| Tier | Condition | Settings |
| --- | --- | --- |
| none | no webgl2, software renderer, canvas error, two context losses in 30 s | SVG monument in the same DOM temple, `no-grain` on `<html>` (set for every tier but high), static colonnade, tilt 30 Hz, crack drop-shadow on |
| low | `hardwareConcurrency <= 4`, or `deviceMemory <= 4`, or `dpr^2 * min(innerWidth, 430) * 513 > 1.2e6` (a DPR 3 phone), or the median of the first 30 frame times over 20 ms (measured while `frameloop` is `always`) | `dprMax` 1.0, dust 90, shaft 80 segments, lathe 32, inscription 512, `uDepth` 0, no sparkle, no antialias, motes 16, smoke 6, ticker 12 fps, tilt 15 Hz, `no-grain` on `<html>`, static colonnade |
| high | everything else | `dprMax` 1.5, dust 220, shaft 160 segments, lathe 64, inscription 1024, `uDepth` 1, sparkle, antialias, motes 40, smoke 12, ticker 24 fps, tilt 30 Hz, colonnade parallax |

Crash-loop guard (`<script id="tp-boot">` inline at the top of `index.html`, app half `src/lib/boot.ts`; tested in `src/lib/boot.test.ts` and `src/lib/bootGuard.test.ts`). Plain ES5 that runs before any stylesheet, font or module, every storage call guarded (no storage means no crash or sticky level; URL switches still apply). Each boot writes `localStorage` `temperance.boot` = `{ at, stable: false, level }`; `installStableMark` in `main.tsx` marks it stable after 30 s (`STABLE_MS`) or at once on `pagehide` or when the page goes hidden, since leaving is not a crash. A previous boot that never became stable and is under 90 s old (`CRASH_MS`) counts as a crash and steps up one level, at most 2. Only a real crash makes the level sticky: `temperance.safe` = `{ level, at }`, honoured for 14 days. URL switches `safe`, `gl`, `fx`, `sweep`, `intro` are read from the query and kept for the tab in `sessionStorage` `temperance.flags`, except `safe=0`. The level is `max(crash, sticky, ?safe=1|2)`; `reason` is `crash`, `sticky`, `url` or `none`. `?safe=0` clears the sticky level for good, the same as TRY FULL MODE, and is not kept for the tab session; a new crash re-arms the guard (a crash seen in this tab still steps up on `?safe=0`). The result goes on `<html>` before first paint: `data-safe="0|1|2"` always; `data-gl="0"`, `data-fx="0"`, `data-sweep="0"`, `data-intro="0"` at any level of 1 or more, or each alone from its URL switch set to 0; `data-bare="1"` at level 2; and `window.__tpBoot = { level, flags, reason }`. Readers (`safeLevel`, `featureOff`, `isBare`) read the attributes on every call.

| Switch | Effect |
| --- | --- |
| `data-gl="0"` | `probeWebGL` returns `ok: false` without creating any context, not even the throwaway: tier none and the SVG monument |
| `data-fx="0"` | flat gold (section 2); no CSS animation or transition, `backdrop-filter`, `filter`, blend mode or `will-change` on any element; no backdrop key pool; sheets still open and close, instantly (Sheet unmounts on a timer, never on `transitionend`) |
| `data-sweep="0"` | no tilt loop (section 8) and no opening light sweeps over the number or the shards |
| `data-intro="0"` | no opening: `useOpening` picks the `none` variant and the home screen is the final frame at once |
| `data-bare="1"` | level 2 only: no backdrop, no shards, no vignette (section 8) |

Both tiers use the same `MeshStandardMaterial` programs, `uFlute` 0.014 and the one 256 x 128 environment texture; the `physical`, `envRes` and `tiltHz` fields in `TierSettings` are read by nothing (`tilt.ts` reads `getTier()` itself). `<html>` carries `data-tier`. A mid-session downgrade applies the dpr cap, dust count, ticker rate, tilt rate, `uDepth`, colonnade parallax and `no-grain` at once; segments, lathe, inscription, antialias, sparkle, motes and smoke are fixed at mount and change on the next launch through the cache. drei `PerformanceMonitor` (`flipflops={3}`), mounted only inside `always` windows: decline sets `dpr` to `[1, max(1, min(1.25, cap))]` and the dust count to at most 90; incline restores `[1, dprMax]` and the tier count. Every `setDpr` uses the clamped `[1, max]` form, so dpr never goes below 1.0 or above the tier cap.

## 16 Motion tokens

```css
:root {
  --ease-cut: cubic-bezier(0.7, 0, 0.2, 1);        /* chisel reveals, clip-path */
  --ease-stone: cubic-bezier(0.16, 1, 0.3, 1);     /* settles, draws, fades, sinks */
  --ease-hit: cubic-bezier(0.6, 0, 1, 0.4);        /* the strike rise */
  --ease-settle: cubic-bezier(0.34, 1.56, 0.64, 1);/* overshoot return */
  --ease-sheet: cubic-bezier(0.2, 0.9, 0.2, 1);    /* spring fallback */
  --ease-count: cubic-bezier(0.2, 0.9, 0.2, 1);
  --ease-enter: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-press: cubic-bezier(0.2, 0, 0, 1);
  --ease-spring: linear(0, 0.068 5%, 0.217 10%, 0.394 15%, 0.561 20%, 0.705 25%, 0.817 30%, 0.9 35%, 0.956 40%, 0.991 45%, 1.011 50%, 1.02 55%, 1.023 60%, 1.021 65%, 1.018 70%, 1.014 75%, 1.01 80%, 1.007 85%, 1.004 90%, 1.002 95%, 1);

  --t-hit: 170ms;  --t-settle: 120ms;  --t-shake: 140ms;  --t-dust: 1100ms;
  --t-capital: 300ms;  --t-flash: 90ms;  --t-crack: 700ms;  --t-crack-out: 600ms;
  --t-count: 380ms;  --t-gold-flash: 600ms;  --t-ring: 520ms;  --t-sink: 600ms;
  --t-press-in: 70ms;  --t-press-out: 300ms;
  --t-sheet-in: 420ms;  /* on --ease-spring */
  --t-sheet-out: 200ms;
  --t-tab: 180ms;  --t-tab-out: 120ms;  --t-tab-in: 260ms;  --t-indicator: 360ms;  --t-sweep-wipe: 460ms;
  --t-roll: 560ms;  --t-roll-stagger: 28ms;
  --t-row-in: 420ms;  --t-row-stagger: 35ms;  --t-new-row: 900ms;  --t-row-out: 220ms;
  --t-toast-in: 320ms;  --t-ghost: 440ms;  --t-shockwave: 480ms;
  --t-always: 1600ms;  /* scene strike window */
  --t-digit: 120ms;  --t-toast: 4000ms;  --t-fade: 160ms;  --t-gold-sweep: 9s;
  --t-opening: 1900ms;  --t-opening-short: 700ms;  --t-opening-reduced: 240ms;
}
@supports not (transition-timing-function: linear(0, 1)) { :root { --ease-spring: var(--ease-sheet); } }
```

CSS reads only `--ease-cut`, `--ease-stone`, `--ease-press`, `--ease-spring`, `--ease-enter`, `--ease-sheet` and `--t-press-in`, `--t-press-out`, `--t-sheet-in`, `--t-sheet-out`, `--t-indicator`, `--t-tab-in`, `--t-sweep-wipe`, `--t-shake`, `--t-crack`, `--t-row-in`, `--t-row-stagger`, `--t-new-row`, `--t-toast-in`. `--t-gold-sweep` is still defined but nothing reads it since the auto sweep was removed (section 8). One read dangles: the SVG fallback's light band (`.tp-svg-band` in `FallbackMonument.tsx`) runs `animation: tpBandSweep var(--t-light-sweep) linear infinite`, and `--t-light-sweep` is no longer defined, so the declaration is invalid at computed-value time and the band does not sweep. The rest are reference values; the number that runs is a constant in TypeScript:

| Motion | Constant | Value |
| --- | --- | --- |
| Strike, scene | `MS` in `src/scene/strike.ts` | hit 170, settle 120, shake 140, dust 1100, capital 300, ghost 440, flash 90 (decay 500), crack 700, crack out 600, sink 600, coalesce 600, always 1600, light sweep 14000, shockwave 480 |
| Idle turn, live idle | `T.turn` in `tokens.ts`, `LIVE_IDLE_CAP` in `ticker.ts` | 0.035 rad/s, 90 000 ms |
| Opening | `FULL_MS`, `SHORT_MS`, `FADE_MS` in `src/intro/timeline.ts` | 1900, 700, 240 ms |
| Hero odometer | `ROLL_MS` in `TodayOdometer.tsx` | 560 ms, 28 ms per cell from the right |
| Ring arcs | `useTweened(flat, 520, easeStone)` in `TodayRing.tsx` | 520 ms |
| Tab out, in phase | `TAB_OUT_MS` in `App.tsx` | 120 ms linear, then `.tp-tab-in` 260 ms; phase cleared after 300 ms |
| Sheet | `SHEET_OUT_MS`, `REDUCED_FADE_MS` in `Sheet.tsx` | 200 ms `cubic-bezier(0.4, 0, 1, 1)`, 160 ms; scrim in 320 ms linear |
| Toast | `OUT_MS`, `duration` in `Toast.tsx` | 200 ms out, 4000 ms default life |
| Row delete | `FOLD_MS` in `TodaySheet.tsx`, inline in `LogRecents.tsx` | 220 ms, height and opacity to 0 |
| PortionField repeat | `REPEAT_DELAY`, `REPEAT_EVERY`, `REPEAT_FLOOR` | 380, 70 easing by 0.9 to 35 ms |

Press. `.press` transitions transform, colours, border and shadow over `--t-press-out` on `--ease-spring`; `:active` scales to `var(--press-scale, 0.97)` over `--t-press-in` on `--ease-press`. Per component `--press-scale`: 0.97 gold, ghost, chip; 0.98 hairline, danger; 0.94 icon button, tab slot; 0.96 keystone; 1 segment. `.portion-pick` (0.97) and `.portion-step` (1) set the variable but do not carry `.press`, so it is inert there: a pick never scales and a step only scales its icon to 0.9. Gold surfaces also light from the press point: `press.ts` writes `--px`/`--py` and restarts `.is-lit`, and the `.press-light-spot` child span runs `radial-gradient(circle at var(--px) var(--py), rgba(255,247,218,0.55), transparent 60%)` from opacity 0.9 to 0 over 450 ms `--ease-press`. The keystone ring goes `0 0 0 0 rgba(246,227,161,0.45)` to `0 0 0 14px rgba(246,227,161,0)` over 520 ms `--ease-press`. The disabled gold button is a `#121218` cover with a `--gold-edge` inset line; enabling slides its `clip-path` from `inset(0)` to `inset(0 0 0 100%)` over 220 ms `--ease-cut`.

Lists. `.tp-stagger > *` runs `tpRowIn` (opacity 0 and `translateY(10px)` to rest) over 420 ms `cubic-bezier(0.2, 0.7, 0.2, 1)` `backwards`, delay `var(--stagger-delay, 0ms) + min(var(--i), 8) * 35ms`; each `.row-rule::after` draws `scaleX` 0 to 1 from the left 80 ms later. `--stagger-delay` is 120 ms inside a sheet. `useStaggerOnce(tab)` returns the class once per tab per session (`sessionStorage` `temperance.staggered.<tab>`), on every mount inside a sheet, never under reduced motion. New row `.row-new`: `rgba(216,180,90,0.14)` to 0 over 900 ms. Mark `.rhombus.is-new` scales 0 to 1 over 240 ms; `.rhombus.is-flash` goes `#fff7da` and scale 1 to 1.4 to 1 over 300 ms; `.row-action` SquarePlus rotates 90 degrees over 200 ms. `.rise-in` (14 px, 500 ms, delays 60 / 120 / 240 / 300 ms) and `.hairline-gold` are still defined; nothing uses them.

Other CSS motion: tab wipe `.tp-sweep-run` 460 ms `--ease-stone` (`linear-gradient(100deg, transparent 30%, rgba(216,180,90,0.28) 46%, rgba(255,90,31,0.1) 54%, transparent 68%)`, `background-size: 300% 100%`); tab and segmented indicators 360 ms (`--ease-stone` and `--ease-spring`); toggle knob 180 ms `--ease-stone`; toast in 320 ms `--ease-spring` from 12 px below (from 12 px above when docked at the top); digit wipe 120 ms `--ease-cut`; invalid shake 140 ms (`stageShake`, 3 px). There is no gold auto sweep: nothing animates `--tilt-x` in CSS (section 8).

GSAP owns the opening (`src/intro/timeline.ts`, `useOpening.ts` inside `gsap.context`) and the strike (`src/scene/strike.ts`); CSS and the Web Animations API own everything else. No `motion` or framer package is installed.

Reduced motion (system `prefers-reduced-motion` unless Settings FULL, or Settings REDUCED). `useMotionClass` keeps `html.reduce-motion` (setting `'on'`) and `html.force-motion` (setting `'off'`) in sync. The CSS block (`:root:not(.force-motion)` under the media query, and `:root.reduce-motion`) sets `animation-duration` and `transition-duration` to `0.01ms`, one iteration and `animation-fill-mode: both` on every element and pseudo-element; removes press `transform` and `scale`; keeps `.row-new` at 900 ms because it carries information. So every CSS colour change is instant and tabs swap at once with no wipe (`App.tsx` skips the out phase). Motion that must still read runs on the Web Animations API, which the block does not touch: sheets fade 160 ms, the hero number crossfades opacity 0.35 to 1 over 120 ms. No stagger, no press light, no `vibrate`. Reduced motion removes movement, never information. Safe mode `data-fx="0"` (section 15) goes further than reduced motion: `animation: none` and `transition: none` with `!important` on every element and pseudo-element, plus no filters, blend modes, `backdrop-filter` or `will-change`.

## 17 Icon set

All from `lucide-react` (`^1.56.0` in `package.json`), `currentColor`. Every lucide element in `src` passes `strokeWidth={1.5}`; no test enforces it. No emoji anywhere.

Sizes as used: 24 px tab icons and the keystone plus; 22 px row actions, close `x`, the PortionField steppers, the LIBRARY add; 20 px the library star, the weigh-in trash and the editor remove `x`; 18 px search, the search clear `x`, chevrons, the back arrow, the editor ingredient-add plus and the photo viewer actions; 16 px icons inside buttons and chips (the detail sheet BUILD chevron included), section heading icons, toast undo, warnings, weight trend; 14 px the flame beside OVER labels and the favourite star beside a detail title. Colour: bone-dim at rest, gold-300 pressed or active, gold-400 for the active tab icon, section heading icons and the REPEAT and trend icons. Exceptions at rest: search icons gold-500; the LIBRARY add plus and the editor ingredient-add plus gold-300; the weigh-in trash bone-mute.

| Use | lucide name |
| --- | --- |
| TODAY tab | `landmark` |
| LIBRARY tab | `book-marked` |
| LOG keystone | `plus` (24 px, `#17110a` on gold) |
| HISTORY tab | `scroll-text` |
| SETTINGS tab | `settings` (the tab only; the header right slot is the streak) |
| Favourite on / off | `star`: rows stroke gold-400 with fill `rgba(216,180,90,0.28)` when on, bone-dim off; detail sheet title and FAVOURITE button `fill-current` when on |
| Favourites folder heading | `folder-heart` |
| Log one portion from a row | `square-plus` (rotates 90 degrees on press) |
| Repeat yesterday, replay opening | `rotate-ccw` |
| Undo in toast | `undo-2` |
| Edit | `pencil` |
| Close sheet, remove row, cancel | `x` |
| Delete entry, photo, weigh-in | `trash-2` (row buttons bone-dim, ember-text when pressed; the HISTORY day sheet swipe reveal ember-text, ember when armed; the photo viewer DELETE action in the ember tone; weigh-in trash bone-mute, ember-text when pressed) |
| Portion stepper | `minus`, `plus` |
| Add meal, ingredient, ingredient row | `plus` |
| Confirm, saved state | `check` |
| Search fields | `search` |
| Month navigation, back | `chevron-left`, `chevron-right` |
| Row and day disclosure | `chevron-right` |
| Collapse a section | `chevron-down`, `chevron-up` |
| Export, share photo | `share-2` (Web Share) or `download` |
| Import | `upload` |
| Install | `house-plus` |
| Add photo | `image-plus` |
| Compare photos | `columns-2` |
| Weight trend | `trending-up`, `trending-down`, `minus` |
| Over the line marker | `flame` |
| Warnings (import error, quota) | `triangle-alert` |
| Sheet grab bar | a plain 40 x 3 px div, radius 2, `--gold-grad-text`, no icon |

## 18 Copy rules

No em dashes and no en dashes anywhere (UI, quotes, toasts, this file); use a middle dot `·`, a comma or a full stop. Vitest checks it for the strings it covers (`stoic.test.ts`, `LibraryFormat.test.tsx`, `LibraryScreen.test.tsx`, `LogRepeat.test.tsx`, `History.test.ts`, `Settings.test.ts`, `TodayRing.test.tsx`, `TodayScreen.test.tsx`); the polish-spec section 9 `perl` check over `src` and `docs` is a release step, not a test. No emoji; lucide SVG icons only.

Labels short, uppercase Cinzel (`.label`), one or two words, sentence case in source and uppercased by CSS: LOG, QUICK, BUILD, PORTION, RECENT, REPEAT, FAVOURITES, MEALS, AVG 7 DAYS, UNDER, STREAK, GOAL, `I · GOALS`. No full stops on labels. A heading's right slot is Cormorant `.hint` and stays as written: `Last 12`, `7 days`, `To 90 days`. Sentences are Cormorant, sentence case, full stop. Lower-case fragments without a full stop appear only as row meta or a label row's right slot: `one tap logs 175 kcal`, `removed from the library`, `0.4 down`, `5 of 9 under`. The one field hint is the macro line, `Macros add to 526 kcal.`, only past 8 percent; the other notes under SETTINGS rows are the iOS backup note and `Replace clears what is on this device first.`

Numbers: thin space U+2009 thousands grouping (`formatInt`), kcal integers, whole grams in list meta, one decimal where stored that way in fields. Units lowercase after the number. `ValueUnit` and the LOG sheet strings (`energyLine`) put U+2009 before the unit; the LIBRARY, HISTORY and TODAY sheet strings and `formatAmount` use a plain space. No minus sign on energy: `energyLine` takes the magnitude and `deltaText` returns one (`History.test.ts`, `LogRepeat.test.tsx`); the hero reads OVER THE LINE in ember, lists `340 OVER` in ember-text with a flame against `272 LEFT` in bone-dim. Percent `51% of goal`.

Portion label (`portionLabel`), after a name as ` · 180 g`: empty for exactly one serve; `180 g`; `250 ml`; `1.5 serves`; `0.5 serve` (singular at 1 or less); never `×`. Spoken `Greek yoghurt, 180 grams, 175 kcal`. Dates `Today`, `Yesterday`, else `Mon 13 Oct` (`formatDayLabel`); week rows `THU 15`; times `3:20 pm` (`formatTime`).

Toasts: `Logged · 612 kcal`, `Logged · 180 g · 175 kcal`, `Logged · 2 140 kcal · yesterday's meals`, `Removed · 612 kcal`, `Removed · Greek yoghurt`, `Logged · 84.3 kg`, `Updated · 84.3 kg`, `Removed · 1 photo`, `Exported · temperance-2026-10-15.json`, `Imported · 12 meals · 48 entries`, `Erased.`, `Keep it on the home screen.`, `Saved for this session only. Export now.` Empty states, one line: `Nothing logged yet.`, `Nothing saved yet.`, `Nothing logged this week.`, `The ledger opens with your first meal.`, `No weigh-ins yet.`, `No photos yet.`, `Nothing matches.` Errors state the fact, not the apology: `That file is not a Temperance backup.`, `Motion access was not allowed.` The one progress word is `Saving...`.

Never preachy, never a streak nag, never an exclamation mark (`stoic.test.ts` and `Settings.test.ts` check `!` in their strings). Voice: the stone speaks in inscriptions, the app in short sentences; Jacob is never addressed by name on screen.

## 19 Signature moment

THE STRIKE. Jacob taps LOG (or a favourite chip, or a recent's `square-plus`). The store write sets `pulse`; `afterLog` closes the sheet (200 ms out) and shows the toast. The DOM never waits for the scene: each changed hero digit rolls to its new value (560 ms, 28 ms per cell from the right, section 6), a 600 ms WAAPI pass writes `--tilt-x` -1, 1 (offset 0.82), then back on the number wrapper, and the macro ring re-cuts its arcs over 520 ms (section 9). The toast reads `Logged · 612 kcal` for exactly one serve, else `Logged · 180 g · 175 kcal` (`loggedToastText`), with UNDO, for 4000 ms; an unsaved write shows `Saved for this session only. Export now.` instead (section 20).

The slam waits for the sheet to close or 220 ms, so it starts as the sheet leaves (`strikeLog`, section 7): the charge glint rides the shaft top, the stone rises to `1.015 * H` in one 170 ms `--ease-hit` and settles in 120 ms. At 170 ms: the camera shakes and the stage jolts 3 px for 140 ms, grit and smoke burst off the foot, the shockwave crosses the die, the capital flares, the stone's reflection flares, the fov punches -0.5, the DOM shaft of light flares and the phone buzzes 18 ms. Frames run `always` for 1600 ms; a second log within 600 ms retargets with no second burst. Logged from another tab, the column settles silently.

On the log that carries the column from under the line to or past it (`crossed`: before under `GOAL_Y`, after at or over), the glint and shockwave turn ember, sparks leap from the top, the line and collar flash `#FFF7DA` (90 ms, then 500 ms decay) and the buzz becomes `[12, 40, 24]`. A later log on a day already over strikes in gold with the 18 ms buzz. When a crossing log puts the day over, the crack blooms from 170 ms over 700 ms (a later over-day log grows it from 0 ms): fissures climb from the line, the stone above the seam leans up to 2.5 degrees (the full lean at 25 percent over), ember glow and light come up; the arch haze turns ember over 700 ms (CSS) as soon as the store write lands. The ember breathes in the cracks for as long as the day stays over. A delete is the quiet reverse: a 600 ms sink and one shimmer along the line, no dust, no shake. The SVG monument plays the same tweens (section 15); reduced motion snaps the column and crossfades the number. The opening foreshadows it: the column rises once and lands with dust, no buzz (section 5). Every log is a strike; the crack is the strike he does not want.

## 20 Risks + mitigations

| Risk | Mitigation |
| --- | --- |
| Shader compile freezes the first open (Pad King PR 19: seconds on Windows ANGLE, older Android) | `frameloop="never"` until one `gl.compileAsync` per program (5) has run with a rAF between, then one `gl.compileAsync(scene, camera)` for the rest (section 7); the crack loop bound is the `uDepth` uniform; no environment map or PMREM, only the painted 256 x 128 texture. The SVG monument covers from frame 0; ready within 600 ms (`EARLY_JOIN_MS`) the canvas takes the rise, later it crossfades in once the opening is done (section 5). No test drives the join windows. |
| Uniform loop bounds need WebGL2 | `probeWebGL` asks only for `webgl2` with `failIfMajorPerformanceCaveat`; webgl1 and software renderers get the SVG monument (section 15). LOCKED: with `data-gl="0"` the probe never calls `getContext` and the layer mounts the SVG (`webgl.test.ts`). |
| The camera tilt makes 122 px per unit approximate | `--goal-y` and `--plinth-y` are projected from world Y 2 and 0 with the rest camera (`ColumnScene.tsx`), or written from the design values times `k` in SVG mode (`MonumentLayer.tsx`); the hero, flanks and goal marker read them (section 6). 263 and 507 survive only as `:root` defaults and the `Wordmark.tsx` fallbacks. |
| Two meshes at the seam | One shared `CylinderGeometry(0.36, 0.36, 1, ...)` (`COL_R`) for `base` and `overflow`; `break` sits at `min(top, 2)` with `top = shaftTop(R)` and carries the capital; `renderH` caps the crown at 0.30 u over the line (section 7). |
| `frameloop` demand plus `always` windows: a missed `invalidate` leaves the column mid-strike | Every tween on `mon` has `onUpdate: invalidate`; each strike holds `always` for `MS.always` 1600 ms (LOCKED, `strike.test.ts`); in `demand` the integrator invalidates again while `Monument.tick` reports motion; the ticker ticks once on becoming visible. `scripts/verify.mjs` (puppeteer-core) shoots 260, 680 and about 1580 ms after LOG and 300, 900 and about 2300 ms after an over strike; a person reads them. |
| iOS drops WebGL contexts in the background | `SafeCanvas` calls `preventDefault` on `webglcontextlost` and remounts the canvas by key once with the SVG covering; a second loss within 30 s (`CONTEXT_LOSS_WINDOW`) falls back for the session at tier none (section 15). No test backgrounds the app mid-strike. |
| iOS tilt needs `requestPermission` inside a gesture | Tilt is opt-in only: Settings GOLD FOLLOWS TILT calls `requestTiltPermission` inside the tap; there is no post-log offer. Without it the light rests at 0 on the phone (on desktop a mouse or other fine pointer still moves it, no setting needed); no default sweep exists any more (next row). |
| The iPhone Safari crash: a registered, inherited `--tilt-x` animated on `:root` every frame (the 9 s `goldSweep`) hit a WebKit style-cache bug, memory growing about 190 MB/s (`boot.ts`) | Removed: no `goldSweep`, no `.auto-sweep`, `--tilt-x` a plain custom property (0 on `:root`), no `will-change` on the gold face. `tilt.ts` loops (30 Hz, 15 Hz low) only while a source sends samples; 2500 ms after the last (`LIVE_TIMEOUT`) it eases back to 0 (lerp 0.12 per frame) and stops once there; at rest no rAF, no style read, no `tilt` event. LOCKED by `tilt.test.ts` ("no infinite root animation"). Its grep covers `index.css` only; `tpShaftBreath` (`Temple.tsx`, paused unless `[data-live]`) and the inert `tpBandSweep` (`FallbackMonument.tsx`) sit in injected styles on single elements. |
| A crash that repeats on every launch | Crash-loop guard: inline `<script id="tp-boot">` right after the charset meta, plain ES5, storage guarded. A previous boot (`localStorage` `temperance.boot`) still unstable and under 90 s old (`CRASH_MS`) steps up one level. Level 1 sets `data-gl`, `data-fx`, `data-sweep`, `data-intro` to `"0"` on `<html>`: SVG monument, flat gold with no CSS animation, transition, filter or blend, no tilt loop, no opening. Level 2 adds `data-bare="1"`: no backdrop, shards or vignette. A crash level sticks 14 days (`temperance.safe`). `installStableMark` marks the boot stable after 30 s (`STABLE_MS`) or at once on `pagehide` or hidden. URL switches `?safe=0`, `?safe=1`, `?safe=2`, `?gl=0`, `?fx=0`, `?sweep=0`, `?intro=0` hold for the tab (`safe=0` acts once). SETTINGS shows the SAFE MODE tablet at level 1 or 2 with TRY FULL MODE (reloads on `?safe=0`). LOCKED by `bootGuard.test.ts` and `boot.test.ts`. |
| Cinzel digits are proportional | Fixed cells: odometer `DIGIT_W` 0.62em and 0.28em thin space, `.digits` elsewhere; `.num` is `lining-nums tabular-nums`. No automated `1111` against `8888` or kJ five-digit check. |
| Cormorant oldstyle figures make lists uneven | `.num` (`lining-nums tabular-nums`) on Cormorant numerals; not enforced. |
| Background-clip text with layered gradients on Safari | No feature detect (`index.css` has one `@supports`, for `linear()`). No blend mode on the number; the brush layer is high tier only (`TodayOdometer.tsx`, `.no-grain`); `data-fx="0"` paints the gold flat `#d8b45a` with no clip. `contain: paint` sits on `.gold-num`, not on the odometer root. |
| Keyboard covers LOG on iOS PWA (no Done key) | Sheet height `min(92svh, calc(var(--vv-h) - var(--safe-top) - 80px))`; under 620 px (`KEYBOARD_UP_PX`) the panel pins to `--vv-top` and `--vv-h`; LOG sits in the sticky footer; the favourites row hides while the keyboard is up. Not tested on Safari or standalone. |
| Fonts swap during the opening | Five woff2 preloaded (Cinzel 700 and 400, Cormorant 400, 500, 400 italic); Cinzel 700 `font-display: block`, the rest `swap`; Cormorant 600 not preloaded. The wordmark waits for `document.fonts.ready` at most 300 ms (`FONTS_CAP_MS`) inside the 1900 ms budget. Georgia fallbacks at `size-adjust` 92 percent (Cinzel) and 104 percent (Cormorant). |
| GitHub Pages under `/temperance/` | Vite `base` `/temperance/`; manifest `start_url` and `scope` the base; preloads and icons via `%BASE_URL%`; Workbox `navigateFallback` `/temperance/index.html`; `public/404.html` redirects any unknown path to `/temperance/` (`location.replace`). |
| An installed PWA keeps an old release | `registerType: 'autoUpdate'`; `main.tsx` asks the service worker to update when the app returns to the foreground, at most once a minute. |
| Safari evicts localStorage after 7 days uninstalled | One install toast after 20 s on SETTINGS or LIBRARY (snoozed 14 days) and the SETTINGS INSTALL row; Export in SETTINGS; `temperance.v1` persisted with `version` 4, `migrate` passing data through and `merge` filling defaults. |
| Local day boundaries | `localDayKey` from local date parts; `useToday` re-reads at local midnight and on `visibilitychange` and `focus`. `toISOString` is ruled out by a comment in `day.ts`, not by a test. |
| Quota or private-mode write failure | `safeStorage` catches the `setItem` throw and sets `persistFailed`; the entry stays in memory and the strike still plays. The LOG sheet then shows `Saved for this session only. Export now.` (warn tone, 8000 ms) instead of the Logged toast; its EXPORT action switches to the SETTINGS tab, it does not export. Writes from LIBRARY, TODAY and HISTORY do not warn. |
| A stoic quote carries a dash in some translation | LOCKED, `stoic.test.ts`: 30 lines, an author on each, under 100 characters, no U+2013, U+2014, ` - ` or `!`. Translations named in the `stoic.ts` header: Long, Gummere, Carter, Higginson. |
| Shake and dust turn cheap if repeated | 3 px for 140 ms once per strike; a strike within 600 ms (`MS.coalesce`) retargets without a second burst. Pulses come only from writes to today's log, so tabs, scroll and other store changes never shake; those settle over 600 ms. |
| Live idle and ticker cost battery | Ticker 24 fps (12 low) only in WebGL mode, with idle wanted, TODAY shown, the document visible, the root on screen and under 90 s (`LIVE_IDLE_CAP`) since the last `pointerdown` or `keydown`; never under reduced motion. Gap: while cracked, `Monument.tick` reports motion whenever idle runs on TODAY and `ColumnScene` invalidates every such frame, so an over day renders at display rate with no 90 s cap. Not measured on a phone. |
| Number legibility when the lit column rises behind it | The radial scrim behind the hero; the crown is capped at 37 px over the line (`OVER_MAX_PX`), the hero ends 44 px above it when over and the sub-line carries a dark halo (section 6). |
| One canvas kept alive across tabs holds GPU memory on low-end phones | Open. The layer stays mounted off TODAY (`visibility: hidden`, ticker stopped); the unmount after 5 minutes off TODAY is not built. |
| The whole bar rests on the first two seconds | `scripts/verify.mjs`, `scripts/tour.mjs` and `scripts/verify-marks.mjs` drive Chrome, each with `--nowebgl` and `--reduced`. The check on the owner's phone at 390 px is still open. |
