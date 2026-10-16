# TEMPERANCE polish spec v2

The one spec for taking TEMPERANCE from "very basic and hard to see" to a monument he cannot stop opening. It sits on top of `docs/design-spec.md`: where the two disagree, this file wins, and section 8 lists which design-spec sections are rewritten at the end. Every number is for a 390 x 844 phone at DPR 2 unless stated. Measured contrast comes from `C:/Users/luka3/temperance-legibility-audit.md` and `.tmp/contrast-v2.mjs` (run with `node .tmp/contrast-v2.mjs`); no contrast figure in this file is an estimate.

Inputs used: the five critiques (art-director, legibility, scene-motion, ux-craft, padking-benchmark), the before tour in `.tmp/tour/before`, `docs/design-spec.md`, `CLAUDE.md`, `src/index.css`, the scene source at `bf5a909`, and the measured legibility audit.

Shot names. The tour script now captures two extra shots (`log-quick-per100g`, `library-editor`), so numbers shift. This spec names shots by their suffix (`today.png`, `log-quick-empty.png`); `before` numbers are given once for reference: 01 opening-250ms, 02 opening-700ms, 03 opening-1150ms, 04 opening-1600ms, 05 opening-2300ms, 06 empty-today, 07 empty-library, 08 empty-history, 09 today, 10 today-sheet, 11 log-quick-empty, 12 log-quick-filled, 13 log-recents, 14 log-build, 15 library, 16 library-detail (broken, same as 15), 17 history-ledger, 18 history-ledger-scrolled, 19 history-day-sheet (broken, same as 18), 20 body-weight, 21 body-photos, 22 body-photo-viewer, 23 settings, 24 settings-end, 25 over-strike, 26 over, 27 small-360x640, 28 desktop-1280.

---

## 1 North star

1. One lit obsidian column you can see: two cream highlight streaks, warm rims on both silhouettes, flutes that shimmer as it turns, standing in a shaft of light inside a dark temple.
2. Every word readable outdoors at half brightness: labels 12 px Cinzel 700, data 15 px Cormorant 600, no text below 4.5:1, no control edge below 3:1.
3. One stone grammar: what you type into is carved, what informs you is raised, what acts is gold. Nothing else is gold.
4. Every log is a strike you feel: the glass ghost fills, the stone slams, the plinth rings, the digits roll.

### The five biggest moves

1. **Light the monument (scene S1, zero new programs).** Repaint the 256 x 128 painted environment so its highlights sit in the horizon band, the only band a vertical shaft can reflect; Schlick fresnel with a 0.30 floor; warm key and rim; plinth shares the obsidian program; drei `Edges` removed. Then (S2) a slimmer fluted shaft on an Attic base and a stepped plinth inscribed TEMPERANTIA.
2. **The legibility floor (system).** Neutral ladder shifted one step up (bone-dim `#D3CDC2`, bone-soft `#B9B3A9`, bone-mute `#9C9791`), labels 12 px Cinzel 700 at 0.12em, Cormorant 600 for data, every control edge at 3:1, a 2 px focus ring.
3. **Stone and gold materials (system).** `.tablet` (raised), `.tablet-inset` (carved), a gold text gradient whose darkest stop is `#B8902E`, the tiling seam fixed, an engraved keystone, a disabled gold button that reads as an empty outline, restrained Roman ornament (meander, rhombus, corner brackets, one laurel).
4. **The temple and the ghost (scene S1 and S2).** A DOM light shaft and fogged colonnade behind the canvas from frame 0, a warm pool on the plinth, a soft bottom fade instead of the hard canvas cut, and a faint glass ghost column from the stone's top up to the gold line showing what remains.
5. **The portion feature, finished (system, log, library, today).** A three-way basis switch (PER SERVE, PER 100 G, PER 100 ML), a 64 px PortionField, quick picks with the usual amount, a live result line, and one portion label rule everywhere an entry is shown.

### 1.1 Conflict rulings (one line each)

| # | Conflict | Ruling and why |
| --- | --- | --- |
| C1 | bone-dim: `#B0AA9F` (art-director), `#D3CDC2` (legibility), `#B3ADA2` (ux) | `#D3CDC2` for labels, plus bone-soft `#B9B3A9` for Cormorant 15 px and up: the audit is measured (Lc 76 vs Lc 61) and the task says measured floors win. |
| C2 | bone-mute: `#78736B`, `#9C9791`, `#7A756C`, `#7D786F` | `#9C9791` (6.78:1 on obsidian-900): the only candidate the audit measured at Lc 46 on all surfaces; the others sit near 4.3:1 and fail for 12 px placeholders. |
| C3 | Label size and tracking: 11 px 600 at 0.3em, 11 px at 0.28em, 11 px 700 at 0.2em, 12 px 700 at 0.12em | 12 px Cinzel 700 at 0.12em: the task forbids tracking over 0.2em below 13 px and important text under 12 px. |
| C4 | Tab labels 9, 10 or 11 px | 12 px Cinzel 700 at 0.06em: SETTINGS measures about 69 px in a 78 px slot, so no exception is needed. |
| C5 | New fonts: Cinzel 600 and Cormorant 600, or Cormorant 600 only, or none | Cormorant 600 only, `swap`, not preloaded: Cinzel 700 is already loaded and the opening budget must not grow. |
| C6 | Gold gradient: 11 stops from `#4A3712` (art-director) vs floor `#B8902E` (legibility) vs `#8A6A2A` (padking) | New `--gold-grad-text` with a `#B8902E` floor for all text and fills (6.3:1 for the dark label, 6.85:1 as text on the stage); the dark `--gold-grad` stays for decoration only. |
| C7 | Brushed texture: anisotropic noise at up to 25 percent vs grain cut to 10 percent | Anisotropic brush on the 96 px hero number only, darkening capped at 10 percent; flat gold-300 for gold text under 32 px. |
| C8 | Environment strip positions (four sets, signs disagree) | Derived from the one written-out mapping, u = 0.75 minus phi / pi (section 5.2 table); no critic's pixel values are copied. |
| C9 | Over state: hide subline + H_MAX 2.35, or `renderH` asymptote + 44 px gap, or H_MAX 2.62 + text-shadow | `renderH` asymptote (max 0.30 units, 37 px) plus `GAP_ABOVE_LINE` 44 when over plus a text halo: strike coalescing stays on raw H and "how far over" still reads through the cracks. |
| C10 | Plinth: new reflective MeshStandard, obsidian clone, or MeshStandard plus gold inlay | Obsidian program reused through the material factory with `uFluteOn 0`: the only option that removes programs (plinth-std and the Edges line program). |
| C11 | Lights: padking front fill and dpr 2 vs scene-motion key move | Scene-motion's set (key moved low, warm rim, warm ambient), no front fill; dprMax stays 1.5 (LOCKED in design-spec section 15). |
| C12 | Sheet scrim: backdrop blur on high tier vs no backdrop-filter over the canvas | No backdrop-filter; scrim `rgba(5,5,7,0.74)`: a blur over a live canvas costs a full-screen pass every frame. |
| C13 | Roman numerals: more (WEEK IX, counts) vs Arabic for data | Arabic for every data value (streak 12, MEALS 8, WEEK 9); Roman only as ornament (settings group numerals I, II, III). |
| C14 | Row grammar: gold bar, rhombus on every row, mark on newest only, kcal gold or bone | One row: a 14 px mark gutter on every row, a 5 px gold rhombus only on the newest or today's row, kcal number in bone Cinzel 700 16 px with a lowercase Cormorant unit. |
| C15 | Gold restraint vs "gold means it acts" | Both: gold is for things that act (LOG, keystone, chips, segmented edge, hairline buttons, active states, focus) and for the four focal values (hero number, weight hero, live portion result, today's history bar); data values are bone. |
| C16 | Input borders: gold edge on every input vs neutral 2:1 line | Neutral `--bone-edge` `rgba(231,225,210,0.46)` (3.43 to 3.63:1 as rendered on tablets; 0.40 measured 2.86 to 2.98:1 in the round 1 review) on inputs, gold-300 on focus: inputs are stone you write into, and 2:1 fails WCAG 1.4.11. |
| C17 | Settings groups: THE MEASURE / THE RITE / THE RECORD vs GOALS / DISPLAY / DATA | `I · GOALS`, `II · DISPLAY`, `III · DATA`: plain words he can scan, the numeral carries the Roman voice. |
| C18 | Settings row labels: Cormorant sentence case vs Cinzel caps | Cinzel 700 12 px caps: copy rule 18 (labels are uppercase Cinzel) is identity. |
| C19 | TODAY duplicates: drop GOAL flank, drop the line label, or shorten the subline | Keep both flanks (EATEN, GOAL), the line marker becomes a rhombus only, the subline becomes the percent `51% of goal`: each figure appears once and the plaques stay symmetric. |
| C20 | Header right slot: settings gear vs streak | Streak (`12` between two rhombi, opens HISTORY); the gear duplicates the SETTINGS tab. |
| C21 | Column radius 0.46 (keep) vs 0.36 (slim) | 0.36 in scene S2 with the Attic base: at 0.46 a 50 percent day is a 1:1 can (`today.png`). Dropped if the S2 budget gate fails (section 5.9). |
| C22 | Canvas: grow to 552 px vs mask the 513 px canvas | Keep 513 px, mask the bottom 28 px: growing the canvas changes px per unit and the camera, which moves `--goal-y`. |
| C23 | Settings: blur headers that appear on scroll vs solid black bars | Header gradient to transparent with no hard edge, no backdrop-filter; blur over the shard strips repaints on every scroll frame. |
| C24 | EATEN leader line projected from 3D (padking) vs plaques | Plaques: a leader needs a per-strike `camera.project` write and ties DOM layout to the scene. |
| C25 | Shards: lighter facets plus a dark fracture stroke vs darker and quieter | Fracture technique (dark gap under a light edge) on dark fills `#1C1C22 / #0A0A0D / #2A2A31`, specular band 0.16: the edge reads as broken glass without becoming grey noise. |
| C26 | Toast while a sheet is open: dock above the sheet footer vs dock at the top | Top: `calc(var(--safe-top) + 12px)`; it can never cover a sheet's action row and needs no per-sheet measurement. |
| C27 | PortionField height 56 vs 64 | 64 px everywhere: one component, 64 px steppers are easy thumb targets, and the LOG layout still fits (section 6.2). |
| C28 | Icon stroke 1.75 for small icons | Not granted: CLAUDE.md fixes stroke 1.5. Icons grow instead (tab 24, row 22). Flagged for the owner. |

---

## 2 Legibility floor

Rules (non-negotiable). Body text at least 4.5:1 against its real background; text of 18 px and up at least 3:1; nothing he needs to read under 12 px; no letter-spacing over 0.2em below 13 px; control boundaries at least 3:1 (WCAG 1.4.11); focus visible at 2 px.

### 2.1 Token table (final)

Contrast cells are WCAG 2 ratio then APCA Lc, measured by `.tmp/contrast-v2.mjs`. Surfaces: page obsidian-950 `#050507`, sheet obsidian-900 `#0B0B0F`, raised tablet top `#17171E`, carved inset `#0E0E13`.

| Token | Old | New | on #050507 | on #0B0B0F | on #17171E | on #0E0E13 | Use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--color-bone` | `#E7E1D2` | keep | 15.61 Lc89 | 15.06 Lc88 | 13.67 Lc88 | 14.76 Lc88 | names, values, inputs |
| `--color-bone-dim` | `#9A948A` (6.53, Lc45) | `#D3CDC2` | 12.88 Lc77 | 12.42 Lc76 | 11.28 Lc76 | 12.17 Lc76 | every Cinzel label, inactive tabs, icons |
| `--color-bone-soft` (new) | none | `#B9B3A9` | 9.78 Lc62 | 9.43 Lc61 | 8.56 Lc60 | 9.24 Lc61 | Cormorant 15 px and up only: meta, subline, units, hints |
| `--color-bone-mute` | `#5E5A54` (2.87, Lc18) | `#9C9791` | 7.03 Lc46 | 6.78 Lc46 | 6.16 Lc45 | 6.65 Lc46 | placeholders, disabled, untracked days, version line |
| `--color-gold-200` | `#F6E3A1` | keep | 15.92 Lc90 | 15.36 Lc90 | 13.94 Lc89 | 15.05 Lc90 | active segment text, highlight |
| `--color-gold-300` | `#E6CB78` | keep | 12.78 Lc76 | 12.33 Lc76 | 11.19 Lc75 | 12.08 Lc76 | all gold text under 32 px, focus ring |
| `--color-gold-400` | `#D8B45A` | keep | 10.28 Lc64 | 9.91 Lc64 | 9.00 Lc63 | 9.71 Lc64 | strokes, fills, marks; text only 16 px bold and up |
| `--color-gold-500` | `#B8902E` | keep | 6.85 Lc46 | 6.61 Lc45 | 6.00 Lc45 | 6.48 Lc45 | text-gradient floor; icons on hover only |
| `--color-gold-600` | `#9C7B33` | keep | 5.13 Lc35 | 4.95 Lc35 | 4.50 Lc34 | 4.85 Lc34 | ornaments only, never text |
| `--color-ember-text` | `#FF7A45` (7.60, Lc52) | `#FF9972` | 9.75 Lc62 | 9.40 Lc62 | 8.53 Lc61 | 9.21 Lc61 | OVER labels and deltas, always with the flame |
| `--color-ember` | `#FF5A1F` | keep | 6.53 Lc45 | 6.30 Lc45 | 5.72 Lc44 | 6.17 Lc44 | number gradient, borders, icons, never small text |
| `--color-protein` | `#F2D98A` | keep | 14.61 | 14.10 | 12.79 | 13.81 | arc, swatch |
| `--color-carbs` | `#B8923E` | keep | 7.00 | 6.75 | 6.13 | 6.62 | arc, swatch |
| `--color-fat` | `#6E5324` (2.74) | `#8E7243` | 4.50 | 4.34 | 3.94 | 4.25 | arc and swatch only, never text (non-text 3:1 met) |

Alpha tokens (`:root`), measured as composites:

| Token | Old | New | Composite on #0B0B0F | Ratio | Use |
| --- | --- | --- | --- | --- | --- |
| `--gold-line` | 0.16 (1.31:1) | `rgba(216,180,90,0.42)` | `#61522F` | 2.58:1 (Lc 15) | section rules, tab bar top edge, dividers inside controls |
| `--gold-line-strong` | 0.55 | keep | `#7C6838` | 3.64:1 | one lead rule per screen, sheet top edge |
| `--gold-edge` (new) | none | `rgba(216,180,90,0.55)` | `#7C6838` | 3.64:1 (3.56 on tablet) | borders of gold controls: segmented, chips, hairline buttons, toggles |
| `--bone-edge` (new) | none | `rgba(231,225,210,0.46)` | | 3.43 to 3.63:1 as rendered on tablets (0.40 rendered 2.86 to 2.98:1) | borders of inputs and PortionField at rest |
| `--rule` (new) | `--bone-08` (1.16:1) | `rgba(231,225,210,0.16)` | `#2E2D2E` | decorative | row rules between list rows (spacing carries the separation) |
| `--gold-focus` | 0.70 | replaced by `--color-gold-300` | `#E6CB78` | 12.33:1 | focus ring and focused input border |
| `--scrim` | 0.60 | `rgba(5,5,7,0.74)` | | | sheet scrim and the hero number scrim |
| `--ember-edge` (new) | 0.35 (1.68:1) | `rgba(255,90,31,0.70)` | `#B6421A` | 3.54:1 | danger button border |

Surfaces (`@theme`): obsidian-950 `#050507`, 900 `#0B0B0F`, 800 `#121218`, 700 `#1A1A21`, 600 `#26262E` all keep their values. New surface tokens used by the material system: `--color-tablet-hi #17171E`, `--color-tablet-mid #111117`, `--color-tablet-lo #0D0D12`, `--color-inset-hi #08080B`, `--color-inset-lo #0E0E13`, `--color-slab #16161C` (toast, chips). Raised against page is only 1.14:1, so tablets always carry their edge highlight and shadow (section 3.1); separation never relies on fill alone.

### 2.2 Type scale v2

Fonts: Cinzel 400 and 700; Cormorant Garamond 400, 500, 600 (new) and 400 italic. Cormorant 600: copy `@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2` to `public/fonts/cormorant-600.woff2` in `scripts/copy-fonts.mjs`; `@font-face { font-family: "Cormorant Garamond"; font-weight: 600; font-display: swap; src: url("/fonts/cormorant-600.woff2") }`; not preloaded. Cinzel 400 stays only for the decorative wordmark fallback; every UI Cinzel role below is 700.

| Role | Family | Weight | Size | Line | Tracking | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| Hero number | Cinzel | 700 | 96 px (72 px under 700 px tall) | 1.08 | -0.01em | `--gold-grad-text` + brush (high tier) |
| Hero number, over | Cinzel | 700 | 88 px | 1.08 | -0.01em | `--ember-grad` |
| Weight hero | Cinzel | 700 | 44 px | 1 | 0 | `--gold-grad-text`, no brush |
| Wordmark, opening | Cinzel | 700 | 30 px | 1 | 0.42em | `--gold-grad-text` |
| Wordmark, header | Cinzel | 700 | 14 px | 1 | 0.3em | gold-300 flat, `.inscribed` |
| Hero eyebrow (REMAINING, EATEN, OVER THE LINE) | Cinzel | 700 | 13 px | 1 | 0.22em | bone-dim; ember-text when over |
| Screen title (LIBRARY, SETTINGS, month) | Cinzel | 700 | 18 px | 1.1 | 0.2em | bone |
| Sheet title | Cinzel | 700 | 16 px | 1.1 | 0.2em | bone |
| Section heading | Cinzel | 700 | 12 px | 1 | 0.12em | bone-dim |
| Labels, eyebrows, stone captions, settings rows, toggle labels, flank labels, ring readout labels | Cinzel | 700 | 12 px | 1 | 0.12em | bone-dim |
| Header date | Cinzel | 700 | 12 px | 1 | 0.12em | bone-dim |
| Tab labels | Cinzel | 700 | 12 px | 1 | 0.06em | bone-dim; gold-300 active |
| Segmented and chips | Cinzel | 700 | 12 px | 1 | 0.1em | bone-dim; gold-200 active (segmented), gold-300 (chips) |
| Buttons (hairline, ghost, danger) | Cinzel | 700 | 14 px | 1 | 0.16em | gold-300 / bone-dim / ember-text |
| Gold button label (LOG, LOG WEIGHT) | Cinzel | 700 | 15 px | 1 | 0.24em | `#17110A` engraved |
| Keystone label | Cinzel | 700 | 12 px | 1 | 0.16em | `#17110A` engraved |
| Flank values | Cinzel | 700 | 24 px | 1.1 | 0.02em | bone |
| Stone values, week kcal | Cinzel | 700 | 24 px / 17 px | 1.1 | 0.02em | bone |
| Row kcal | Cinzel | 700 | 16 px | 1 | 0.02em | bone (gold-300 on the newest or today's row) |
| Ring centre value | Cinzel | 700 | 22 px | 1 | 0 | gold-300 flat |
| Ring letters P C F, chart axis, colonnade day numbers (SVG) | Cinzel | 700 | 12 px | 1 | 0.04em | bone-dim; today gold-300; untracked bone-mute |
| Units after any number (kcal, kJ, g, ml, kg) | Cormorant | 500 | 60 percent of the figure, never under 15 px | 1 | 0 | bone-soft, lowercase, after U+2009 |
| Inputs | Cormorant | 600 | 22 px (CALORIES 28 px, PortionField 30 px) | 1.2 | 0 | bone, `.num` |
| Placeholders | Cormorant | 600 | as input | | | bone-mute |
| List names | Cormorant | 500 | 19 px | 1.3 | 0 | bone |
| Meta and data lines (macros, times, deltas) | Cormorant | 600 | 16 px | 1.35 | 0 | bone-soft, `.num` |
| Hints and footnotes (floor) | Cormorant | 600 | 15 px | 1.4 | 0 | bone-soft |
| Subline under the hero | Cormorant | 500 | 18 px roman (not italic) | 1.3 | 0 | bone-soft, `.num` |
| Stoic line | Cormorant | 400 italic | 19 px | 1.35 | 0 | bone-dim, max 2 lines |
| Empty-state sentence | Cormorant | 500 italic | 18 px | 1.35 | 0 | bone-soft |
| Toast text | Cormorant | 600 | 17 px | 1.3 | 0 | bone |
| Body (paragraphs) | Cormorant | 500 | 19 px | 1.45 | 0 | bone |

Rules. Nothing under 12 px anywhere. No tracking over 0.2em below 13 px: every role at 0.2em or more in this table is 13 px or larger. No italic for numbers. Every Cormorant numeral carries `.num`. Gradient text only at 32 px and up; anything smaller in gold is flat gold-300. Cinzel has no lowercase, so units are never inside a Cinzel span. Thousands grouping U+2009.

### 2.3 Icons

lucide-react, stroke 1.5 (CLAUDE.md, unchanged). Tab icons 24 px. Keystone plus 24 px. Row actions 22 px inside a 44 x 44 hit area. Inline icons (search, flame, chevrons) 18 px. Section icons 16 px. Colour: bone-dim at rest, gold-300 when active or pressed, ember-text for destructive pressed. Never bone-mute for an icon that is a control, except the weigh-in trash (bone-mute `#9C9791`, 6.78:1, still over 3:1). Favourite star: off stroke bone-dim; on stroke gold-400, fill `rgba(216,180,90,0.28)`.

### 2.4 Hairlines and borders

Minimum 1 CSS px. Any rule that separates sections: `--gold-line` (0.42). Row rules inside lists: `--rule` (0.16, decorative). Control boundaries: `--bone-edge` (inputs) or `--gold-edge` (gold controls), never under 3:1. The ring track gets two hairlines (section 6.1). The old `--bone-08` is deleted; `grep -r bone-08 src` must return nothing.

### 2.5 Focus and pressed

`:focus-visible { outline: 2px solid var(--color-gold-300); outline-offset: 2px; }` in `@layer base`. Inputs and PortionField: on focus the border becomes `#E6CB78` and `box-shadow: inset 0 2px 4px rgba(0,0,0,0.7), 0 0 0 1px #E6CB78` (2 px total). Every pressable gets a pressed state (section 4): touch never shows `:focus-visible`, so a press must change colour or light, not only scale.

---

## 3 Material system

### 3.1 Stone tablet

All in `src/index.css`.

```css
/* raised: informs */
.tablet {
  background: linear-gradient(180deg, #17171E 0%, #111117 55%, #0D0D12 100%);
  border: 1px solid #2A2A33;
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(231, 225, 210, 0.07),
    inset 0 -1px 0 rgba(0, 0, 0, 0.55),
    0 1px 0 rgba(216, 180, 90, 0.06),
    0 14px 28px -14px rgba(0, 0, 0, 0.85);
}
/* carved: you type into it */
.tablet-inset {
  background: linear-gradient(180deg, #08080B 0%, #0E0E13 100%);
  border: 1px solid var(--bone-edge);
  border-radius: 4px;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.7),
    inset 0 -1px 0 rgba(231, 225, 210, 0.04),
    0 1px 0 rgba(231, 225, 210, 0.05);
}
.tablet-inset:focus-within {
  border-color: #E6CB78;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7), 0 0 0 1px #E6CB78;
}
/* grain on tablets, high tier only: the backdrop grain data-URI at 0.035, tiled 160px */
html:not(.no-grain) .tablet { background-image: var(--grain-uri), linear-gradient(180deg, #17171E 0%, #111117 55%, #0D0D12 100%); background-size: 160px 160px, 100% 100%; }
```

`--grain-uri` is the existing Backdrop feTurbulence data-URI moved to a `:root` token with its alpha set to 0.035 in the feColorMatrix (static image, not a runtime filter).

### 3.2 Gold treatments

```css
:root {
  /* text and fills: darkest stop #B8902E (6.85:1 on the stage, 6.3:1 for the dark label on it) */
  --gold-grad-text: linear-gradient(calc(100deg + var(--tilt-angle)),
    #B8902E 0%, #C9A24A 20%, #D8B45A 38%, #EBD08A 46%, #FFF3CF 50%, #F6E3A1 54%, #D8B45A 66%, #C29A42 82%, #B8902E 100%);
  /* decoration only (goal line DOM fallback, gradient borders, grab bar): unchanged dark ends */
  --gold-grad: (unchanged);
  /* brushed metal, static, rasterised once; darkening capped near 10 percent */
  --gold-brush: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='64'%3E%3Cfilter id='b' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.004 0.55' numOctaves='3' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.45 0.27'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23b)'/%3E%3C/svg%3E");
}
```

`--gold-grain` is deleted (it drew 1 px pinstripes, `today.png`).

| Treatment | CSS | Allowed on |
| --- | --- | --- |
| Gold foil text `.gold-num .gold-face` | `background: var(--gold-brush), var(--gold-grad-text); background-size: 256px 64px, 220% 100%; background-repeat: repeat, no-repeat; background-position: 0 0, calc(50% + var(--tilt-x) * 50%) 0; background-clip: text; color: transparent;` plus a third span `.gold-hi` (absolute, inset 0, `transform: translateY(-1px)`, colour `rgba(255,247,218,0.14)`, aria-hidden) rendered before `.gold-face`, and the existing `.gold-shadow` lip below. Low tier (`.no-grain`): no brush layer, no `.gold-hi`. | hero number only (brush); weight hero 44 px (no brush) |
| Gold text `.gold-text` | `background: var(--gold-grad-text); background-size: 220% 100%; background-repeat: no-repeat; background-position: calc(50% + var(--tilt-x) * 50%) 0; background-clip: text; color: transparent;` | opening wordmark 30 px, any gold text 32 px and up |
| Gold fill `.gold-fill` | `background: var(--gold-grad-text); background-size: 220% 100%; background-repeat: no-repeat; background-position: calc(50% + var(--tilt-x) * 50%) 0; color: #17110A; box-shadow: inset 0 1px 0 rgba(255,247,218,0.55), inset 0 -2px 0 rgba(60,40,10,0.40), inset 1px 0 0 rgba(255,247,218,0.15), inset -1px 0 0 rgba(60,40,10,0.30);` label `text-shadow: 0 1px 0 rgba(255,240,200,0.45)` | the keystone, the LOG button, LOG WEIGHT, the toggle knob when on |
| Gold hairline frame `.gold-border` | existing mask technique with `--gold-border` | active chip, active quick pick, the sheet top edge |
| Gold glow | `radial-gradient(50% 50% at 50% 50%, rgba(216,180,90,0.35), transparent 70%)` on a sibling element, never `filter` | keystone underglow, goal-line DOM fallback, today's colonnade bar, the live portion result on change (300 ms) |

Seam fix (LOCKED): every `calc(50% + var(--tilt-x) * 60%)` in the codebase becomes `* 50%` and the gradient layer gets `background-repeat: no-repeat`. `grep -rn "tilt-x) \* 60%" src` must return nothing.

### 3.3 Ornaments

New `src/components/ornaments/` (React components) plus CSS utilities in `index.css`. At most two ornament kinds visible per screen (TODAY: meander and rhombus; LIBRARY: rhombus and brackets on the empty tablet; HISTORY: rhombus, brackets, plus the single laurel on STREAK as the allowed third, the only exception; SETTINGS: rhombus and brackets, meander in the footer below the fold; sheets: meander under the title and rhombus).

1. **Meander** (Greek key). Tile 12 x 6, path `M0 5.5H12M9 5.5V0.5H3V3.5H6`, `fill none`, `stroke #D8B45A`, `stroke-width 1`.
   ```css
   .meander { height: 6px; opacity: 0.55;
     background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='6' viewBox='0 0 12 6'%3E%3Cpath d='M0 5.5H12M9 5.5V0.5H3V3.5H6' fill='none' stroke='%23D8B45A' stroke-width='1'/%3E%3C/svg%3E") repeat-x center / 12px 6px;
     -webkit-mask-image: linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent);
             mask-image: linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent); }
   ```
   Uses: 96 px centred 14 px above the stoic line; 72 px left-aligned 8 px under every sheet title; 120 px centred above the settings footer. Component `<Meander width={96} />`.
2. **Rhombus**. `.rhombus { display: inline-block; width: 5px; height: 5px; transform: rotate(45deg); border: 1px solid #D8B45A; background: #050507; flex: none; }` and `.rhombus.solid { background: #D8B45A; }`. SVG form `<path d="M3.5 0L7 3.5L3.5 7L0 3.5Z"/>` in a 7 x 7 box. Uses: the strong SectionHeading rule terminal (absolute, right -3 px, bottom -3 px), the goal marker on TODAY, flank plaque ends, the newest-row mark (solid), the usual quick pick, the streak in the header, settings group headings.
3. **Corner brackets** `.bracketed`: brackets live on `::after` so they compose with `.tablet` backgrounds and with `.gold-border::before`.
   ```css
   .bracketed { position: relative; }
   .bracketed::after { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
     --bk: rgba(216,180,90,0.55); --bl: 10px; --bi: 5px;
     background:
       linear-gradient(var(--bk),var(--bk)) var(--bi) var(--bi) / var(--bl) 1px no-repeat,
       linear-gradient(var(--bk),var(--bk)) var(--bi) var(--bi) / 1px var(--bl) no-repeat,
       linear-gradient(var(--bk),var(--bk)) calc(100% - var(--bi)) var(--bi) / var(--bl) 1px no-repeat,
       linear-gradient(var(--bk),var(--bk)) calc(100% - var(--bi)) var(--bi) / 1px var(--bl) no-repeat,
       linear-gradient(var(--bk),var(--bk)) var(--bi) calc(100% - var(--bi)) / var(--bl) 1px no-repeat,
       linear-gradient(var(--bk),var(--bk)) var(--bi) calc(100% - var(--bi)) / 1px var(--bl) no-repeat,
       linear-gradient(var(--bk),var(--bk)) calc(100% - var(--bi)) calc(100% - var(--bi)) / var(--bl) 1px no-repeat,
       linear-gradient(var(--bk),var(--bk)) calc(100% - var(--bi)) calc(100% - var(--bi)) / 1px var(--bl) no-repeat; }
   .bracketed.lg::after { --bl: 14px; --bi: 6px; }
   ```
   Uses: stat stones (one set on the whole row), the BODY weight panel, settings group tablets, empty-state tablets, the install row, the photo viewer frame (`.lg`).
4. **Laurel**, used once (HISTORY STREAK stone). SVG `viewBox 0 0 28 14`, rendered 56 x 28 px behind the streak value at opacity 0.7. Left sprig: stem `M14 13Q6 11 2 3`; five leaves as `<ellipse rx="2.2" ry="0.9">` at (11.69, 12.27), (8.89, 10.87), (6.41, 8.99), (4.25, 6.63), (2.67, 4.24), each `transform="rotate(-40 cx cy)"`. Right sprig: the same group with `transform="matrix(-1 0 0 1 28 0)"`. `stroke #B8902E`, `stroke-width 0.6`, `fill none`. Component `<Laurel />`.
5. **Roman numerals**: ornament only. Settings group headings `I`, `II`, `III`. Nothing that is data.
6. **Column glyph** for empty states: `viewBox 0 0 40 48`, capital `<rect x="4" y="6" width="32" height="3"/>`, shaft `<rect x="10" y="9" width="20" height="30"/>`, flutes `<path d="M15 10V38M20 10V38M25 10V38"/>`, base `<rect x="6" y="39" width="28" height="3"/>` and `<rect x="2" y="42" width="36" height="3"/>`, `stroke #9C7B33`, `stroke-width 1`, `fill none`. Rendered 40 x 48 px. Component `<ColumnGlyph />`.

### 3.4 Atmosphere

`src/components/Backdrop.tsx`, fixed, z `--z-backdrop`:
1. Key pool: 96vmax square, `background: radial-gradient(closest-side, rgba(255,247,218,0.09) 0%, rgba(216,180,90,0.055) 34%, rgba(122,94,34,0.024) 62%, transparent 100%)`, centre at x 50 percent and y `calc(var(--goal-y) + 40px)`, `transform: translateX(calc(var(--tilt-x) * 7vw))`. Replaces the cool grey `rgba(220,224,230,0.06)` light.
2. Floor pool: `radial-gradient(60% 22% at 50% var(--plinth-y), rgba(216,180,90,0.08), transparent 70%)`, static.
3. Floor falloff: `radial-gradient(80% 50% at 50% 100%, rgba(0,0,0,0.5), transparent 70%)`, static.
4. Grain: opacity 0.05 to 0.06.
Reduced motion: layers 2 to 4 stay, layer 1 stays but does not follow tilt.

`body::after` vignette (index.css): `radial-gradient(120% 90% at 50% 38%, transparent 50%, rgba(0,0,0,0.65) 100%)`.

Desktop (768 px and up, `src/App.tsx` slab, SYSTEM owns the style): slab `box-shadow: 0 0 0 1px #1A1A21, 0 0 0 2px rgba(216,180,90,0.06), 0 40px 120px rgba(0,0,0,0.8)`; field `radial-gradient(60% 50% at 50% 40%, rgba(216,180,90,0.06), transparent 70%), #040406` with the grain at 0.06.

Bottom fade above the tab bar on the three scrolling tabs: a `::before` on the TabBar, `position: absolute; bottom: 100%; left: 0; right: 0; height: 40px; background: linear-gradient(180deg, rgba(5,5,7,0), #050507); pointer-events: none;` hidden when `tab === 'today'`.

### 3.5 Shards

`scripts/shards.mjs` and `src/components/ui/Shards.tsx` (data regenerated, `shards-data.test.ts` updated):
- Facet stops `#1A1A20 / #0A0A0D / #26262E` become `#1C1C22 0% / #0A0A0D 55% / #2A2A31 100%`.
- Under every glint polyline, a fracture stroke on the same points: `stroke #000`, `stroke-opacity 0.6`, `stroke-width 1.5`, drawn first.
- Glint opacity 0.55 to 0.4 at rest. In the generator, skip glint segments whose outward normal has positive x on the top strip or positive y on the side strips (light comes from the top left).
- Facet lines inside big shards 0.25 to 0.18. Specular band bone 0.22 to 0.16.
- Opening: glint tweens 0 to 0.8 (120 to 420 ms) then to 0.4 (420 to 720 ms); it never holds at full.

---

## 4 Components

All primitives live in `src/components/ui/**` (SYSTEM agent). States are rest, hover (pointer: fine only), pressed, focus, disabled. Press timing: in 70 ms `cubic-bezier(0.2,0,0,1)`, out 300 ms `var(--ease-spring)` (section 7). Reduced motion: no scale, colour changes only at 80 ms.

### 4.1 Button

| Variant | Rest | Hover | Pressed | Disabled |
| --- | --- | --- | --- | --- |
| gold | h 56, radius 4, `.gold-fill`, label 15 px Cinzel 700 0.24em `#17110A` engraved, outer `0 10px 24px -12px rgba(216,180,90,0.35)` | background-position shifts to `calc(50% + var(--tilt-x) * 50% + 8%)` over 300 ms | scale 0.97, inset shadows swap to `inset 0 2px 3px rgba(60,40,10,0.45), inset 0 -1px 0 rgba(255,247,218,0.25)`, a `::before` light `radial-gradient(circle at var(--px) var(--py), rgba(255,247,218,0.55), transparent 60%)` fades 0.9 to 0 over 450 ms from the pointer point | bg `#121218`, no gradient, border 1px `--gold-edge`, label `#9C9791` (6.44:1), no shadows, no text-shadow; enabling sweeps the fill in over 220 ms (`background-position` 0 to 50 percent, `--ease-cut`) |
| hairline | h 48 (56 when `size="lg"`), transparent, border 1px `--gold-edge`, label 14 px 0.16em gold-300 | bg `rgba(216,180,90,0.06)` | bg `rgba(216,180,90,0.16)`, scale 0.98 | border `rgba(231,225,210,0.16)`, label bone-mute |
| ghost | min 44 x 44, no border, label 14 px 0.16em bone-dim | label bone | bg `rgba(216,180,90,0.10)`, label gold-300 | label bone-mute |
| danger | h 48, border 1px `--ember-edge`, label 14 px 0.16em ember-text | bg `rgba(255,90,31,0.06)` | bg `rgba(255,90,31,0.16)` | label bone-mute, border `rgba(255,90,31,0.25)` |
| danger armed (second tap) | bg `rgba(255,90,31,0.14)`, border `#FF5A1F`, label reads the confirm copy | | | |

Focus for every variant: the global 2 px gold-300 outline. `disabled:opacity-*` classes are removed from `Button.tsx` entirely.

### 4.2 Field and Input

Label Cinzel 700 12 px 0.12em bone-dim, 8 px above the field. Input: `.tablet-inset`, h 56, padding 0 16 px, value Cormorant 600 22 px `.num` bone, caret `#D8B45A`, `::selection rgba(216,180,90,0.35)`, placeholder bone-mute. Suffix (kcal, g, kg) Cormorant 500 16 px bone-soft lowercase, right 16 px. Focus: section 3.1. Invalid: border `#FF5A1F` at 0.7, `.shake` 140 ms, `vibrate(10)`. Disabled: border `rgba(231,225,210,0.16)`, value bone-mute. Inner-label variant (`labelInside`): label at top 8 px left 12 px, value baseline at bottom 8 px, field still 56 px.

### 4.3 PortionField and PortionPicks

`src/components/ui/PortionField.tsx` (existing logic kept: step grid, hold-to-repeat 380 ms then 70 ms decaying to 35 ms, commit on blur or Enter, revert on nonsense).

Anatomy, full width (350 px in a sheet), h 64, `.tablet-inset`:
- Minus and plus: 64 x 64 buttons, lucide `Minus` and `Plus` 22 px stroke 1.5 in bone-dim; pressed: icon gold-300, scale 0.9, bg `rgba(216,180,90,0.10)` for 120 ms; disabled at the minimum: icon `#5E5A54` (no opacity change, the edge still reads). `onMouseDown preventDefault` and `tabIndex -1` while the input has focus so the keyboard stays up.
- Dividers: 1 px wide, inset 14 px top and bottom, `linear-gradient(180deg, transparent, rgba(216,180,90,0.42), transparent)`.
- Middle (222 px): value and unit on one baseline, centred, gap 6 px. Value: input, Cormorant 600 30 px `.num` bone, width `calc(var(--len) * 0.55em + 0.4em)` where `--len` is the character count. Unit: Cormorant 500 18 px bone-soft: `g`, `ml`, `serve` or `serves` (singular at 1 or less). The `×` glyph is removed.
- Repeat feedback: while holding, the middle cell gets `box-shadow: inset 0 0 0 1px rgba(216,180,90,0.45)`; each tick wipes the changed digits (`clip-path: inset(100% 0 0 0)` to `inset(0)`, 120 ms, `--ease-cut`).
- Focus: border gold-300, unit turns gold-300.
- Invalid typed value: reverts with `.shake` and `vibrate(10)`.
- New prop `onPreview(n: number | null)`: fired on every parseable keystroke so the result line updates while typing.
- New prop `size?: 'md'` reserved; one size ships (64).
- Test ids kept: `testId`, `${testId}-input`, `${testId}-less`, `${testId}-more`.

Basis: shown on the label row, never inside the field. Label row (20 px): left `PORTION` (label style); right the live result (section 6.2).

`PortionPicks` (exported beside it, `src/components/ui/PortionField.tsx`): row 8 px under the field, four chips of `(width - 3 x 8) / 4` (81.5 px at 350) x 40 px, radius 4, border 1px `--gold-edge`, transparent fill. Label: number Cinzel 700 13 px 0.04em bone-dim plus unit Cormorant 500 15 px bone-soft (serve picks show the number only). Active (value equals the pick): `.gold-border`, bg `rgba(216,180,90,0.12)`, number gold-200. Tap: sets the value, `vibrate(6)`, `onPointerDown preventDefault`. Sets: serve `0.5, 1, 1.5, 2`; g `100, 150, 200, 250`; ml `150, 250, 330, 500`. If the meal has a `usual` outside the set, it replaces the first pick and gets a 5 px solid rhombus 6 px before the number, `aria-label="Usual, 180 grams"`. Test ids `${testId}-pick-<value>`.

### 4.4 Segmented

`grid-auto-columns: 1fr; grid-auto-flow: column;` equal widths. Outer: `.tablet-inset` fill, border 1px `--gold-edge`, radius 4. Dividers 1 px `--gold-line`. Sizes: sm h 32 (hit 44 via the existing `::before`), md h 44 (default), lg h 40 full width (basis switch). Label Cinzel 700 12 px 0.1em; segment padding 0 8 px. Inactive bone-dim. Active: gold-200 text, bg `rgba(216,180,90,0.12)`, plus the shared indicator: one absolutely positioned 2 px gold-400 bar inset 10 px from the segment edges at the bottom, moved with `transform: translateX() scaleX()` over 300 ms `--ease-spring`. Pressed: bg `rgba(216,180,90,0.16)`. Focus: outline on the segment. Disabled segment: bone-mute.

### 4.5 Toggle

Track 48 x 28 (hit 48 x 44), radius 4, `.tablet-inset` fill, border 1px `--gold-edge`. Knob 20 x 20, radius 2, inset 3 px. Off: knob `#9C9791` (6.65:1 on the inset). On: knob `.gold-fill`, track bg `rgba(216,180,90,0.22)`, border gold-300. Knob travel 22 px (48 minus 20 minus 2 x 3), 180 ms `--ease-stone`. Hover: border gold-300. Pressed: knob scale 0.9. Focus: the global 2 px outline on the track. Disabled: border `rgba(231,225,210,0.16)`, knob `#5E5A54`, label bone-mute. Label Cinzel 700 12 px 0.12em bone-dim.

### 4.6 Chip

h 40 (sm 32 with a 44 px hit area), radius 4, `--color-slab #16161C` fill, border 1px `--gold-edge`, padding 0 14 px, max-width 168 px with the name truncated. Label Cinzel 700 12 px 0.1em gold-300; trailing energy Cormorant 500 15 px bone-soft. Active: `.gold-border`, bg `rgba(216,180,90,0.12)`, label gold-200. Pressed: bg `rgba(216,180,90,0.16)`, scale 0.97. Hover: bg `rgba(216,180,90,0.06)`. Focus: the global 2 px outline. Disabled: border `rgba(231,225,210,0.16)`, label bone-mute. Chip rows that scroll: `mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent)`.

### 4.7 SectionHeading

Row: title (Cinzel 700 12 px 0.12em bone-dim) left, optional right slot (count in Cormorant 600 15 px bone-soft `.num`, or a small control). 10 px below, the rule: default 1 px `--rule`; `rule="strong"` 1 px `--gold-line-strong` with a rhombus terminal at the right end. One strong rule per screen (the first section). Optional leading icon 16 px gold-400.

### 4.8 EmptyState (replaces EmptyLine for whole-section empties)

`.tablet.bracketed`, full width, padding 28 px 24 px, centred column: `ColumnGlyph` (40 x 48), 16 px gap, sentence Cormorant 500 italic 18 px bone-soft, 20 px gap, optional hairline Button h 44. `EmptyLine` stays for one-line empties inside a section: Cormorant 500 italic 17 px bone-soft (never bone-mute).

### 4.9 Tablet panel

`<Tablet as="section" bracketed? inset?>` renders `.tablet` (or `.tablet-inset`) plus `.bracketed`. Padding 16 px 18 px. Internal row dividers `--rule`.

### 4.10 StatStone row

One `.tablet.bracketed` grid of three equal cells (116.7 px at 350), height 96. Cell dividers 1 px `rgba(231,225,210,0.10)` inset 16 px vertically. `grid-template-rows: 40px auto; align-items: end` so values share a baseline. Value Cinzel 700 24 px bone, unit Cormorant 500 15 px bone-soft. Caption one line, Cinzel 700 12 px 0.1em bone-dim, 8 px under the value. A highlighted stone (the HISTORY average) may use gold-300 for its value.

### 4.11 List row (one grammar)

Grid `14px 1fr auto 44px`, height 60 (56 in the LOG sheet and the TODAY sheet), padding-right 0, bottom rule 1px `--rule`.
- Mark column: empty, or a 5 px solid rhombus (newest row in recents, today's row in the week list, the entry being edited).
- Body: name Cormorant 500 19 px bone, truncating; the portion `· 180 g` as a separate `shrink-0` span, Cormorant 500 16 px bone-soft `.num`, so the name truncates and the amount never does. Meta line Cormorant 600 16 px bone-soft `.num` (`3:20 pm · P 16 · C 7 · F 9`), macros rounded to integers.
- Value: `<ValueUnit>`: number Cinzel 700 16 px bone (gold-300 on the marked row) + U+2009 + unit Cormorant 500 15 px bone-soft lowercase, right aligned, tabular.
- Action: 44 x 44, icon 22 px bone-dim, pressed gold-300 and rotate 90 degrees over 200 ms for SquarePlus.
- Pressed row: bg `rgba(216,180,90,0.08)` in 0 ms, out 300 ms.
`ValueUnit` is a new primitive in `src/components/ui/GoldNumber.tsx` (`<ValueUnit value="175" unit="kcal" size={16} tone="bone" | "gold" />`).

### 4.12 Sheet chrome

`src/components/ui/Sheet.tsx`:
- Panel: `background: linear-gradient(180deg, #15151B 0px, #0B0B0F 160px)`; `box-shadow: inset 0 1px 0 rgba(255,247,218,0.10), 0 -1px 0 rgba(216,180,90,0.55), 0 -30px 60px rgba(0,0,0,0.7)`; top corners 16 px.
- Grab bar 40 x 3, radius 2, `var(--gold-grad-text)`, 10 px from the top.
- Header row 56 px: title (sheet title style) left; actions right; close `X` 22 px bone-dim in a 44 px target. A 72 px `.meander` 8 px under the title, left aligned with it.
- Scrim `var(--scrim)` (0.74), fades in over 320 ms; no backdrop-filter.
- Footer: no border-top; `background: linear-gradient(180deg, rgba(11,11,15,0) 0, #0B0B0F 20px)`, `margin-top: -20px; padding-top: 20px`, so rows dissolve under it.
- Spring in (section 7) with `::after { content: ""; position: absolute; top: 100%; left: 0; right: 0; height: 48px; background: #0B0B0F; }` so the overshoot never shows a gap.
- Sheet stack: Sheet registers itself in a tiny store `useSheets` (`open: number`) exported from `src/components/ui/Sheet.tsx`; Toast reads it.

### 4.13 Toast

`.tablet` with border 1px `--gold-line-strong`, width `min(358px, calc(100% - 32px))`, min-h 56, padding 0 6 px 0 16 px, centred. Text Cormorant 600 17 px bone. Action: Cinzel 700 12 px 0.12em gold-300, h 44, min-w 72, separated by a 1 px `--gold-line` rule; icon `undo-2` 16 px. Position: `bottom: calc(var(--safe-bottom) + 76px)` normally; when `useSheets().open > 0` or `useUI().logOpen || todayOpen`: `top: calc(var(--safe-top) + 12px)`. One slab at a time: the install prompt is shown through the toast queue (`show({ id: 'install', ... })`), never as its own floating card. In: translateY 12 px to 0 and opacity, 320 ms `--ease-spring`; out 200 ms.

### 4.14 TabBar and the LOG keystone

`src/components/TabBar.tsx`:
- Bar: h 56 plus safe bottom, `background: linear-gradient(180deg, #0E0E13, #0B0B0F)`, top edge 1 px `--gold-line`, `backdrop-filter: blur(20px)` kept (it is static over a non-animating area).
- Slots 78 px. Icon 24 px stroke 1.5, label 12 px Cinzel 700 0.06em, 4 px gap, bone-dim. Active: icon gold-400, label gold-300, icon `translateY(-2px)` (180 ms). Pressed: scale 0.94, label gold-300.
- Indicator: one 24 x 2 px gold-400 bar, `box-shadow: 0 0 8px rgba(216,180,90,0.6)`, at the top edge, `transform: translateX(...)` to the active slot centre over 360 ms `--ease-stone` (keystone slot skipped).
- Keystone: 78 x 64, rises 8 px above the bar, `clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%)` (tap area unchanged), `.gold-fill` with the engraved shadows, plus icon 24 px stroke 1.5 `#17110A`, LOG label 12 px 0.16em `#17110A` engraved. Glow: sibling div 78 x 20 px at bottom -6 px, `radial-gradient(50% 50% at 50% 50%, rgba(216,180,90,0.35), transparent 70%)`. Pressed: scale 0.96, the pointer light (section 4.1), a ring `box-shadow 0 0 0 0 rgba(246,227,161,0.45)` to `0 0 0 14px rgba(246,227,161,0)` over 520 ms on a sibling, `vibrate(8)`. Focus: outline 2 px gold-300 offset 3 px (the clip-path does not clip an outline on a wrapper; put the outline on the unclipped wrapper).

---

## 5 The 3D scene v2

Baseline is the code at `bf5a909`, not design-spec section 7: there is no drei Environment and no Lightformer; reflections come from the painted equirect in `src/scene/environment.ts` sampled in `injectReflection`; `MeshPhysicalMaterial` is off on both tiers. Programs today (9): obsidian, gold (capital), plinth MeshStandard, drei Edges line, MeshBasic front (slab and glow slab), MeshBasic double (ring), MeshBasic plus map (contact shadow), Sprite, dust ShaderMaterial.

Budgets (LOCKED): opening total 1900 ms; `tp:opening-done` minus `tp:opening-start` at or under 2000 ms in `node scripts/verify-marks.mjs`; compile stays chunked one material per frame; no PMREM, no drei Environment or Lightformer, no RectAreaLight, no MeshPhysical clearcoat, no postprocessing; one dust InstancedMesh; `Canvas` only in `SafeCanvas.tsx`; dprMax 1.5 high, 1.0 low.

The work is in three stages. Each stage is measured before the next starts (section 5.9).

### 5.1 Why it is black, and the mapping every strip uses

`tpEnvSample` maps a world direction to `u = atan(z, x) / 2pi + 0.5`, `v = asin(y) / pi + 0.5`, and `CanvasTexture` flips Y, so canvas row = `(1 - v) * H`. The camera sits at y 0.9, z 8.4 looking at y 1.67. A vertical surface keeps the vertical component of the incoming view ray, so reflections off the shaft have `R.y` between -0.11 and +0.23: v 0.465 to 0.574, canvas rows `0.43H` to `0.54H`. The old painting is `#050507` there, so the column reflects black.

Horizontally, a shaft normal at angle phi (positive is screen right) reflects `R = (sin 2phi, 0, cos 2phi)`, so **u = 0.75 minus phi / pi** (wrap by +1 below 0), and the highlight sits at screen x = r sin(phi). Both silhouettes (phi = plus or minus 90 degrees) reflect u 0.25.

| phi | u | canvas x at W 256 | screen x at r 0.46 (56 px) | at r 0.36 (44 px) |
| --- | --- | --- | --- | --- |
| 0 | 0.750 | 192 | 0 | 0 |
| +25 | 0.611 | 156 | +24 | +19 |
| -20 | 0.861 | 220 | -19 | -15 |
| +45 | 0.500 | 128 | +40 | +31 |
| -45 | 1.000 (0.000) | 0 and 256 | -40 | -31 |
| +76 to +90 | 0.328 to 0.250 | 84 to 64 | +54 to +56 | +43 to +44 |
| -76 to -90 | 0.172 to 0.250 | 44 to 64 | -54 to -56 | -43 to -44 |

If a strip does not show on the column, it is outside rows 0.43H to 0.54H; check that first.

### 5.2 Stage S1: light it (parameters and texture only, 0 new programs)

`src/scene/environment.ts`:
- `W = 256`, `H = 128`. Keep `LinearFilter`, `generateMipmaps = false`, `RepeatWrapping` on S; `texture2D` is fine with no mips.
- New helper `vstrip(g, cx, w, y0, y1, color, alpha)`: a rect from `cx - w/2` to `cx + w/2`, horizontal gradient stops `0 transparent, 0.3 color, 0.7 color, 1 transparent`, multiplied by a vertical feather (top and bottom 20 percent fade to transparent, drawn with `globalCompositeOperation = 'destination-in'` on an offscreen strip, then drawn onto the env).
- Paint, in order:
  1. Base vertical gradient: 0 `#0E0E13`, 0.5 `#0B0B10`, 1 `#0A0807`.
  2. Overhead key band (kept, lights the capital and plinth top): `glow(g, W*0.5, H*0.14, W*0.62, H*0.16, '#FFF1CC', 0.95)`.
  3. S-KEY: `vstrip(g, 156, 9, H*0.30, H*0.66, '#FFF3DC', 1.0)` (phi +25, the main cream streak right of centre).
  4. S-FILL: `vstrip(g, 220, 6, H*0.32, H*0.64, '#FFE6BE', 0.6)` (phi -20, a softer streak left of centre).
  5. S-CENTRE: `vstrip(g, 192, 28, H*0.30, H*0.66, '#3B342A', 0.55)` (keeps the face from going dead).
  6. S-RIM: `vstrip(g, 64, 40, H*0.28, H*0.70, '#D9BC80', 0.7)` (u 0.172 to 0.328: warm rims on both silhouettes; also the temple doorway the plinth top mirrors).
  7. Delete the old side streak at `W*0.3` and the ember band at `H*0.74` (the shaft never samples them and the ember tinted the gold).
- Reflection term (inside `injectReflection`, replacing the current block):
  ```glsl
  vec3 rView = reflect(-geometryViewDir, normal);
  vec3 rWorld = inverseTransformDirection(rView, viewMatrix);
  vec3 env = tpEnvSample(rWorld);
  float nv = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
  float F = mix(uF0, 1.0, pow(1.0 - nv, 5.0));
  outgoingLight += mix(env, env * diffuseColor.rgb, uReflectTint) * uReflect * F * (1.0 - tpMatte);
  outgoingLight += uRimColor * pow(1.0 - nv, 3.0) * uRim * (1.0 - tpMatte);
  ```
  New uniforms per material: `uF0`, `uRimColor` (linear), `uRim`. Values: obsidian `uF0 0.30, uReflect 1.6, uReflectTint 0, uRimColor #C9A961, uRim 0.18`; gold `uF0 1.0, uReflect 1.4, uReflectTint 1, uRim 0`; plinth (obsidian factory) `uF0 0.12, uReflect 0.9, uRim 0.08`. Same cache keys, so the program count does not change.

`src/scene/obsidianMaterial.ts`:
- Export a factory `createObsidianMaterial(opts: { color, roughness, fluteOn, f0, reflect, rim })` that always builds the same class with the same `onBeforeCompile` source and the same `customProgramCacheKey`. Never `Material.clone()` (three does not copy `onBeforeCompile`). Uniforms are per material object.
- New uniform `uFluteOn` (float): the vertex flute offset and the normal perturbation are multiplied by it. Column 1, plinth 0.
- Column: color `#121218`, roughness 0.22, metalness 0.
- `uFlute` 0.012 to 0.018; column `CylinderGeometry` radial segments 48 to 96 on high tier, 24 to 48 on low (6 vertices per flute instead of 3, so the flutes stop aliasing away). The `/ 0.46` in the normal term stays until S2 changes the radius.

`src/scene/tokens.ts`: `COL.column '#121218'`, `COL.plinth '#121217'`, `COL.ambient '#3A3428'`, `T.exposure 1.0`, `T.key 22`, `T.rim 2.5`, `T.ambient 0.22`. Fog density in `ColumnScene.tsx` 0.06 to 0.03 (a uniform, no recompile).

`src/scene/Lights.tsx`: key spot position `[2.2, 2.6, 3.2]` (was `[2.4, 4.2, 2.6]`), target `[0, 1.2, 0]`, angle 0.5, penumbra 0.8: low enough that the GGX lobe reaches the near-horizontal normals of the shaft. Rim directional `#C8B07A` from `[-2.6, 1.3, -2.2]` at about camera height, so it draws a warm edge on the left silhouette. Sweep and ember unchanged.

`src/scene/Plinth.tsx`: both RoundedBoxes use one `createObsidianMaterial({ color: '#121217', roughness: 0.32, fluteOn: 0, f0: 0.12, reflect: 0.9, rim: 0.08 })` made once with `useMemo` (shares the obsidian program). Delete `<Edges>`. Gilded arrises: 8 boxes `1.9 x 0.008 x 0.008` (and `0.008 x 0.008 x 1.9`) along the top four edges and the bottom front and side edges of the upper step, merged with `BufferGeometryUtils.mergeGeometries` into one mesh whose material comes from the capital's gold factory (same `'gold'` key, so it reuses the gold program). Contact shadow opacity 0.6 to 0.8, plane 3.2 to 3.6.

`src/scene/GoalLine.tsx`: ring `RingGeometry(0.56, 0.575, 96)` to `RingGeometry(0.50, 0.515, 96)` (a collar, not a selection ellipse); slab `BoxGeometry(6.0, 0.016, 0.016)`, colour `#EBD08A`; glow slab opacity 0.16 to 0.22; sprite opacity 0.35 to 0.5, scale `[1.6, 0.28, 1]` to `[2.4, 0.22, 1]`.

`src/scene/Column.tsx`: ember glow sprite opacity `0.5 * uCrack` to `0.65 * uCrack`, position `[0, 2.08, 0.30]`, scale `[1.0, 0.5, 1]`.

`src/scene/tokens.ts` over-state contract (Phase A export, the TODAY agent reads it):
```ts
/** Rendered column height: identical up to the goal, then an asymptote 0.30 units (37 px) above the line. */
export const OVER_MAX = 0.30
export const OVER_MAX_PX = Math.round(OVER_MAX * PX_PER_UNIT) // 37
export function renderH(h: number): number { return h <= GOAL_Y ? h : GOAL_Y + OVER_MAX * (1 - Math.exp(-(h - GOAL_Y) / OVER_MAX)) }
```
`H_MAX` stays as the input clamp for `heightFor`; Column, Capital and FallbackMonument draw `renderH(mon.h)`; the strike tween still runs on raw H, so coalescing is unchanged. `tokens.test.ts` adds: `renderH(2) === 2`, `renderH(10) < 2.3001`, `renderH` is monotonic.

`src/scene/MonumentLayer.tsx`, on the stage root (so canvas, fallback and the DOM temple all fade): `mask-image` and `-webkit-mask-image` `linear-gradient(180deg, #000 0, #000 calc(100% - 28px), transparent 100%)`. Canvas stays 390 x 513 (C22).

DOM temple, inside the MonumentLayer root before the canvas (z order: colonnade, shaft, canvas, fallback SVG). 0 GPU programs, visible from frame 0, identical on tier none:
- Shaft `div.tp-shaft`: `position: absolute; left: 50%; top: -168px; width: 520px; margin-left: -260px; height: 728px; pointer-events: none; background: conic-gradient(from 168deg at 50% 0%, transparent 0deg, rgba(255,231,182,0.10) 8deg, rgba(255,236,196,0.16) 12deg, rgba(255,231,182,0.10) 16deg, transparent 24deg); mask-image: linear-gradient(180deg, transparent 0, #000 34%, #000 82%, transparent 100%);`. Idle: `@keyframes tpShaftBreath { 0%, 100% { opacity: 0.85 } 50% { opacity: 1 } }` 8 s ease-in-out infinite, `animation-play-state` follows live idle (paused off TODAY and in deep idle). A twin `div.tp-shaft-flare` at opacity 0 for strike flashes.
- Colonnade: inline SVG `viewBox 0 0 390 513`, `preserveAspectRatio="xMidYMax slice"`, `pointer-events: none`. Far arcade: 9 semicircular arches (opening 34 px, pier 10 px, springing at y 250) as one even-odd path; piers `#0F0E13`; openings a vertical gradient `rgba(122,96,56,0)` at y 140, `0.10` at y 300, `0` at y 470; group opacity 0.55. Near columns at x 22, 70, 320, 368 (widths 30, 26, 26, 30), y 40 to 480, horizontal gradient `#08080B 0, #17161C 0.45, #1E1C22 0.6, #08080B 1`, a 1.5 px inner rim `rgba(255,220,160,0.10)` on the side facing the shaft, architrave band y 30 to 52 `#0B0B0E`. Whole group `mask-image: linear-gradient(180deg, transparent 0, #000 25%, #000 70%, rgba(0,0,0,0.3) 100%)`. Brightest value `#1E1C22`: bone on it is 12.94:1, bone-dim 10.67:1, so the flank text keeps its contrast. High tier parallax: near group `translate3d(calc(var(--tilt-x) * -7px), 0, 0)`, far group `-2.5px`; low tier static. Over state: `[data-over]` on the root fades the arch haze to `rgba(255,90,31,0.08)` over 700 ms.
- Plinth pool: `div` at `top: calc(var(--plinth-y) - 47px - 40px)` (stage coordinates), height 120 px, full width, `radial-gradient(42% 50% at 50% 35%, rgba(216,180,90,0.09), rgba(216,180,90,0) 70%)`.
- Goal haze (in the stage, above the canvas, below inscriptions): top at the goal line, height 240 px, `radial-gradient(38% 100% at 50% 0%, rgba(246,227,161,0.07), rgba(246,227,161,0) 72%)`, `mix-blend-mode: screen`.
- Reduced motion: shaft static at opacity 1, no breathing, no parallax.

`src/scene/FallbackMonument.tsx` (S1): match the 3D read. Column gradient stops `#050507 / #1A1A21 / #050507` become a lit shaft: `#0C0C10 0%, #2A2A33 22%, #121218 45%, #8A8578 64%, #1A1A21 72%, #0C0C10 100%` (a cream streak right of centre matching S-KEY) plus 1.5 px rims `rgba(217,188,128,0.55)` at both edges; plinth faces `#17171E` top, `linear-gradient(#121218, #0B0B0F)` front, 1 px `#E6CB78` edges at 0.9 (the gold arrises); hide the dust dots until the landing.

S1 cost: programs 9 to 7 (plinth-std and Edges line removed); draw calls 13 to 13 (Edges removed, arrises added); compile: the obsidian and gold programs gain about 6 ALU lines, under 3 percent; texture paint about 2 ms at boot, one 256 x 128 upload. Both tiers.

S1 acceptance (sampled from `today.png` at DPR 2, seeded tour data, tier high): brightest pixel on the key streak at least `#8A8A92` (5.46:1 against the stage `#121214`); column face average across the centre 40 percent at least `#24242B`; both silhouettes show a warm 2 to 4 px rim at least `#5A5A62`; plinth top average at least `#2A2A30`; no hard horizontal cut at the canvas bottom; the shaft is visibly lighter than the page behind the column.

### 5.3 Stage S2: sculpture (one new program, three removed)

**One unlit uber shader** `src/scene/fxMaterial.ts` (new): `createFxMaterial(mode)` returns a `ShaderMaterial` with identical source, `side: DoubleSide`, `fog: false`, `transparent: true`, `depthWrite: false`, `toneMapped: false`, `blending: AdditiveBlending` for every instance, and an `int uMode` uniform: 0 ghost, 1 line and ring, 2 radial glow (billboarded sprites, pool, shockwave). It replaces the slab, glow slab, ring and both sprites. Uniforms: `uMode, uTime, uGold (linear #D8B45A), uFlashCol (#FFF7DA), uFlash, uDraw, uHot (#FFF7DA), uSweepX, uSparkle, uH, uReveal, uAlpha, uColor`.

Programs after S2: obsidian, gold, tpFx, dust, MeshBasic plus map (contact shadow and inscription) = 5. Compile order in the ColumnScene chunk loop, largest first, sorted by a key not by traverse order: obsidian, gold, tpFx, dust, basic-map. Add `performance.mark('tp:gl-compile-done')` timing to the tour manifest.

**Column** (`Column.tsx`, `tokens.ts`): `CylinderGeometry(0.36, 0.36, 1, 160, 1)` high, `(0.36, 0.36, 1, 80, 1)` low; `heightFor`: `H = 0.36 + 1.64 * (eaten / goal)` so an empty day still shows base plus capital and H is exactly 2.0 at the goal; `H_MIN 0.36`; update `tokens.test.ts`. The voronoi `p2` coordinate `atan * 0.46` becomes `* 0.36`.

**Per-pixel flutes** (`obsidianMaterial.ts`): 20 flutes. Vertex adds varyings `vFluteXZ` (object xz), `vSide` (`1.0 - step(0.5, abs(normal.y))`), `vTanV` (`normalize(normalMatrix * vec3(-sin(a), 0.0, cos(a)))`); the vertex keeps only the silhouette scallop `transformed -= radial * uFlute * f * uFluteOn` with `f = 0.5 + 0.5 * cos(20.0 * a)`, `uFlute 0.014`, and drops the normal perturbation. Optional entasis from world Y: `transformed.xz *= 1.0 - 0.08 * smoothstep(0.5, 2.0, wy)`. Fragment, after the crack normal:
```glsl
if (uFluteOn > 0.5 && vSide > 0.5) {
  float a = atan(vFluteXZ.y, vFluteXZ.x);
  float w = fract(a * 20.0 / 6.28318530718) - 0.5;
  float fillet = smoothstep(0.40, 0.46, abs(w));
  float facing = clamp(dot(normalize(vNormal), geometryViewDir), 0.0, 1.0);
  float slope = -2.0 * w * uFluteDepth * (1.0 - fillet) * smoothstep(0.08, 0.35, facing);
  normal = normalize(normal + normalize(vTanV) * slope);
}
```
`uFluteDepth 0.55` (walls tilt up to 29 degrees, so each flute sweeps across S-KEY, S-FILL and S-CENTRE and every flute carries two thin light lines). Crack early-out: wrap the voronoi and crack math in `if (uCrack > 0.001 && vWorldPos.y > uGoalY - 0.05) { ... }` with `tpF1 = tpF2 = 0.0` and `c = 0.0` by default (27 hash taps removed from every column pixel on normal days). Cost: 0 programs, under 5 percent compile, about 20 ALU per column pixel, repaid by the early-out.

**Attic base** (new mesh in `Column.tsx`): `LatheGeometry` 64 segments (32 low) with profile `[r, y]`: `[0,0] [0.50,0] [0.512,0.018] [0.515,0.045] [0.505,0.072] [0.480,0.088] [0.440,0.094] [0.410,0.105] [0.398,0.125] [0.410,0.145] [0.440,0.150] [0.452,0.162] [0.458,0.180] [0.448,0.198] [0.420,0.208] [0.380,0.212] [0.366,0.222] [0.360,0.240]`, obsidian factory `fluteOn 0, roughness 0.22`. Gold fillets: `TorusGeometry(0.513, 0.010, 8, 96)` at y 0.045 and `TorusGeometry(0.456, 0.009, 8, 96)` at y 0.180, merged into one gold mesh.

**Capital** (`Capital.tsx`): echinus `LatheGeometry` 48 segments, profile `[0.36,0] [0.375,0.012] [0.40,0.03] [0.43,0.05] [0.45,0.065] [0.455,0.075]` from local y `renderH - 0.12`, plus astragal `TorusGeometry(0.37, 0.016, 10, 96)` at `renderH - 0.13`, merged, gold; abacus `BoxGeometry(0.98, 0.045, 0.98)` on top in the obsidian factory (`fluteOn 0`). The capital top equals `renderH`, so at goal it kisses the line. Strike: emissive 0 to 0.8 to 0 over 300 ms, scale 1 to 1.06 to 1 over 220 ms `--ease-settle`.

**Stepped plinth** (`Plinth.tsx`, replaces the RoundedBoxes): die `BoxGeometry(1.30, 0.24, 1.30)` at y -0.12; step 2 `(1.66, 0.09, 1.66)` at y -0.285; step 3 `(2.02, 0.08, 2.02)` at y -0.37 (bottom -0.41, stage y 510, inside the 28 px mask so it fades). All obsidian factory `color #121217, roughness 0.35, f0 0.10, reflect 1.2`. Gilded arrises: 8 boxes `1.30 x 0.008 x 0.008` along the die's top and bottom front and side edges, merged, gold. Contact shadow plane 2.8 x 2.8 at y -0.412.

**Inscription** TEMPERANTIA on the die face: canvas 1024 x 128 (512 x 64 low). Draw after `await Promise.race([document.fonts.load('700 80px Cinzel'), 300 ms timeout])`; if the font arrives later, redraw and set `tex.needsUpdate` (upload only, no recompile). Letters placed one by one with 0.2em tracking, cap height 72 percent of the canvas height; each letter filled with a vertical gradient `0 #7A5C22, 0.45 #E9CF86, 0.55 #F6E3A1, 1 #8A6A2A` and stroked 1 px `rgba(0,0,0,0.6)`. Mesh `PlaneGeometry(1.10, 0.13)` at `[0, -0.125, 0.6515]`, `MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 })`, matching the contact shadow's parameters so the program is shared. Letters land about 11 css px tall (decorative, not text he needs to read; the opening wordmark carries the name).

**Glass ghost** (`Ghost.tsx`, new): `CylinderGeometry(0.372, 0.372, 2.0, 80, 1, true)` translated y +1.0, `renderOrder 1`, tpFx mode 0, with the same entasis taper in its vertex if entasis ships. Fragment mode 0:
```glsl
float above = smoothstep(uH + 0.004, uH + 0.05, vW.y);
float rev = 1.0 - smoothstep(uReveal * 2.0 - 0.04, uReveal * 2.0, vW.y);
float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
float arris = pow(0.5 + 0.5 * cos(20.0 * atan(vXZ.y, vXZ.x)), 24.0);
float top = 1.0 - 0.4 * smoothstep(1.75, 2.0, vW.y);
gl_FragColor = vec4(uGold * (fres * 0.22 + arris * fres * 0.10) * above * rev * top, 1.0);
```
`uH = renderH(mon.h) - 0.12` (the shaft top under the capital); `uReveal` 1 at rest. Over the goal `above` is 0 and the ghost vanishes, which is right: nothing remains. SVG fallback: a rect 92 px wide from `--goal-y` to the column top, `fill none`, `stroke #D8B45A`, opacity 0.22, plus 4 inner vertical lines at 0.08.

**Goal line on tpFx** (`GoalLine.tsx`): one `PlaneGeometry(6.0, 0.10)` at `[0, 2.0, 0]`, mode 1:
```glsl
float yy = (vUv.y - 0.5) * 0.10 / 0.006;
float core = exp(-yy * yy);
float glow = exp(-abs(yy) * 0.22) * 0.18;
float x = (vUv.x - 0.5) * 6.0;
float glint = pow(max(0.0, 1.0 - abs(x - uSweepX) / 0.45), 3.0);
float spark = uSparkle * step(0.985, fract(sin(floor(x * 90.0) * 12.9898 + floor(uTime * 6.0) * 78.233) * 43758.5453)) * 0.6;
vec3 c = uGold * (core * (0.85 + 0.9 * glint + spark) + glow * (1.0 + 1.5 * glint));
c = mix(c, uFlashCol * (core + glow) * 1.4, uFlash);
c *= step(vUv.x, uDraw);
c += uHot * exp(-pow((vUv.x - uDraw) * 60.0, 2.0)) * (1.0 - step(0.999, uDraw)) * 2.0;
gl_FragColor = vec4(c, 1.0);
```
`uSweepX = 2.2 * mon.tiltX` when tilt is live, else `2.6 * sin(2pi t / 9)` (mirrors the 9 s goldSweep); `uDraw = mon.goalX`; `uFlash = mon.flash`; `uSparkle` 1 high, 0 low. The collar ring and both sprites become tpFx meshes (mode 1 with radial UVs, mode 2 billboarded). Reduced motion: `uTime` frozen, `uSweepX 0`.

S2 cost: programs 7 to 5; draw calls about 13 to 19 (base, fillets, die, two steps, arrises, inscription, abacus, ghost; less two boxes, Edges, glow slab and one sprite); compile: tpFx about 5 to 15 ms desktop, 15 to 40 ms mid phone, offset by removing three programs. Fill: ghost about 92 x 244 px x 2 faces additive. High tier only: 160 segments, 64-segment lathe, 1024 px inscription, sparkle. Both tiers: everything else.

S2 acceptance: the column reads as a column (ratio of shaft height at goal to shaft width at least 2.7:1), at least 8 flutes visibly carry light lines in `today.png`, TEMPERANTIA is legible in a 2x crop, the ghost is visible between the shaft top and the line on `today.png` and `empty-today.png` and absent on `over.png`.

### 5.4 Stage S3: the strike and atmosphere upgrades

All on `mon`, gsap-driven with `onUpdate: invalidate`; strike timings in `strike.ts` kept.
1. Charge glint: obsidian uniform `uGlintY` from `h0` to `h1` over 170 ms (`--ease-hit`); `totalEmissiveRadiance += uGlintCol * 0.35 * exp(-pow((vWorldPos.y - uGlintY) / 0.06, 2.0)) * uGlintOn`; gold `#F6E3A1`, ember `#FF6A2B` when crossing; `uGlintOn` 1 to 0 over 200 ms after impact.
2. Impact at 170 ms: trauma 1 (existing); `mon.fov` 28 to 27.5 and back over 260 ms (`--ease-settle`); `uReflect` 1.6 to 2.4 over 60 ms and back over 200 ms; capital flare (S2); `.tp-shaft-flare` opacity 0 to 0.5 over 60 ms then 0 over 320 ms; `vibrate(18)` (crossing `[12, 40, 24]`).
3. Shockwave (`Shockwave.tsx`, new): `RingGeometry(0.9, 1.0, 96)` flat at y 0.004 on the die, tpFx mode 2 ring variant, scale 0.55 to 1.9 over 480 ms `power3.out`, alpha `0.55 * (1 - p)^2`, gold or ember. Visible only while running. 1 draw call while active.
4. Dust: foot grit origin radius 0.50 to 0.75 (the new base); brighten inside the shaft `col *= 1.0 + 1.2 * (1.0 - smoothstep(0.3, 1.1, abs(centre.x)))`; new `aKind 2` smoke, 12 high, 6 low: origin radius 0.45 to 0.7 at y 0.03, `centre = origin + vel * (1.0 - exp(-t * 2.2)) / 2.2`, vel outward 0.25 to 0.45 and up 0.10 to 0.25, size 0.18 to 0.55, life 1.3 to 1.6 s, alpha `pow(1 - t / life, 1.5) * 0.16`, colour `#8E826E`.
5. Motes: `aKind 3` in the same InstancedMesh (LOCK kept), 40 high, 16 low, at the START of the instance array: the vertex branch from the scene-motion critique (`y = mod(aSeed.y * 4.0 - uTime * 0.045, 4.0) - 0.1`, `hw = max(0.15, 1.094 - 0.2126 * y)` following the DOM cone, size 0.010 to 0.024, alpha `0.5 * (0.55 + 0.45 * sin(uTime * 1.1 + ph * 7.0))` faded at both ends), colour `#FFE3A8`; drift only while the 24 fps ticker runs.
6. `MS.always` 1200 to 1600 ms so the smoke tail is not stepped.
7. Remove: sink 600 ms, then a shimmer `uSweepX` from +3 to -3 over 300 ms; no dust, no shake.
Reduced motion: everything snaps; glint, shockwave, smoke, motes drift and fov punch skipped; `uReflect` stays 1.6.
S3 cost: 0 programs; +1 draw call while a shockwave runs; motes add 40 instances to the existing mesh.

### 5.5 Opening upgrades (`src/intro/**`, SCENE agent)

Total stays 1900 ms. Added beats only:
- 0 ms: if `document.fonts.check('700 30px Cinzel')` is already true, the wordmark cut starts at 0 instead of waiting for the gate; wordmark at stage centre, 30 px, `--gold-grad-text`, with one sheen pass (`linear-gradient(105deg, transparent 40%, rgba(255,248,230,0.55) 50%, transparent 60%)`, `background-size 260%`, position 130 percent to -30 percent over 900 ms).
- 0 to 900 ms: colonnade opacity 0 to 1 and `translateY(6px)` to 0, `--ease-stone`.
- 120 to 820 ms: shaft opacity 0 to 1 (light enters before anything else; 250 ms is no longer a void).
- 300 to 1020 ms: goal line draws with the hot tip (`uDraw`, `uHot`), unchanged timing.
- 420 to 860 ms: ghost reveal `uReveal` 0 to 1 (440 ms, `--ease-stone`); SVG: a clip rect on the ghost from the plinth up to `--goal-y`.
- 480 to 1000 ms: the stone rises inside the ghost (existing), `uGlintY` riding `mon.h`.
- 1000 ms: landing: dust, smoke, shockwave, `uReflect` flare, shaft flare, trauma 0.75. No vibrate (no user activation yet).
- The header streak slot carries `data-intro="streak"`: SCENE adds `'streak'` to `TARGET_NAMES` and `OPACITY_TARGETS` in `src/intro/targets.ts` in Phase A and fades it 0 to 1 over 200 ms at 1100 ms with the wordmark FLIP. `queryTargets` skips names it cannot find and never hides unknown elements, so the TODAY agent's slot is simply visible until the target lands (no stuck opacity).
- Short opening (700 ms): ghost reveal 0 to 300 with the line draw; no rise.
- OFF and reduced: 240 ms crossfade into the final frame with shaft and colonnade at rest.
- New handle method `playGhostReveal(ms)` in `src/scene/handle.ts`, a no-op until the scene registers.
- SKIP (`Opening.tsx`): pill h 44, padding 0 16 px, border 1px `--bone-edge`, label Cinzel 700 12 px 0.12em bone-dim, bottom right, clear of the keystone (`bottom: calc(var(--safe-bottom) + 84px); right: 20px`).
- The SVG monument carries every new beat (the shaft and colonnade are DOM anyway).

### 5.6 Tier gating summary

| Feature | High | Low | None (SVG) |
| --- | --- | --- | --- |
| Env texture | 256 x 128 | 256 x 128 | n/a |
| Column segments | 96 (S1), 160 (S2) | 48 (S1), 80 (S2) | SVG |
| Lathe base segments | 64 | 32 | SVG ellipses |
| Inscription | 1024 px | 512 px | SVG text, Cinzel 700 12 px, letter-spacing 2 px, gold-400 |
| Line sparkle | on | off | off |
| Colonnade parallax | on | static | static |
| Motes / smoke | 40 / 12 | 16 / 6 | none |
| Brush on hero number, tablet grain | on | off | per tier of the DOM (`no-grain` when not high) |
| Shaft breathing | on | on | on |

### 5.7 Reduced motion (scene)

Column at H instantly; no dust, smoke, shockwave, glint, fov punch; no idle turn; sweep static at theta 0.6; `uTime` frozen; motes frozen but drawn (atmosphere, not information); shaft static; ghost at rest. One `invalidate()` per store change.

### 5.8 Files touched by the scene agent

`environment.ts, obsidianMaterial.ts, tokens.ts, tokens.test.ts, Lights.tsx, Plinth.tsx, Capital.tsx, Column.tsx, GoalLine.tsx, ColumnScene.tsx, MonumentLayer.tsx, MonumentLayer.test.tsx, FallbackMonument.tsx, Dust.tsx, strike.ts, strike.test.ts, handle.ts, tier.ts, fxMaterial.ts (new), Ghost.tsx (new), Shockwave.tsx (new), Temple.tsx (new, the DOM shaft and colonnade), src/intro/**`.

### 5.9 Budget gate and drop order

Before S1, record on the tour machine: `node scripts/verify-marks.mjs` (first launch) and `--second`; keep `tp:gl-compile-done`, `tp:gl-first-frame`, `tp:opening-done` minus `tp:opening-start`, and long tasks. After each stage the same run must show: opening at or under 2000 ms; `tp:gl-compile-done` no later than the before value plus 50 ms (S1) and no later than the before value (S2, which removes programs); no long task over 200 ms between `tp:opening-start` and `tp:opening-done`; zero console errors; `--nowebgl` renders the SVG monument with the temple. If S2 or S3 misses, drop in this order and re-measure after each: motes, smoke, inscription texture, sparkle, ghost, Attic base and capital lathe, the 0.36 radius. S1 is never dropped.

---

## 6 Screens

Each screen lists what changes, the layout numbers, and the tour shot that proves it. Content width is 350 px (20 px gutters, shard strips) unless stated.

### 6.1 TODAY (`src/screens/Today*`)

Layout at 390 x 844 (safe top 47, safe bottom 34):

| y | Height | Element |
| --- | --- | --- |
| 47 to 87 | 40 | Header. Left: date `THU 15 OCT` Cinzel 700 12 px 0.12em bone-dim. Centre: TEMPERANCE Cinzel 700 14 px 0.3em gold-300 `.inscribed`. Right: streak slot, 44 x 44 target, `rhombus  12  rhombus` with the number in Cinzel 700 14 px gold-300, `aria-label="Streak 12 days"`, tap opens HISTORY; nothing rendered at a zero streak. The settings gear is removed (the tab bar has it). `data-intro="wordmark"` and `"date"` kept; the streak gets `data-intro="streak"`. |
| 101 to 119 | 18 | `REMAINING` eyebrow, Cinzel 700 13 px 0.22em bone-dim (`OVER THE LINE` in ember-text with a 14 px flame). |
| 121 to 225 | 104 | Hero number, 96 px, `.gold-num` with brush; odometer (section 7). Scrim behind it `radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)`. |
| 229 to 251 | 22 | Subline `51% of goal` Cormorant 500 18 px roman bone-soft `.num` (`tp-subline` kept). Over: `116% of goal` in ember-text plus `text-shadow: 0 0 2px #050507, 0 0 10px #050507, 0 0 18px rgba(5,5,7,0.9)`. Hero swapped to EATEN: same percent. |
| 263 | 0 | Goal line (3D). DOM marker: a 7 x 7 rhombus at the right gutter centred on the line (`top: calc(var(--goal-y) - 3.5px); right: 20px`), `tp-goal-label` and `data-intro="goal-label"` kept on it, `aria-label="Goal 2 600 kcal"`. No text. |
| `--plinth-y` minus 64 to minus 12 | 52 | Flank plaques (`TodayFlanks.tsx`): left x 20 to 124 left aligned, right x 266 to 370 right aligned. Label Cinzel 700 12 px 0.12em bone-dim; value Cinzel 700 24 px bone (`tp-eaten-value`, `tp-goal-value`). 6 px under the value a plaque rule 44 x 1 px, `linear-gradient(90deg, rgba(216,180,90,0.55), transparent)` (mirrored on the right) ending in a rhombus on the column side. Hero swapped: the left plaque reads LEFT and the remaining value. |
| 547 to 679 | 132 | Macro ring row: ring 120 px at x 20; readouts x 160 to 370, three 36 px rows. |
| 679 to bar top minus 8 | flex | Stoic block: `flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 96px`. Meander 96 px centred, 14 px gap, line Cormorant 400 italic 19 px bone-dim max 2 lines at 326 px, 10 px gap, a 24 x 1 gold-400 rule, 8 px gap, author Cinzel 700 12 px 0.12em bone-dim. |
| bottom | | Spacer `flex: 0 0 calc(64px + var(--safe-bottom))` (was `1 0 calc(75px + ...)`). |

Stage additions owned by the scene (`Temple.tsx`): shaft, colonnade, plinth pool, goal haze (section 5.2). The TODAY agent must not paint over them; its only background is the number scrim.

Over state (contract with scene): `TodayNumber.tsx` `GAP_ABOVE_LINE = over ? OVER_MAX_PX + 7 : 16` (44 when over), imported from `src/scene/tokens.ts`; the number shrinks through the existing `min()` formula.

Macro ring (`TodayRing.tsx`, viewBox 120 at 120 px):
1. Track: base circle r 50, width 7, stroke `#0A0A0D`; groove hairlines at r 46.5 and r 53.5, stroke `rgba(231,225,210,0.36)` (`--bone-rule` value), width 0.75, so an empty track reads as a track.
2. Arcs: each a `linearGradient` (`gradientUnits="userSpaceOnUse" x1 10 y1 10 x2 110 y2 110`): protein `#FFF1C4` to `#E6C670`; carbs `#D2AE55` to `#9C7B33`; fat `#A88A55` to `#8E7243`. `stroke-linecap butt`.
3. Inner bezel: circle r 41, fill `radialGradient` `#121218` centre to `#0B0B0F`, stroke `rgba(216,180,90,0.35)` 0.6.
4. Centre: value Cinzel 700 22 px gold-300 flat with the unit `g` in Cormorant 500 15 px bone-soft (lowercase, outside the Cinzel span); caption PROTEIN Cinzel 700 12 px 0.1em bone-dim (it was 8 to 9 px).
5. Letters P C F: Cinzel 700 12 px, fill bone-dim (the swatch carries the colour), ticks 5 px.
6. Readouts: swatch 12 x 2 with a 1 px top highlight `rgba(255,247,218,0.3)`; label Cinzel 700 12 px 0.1em bone-dim; value Cormorant 600 20 px bone `.num` with `g` Cormorant 500 15 px bone-soft; aside `of 190 g` Cormorant 600 16 px bone-soft. Container under 372 px wide: hide the aside and draw a 2 px progress underline under each value (width grams over target, gold-400 at 0.6); ring 96 px; readouts start at x 132.
SVG text sizes are in viewBox units (viewBox 120): at the 120 px ring they render 1:1; in compact mode (96 px) every SVG text uses `fontSize` 15 units (15 x 96 / 120 = 12 px); the 56 px rings in the HISTORY day sheet render arcs only, no text.
7. Empty day: three 114 degree arcs in `#2A2A33` plus centre `0` in Cinzel 700 22 px bone-dim and `g`.
8. Tip glint: a 3 px `#FFF7DA` circle at each moving arc end during the 520 ms tween (opacity 0 to 1 to 0, 300 ms fade after); `drop-shadow(0 0 4px rgba(246,227,161,0.6))` on high tier only. None under reduced motion.
All existing `tp-ring*` and `tp-readout-*` ids and data attributes kept.

TODAY sheet (`TodaySheet.tsx`): list rows per section 4.11 (56 px), the portion label rule (section 6.2), the newest entry marked, entry meta `3:20 pm · P 16 · C 7 · F 9` Cormorant 600 16 px bone-soft. Swipe to delete unchanged.

TODAY entry editor (`TodayEntryEdit.tsx`): Back row 44; NAME field 56; 16 px gap; PORTION label row (left PORTION, right `was 180 g` Cormorant 600 15 px bone-soft only when changed); PortionField with `unit = entry.portion?.unit ?? 'serve'`, `value = entry.portion?.amount ?? entry.servings`; PortionPicks; 16 px; CALORIES full width; macro thirds. Untouched numbers rescale by `newValue / oldValue` (existing touched logic). Type change: `EntryPatch = { name: string; macros: Macros; servings?: number; portion?: Portion }`; `buildEntryPatch` returns `portion` when `entry.portion` exists, else `servings`; the save passes it to `updateEntry` (which already accepts `portion`).

Proof shots: `today.png` (lit column, temple, ghost, flanks, ring grooves, meander, streak, no gear), `empty-today.png` (ghost up to the line, unbuilt column waiting, empty ring with hairlines), `today-sheet.png`, `over-strike.png` and `over.png` (subline readable above a capped crown), `small-360x640.png` (compact ring readouts).

Tests: `TodayScreen.test.tsx` (subline copy, no settings gear, streak slot), `TodayRing.test.tsx` (empty-ring colour, compact mode).

### 6.2 LOG sheet (`src/screens/Log*`, `src/components/MealForm*`)

QUICK layout, content x 20 to 370, y from the top of the sheet content (title row and meander above it):

| y | Height | Element |
| --- | --- | --- |
| 0 to 12 | 12 | NAME label |
| 20 to 76 | 56 | NAME field (`tp-log-name`), placeholder `Meal` |
| 92 to 132 | 40 | Basis switch: Segmented lg, three equal segments 116.7 px, source text `Per serve`, `Per 100 g`, `Per 100 ml` (uppercase via CSS; the tour clicks the exact text `per 100 g`), `tp-log-basis`, segments `tp-log-basis-serve`, `-g`, `-ml` |
| 148 to 160 | 12 | Label row: CALORIES left; right the basis tag `PER 100 G` Cinzel 700 12 px 0.08em gold-300 (cross-fades 160 ms `--ease-cut` on change) |
| 168 to 232 | 64 | CALORIES field (`tp-log-kcal`), value Cormorant 600 28 px bone `.num`, suffix `kcal` or `kJ` |
| 248 to 304 | 56 | PROTEIN, CARBS, FAT thirds (108.7 px, 12 px gaps) with inner labels (Cinzel 700 12 px 0.1em bone-dim at top 8 left 12), value Cormorant 600 22 px, suffix `g` (`tp-log-protein`, `-carbs`, `-fat`) |
| 324 | 1 | Rule `--rule` |
| 341 to 361 | 20 | PORTION label row: left PORTION; right the live result `302` Cinzel 700 16 px gold-300 + ` kcal` Cormorant 500 15 px bone-soft + ` · P 16` Cormorant 600 15 px bone-soft (`tp-log-result`); hidden until calories parse; counts over 380 ms, instant under reduced motion; a 300 ms gold glow behind it on change |
| 369 to 433 | 64 | PortionField (`tp-log-portion`, `-input`, `-less`, `-more`) |
| 441 to 481 | 40 | PortionPicks (`tp-log-portion-pick-<value>`) |
| 493 to 529 | 36 | Hint left (`tp-log-hint`, always rendered, empty unless the 4/4/9 sum differs by more than 8 percent: `Macros add to 526 kcal.` Cormorant 600 15 px bone-soft); SAVE TO LIBRARY toggle right (`tp-log-save-library`) |
| 553 | | RECENT section |

Basis behaviour: switching basis never converts the typed numbers (they are label numbers); it resets the amount: serve to 1, g to 100 (or the source meal's `usual` when units match), ml to 250. `QuickDraft` gains `basis: 'serve' | 'g' | 'ml'` and `amount: number` (replacing `servings`). Result: serve gives kcal x amount; g or ml gives kcal x amount / 100.

Submit (store unchanged, it already accepts these):
- quick: `logQuick({ name, macros, per: basis === 'serve' ? undefined : { amount: 100, unit: basis }, amount: basis === 'serve' ? undefined : amount, servings: basis === 'serve' ? amount : undefined, saveToLibrary })`.
- prefilled from a library meal and untouched: `logMeal(id, basis === 'serve' ? amount : { amount, unit: basis })`.
- `MealFormQuick.tsx` no longer imports `Stepper`.

Bug fix: delete `clampServings` from `MealForm.tsx` (it rounds 1.8 to 2 and caps 5 at 4). `draftFrom` takes `{ basis: entry.portion?.unit ?? 'serve', amount: entry.portion?.amount ?? entry.servings }` cleaned with `cleanAmount`. `onEditFirst` and `onSuggestion` pass `entry.portion` through. Update `MealForm.test.ts`.

Keyboard: on PortionField focus, `requestAnimationFrame` then `scrollIntoView({ block: 'end' })` on the PORTION block (label row, field, picks: 112 px) with `scroll-margin-bottom: 12px`. `enterKeyHint="go"` in the LOG sheet (Enter commits, then logs when calories exist).

Recents (`LogRecents.tsx`): rows per section 4.11 at 56 px, mark on the newest row only, the gold bar removed; name line `Greek yoghurt · 180 g` (portion span from `portionLabel`); meta `P 16 · C 7 · F 9`; value `175 kcal` via `ValueUnit` (bone, gold-300 on the newest); action SquarePlus 22 px. Heading `RECENT` with `LAST 12` in the right slot (Cormorant 600 15 px bone-soft).

Favourites footer (`LogFavourites.tsx`, `LogRepeat.tsx`): chips per section 4.6; the row masks its right edge; REPEAT YESTERDAY becomes icon + `REPEAT` (Cinzel 700 12 px) + ` 1 951 kcal` (Cormorant 500 15 px), about 170 px (`tp-repeat-yesterday` kept). Favourite chips max 168 px.

LOG button: gold variant, disabled state per section 4.1 (an engraved outline, never 40 percent gold).

BUILD: ingredient search `.tablet-inset` h 48 with a 18 px search icon gold-500; component rows per 4.11; totals bar `612 kcal · P 42 · C 78 · F 14` with the kcal in Cinzel 700 16 px gold-300 and the rest Cormorant 600 16 px bone-soft.

Portion label rule (SYSTEM changes `portionLabel` in `src/lib/portion.ts`; every consumer uses it): `''` for exactly 1 serve; `180 g`; `250 ml`; `1.5 serves`; `0.5 serve` (singular at 1 or less); never `×`. Rendered on the name line as ` · 180 g`. Aria: `Greek yoghurt, 180 grams, 175 kcal`. Consumers: LogRecents, LogSuggestions chips, TodaySheet rows, the HISTORY day sheet rows. Toast: `Logged · 180 g · 175 kcal` (copy sign-off below).

Proof shots: `log-quick-empty.png` (carved fields with visible edges, basis switch, engraved disabled LOG), `log-quick-filled.png` (live result, picks), `log-quick-per100g.png` (basis tag PER 100 G, amount 100 g), `log-recents.png` (one marked row, bone kcal, portion labels), `log-build.png`.

Tests: `MealForm.test.ts`, `LogRepeat.test.tsx`.

### 6.3 LIBRARY (`src/screens/Library*`)

- Header: 56 px, title LIBRARY (screen title style) left, plus 22 px gold-300 right; `background: linear-gradient(180deg, #050507 0%, #050507 70%, rgba(5,5,7,0) 100%)`, padding-bottom 16 px, no hard edge.
- Search: `.tablet-inset` h 48, search icon 18 px gold-500, placeholder `Search` bone-mute (`tp-library-search`).
- FAVOURITES: SectionHeading with `folder-heart` 16 px gold-400 and `rule="strong"` (the screen's one gold rule). Rows per 4.11 (60 px). Hidden entirely when empty (no `Mark a meal to keep it here.`; `tp-fav-empty` stays for the case where the folder heading is shown by search, otherwise absent).
- MEALS: SectionHeading `MEALS` with the count `8` (Arabic) and the sort control in the right slot: Segmented sm `A TO Z | MOST` (the floating chips are removed). Rows: name, sub-line `P 69 · C 70 · F 18` (integers), value `743 kcal` (ValueUnit, bone), one SquarePlus action (`tp-meal-log-<id>`). Favourite shown as a 14 px filled star after the name in gold-400; the per-row star button stays with its id `tp-meal-fav-<id>` but moves inside the row body as a 44 x 44 target before the SquarePlus (star 20 px: off bone-dim stroke, on gold-400 stroke with fill `rgba(216,180,90,0.28)`).
- INGREDIENTS: sub-line `per 100 g · P 31 · C 0 · F 4`.
- Meal detail sheet (`LibraryDetailSheet.tsx`): title Cormorant 500 26 px bone; numbers block (kcal Cinzel 700 32 px gold-300 flat plus unit; P C F Cinzel 700 20 px bone) scaling live with the portion; 20 px gap; PORTION label row with the basis right `per 100 g · 97 kcal` (Cormorant 600 15 px bone-soft); PortionField with `unit = meal.per?.unit ?? 'serve'`, `value = meal.usual ?? meal.per?.amount ?? 1`; PortionPicks; actions LOG (gold, h 56, full width; directly under it, centred, the meta `180 g · 175 kcal` in Cormorant 600 15 px bone-soft, never on the gold), then EDIT, FAVOURITE, DELETE (hairline, 56 px, two per row). LOG calls `logMeal(meal.id, unit === 'serve' ? value : { amount: value, unit })`. Built meals scale component amounts by `value / (meal.per?.amount ?? 1)`. The note `Edits change future logs only. Past days keep their numbers.` Cormorant 500 italic 16 px bone-soft.
- Ingredient detail: the same PortionField with `unit = ingredient.per.unit`; log with `logQuick({ name: ingredient.name, macros: ingredient.macros, per: ingredient.per, amount: value })`; delete the name concatenation (`Chicken breast · 180 g` would double up).
- Meal editor (`LibraryEditor.tsx`): under NAME the same 40 px basis switch; CALORIES with the basis tag; macro thirds; then `USUAL` label row and a PortionField bound to `usual`; save calls `updateMeal(id, { per, usual })`.
- Empty library: one EmptyState at y 120: ColumnGlyph, `Nothing saved yet.`, two hairline buttons side by side, NEW MEAL and NEW INGREDIENT (h 44). FAVOURITES and the sort control hidden.

Proof shots: `library.png`, `library-detail.png` (requires the tour fix, section 8), `library-editor.png`, `empty-library.png`.

Tests: `LibraryScreen.test.tsx`, `LibraryFormat.test.tsx` (integer macros in lists).

### 6.4 HISTORY LEDGER (`src/screens/History*`)

- Mode switch LEDGER | BODY: Segmented md 44 px, 168 px wide, centred (`tp-history-mode`).
- Month header: chevrons 44 px targets with 18 px icons bone-dim, month Cinzel 700 18 px 0.2em bone. Header bottom fades like LIBRARY's.
- Colonnade (`HistoryColonnade.tsx`), strip 180 px, per day column:
  1. Fill: horizontal gradient (x1 0, x2 1) `#15151B 0%, #24242C 45%, #3A3A44 75%, #1C1C24 100%` (lit from the right like the 3D key).
  2. Flutes: lines at 30, 50, 70 percent width, strokes `rgba(231,225,210,0.07), 0.12, 0.05`.
  3. Cap: rect full column width x 2 px gold-400 `#D8B45A` (the value mark, 9.9:1).
  4. Stylobate under all columns: rect full width x 4 `#121218` with a 1 px `rgba(216,180,90,0.42)` top edge, then 2 px `#0B0B0F`.
  5. Goal hairline gold-400 at 0.8; label `GOAL` Cinzel 700 12 px 0.08em gold-300 right aligned above it.
  6. Day numbers Cinzel 700 12 px; today gold-300; untracked bone-mute; tap target 30 x 180 (kept).
  7. Today: fill `linear-gradient(180deg, #D8B45A, #B8902E)`, a gold-300 cap and a glow sibling `radial-gradient(50% 50% at 50% 100%, rgba(216,180,90,0.45), transparent 70%)` 40 px tall under its top.
  8. Over day: the part above the line uses the vertical `--ember-grad` and an ember cap; `drop-shadow` on high tier only.
  9. Untracked day: a 4 px stub `#22222A` at 0.6.
  10. Empty colonnade: 14 ghost stubs at 0.3 and a centred line `The ledger opens with your first meal.` Cormorant 500 italic 18 px bone-soft.
- Stat stones (`HistoryStones.tsx`): section 4.10. Labels `AVG 7 DAYS`, `UNDER`, `STREAK`; values `2 015 kcal` (gold-300, the screen's focal value besides today's bar), `7 of 7`, `12` with the laurel behind it at 0.7. Nothing logged: `0` and `0 of 0` become `·` in bone-mute. Ids `tp-stat-avg`, `-under`, `-streak` kept.
- THIS WEEK list (`HistoryWeek.tsx`): grid `14px 72px 1fr auto`, rows 56: mark (today), day `THU 15` Cinzel 700 12 px 0.08em bone-dim (today gold-300), kcal ValueUnit 17 px plus `P 117` Cormorant 600 16 px bone-soft, delta right `272 LEFT` Cinzel 700 12 px 0.08em bone-dim or flame 14 px + `340 OVER` ember-text. A week with no entries renders one row `Nothing logged this week.` Ids kept.
- Day sheet (`HistoryDaySheet.tsx`): rows per 4.11 with the portion rule; the day's ring at 56 px.
- A 24 px top fade (`mask-image`) on the scroll column under the sticky header.

Proof shots: `history-ledger.png`, `history-ledger-scrolled.png`, `history-day-sheet.png` (requires the tour fix), `empty-history.png`.

Tests: `History.test.ts`.

### 6.5 HISTORY BODY

- WEIGHT panel: `.tablet.bracketed`, padding 18. Left: today's weight `84.1` Cinzel 700 44 px `.gold-num` without brush plus ` kg` Cormorant 500 22 px bone-soft; caption TODAY. Right: two stones stacked (trend `DOWN 0.9 kg`, target `4.1 kg` `ABOVE TARGET`) with values Cinzel 700 22 px bone, captions per 4.10. `data-*` attributes kept.
- Chart (`HistoryWeightChart.tsx`): gridlines at each whole kg, stroke `rgba(231,225,210,0.06)`, 0.5 px; axis labels Cinzel 700 12 px bone-dim (were 9 px); date labels Cinzel 700 12 px 0.06em bone-dim; target line gold-400 at 0.6 dashed `4 4` with label `TARGET 80.0` Cinzel 700 12 px 0.06em gold-300 at full opacity; area fill `linear-gradient(180deg, rgba(216,180,90,0.16), transparent)`; line 1.5 px gold-400; last point 4 px gold-200 dot inside an 8 px `rgba(216,180,90,0.25)` halo.
- Input row: kg input (`tp-weight-input`) and LOG WEIGHT (`tp-weight-log`, gold variant, seam fixed) in a `1fr 1fr` grid, 12 px gap, both 56 px.
- RECENT WEIGH-INS: rows 56, grid `14px 1fr auto auto 44px`: date Cinzel 700 12 px 0.08em, value `84.1 kg` ValueUnit (gold-300 on today's row, bone otherwise), delta `0.4 down` Cormorant 600 16 px bone-soft (never ember: weight is not over or under), trash 20 px bone-mute in 44 px (`tp-weight-delete-<id>` kept), pressed ember-text.
- Photos: tiles with a 2 px frame `box-shadow: 0 0 0 1px #2A2A33, 0 0 0 2px rgba(0,0,0,0.8)`; label `WEEK 9` Cinzel 700 12 px 0.08em bone over a bottom gradient. Viewer (`HistoryPhotoViewer.tsx`): frame padding 6 px, `linear-gradient(180deg, #17171E, #0D0D12)`, `box-shadow 0 0 0 1px #2A2A33, 0 0 0 2px rgba(0,0,0,0.8), 0 20px 40px -20px rgba(0,0,0,0.9)`, `.bracketed.lg`; actions hairline; the toast docks at the top while the viewer is open.

Proof shots: `body-weight.png`, `body-photos.png`, `body-photo-viewer.png` (no toast over COMPARE or SHARE).

Tests: `HistoryWeightChart.test.ts`.

### 6.6 SETTINGS (`src/screens/Settings*`)

- Header: SETTINGS screen title, centred, fading bottom edge.
- Three groups, each a `.tablet.bracketed` with padding 4 px 16 px 8 px, 16 px apart. Group heading inside the tablet: rhombus + `I · GOALS` (then `II · DISPLAY`, `III · DATA`) Cinzel 700 12 px 0.12em gold-300, 16 px top padding, 12 px under it a `--rule`.
  - I · GOALS: DAILY GOAL, MACRO TARGETS, TARGET WEIGHT.
  - II · DISPLAY: UNITS, HERO FIGURE, GOLD FOLLOWS TILT, MOTION, OPENING, REPLAY OPENING.
  - III · DATA: INSTALL (when installable), EXPORT, IMPORT, ERASE ALL.
- Rows: min-h 60, padding 14 px 0, divided by `--rule`. Label Cinzel 700 12 px 0.12em bone-dim.
- Two row layouts only. (a) Value controls (inputs, toggles, two-way segmented, single buttons) sit in a fixed right column 168 px wide, right aligned, all 44 px tall. Inputs `.tablet-inset` h 44, value Cormorant 600 22 px. MACRO TARGETS: three boxes 52 x 44 inside the 168 column (6 px gaps, 52 x 3 + 12 = 168), each with an inline prefix `P`, `C` or `F` (Cinzel 700 12 px bone-dim) at left 8 px and the value (Cormorant 600 20 px `.num`) right aligned at right 8 px on one baseline. (b) Three-way segmented (MOTION, OPENING): label on its own line, control full width beneath (Segmented md, equal segments).
- Buttons: hairline, min-w 120, h 44, each with a 16 px icon (`share-2` EXPORT, `upload` IMPORT, `rotate-ccw` REPLAY); ERASE ALL danger with `x`; second tap ERASE EVERYTHING (armed state).
- INSTALL row: hairline INSTALL button in the right column. `SettingsInstall` never floats: the inline row plus at most one toast-lane prompt (`show({ id: 'install', text: 'Keep it on the home screen.', action: { label: 'Install' } })`, 8 s, after 20 s on SETTINGS or LIBRARY only, never on TODAY, never while a sheet is open, never while another toast is showing; snooze rules unchanged).
- The DAYS row is deleted; `Days reset at local midnight.` moves to the footer.
- Footer: 120 px meander, then `Data lives on this device.` and `Days reset at local midnight.` Cormorant 600 15 px bone-soft, the photos line (`tp-settings-photos`) same style, the sources line Cormorant 500 15 px bone-soft, version `TEMPERANCE · V0.1.0 · BF5A909` Cinzel 700 12 px 0.08em bone-mute (check the hash injection matches HEAD after build).

Proof shots: `settings.png` (three tablets, aligned right column, no floating card), `settings-end.png` (readable footer).

Tests: `Settings.test.ts`.

### 6.7 The opening

See 5.5. Proof shots: `opening-250ms.png` (wordmark centred over the shaft of light, colonnade fading in, SKIP pill readable), `opening-700ms.png` (shards glint at 0.8, not a gold wireframe; ghost drawing up), `opening-1150ms.png` (stone risen inside the ghost, no model swap), `opening-1600ms.png`, `opening-2300ms.png` (final frame equals `today.png`).

### 6.8 Empty states (all screens)

- TODAY: ghost to the line, base and capital on the plinth, ring with grooves and the empty arcs, subline `0% of goal`.
- LOG recents: EmptyLine `Nothing logged yet.`
- LIBRARY: EmptyState (6.3).
- HISTORY: stubs plus one line (6.4); stones show `·`.
- BODY: EmptyState `No weigh-ins yet.` with the input row below it; photos EmptyState `No photos yet.` with ADD PHOTO hairline.
Proof shots: `empty-today.png`, `empty-library.png`, `empty-history.png`.

---

## 7 Motion v2

### 7.1 New and changed tokens (`src/index.css :root`)

```css
--ease-spring: linear(0, 0.068 5%, 0.217 10%, 0.394 15%, 0.561 20%, 0.705 25%, 0.817 30%, 0.900 35%, 0.956 40%, 0.991 45%, 1.011 50%, 1.020 55%, 1.023 60%, 1.021 65%, 1.018 70%, 1.014 75%, 1.010 80%, 1.007 85%, 1.004 90%, 1.002 95%, 1);
--ease-press: cubic-bezier(0.2, 0, 0, 1);
--t-press-in: 70ms;
--t-press-out: 300ms;
--t-sheet-in: 420ms;      /* was 320, now on --ease-spring */
--t-tab-out: 120ms;
--t-tab-in: 260ms;
--t-indicator: 360ms;
--t-roll: 560ms;
--t-roll-stagger: 28ms;
--t-row-in: 420ms;        /* was 240 */
--t-row-stagger: 35ms;
--t-new-row: 900ms;
--t-row-out: 220ms;
--t-toast-in: 320ms;
--t-ghost: 440ms;
--t-shockwave: 480ms;
--t-always: 1600ms;       /* scene strike window, was 1200 */
```
`@supports not (transition-timing-function: linear(0, 1)) { :root { --ease-spring: var(--ease-sheet); } }`.

### 7.2 Animations

1. **Odometer** (`TodayNumber.tsx`, `TodayMotion.tsx`; replaces the `useCounted` ticker for the hero). Each digit sits in its existing 0.62em cell: `display: inline-block; height: 1.08em; overflow: hidden; vertical-align: top;` with `mask-image: linear-gradient(180deg, transparent 0, #000 16%, #000 84%, transparent 100%)`. Inside, a strip of 0 to 9 twice (20 glyphs, line-height 1.08em) moved by `transform: translateY(calc(var(--d) * -1.08em))`, `transition: transform 560ms cubic-bezier(0.2, 0.9, 0.2, 1) calc(var(--i) * 28ms)`, `--i` counting from the rightmost digit. On a log the remaining number falls, so digits arrive from above; a wrapping digit uses index `d + 10` so it keeps rolling one way, then resets without transition after `transitionend`. Gold: each strip carries the `.gold-face` with `background-size: calc(var(--num-w) * 2.2) 1.08em; background-repeat: repeat-y; background-position-x: calc((var(--num-w) * -1.2) * (0.5 + var(--tilt-x) * 0.5) - var(--slot-x))` so the gradient is continuous across cells. If Safari shows seams, swap the strips for one static `.gold-face` span after `transitionend` (the roll only shows during motion). A new leading digit clips in (`clip-path: inset(100% 0 0 0)` to `inset(0)`, 320 ms `--ease-cut`); the thin-space cell is static. Ember uses the same mechanism. `tp-hero-number` `aria-label` stays the plain digits. Reduced motion: no roll, a 120 ms opacity crossfade.
2. **Press**: section 4. Recents, library quick-add and favourite chips: on a successful one-tap log the row's rhombus flashes `#FFF7DA` and scales 1 to 1.4 to 1 over 300 ms; SquarePlus rotates 90 degrees over 200 ms.
3. **Sheets**: in 420 ms `--ease-spring` with the `::after` underfill; out 200 ms ease-in; drag tracks velocity over the last 80 ms; release closes when v over 0.5 px/ms or dy over 30 percent of the height, else springs back. Children run the list stagger from 120 ms. Scrim 0 to 0.74 over 320 ms. Reduced: 160 ms fade.
4. **Tabs** (`App.tsx`): outgoing screen opacity 1 to 0 over 120 ms linear; incoming opacity 0 to 1 and `translateX(dir * 14px)` to 0 over 260 ms `--ease-stone`, `dir = sign(newIndex - oldIndex)`. The gold wipe `.tp-sweep` gradient becomes `linear-gradient(100deg, transparent 30%, rgba(216,180,90,0.28) 46%, rgba(255,90,31,0.10) 54%, transparent 68%)`. TabBar indicator travels (4.14). Segmented indicator travels (4.4). Reduced: 120 ms crossfade, indicators jump, no wipe.
5. **Lists**: `.tp-stagger > *` animate `tpRowIn 420ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards`, delay `calc(min(var(--i), 8) * 35ms)`, from `opacity 0; translateY(10px)`; each row rule (`::after`) draws `scaleX 0 to 1`, origin left, 420 ms, 80 ms later. Runs only on container mount (sheet open, or first visit to a tab this session via `sessionStorage` key `temperance.staggered.<tab>`). Applies to the TODAY sheet, recents, library lists, the week list, stat stones, settings tablets. New row: bg `rgba(216,180,90,0.14)` to 0 over 900 ms, rhombus scale 0 to 1 over 240 ms. Delete: height and opacity to 0 over 220 ms `--ease-stone`. Reduced: no stagger or movement; the new-row colour flash stays (it carries information).
6. **Toasts**: in 320 ms `--ease-spring` from 12 px below (or above when docked at the top), out 200 ms.
7. **Ring tip glint**: 6.1 item 8.
8. **Portion result**: number counts over 380 ms; glow 300 ms; picks cross-fade active state 160 ms.
9. **Scene**: strike, opening, shaft breathing, motes per section 5.

### 7.3 Reduced motion

System `prefers-reduced-motion` or Settings REDUCED: the global zeroing block stays; additionally, odometer becomes a crossfade, presses change colour only (80 ms), sheets fade 160 ms, tabs crossfade 120 ms, no stagger, no tip glint, no shaft breathing or parallax, scene per 5.7. Reduced motion removes movement, never information.

---

## 8 Build plan for parallel agents

Ownership for this polish (overrides the CLAUDE.md map where they differ; Backdrop, TabBar and Shards move to SYSTEM). An agent edits only its files; a needed change elsewhere goes in its final report.

### PHASE A (runs first; SYSTEM and SCENE in parallel, nothing else)

**SYSTEM agent.** Owns `src/index.css`, `src/components/ui/**` (Button, IconButton, Field, Input, Segmented, Stepper, Toggle, SectionHeading, EmptyLine, EmptyState (new), Tablet (new), StatStone (new), Chip (new), ValueUnit (new), Sheet + `useSheets`, Toast, GoldNumber, PortionField + PortionPicks, Shards, shards-data), `src/components/ornaments/**` (Meander, Rhombus, Laurel, ColumnGlyph), `src/components/Backdrop.tsx`, `src/components/TabBar.tsx`, `src/App.tsx` (desktop slab, tab transition, Toaster placement), `src/lib/portion.ts` (`portionLabel`), `scripts/copy-fonts.mjs`, `scripts/shards.mjs`, `scripts/tour.mjs`, `index.html`, `public/fonts/`.
Checklist:
- [ ] 2.1 tokens and alpha tokens; delete `--bone-08` and `--gold-grain`; `--grain-uri` token.
- [ ] 2.2 Cormorant 600 font file, `@font-face`, copy script; type utilities `.label` (Cinzel 700 12 px 0.12em bone-dim), `.label-tab`, `.meta`, `.hint`, `.unit`.
- [ ] 2.5 focus ring and input focus.
- [ ] 3.1 `.tablet`, `.tablet-inset`; 3.2 gold treatments, seam fix, `.gold-hi` in GoldNumber; 3.3 ornaments; 3.4 Backdrop, vignette, desktop slab, tab bar fade; 3.5 shards regenerated.
- [ ] 4.1 to 4.14 every primitive with all five states; `ValueUnit`; `useSheets`; Toast lane and top docking.
- [ ] 7.1 motion tokens; 7.2 items 2 (press), 3 (sheet), 4 (tabs and indicators), 5 (`.tp-stagger` utility), 6 (toast).
- [ ] `portionLabel` rule (6.2); update `src/lib/portion.test.ts`.
- [ ] Tour fix: after clicking a meal row wait for `[data-testid=tp-meal-detail]` (timeout 3 s) before `library-detail`; after clicking a colonnade day or week row wait for the history day sheet dialog before `history-day-sheet`; scroll the log sheet back to top before `log-build`.
- [ ] Keep every existing `tp-*` id rendered by primitives (`tp-toast`, `tp-toast-undo`, PortionField ids).
- [ ] `Stepper` stays exported and restyled to the PortionField surface until Phase C; the orchestrator deletes it in Phase C once `grep -rn "Stepper" src/screens src/components/MealForm*` is empty.
Tests: `shards-data.test.ts`, `portion.test.ts`, any primitive tests.
Re-capture: `node scripts/tour.mjs --out .tmp/tour/system` (all groups); prove `log-quick-empty.png` (fields, disabled LOG), `library.png` (search, chips), `settings.png` (controls), `body-weight.png` (no seam on LOG WEIGHT), `body-photo-viewer.png` (toast at top). Screens are not restyled yet; primitives must look right inside them.

**SCENE agent.** Owns `src/scene/**` and `src/intro/**` (timing and SKIP).
Checklist, in order with the gate after each (5.9):
- [ ] Record before marks.
- [ ] S1 (5.2) including `renderH` / `OVER_MAX_PX` exports, FallbackMonument, Temple DOM layers, stage mask. Gate.
- [ ] S2 (5.3). Gate.
- [ ] S3 (5.4). Gate.
- [ ] 5.5 opening beats, `playGhostReveal`, SKIP pill.
Tests: `tokens.test.ts`, `strike.test.ts`, `MonumentLayer.test.tsx`, `canvas-lint.test.ts`, `src/intro/*.test.*`.
Re-capture: `node scripts/tour.mjs --only opening,today,over,small,empty --out .tmp/tour/scene` and `--nowebgl --out .tmp/tour/scene-svg`; prove `today.png`, `empty-today.png`, `over.png`, `over-strike.png`, `opening-250ms.png` to `opening-2300ms.png`, `small-360x640.png`, `desktop-1280.png`; attach the verify-marks output before and after each stage.

### PHASE B (after the SYSTEM agent lands; five agents in parallel; the SCENE agent may still be finishing S2 or S3)

**TODAY agent** (`src/screens/Today*`): 6.1 header (streak, no gear), eyebrow, subline percent and over halo, `GAP_ABOVE_LINE` from `OVER_MAX_PX`, rhombus goal marker, flank plaques, ring v2 and compact mode and tip glint, stoic block with meander and new spacing, TODAY sheet rows, TodayEntryEdit with PortionField, odometer (7.2 item 1). Tests `TodayScreen.test.tsx`, `TodayRing.test.tsx`. Shots `today.png`, `today-sheet.png`, `empty-today.png`, `over.png`, `small-360x640.png`.

**LOG agent** (`src/screens/Log*`, `src/components/MealForm*`): 6.2 QUICK layout, basis switch, live result, PortionField and picks wiring, submit calls, `clampServings` removal and `draftFrom`, keyboard scroll, recents rows and portion labels, favourites footer and REPEAT chip, BUILD search and totals. Tests `MealForm.test.ts`, `LogRepeat.test.tsx`. Shots `log-quick-empty.png`, `log-quick-filled.png`, `log-quick-per100g.png`, `log-recents.png`, `log-build.png`.

**LIBRARY agent** (`src/screens/Library*`): 6.3 header fade, search, sections, sort in heading, rows, stars, detail sheet with PortionField, ingredient detail, editor basis and USUAL, empty state. Tests `LibraryScreen.test.tsx`, `LibraryFormat.test.tsx`. Shots `library.png`, `library-detail.png`, `library-editor.png`, `empty-library.png`.

**HISTORY agent** (`src/screens/History*`): 6.4 and 6.5. Tests `History.test.ts`, `HistoryWeightChart.test.ts`. Shots `history-ledger.png`, `history-ledger-scrolled.png`, `history-day-sheet.png`, `empty-history.png`, `body-weight.png`, `body-photos.png`, `body-photo-viewer.png`.

**SETTINGS agent** (`src/screens/Settings*`): 6.6 groups, row layouts, install row and toast-lane prompt, footer. Tests `Settings.test.ts`. Shots `settings.png`, `settings-end.png`, plus `today.png` showing no install card.

Every Phase B agent: use only the SYSTEM primitives and tokens; no raw hex in screens except SVG paints listed here; keep every `tp-*` id and `data-intro` attribute; run `npm run typecheck` and `npm test` before finishing; capture with `node scripts/tour.mjs --only <groups> --out .tmp/tour/<agent>`.

### PHASE C (orchestrator, after B)

- Docs: rewrite `docs/design-spec.md` sections 2 (tokens), 3 (type table and floor rule), 4 (radius and hairlines), 6 (TODAY layout), 7 (scene baseline: painted env, no Environment, programs, column, plinth, capital, ghost, `renderH` instead of the 2.86 clamp, lights, dust kinds, `MS.always` 1600), 8 (backdrop and shards), 9 (ring), 10 (QUICK form and portion), 11, 12, 13, 15 (SVG monument), 16 (motion tokens), 17 (icon sizes), 18 (portion label and new copy). Update `docs/test-hooks.md` with the new ids (`tp-log-basis*`, `tp-log-result`, `tp-log-portion-pick-*`, streak slot, ghost). Update the CLAUDE.md token line (`--gold-grad-text`, `.tablet`, `.tablet-inset`, `.bracketed`, `.meander`, `ValueUnit`, `EmptyState`).
- Full tour `--out .tmp/tour/after`, the `--nowebgl` and `--reduced` tours, verify-marks first and second launch, the legibility audit scripts in `C:/Users/luka3/temperance-legibility-audit-assets/` re-run against the after build, then section 9.

### Copy changes needing the owner's sign-off

`51% of goal` subline; `Macros add to 526 kcal.` (hint only when different); `0.5 serve` singular; `Logged · 180 g · 175 kcal`; `Nothing saved yet.`; `Nothing logged this week.`; `The ledger opens with your first meal.`; `No weigh-ins yet.`; `No photos yet.`; group headings `I · GOALS`, `II · DISPLAY`, `III · DATA`; streak replacing the header gear. Flagged, not changed: icon stroke 1.75 for icons of 20 px and under.

Also shipped in the build and the round 1 review, for the same sign-off: the LOG footer chip `REPEAT` with the energy (was REPEAT YESTERDAY; its aria-label keeps `Repeat yesterday's meals`); LIBRARY meal editor kind switch `Numbers | Built`, basis label `Counted per`, usual hint `one tap logs 175 kcal` or `one tap logs this`, a deleted component reading `removed from the library`, the favourites toggle `All 12` / `Fewer`, empty-state buttons `+ MEAL` and `+ INGREDIENT`, and the add menu note `Its numbers per serve or per 100 g, or built from ingredients.`; HISTORY weigh-in deltas `0.4 down` (the kg is on the value beside it); the SAFE MODE tablet `The 3D column and moving gold are off because the app stopped on this phone.` with `Try full mode`; the install prompt as a toast `Keep it on the home screen.` with `Install`.

---

## 9 Acceptance checklist

Measured on the after build at 390 x 844 DPR 2 (tour machine, tier high) unless stated.

Legibility (re-run the audit capture scripts):
- [ ] 0 text nodes under 12 px on every screen (SVG text included). The only decorative exception is the 3D TEMPERANTIA texture, which is not a text node.
- [ ] 0 text nodes with letter-spacing over 0.2em below 13 px.
- [ ] Every text node at least 4.5:1 against its composited background; 18 px and up at least 3:1. Real WCAG fails: 0 (before: 7).
- [ ] Every input, toggle, segmented, chip and outline-button boundary at least 3:1 against its surround.
- [ ] Focus ring 2 px gold-300 visible on keyboard focus of every control (tab through LOG sheet and SETTINGS).
- [ ] `grep -rn "bone-08\|gold-grain\|tilt-x) \* 60%\|text-\[9px\]\|text-\[10px\]\|text-\[11px\]" src` returns nothing.
- [ ] No disabled control uses opacity on a gold fill.

Scene and opening:
- [ ] 5.2 S1 acceptance samples pass on `today.png`.
- [ ] 5.3 S2 acceptance passes (or the drop order is recorded with numbers).
- [ ] `tp:opening-done` minus `tp:opening-start` at or under 2000 ms, first launch and `--second` (short opening at or under 800 ms).
- [ ] `tp:gl-compile-done` no later than the recorded before value plus 50 ms; program count (log `renderer.info.programs.length` in dev, in the same run that records the before marks) equals before minus 2 after S1 and before minus 4 after S2 (expected 9, 7, 5).
- [ ] No long task over 200 ms inside the opening window.
- [ ] `--nowebgl` tour: SVG monument with temple, ghost outline, lit shaft gradient; no blank stage; no console errors.
- [ ] `--reduced` tour: final frames identical in content, no motion.

Layout:
- [ ] At 360 x 640 and 390 x 844, on every tab and with each sheet open: `document.documentElement.scrollWidth` at or under the viewport width (no horizontal scroll).
- [ ] Every tap target at least 44 x 44 (colonnade days 30 x 180 accepted).
- [ ] Nothing floats over content: no install card on any tab; the toast never overlaps a sheet's action row (`body-photo-viewer.png`).

Tour hygiene:
- [ ] `manifest.json` `errors: []`, `failed: []`, `failedRequests: []`.
- [ ] `library-detail.png` differs from `library.png`; `history-day-sheet.png` differs from `history-ledger-scrolled.png`; `log-quick-per100g.png` exists.

Must-see per screen (a reviewer checks each against the shot):
- [ ] `today.png`: a black glass column with two cream streaks and warm rims standing in a shaft of light, fluted, on a stepped plinth reading TEMPERANTIA, a faint glass ghost up to a gold collar on the line, plaques left and right, the ring with grooves, a meander over the stoic line, no hard canvas edge, no gear.
- [ ] `over.png`: ember cracks in a capped crown, subline readable above it.
- [ ] `log-quick-empty.png`: carved fields with visible edges, the basis switch, the 64 px PortionField, an engraved empty LOG.
- [ ] `log-quick-filled.png`: the live result in gold, picks with the active one framed.
- [ ] `library.png`: fading header, tablet search, sort in the MEALS heading, bone kcal values, one gold rule.
- [ ] `library-detail.png`: PortionField with USUAL pick and live numbers.
- [ ] `history-ledger.png`: lit mini columns on a stylobate, today's bar gold, three equal stones with the laurel, aligned week rows.
- [ ] `body-weight.png`: bracketed weight tablet, gridded chart, no gold seam.
- [ ] `settings.png`: three titled tablets, controls aligned to one right edge.
- [ ] `opening-250ms.png`: wordmark centred in light, not a void.

Process:
- [ ] `npm run typecheck` and `npm test` green.
- [ ] `perl -CSD -ne 'print "$ARGV:$.: $_" if /\x{2013}|\x{2014}/; close ARGV if eof' $(git ls-files src docs)` prints nothing (no en or em dash in UI copy or docs).
- [ ] No new font preload; `public/fonts/cormorant-600.woff2` present; build size of fonts grows by under 40 KB.
