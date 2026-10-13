# TEMPERANCE design spec

Final, implementable spec. Synthesised from the winning concept (THE STELE) with the judges' REQUIRED grafts folded in as LOCKED rules, plus the engineering findings from the Pad King, OMA HQ and mobile R3F readers. This file is the source of truth for colours, type, layout, motion and scene numbers (`CLAUDE.md`). Every number here is for a 390 x 844 phone unless stated. Lines marked LOCKED are not optional.

Owning paths per section follow `CLAUDE.md` file ownership: scene `src/scene/**`, opening `src/intro/**`, home `src/screens/Today*`, log `src/screens/Log*` and `src/components/MealForm*`, library `src/screens/Library*`, history and settings `src/screens/History*` and `src/screens/Settings*`, primitives `src/components/ui/**`.

## 1 Direction

The column is the page. One obsidian monument on a plinth under a gold goal line, with every number, arc and word cut into the stone around it; nothing on the home screen is a card or a form.
Every logged meal is a strike: the column slams up in one hit with dust and a 4 px shake, the brushed gold number ticks down, the ring re-cuts. Past the gold line the stone breaks and ember bleeds through the cracks.
Severe, dark, quiet. Obsidian and gold only, Roman inscription type, no greens, no blues, no pure white, no helper text, and logging never waits on motion.

## 2 Colour tokens

Tailwind 4 `@theme` tokens in `src/index.css`. Names match the existing file; values are updated to these. Dark only (`color-scheme: dark`). LOCKED: sync `index.html` `theme-color` and the `vite.config.ts` manifest `background_color` and `theme_color` to `#050507`.

```css
@theme {
  --font-display: "Cinzel", "Cinzel Fallback", Georgia, serif;
  --font-body: "Cormorant Garamond", "Cormorant Fallback", Georgia, serif;

  /* obsidian: the stone, deepest to lightest */
  --color-obsidian-950: #050507; /* the void: page, canvas clear, shard fill */
  --color-obsidian-900: #0B0B0F; /* bars, sheets, tab bar, 3D column colour */
  --color-obsidian-800: #121218; /* raised slab, inputs, chips */
  --color-obsidian-700: #1A1A21; /* ring track, ghost arcs, skeleton rows */
  --color-obsidian-600: #26262E; /* neutral hairlines */

  /* bone: the only neutrals for text */
  --color-bone: #E7E1D2;      /* primary text */
  --color-bone-dim: #9A948A;  /* labels, meta, sub-lines */
  --color-bone-mute: #5E5A54; /* disabled, placeholders, SKIP */

  /* gold ladder: gradient stops and flat gold */
  --color-gold-100: #FFF7DA; /* specular tip */
  --color-gold-200: #F6E3A1; /* highlight, 3D goal line, ring flash */
  --color-gold-300: #E6CB78; /* light body */
  --color-gold-400: #D8B45A; /* body, flat gold for SVG strokes and fallback text */
  --color-gold-500: #B8902E; /* mid */
  --color-gold-600: #9C7B33; /* shadow */
  --color-gold-700: #7A5E22; /* tail */
  --color-gold-800: #5C4418; /* deep shadow */

  /* ember: over the line */
  --color-ember: #FF5A1F;      /* crack emissive, OVER number stop, delete */
  --color-ember-deep: #B3300A; /* ember gradient tail */
  --color-ember-text: #FF7A45; /* OVER labels and deltas in lists */

  /* macro ring, monochrome gold by value */
  --color-protein: #F2D98A;
  --color-carbs: #B8923E;
  --color-fat: #6E5324;

  /* scene and shard flats */
  --color-dust: #9A8E7A;
  --color-shard-a: #1A1A20;
  --color-shard-b: #0A0A0D;
  --color-shard-c: #26262E;
}

:root {
  /* alpha tokens (Tailwind theme colours cannot carry alpha) */
  --gold-line: rgba(216, 180, 90, 0.16);        /* ledger rules, row rules, tab bar top edge */
  --gold-line-strong: rgba(216, 180, 90, 0.55); /* sheet top edge, section rules */
  --gold-focus: rgba(216, 180, 90, 0.70);       /* input focus hairline */
  --ember-glow: rgba(255, 90, 31, 0.45);        /* fallback crack drop-shadow */
  --bone-08: rgba(231, 225, 210, 0.08);         /* neutral hairline on obsidian-900 */
  --scrim: rgba(5, 5, 7, 0.60);                 /* radial scrim behind the big number */

  /* tilt-driven light. Written by the tilt loop (section 8) or the goldSweep keyframe. */
  --tilt-x: 0;            /* -1 to 1 */
  --tilt-angle: 0deg;     /* = --tilt-x * 18deg */

  --gold-grad: linear-gradient(calc(100deg + var(--tilt-angle)),
    #5C4418 0%, #9C7B33 22%, #D8B45A 42%, #FFF7DA 50%, #F6E3A1 56%, #D8B45A 70%, #7A5E22 100%);
  --gold-grain: repeating-linear-gradient(calc(90deg + var(--tilt-angle)),
    rgba(0, 0, 0, 0) 0 1px, rgba(0, 0, 0, 0.18) 1px 2px);
  --gold-border: linear-gradient(calc(120deg + var(--tilt-angle)),
    #7A5E22 0%, #D8B45A 45%, #FFF7DA 50%, #D8B45A 55%, #5C4418 100%);
  --ember-grad: linear-gradient(calc(100deg + var(--tilt-angle)),
    #B3300A 0%, #FF5A1F 45%, #FFB088 50%, #FF5A1F 55%, #7A2208 100%);
}
```

Three.js colours (hex strings in `src/scene/tokens.ts`): column `#0B0B0F`, plinth `#0D0D12`, key light `#FFE9B8`, rim light `#C8B07A`, sweep light `#FFF4D6`, ember light `#FF6A2B`, goal line `#F6E3A1`, goal flash `#FFF7DA`, goal glow `#D8B45A`, capital `#D8B45A`, dust `#9A8E7A`, spark `#FF8C42`, fog `#050507`, crack emissive `vec3(1.0, 0.35, 0.12) * 2.5`.

Desktop field behind the 430 px slab: `#040406` with `radial-gradient(60% 50% at 50% 40%, rgba(216,180,90,0.05), transparent 70%)`.

## 3 Typography scale

Fonts: Cinzel 400 and 700; Cormorant Garamond 400, 500 and 400 italic. Source `@fontsource/cinzel` and `@fontsource/cormorant-garamond` (remove the Cinzel 500 and 600 and Cormorant 600 imports from `src/main.tsx`). LOCKED: copy the five latin `woff2` files to `public/fonts/` (script `scripts/copy-fonts.mjs`), declare them with `@font-face` in `src/index.css` (`font-display: block` for Cinzel 700, `swap` for the rest), and preload all five in `index.html` with `<link rel="preload" as="font" type="font/woff2" crossorigin href="%BASE_URL%fonts/...">` so the opening cuts the real glyphs. Size-adjusted fallbacks so a late swap never moves layout: `@font-face { font-family: "Cinzel Fallback"; src: local("Georgia"); size-adjust: 92%; }` and `"Cormorant Fallback"` at `size-adjust: 104%`. `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility`.

Sizes at 390 px (desktop slab keeps them; the display number may go to 104 px at 430 px):

| Role | Family | Weight | Size | Line | Tracking | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| Display number (REMAINING or EATEN) | Cinzel | 700 | 96 px | 1.08 | -0.01em | `--gold-grad` clipped |
| Display number when over the line | Cinzel | 700 | 88 px | 1.08 | -0.01em | `--ember-grad` clipped |
| Wordmark, opening | Cinzel | 700 | 28 px | 1 | 0.5em | gold |
| Wordmark, header | Cinzel | 700 | 12 px | 1 | 0.34em | gold |
| Flank values (EATEN, GOAL) | Cinzel | 400 | 22 px | 1.1 | 0.02em | bone |
| Ring centre value | Cinzel | 700 | 20 px | 1 | 0 | gold |
| Stat stones, history values | Cinzel | 400 | 20 px | 1.1 | 0.02em | bone |
| Sheet and section titles | Cinzel | 400 | 14 px | 1 | 0.35em | bone |
| Buttons (LOG, STRIKE rows) | Cinzel | 400 | 14 px | 1 | 0.30em | obsidian-900 on gold, gold on obsidian |
| Row kcal (recents, library, history) | Cinzel | 400 | 15 px | 1 | 0.02em | gold-400 |
| Labels and eyebrows | Cinzel | 400 | 10 px or 11 px | 1 | 0.40em | bone-dim |
| Tab labels | Cinzel | 400 | 9 px | 1 | 0.30em | bone-dim, gold when active |
| Ring letters P C F, author line | Cinzel | 400 | 9 px | 1 | 0.30em | arc colour, bone-dim |
| Inputs | Cormorant | 500 | 20 px | 1.2 | 0 | bone |
| List primary (names) | Cormorant | 500 | 19 px | 1.3 | 0 | bone |
| Rows in recents and history | Cormorant | 500 | 18 px | 1.3 | 0 | bone |
| Stoic line, sub-line under the number | Cormorant | 400 italic | 17 px | 1.35 | 0 | bone-dim |
| Meta and secondary | Cormorant | 400 | 15 px | 1.4 | 0 | bone-dim |
| Hints (floor) | Cormorant | 400 | 14 px | 1.4 | 0 | bone-dim |
| Header date | Cormorant | 400 | 14 px | 1 | 0.08em | bone-dim |

Rules. Nothing in Cormorant under 14 px; nothing in Cinzel under 9 px. Every Cormorant numeral gets the `.num` utility (`font-variant-numeric: lining-nums tabular-nums`) because Cormorant defaults to oldstyle figures. Cinzel digits are proportional: the display number and every counting number lay digits in `inline-grid` cells of `0.62em` (thin space separator cell `0.28em`) so counts never jitter; verify `1111` against `8888` at 96 px in review. Thousands grouping is a thin space U+2009 (`formatInt` in `src/lib/units.ts` changes from a regular space to U+2009). Inscription cut on every Cinzel element except gradient text: `text-shadow: 0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,247,218,0.06)`.

Gradient text (`.gold-text`): LOCKED, no `filter` on the number. Markup `<span class="num"><span class="num-shadow" aria-hidden="true">N</span><span class="num-gold">N</span></span>`; `.num { position: relative; contain: paint; }`, `.num-shadow { position: absolute; inset: 0; transform: translateY(1px); color: rgba(0,0,0,0.55); }`, `.num-gold { position: relative; background: var(--gold-grain), var(--gold-grad); background-blend-mode: multiply, normal; background-size: 100% 100%, 220% 100%; background-position: 0 0, calc(50% + var(--tilt-x) * 60%) 0; -webkit-background-clip: text; background-clip: text; color: transparent; will-change: background-position; }`. Low tier and Safari without `background-blend-mode` on clipped text: drop the grain layer (`.num-gold { background: var(--gold-grad) }`).

## 4 Spacing + layout grid

Base unit 4 px. Side gutters 16 px; 20 px where a shard strip lives (left and right edges of every screen, so no tappable element sits under a shard). Label to value gap 6 px. Card padding 20 px 18 px. Section gap 24 px. Row heights: list rows 52 px (60 px in the library), recents rows 52 px, settings rows 56 px, chips 40 px, inputs 56 px, buttons 56 px. Tap targets 44 px minimum. Radius ladder: 2 px (marks, ticks), 4 px (inputs, buttons, chips: stone, not pills), 16 px (sheet top corners only). Hairlines: `--gold-line` on anything ruled like the goal line (rows, tab bar top), `--bone-08` on neutral dividers, `--gold-border` on the two gold-filled elements and on focused inputs.

Frames. Phone: one fixed 390 x 844 frame, no page scroll on TODAY; LIBRARY, HISTORY and SETTINGS scroll inside a column between the header and the tab bar. Short phones (height under 700 px, iPhone SE class): the stage shrinks to `100svh` minus the fixed rows with a 280 px floor, the number drops to 72 px, the flank inscriptions move onto one row under the sub-line. Desktop (width 768 px or more): the whole app is a 430 px slab centred on the `#040406` field, height `min(100vh, 932px)`, same proportions; shard strips hug the slab's edges, not the window.

Z-index ladder: backdrop 0, canvas 1, inscriptions 10, tab bar 30, shard strips 40, sheets 50, toast 60, opening overlay 70. Safe areas via `env(safe-area-inset-*)` as `--safe-top` and `--safe-bottom`. Keyboard: a `visualViewport` resize listener writes `--vv-h` on `:root` (section 10).

## 5 Opening sequence

Owner `src/intro/**`. One GSAP master timeline (`gsap.context` scoped to the root, reverted on unmount) drives the DOM and SVG; the canvas joins when its shaders are ready and never stretches the timeline. LOCKED: total 1900 ms, the `document.fonts.ready` gate (300 ms cap) runs inside the budget (the timeline starts at t = 0 regardless; only the wordmark cut waits, and at most 300 ms), the LOG keystone and the tab bar are live from frame 0, any `pointerdown` or `keydown` skips.

Full opening (first launch, or Settings OPENING = FULL DAILY):

| Shot | Window | What happens |
| --- | --- | --- |
| S1 The void | 0 to 260 ms | Body `#050507`. Wordmark TEMPERANCE (Cinzel 700, 28 px, tracking 0.5em, gold) at screen centre y 400 is chiselled in letter by letter: each letter `clip-path: inset(0 0 100% 0)` to `inset(0)`, 180 ms, `--ease-cut`, 40 ms stagger across 10 letters (first begins at the fonts gate, at most 300 ms; last lands by 300 + 360 + 180 = 840 ms worst case, 620 ms typical). |
| S2 The shards | 120 to 420 ms | Four shard strips fade 0 to 1 over 300 ms linear while the glint band sweeps once top-left to bottom-right (`--tilt-x` tweened -1 to 1 over 600 ms, ending at 720 ms). |
| S3 The line | 300 to 1100 ms | Canvas: the gold goal slab scales X from 0 to 1 from the left edge, 720 ms `--ease-stone` (300 to 1020); the goal ring and glow sprite fade in 420 to 720 ms. Wordmark travels to its header slot with a FLIP transform (`translateY(-312px) scale(0.43)`, 420 ms, `--ease-stone`) from 680 ms (after its last letter), landing by 1100. |
| S4 The rise | 420 to 1100 ms | Camera dollies from `[0, 0.35, 6.0]` fov 34 lookAt `[0, 0.6, 0]` to rest `[0, 0.9, 8.4]` fov 28 lookAt `[0, 1.67, 0]` over 680 ms `--ease-stone`. Column `scale.y` 0 to H from 480 to 1000 ms with `--ease-hit` then the 120 ms settle. At 1000 ms, the landing: dust burst (full count), stage shake 3 px for 140 ms, the sweep light does one fast pass (theta += 2.1 rad over 400 ms, 960 to 1360). If today is already over the line, `uCrack` blooms 0 to its value over 700 ms from 1020 and the ember light rises. |
| S5 The cut | 1060 to 1700 ms | REMAINING label fades in 160 ms at 1060. The big number is cut upward out of the stone: `clip-path: inset(100% 0 0 0)` to `inset(0)`, 320 ms, `--ease-cut`, from 1100; one brushed highlight sweeps across it (`--tilt-x` -1 to 1, 600 ms, 1100 to 1700). Sub-line and the EATEN and GOAL flank inscriptions fade in 1300 to 1500 ms. |
| S6 The ring | 1380 to 1820 ms | Protein, carbs and fat arcs draw by angle interpolation, 360 ms each, staggered 80 ms (1380, 1460, 1540), `--ease-stone`; readouts fade in at 1500 over 200 ms. |
| S7 The word | 1620 to 1900 ms | Stoic line fades in with a 6 px rise (280 ms). Tab bar slides up 8 px and fades in 1600 to 1840. At 1900 ms live idle begins. The final frame IS the home screen: nothing cuts, nothing re-lays out. |

Shader readiness (LOCKED). The canvas mounts at t = 0 with `frameloop="never"` and `gl.compileAsync(scene, camera)` runs behind the SVG monument (section 15), which is visible from frame 0 at `scale.y` 0. Three join windows: ready by 420 ms: the 3D column rises on schedule and the SVG monument is hidden at 420. Ready between 420 and 600 ms: the 3D column rises from where the SVG column is at that moment and lands at 1000 ms. Ready after 600 ms: the SVG monument plays S4 exactly (rise, dust spans, shake) and the canvas crossfades in over 200 ms at the first idle frame after 1900 ms with the column at H and `rotation.y` 0, so the slow phones still get the rise. The timeline never extends past 1900 ms.

Skip. Any `pointerdown` or `keydown` runs `tl.progress(1)`, sets the 3D state directly (`scale.y` = H, camera at rest, `uCrack` = target, no dust) and starts live idle. A SKIP label (Cinzel 10 px, bone-mute) sits bottom right from 0 ms. A tap on the LOG keystone during the opening both skips and opens the sheet.

Short opening (every launch after the first; `settings.introCount > 0`): 700 ms. Shards and header wordmark fade 0 to 200; goal slab scales 0 to 300; column already standing at H (no rise, no camera move); one sweep pass 100 to 500; number cut 150 to 450; ring 300 to 660; stoic 450 to 700. No opening at all when returning from another tab or from the background within 10 minutes (`sessionStorage` key `temperance.seen` holding a timestamp). Settings OPENING: SHORT (default after the first launch), FULL DAILY, OFF (OFF = a 240 ms crossfade). `markIntroPlayed()` is called when the full opening completes or is skipped.

Reduced motion (system or Settings REDUCED): both versions become one 240 ms crossfade into the final frame, no rise, no dust, no shake, no sweep.

## 6 Home screen

Owner `src/screens/Today*`. 390 x 844, single fixed frame, heights sum to 844:

| y (px) | Height | Element |
| --- | --- | --- |
| 0 to 47 | 47 | Top safe area, obsidian-950. The top shard strip starts here. |
| 47 to 87 | 40 | HEADER BAND. Left: date `MON 13 OCT` (Cormorant 14 px, tracking 0.08em, bone-dim). Centre: TEMPERANCE (Cinzel 700, 12 px, tracking 0.34em, gold). Right: `settings` icon 22 px, bone-dim, 44 px tap target. |
| 87 to 547 | 460 | THE MONUMENT STAGE. The canvas sits behind it, absolute, 390 x 513 from y 47 to 560 so the plinth steps bleed under the ring row. Inscriptions are DOM over the canvas (z 10) and the canvas is `pointer-events: none`. |
| 103 to 121 | 18 | Label REMAINING (Cinzel 11 px, tracking 0.4em, bone-dim, centred). Reads EATEN when the hero figure is swapped (tap the number, persisted in `settings.hero`). Reads OVER THE LINE in ember-text when remaining is negative. |
| 121 to 225 | 104 | The big number, Cinzel 700 96 px, `--gold-grad`, centred, digit cells 0.62em. Over the line: 88 px, `--ember-grad`, magnitude only (no minus sign). A radial scrim sits behind it: `radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)` so gold stays legible when the lit column rises behind. |
| 225 to 247 | 22 | Sub-line `of 2 500 · 1 988 eaten` (Cormorant italic 17 px, bone-dim). Swapped hero shows `of 2 500 · 512 left`. |
| 263 | 0 | THE GOLD GOAL LINE: 3D only (slab, ring, glow, section 7). Design value y 263; the actual y of world `(0, 2.0, 0)` is read once at mount with `camera.project` and written to `--goal-y`, which the GOAL label and the fallback use. A DOM label `GOAL 2 500` (Cinzel 9 px, tracking 0.3em, gold-400) sits right-aligned at the right gutter, 6 px above `--goal-y`. |
| 263 to 507 | 244 | Column territory. Column top sits at `507 - 122 * H` (design value; `--plinth-y` is also read from `camera.project` of `(0, 0, 0)` at mount). At goal the top kisses the line; past it the stone passes behind the number. |
| 400 to 452 | 52 | FLANK INSCRIPTIONS. Left block x 16 to 120, left aligned: EATEN (Cinzel 9 px, tracking 0.35em, bone-dim) over `1 988` (Cinzel 22 px, bone). Right block x 270 to 374, right aligned: GOAL over `2 500`. Tapping EATEN opens the TODAY sheet (section 10). |
| 507 to 547 | 40 | Plinth top and front face (3D), blank. Severe. |
| 547 to 671 | 124 | MACRO RING ROW. Ring 112 px at x 24, y 553. Readouts x 160 to 366: three 32 px rows PROTEIN, CARBS, FAT (section 9). Tapping the ring opens the TODAY sheet. |
| 671 to 735 | 64 | THE STOIC LINE (section 14). Cormorant italic 17 px bone-dim, centred, max 2 lines at 326 px, then a 24 x 1 px gold-400 rule and the author in Cinzel 9 px tracking 0.3em bone-dim. |
| 735 to 754 | 19 | Air; the plinth contact shadow fades into it. |
| 754 to 810 | 56 | THE ENTABLATURE tab bar, obsidian-900, 1 px `--gold-line` top edge, `backdrop-filter: blur(20px)`. Five 78 px slots: TODAY (`landmark`), LIBRARY (`book-marked`), LOG keystone, HISTORY (`scroll-text`), SETTINGS (`settings`). Icons 22 px stroke 1.5 over Cinzel 9 px labels, bone-dim; active = gold text and a 16 x 1 px gold-400 mark above the icon. The keystone is 78 x 64 px and rises 8 px above the bar (y 746 to 810): the only gold-filled element on the home screen, `--gold-grad`, obsidian-900 `plus` icon 22 px and LOG in Cinzel 10 px tracking 0.3em. `:active` scale 0.96. |
| 810 to 844 | 34 | Bottom safe area, obsidian-900 (the bar's colour continues). |

Tab switch: 180 ms crossfade of the screen column plus a 460 ms diagonal gold light wipe (`.tp-sweep`, a fixed `pointer-events: none` 100deg gradient at 12% alpha, restarted with `void el.offsetWidth`). The canvas is mounted once at the app root and kept alive across tabs: off TODAY it is `visibility: hidden` (never `display: none`, which collapses the renderer) with the ticker stopped.

## 7 Column scene

Owner `src/scene/**`. Every canvas goes through `SafeCanvas` (section 15); nothing imports `Canvas` from `@react-three/fiber` directly, enforced by a vitest file that scans `src/`.

Canvas. `<SafeCanvas dpr={[1, dprMax]} gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance', stencil: false }} frameloop={loop} camera={rest} style={{ touchAction: 'pan-y' }} className="pointer-events-none">`. 390 x 513 CSS px. `onCreated`: `gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 0.95; gl.setClearColor(0x000000, 0)`. Scene fog `FogExp2(#050507, 0.06)`. No shadows on any tier (`shadows={false}` at creation; turning shadows on later recompiles every shader). No postprocessing on any tier.

Frameloop (LOCKED). `never` until `gl.compileAsync(scene, camera)` resolves (`ShaderGate` from Pad King: dust mesh mounted `visible={false}` and both ember lights mounted at intensity 0 from the start so every program compiles in the gate; `precompileLightBake` for the `Environment` bake, three pinned `^0.186`). Then `always` only inside windows: the opening rise (420 to 1900 ms) and 1200 ms from each strike. Otherwise `demand` with a ticker that calls `invalidate()` at 24 fps (12 fps low tier) only while TODAY is the active tab, `document.visibilityState === 'visible'`, the canvas is on screen (IntersectionObserver) and fewer than 90 s have passed since the last `pointerdown`; after that it holds the last frame and any store change, resize, tilt sample or pointerdown invalidates once (and restarts the 90 s clock). Every gsap tween that touches a three object has `onUpdate: invalidate`.

Camera. `PerspectiveCamera` fov 28, near 0.1, far 40, rest position `[0, 0.9, 8.4]`, lookAt `[0, 1.67, 0]`. Visible height at z 0 is 4.19 units, so 513 px / 4.19 = 122 px per unit: plinth top Y 0 lands near screen y 507, goal Y 2.0 near y 263 (both measured once via `camera.project`, section 6). Dev tunables on `window.__tune` (exposure, light intensities, `follow`), read each frame from a `T` object, never React state.

Units. 1 world unit = one column metre. `H = 0.18 + 1.82 * (eatenKcal / goalKcal)`, clamped to 2.86 (147 percent of goal). At goal H = 2.0 exactly. The number keeps counting past the clamp.

Plinth. drei `RoundedBox` 1.9 x 0.32 x 1.9 radius 0.02 centred at Y -0.16 (top at Y 0); lower step `RoundedBox` 2.5 x 0.10 x 2.5 centred at Y -0.37. `MeshStandardMaterial color #0D0D12 roughness 0.5 metalness 0.05 envMapIntensity 0.8`. drei `Edges` on the upper step, colour `#D8B45A`, `transparent opacity 0.5`, as the gold inlay. Contact shadow: a 3.2 x 3.2 plane at Y -0.425 with a 64 px radial alpha canvas texture, `MeshBasicMaterial color #000000 transparent opacity 0.6 depthWrite false`.

Column. One `CylinderGeometry(0.46, 0.46, 1, 48, 1)` (24 radial segments low tier), `geometry.translate(0, 0.5, 0)` so the base is the origin, shared by two meshes: `base` at Y 0 with `scale.y = min(H, 2.0)`, and `overflow` inside a `break` group. The `break` group sits at `position.y = min(H, 2.0)`, `rotation.z = -0.0436 * uCrack` (2.5 degrees), `position.x = 0.03 * uCrack`; `overflow` has `scale.y = max(0, H - 2.0)`; the capital torus is a child of `break` at local Y `max(0, H - 2.0)`, so it always rides the top and inherits the tilt. Constant radius on both meshes (no taper) so the seam has no step. Group `rotation.y` carries the idle turn and both meshes share one material.

Capital. `TorusGeometry(0.47, 0.018, 12, 64)` lying flat (`rotation.x = PI / 2`), `MeshStandardMaterial color #D8B45A metalness 1 roughness 0.22 emissive #F6E3A1 emissiveIntensity 0`; on each strike `emissiveIntensity` 0 to 0.6 to 0 over 300 ms.

Obsidian material. High tier: `MeshPhysicalMaterial({ color: '#0B0B0F', roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.10, envMapIntensity: 1.6 })`, `customProgramCacheKey = () => 'tp-obsidian-phys'`. Low tier: `MeshStandardMaterial({ color: '#0B0B0F', roughness: 0.25, metalness: 0.1, envMapIntensity: 1.2 })`, key `'tp-obsidian-std'`. One `onBeforeCompile` injection on either, uniforms assigned by reference with `Object.assign(shader.uniforms, uniforms)`:

| Uniform | Type | Value |
| --- | --- | --- |
| `uCrack` | float | `clamp((eaten - goal) / (0.25 * goal), 0, 1)`; fully fractured at 25 percent over |
| `uGoalY` | float | 2.0 |
| `uTime` | float | seconds, ticked only while `uCrack > 0` and motion is not reduced |
| `uDepth` | int | 1 = 3D voronoi (27 taps), 0 = 2D (9 taps, low tier) |
| `uScale` | float | 6.0 |
| `uFlute` | float | 0.012 (0 on low tier if frame time says so) |
| `uEmber` | vec3 | `(1.0, 0.35, 0.12) * 2.5` |

Vertex (after `#include <begin_vertex>`): `float a = atan(transformed.z, transformed.x); float f = 0.5 + 0.5 * cos(16.0 * a); vec3 radial = normalize(vec3(transformed.x, 0.0, transformed.z)); transformed -= radial * uFlute * f; vec3 tang = vec3(-sin(a), 0.0, cos(a)); objectNormal = normalize(objectNormal + tang * (uFlute * 8.0 * sin(16.0 * a)) / 0.46); vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;` with `varying vec3 vWorldPos;` declared after `#include <common>` in both stages (three's own `worldPosition` only exists under envmap or shadow defines). Flute sign is verified by eye in review.

Fragment. After `#include <color_fragment>`: `float above = smoothstep(uGoalY - 0.02, uGoalY + 0.15, vWorldPos.y); vec3 p3 = vWorldPos * uScale; vec2 p2 = vec2(atan(vWorldPos.z, vWorldPos.x) * 0.46, vWorldPos.y) * uScale; float f1, f2; voro(p3, p2, uDepth, f1, f2); float edge = 1.0 - smoothstep(0.0, 0.06 + 0.04 * uCrack, f2 - f1); float climb = smoothstep(0.0, 1.0, uCrack * 1.4 - (vWorldPos.y - uGoalY) * 0.6); float c = above * uCrack * edge * climb; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), c);`. `voro` is a 3 x 3 x (2 * uDepth + 1) cell search with `hash3` (`fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453)`), loop bounds from the uniform (WebGL2 only; no constant loops for ANGLE to unroll), returning F1 and F2 distances. After `#include <roughnessmap_fragment>`: `roughnessFactor = mix(roughnessFactor, 1.0, c);`. After `#include <normal_fragment_maps>`: `normal = normalize(normal + 0.6 * c * vec3(dFdx(f1), dFdy(f1), 0.0));`. After `#include <emissivemap_fragment>`: `totalEmissiveRadiance += c * uEmber * (0.8 + 0.2 * sin(uTime * 3.0 + f1 * 20.0));`. Ember glow sprite at `[0, 2.25, 0.35]`, 64 px radial texture, additive, colour `#FF5A1F`, `opacity = 0.5 * uCrack`, scale `[1.3, 0.9, 1]`, scale pulsing 0.95 to 1.05 over 2 s while `uCrack > 0`.

Goal line. Slab `BoxGeometry(6.0, 0.012, 0.012)` at `[0, 2.0, 0]`, `MeshBasicMaterial color #F6E3A1 toneMapped false` (wider than the frustum, so it meets both canvas edges and the column occludes it where it passes through). Glow slab `BoxGeometry(6.0, 0.06, 0.06)`, `MeshBasicMaterial color #D8B45A transparent opacity 0.16 blending AdditiveBlending depthWrite false`. Ring `RingGeometry(0.56, 0.575, 96)` flat at Y 2.0 (`rotation.x = -PI / 2`, `side DoubleSide`), same gold basic material. Glow sprite at `[0, 2.0, 0.5]`, 64 px radial texture, additive, colour `#D8B45A`, opacity 0.35, scale `[1.6, 0.28, 1]`. Crossing flash: slab and ring colour to `#FFF7DA` and sprite opacity 0.9 for 90 ms, decaying to rest over 500 ms.

Lights. `ambientLight` 0.12 `#2A2A33`. Key `spotLight #FFE9B8 intensity 18 decay 2 angle 0.5 penumbra 0.7` at `[2.4, 4.2, 2.6]` targeting `[0, 1.2, 0]`. Rim `directionalLight #C8B07A intensity 1.2` from `[-3, 2.5, -2.5]`. Sweep `pointLight #FFF4D6 intensity 9 distance 7 decay 2` at `[3.2 * sin(theta), 3.4, 3.2 * cos(theta)]`, `theta = 2 * PI * t / 14 + 0.4 * tiltX`; this one moving light is the idle light sweep and the opening pass (moving a light never recompiles; it is mounted from frame 0). Ember `pointLight #FF6A2B distance 2.2 decay 2` at `[0, 2.05, 0.6]`, `intensity = 6 * uCrack` (mounted at 0). drei `<Environment resolution={64} frames={1}>` (32 on low tier) with three `Lightformer`s: rect `#FFF1CC` intensity 3 at `[0, 5, -2]` scale `[6, 1, 1]`; rect `#8C7A5A` intensity 1.2 at `[-4, 1, 3]` `rotation-y PI / 3` scale `[1, 4, 1]`; rect `#FF6A2B` intensity 0.6 at `[0, -1, 4]` scale `[4, 0.5, 1]`. The bake is precompiled before the first draw; Lightformers never move.

Strike (per store `pulse`). The scene subscribes to `useStore.pulse` (`{ id, kind: 'log' | 'remove', deltaKcal, totalKcal, over }`) and reads the new H from `totalKcal`. `kind: 'log'`: a GSAP timeline on a ref object `s = { h, sx, sy }`: `scale.y` from `H0` to `1.015 * H1` over 170 ms `--ease-hit` (accelerates and stops hard), then to `H1` over 120 ms `--ease-settle`; at the 170 ms mark: `trauma = 1.0`, dust burst, capital pulse, `navigator.vibrate?.(18)`. Strikes within 600 ms coalesce: the running tween retargets `H1` and no second burst fires. If the top crosses 2.0: goal flash, 60 ember sparks, `uCrack` blooms to its value over 700 ms `--ease-stone`, ember light to its value over the same 700 ms. `kind: 'remove'`: sink to the new H over 600 ms `--ease-stone`, no dust, no shake; if the top drops below 2.0, `uCrack` to 0 over 600 ms. The slam starts after the sheet's `transitionend` or 220 ms, whichever comes first; the store write, number, ring and recents never wait for it.

Shake. Trauma model in `useFrame`: `trauma = max(0, trauma - dt * 2.4); s = trauma * trauma; camera.position = rest + (s * 0.033 * sin(t * 97), s * 0.024 * sin(t * 113 + 1.3), 0); camera.rotation.z = s * 0.012 * sin(t * 89)` (about 4 px at the column, 140 ms visible). The stage container runs the matching DOM keyframe (`translate 3px` two cycles, 140 ms) so canvas and inscriptions move as one and the fallback shakes identically. The opening landing uses `trauma = 0.75`.

Dust (LOCKED: one `InstancedMesh`). 220 instances of `PlaneGeometry(0.05, 0.05)` (90 on low tier), `frustumCulled={false}`, `visible` toggled on burst, `ShaderMaterial transparent depthWrite false blending NormalBlending`, soft-circle 64 px alpha texture, billboarded in the vertex shader (`mv = modelViewMatrix * vec4(centre, 1.0); mv.xy += position.xy * size`). Per-instance attributes: `aSeed` vec4 (angle 0 to 2 PI, speed 0 to 1, life offset 0 to 0.12 s, size 0 to 1) and `aKind` float (0 = foot, 160 instances; 1 = top spark, 60 instances). Uniforms: `uTime`, `uBurst` (burst time, -100 initially), `uTopY` (H at burst), `uEmber` (1 when the burst crossed the goal, else 0), `uColorDust #9A8E7A`, `uColorSpark #FF8C42`, `uMap`. Foot particle: origin radius 0.55 to 0.9 at Y 0.02, outward 0.8 to 1.6 u/s, up 0.6 to 1.4 u/s, gravity -2.2, life 0.7 to 1.1 s, size 0.03 to 0.09, alpha `(1 - t / life) * 0.55`. Top spark (only when `uEmber > 0.5`, else size 0): origin radius 0.2 at `uTopY`, outward 0.3 to 0.8, up 1.2 to 2.0, gravity -1.6, life 1.0 to 1.4 s, size 0.02 to 0.05, colour `uColorSpark`, `toneMapped false`. `t = uTime - uBurst - lifeOffset`; size 0 outside `0 < t < life`. CPU cost per burst: two uniform writes. Idle: `visible = false`.

Idle. Live idle while TODAY is visible: column group `rotation.y += 0.035 * dt` (one turn per 180 s), sweep theta advances on the 14 s period, both driven by the demand ticker. Deep idle (another tab, hidden, 90 s without touch, reduced motion): no ticker, `invalidate()` only on change.

Over goal. H continues above 2.0 (the `overflow` mesh grows), the `break` group tilts to 2.5 degrees as `uCrack` reaches 1, cracks climb from the line, the ember glow sprite and light come up, the hero label flips to OVER THE LINE with the ember number. All of it reverses on delete.

Reduced motion. Column at H instantly, no dust, no shake, no tilt animation, no idle turn, sweep light static at `theta = 0.6`, `uTime` frozen (steady ember, no pulse), `frameloop="demand"` with one `invalidate()` per store change. The still frame always shows the final state: column, cracks, gold.

Resilience. `webglcontextlost`: `preventDefault`, remount the canvas by key once with the SVG monument covering; a second loss within 30 s switches to the SVG monument for the session. `isSoftwareRenderer` (section 15) never mounts the canvas.

## 8 Fractured edges overlay technique

Owner `src/components/ui/Shards.tsx`. LOCKED: four fixed strip SVGs (top, bottom, left, right), not one full-screen SVG, so the per-frame glint repaints four strips and never the whole screen. Each strip: `position: fixed; pointer-events: none; z-index: 40`, offset by its `env(safe-area-inset-*)`. Top and bottom strips are `100vw x 64px` with `viewBox 0 0 390 64` and `preserveAspectRatio="xMidYMin slice"` (bottom uses `xMidYMax`); left and right strips are `64px x 100vh` with `viewBox 0 0 64 844` and `xMinYMid` or `xMaxYMid slice`, so shards crop on wide or tall screens instead of stretching. On desktop the strips hug the 430 px slab.

Shards. Polygons generated once by a seeded script (`scripts/shards.mjs`, fixed seed, committed as static SVG so the stone is identical every launch): 5 across the top, 9 down the left, 11 down the right, 3 at each bottom corner (bottom strip stays shallow, 8 to 18 px, so it never eats the tab bar), each 4 to 6 points with jagged inner edges, depth 18 to 64 px (deepest at the top right and bottom left corners), outer edge flush with the screen. Three layers per strip: (1) fill, each polygon using one of six reusable `linearGradient` facets at different angles with stops `#1A1A20 0%`, `#0A0A0D 55%`, `#26262E 100%`, so neighbouring shards read as broken planes catching light differently; (2) glint, one `polyline` traced along the broken inner edge of every shard, `stroke="url(#glint)" stroke-width 0.8 opacity 0.55`, never on the screen-side edges, plus three or four short facet lines inside the bigger shards at opacity 0.25; (3) specular, a `<g class="spec">` holding a 140 px wide soft `linearGradient` band (bone `#E7E1D2` at 0.22 to transparent) clipped to the shard shapes with `clipPath`, moved by CSS `transform: translateX(calc(var(--tilt-x) * 120px))` (translateY on the side strips). No `feTurbulence`, no `feGaussianBlur`, no runtime filters.

Light. `#glint` is a `userSpaceOnUse` gradient (stops transparent 0, `#F6E3A1` 48%, `#FFF7DA` 50%, `#F6E3A1` 52%, transparent 100%) whose `x1` and `x2` are set by the tilt loop (`x1 = 390 * (tiltX * 1.2 - 0.6)`, `x2 = x1 + 390`); the specular `<g>` reads `--tilt-x` directly. Tilt loop: one rAF-throttled listener at 30 Hz writes `--tilt-x` (-1 to 1), `--tilt-angle` (`--tilt-x * 18deg`) and the gradient attributes. Desktop: pointer position normalised to the slab. Phone: `DeviceOrientation` `gamma / 30` clamped, lerped 0.12 per frame. Where `DeviceOrientationEvent.requestPermission` exists (iOS 13+) tilt is opt-in via Settings GOLD FOLLOWS TILT (a user gesture) and a one-line offer under the toast after the first log; elsewhere it is on by default. Until tilt is live, `@property --tilt-x { syntax: '<number>'; inherits: true; initial-value: 0 }` is animated by `@keyframes goldSweep { from { --tilt-x: -1 } to { --tilt-x: 1 } }` 9 s ease-in-out alternate infinite on `:root`, `animation-play-state` tied to live idle. The number, the borders, the shards and the 3D sweep light all read the same variable: one light for the whole screen. Low tier: tilt and glint update at 15 Hz. Reduced motion: no auto sweep (`--tilt-x` rests at 0); user-driven tilt still allowed.

Polished centre. A page-level CSS vignette on `body::after`: `radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)`, fixed, `pointer-events: none`, z 0, under the shards. Backdrop (ported from Pad King `StudioBackdrop`, recoloured): a fixed `96vmax` radial key light `rgba(220,224,230,0.06)` moved by `--tilt-x`, plus the SVG `feTurbulence` grain as a static data-URI background at opacity 0.05 (static image, not a runtime filter) so pure black never bands. The backdrop returns nothing under reduced motion except the grain.

## 9 Macro ring geometry

Owner `src/screens/TodayRing.tsx`. SVG `viewBox 0 0 120 120` rendered at 112 px (56 px in an expanded history day). Centre (60, 60), radius 50, `stroke-width 7`, `stroke-linecap butt` (chiselled ends, never round). Track: full circle `#1A1A21` width 7. Three arcs as explicit `<path>` arcs computed from angles (not dashoffset, so the gaps stay exact), starting at -90 degrees plus a 3 degree half gap, clockwise, in the order protein, carbs, fat. Gap 6 degrees between arcs (18 total, 342 shared).

Split by calorie contribution (`macroEnergySplit` in `src/lib/macros.ts`): `p = protein * 4`, `c = carbs * 4`, `f = fat * 9` over their sum, so the ring matches the big number. `deg_i = 342 * share_i`. Colours: protein `#F2D98A`, carbs `#B8923E`, fat `#6E5324`. Outside each arc's midpoint at radius 58, a 4 px tick in the arc colour and the letter P, C or F in Cinzel 9 px tracking 0.2em. A zero macro draws no arc but keeps its gap, so a missing macro never reads as a complete ring. Empty day: three equal 114 degree arcs in `#1A1A21` with the gaps, centre `0 g`.

Centre: protein grams in Cinzel 700 20 px gold (`142 g`) over PROTEIN in Cinzel 8 px tracking 0.3em bone-dim.

Readouts (x 160 to 366, three 32 px rows): 10 x 2 px swatch in the arc colour, label Cinzel 10 px tracking 0.3em bone-dim (PROTEIN, CARBS, FAT), value Cormorant 500 18 px bone `.num` (`142 g`), share Cormorant 15 px bone-dim `.num` (`31%`) right aligned. If macro targets are set, a ghost arc (`#26262E`, width 2, radius 44) shows each target's calorie share inside the ring. Tapping a readout row flips the ring into single-macro progress mode for 6 s or until tapped again: one arc of `grams / target` over 342 degrees in that colour, centre `142 g` over `OF 180`.

Motion: on each store change the arc angles tween to the new split over 520 ms `--ease-stone` in rAF (angles, then path `d` rewritten); reduced motion snaps. Tapping the ring opens the TODAY sheet.

## 10 Log form + recents

Owner `src/screens/Log*`, `src/components/MealForm*`, `src/components/ui/Sheet.tsx`. The LOG keystone opens a bottom sheet, obsidian-900 with a 1 px `--gold-line-strong` top edge, 16 px top corners and a 36 x 3 px gold-400 grab bar. OMA HQ pattern, in order: the form on top, the submit, the recent items underneath, tap to re-log.

Sheet geometry (LOCKED). Height `min(92svh, var(--vv-h))`; `--vv-h` is written by a `visualViewport` resize listener; when `--vv-h < 620px` the sheet pins to the visual viewport (`position: fixed; top: 0; height: var(--vv-h)`), the home stage underneath is not touched. Rises 320 ms `--ease-sheet` (reduced motion: 160 ms fade), dismisses 200 ms. The footer is sticky inside the sheet so LOG always sits above the keyboard.

Header (56 px): LOG in Cinzel 14 px tracking 0.35em; right: a two-way inscribed switch QUICK | BUILD (32 px, gold hairline, active = gold text with a 2 px gold-400 underline).

QUICK form (inputs 56 px, obsidian-800, 1 px `#26262E` line, radius 4, Cormorant 500 20 px bone, focus = `--gold-focus` hairline, no glow; labels Cinzel 10 px tracking 0.35em bone-dim 6 px above; 12 px row gaps):
1. NAME (text, optional, placeholder `Meal`). LOCKED: no `datalist`; a custom suggestion row of up to 5 chips from recents appears under the field as he types (matches by `matchesQuery`); tapping one fills all four numbers and sets `mealId`.
2. CALORIES (2/3 width, `inputmode="decimal"`, unit suffix inside the field reads `kcal` or `kJ` per Settings; typed kJ is divided by 4.184 on save via `fromInputEnergy`) | PORTION (1/3 width: a 56 px stepper with `minus` and `plus` ghost icons 44 px each, 0.5 to 4 step 0.5, default 1; the value is `servings` on the entry).
3. PROTEIN g | CARBS g | FAT g thirds, `inputmode="decimal"`, default 0.
4. One 36 px line: left the quiet hint in Cormorant 14 px bone-dim (`macros = 1 012 kcal`, adding `· differs from calories` when typed calories differ from the 4/4/9 sum by more than 8 percent, never blocking); right a SAVE TO LIBRARY toggle (Cinzel 10 px label, 36 x 20 px hairline switch; on by default for a new name, off when the name matches a library meal).

LOCKED: LOG is enabled on calories alone (name defaults to `Meal`), and Enter or Go on any field commits when calories exist. Each typed digit lands with a 120 ms `clip-path` wipe from the top of its cell and `navigator.vibrate?.(8)` on Android.

BUILD mode: an INGREDIENT search field (48 px) over saved ingredients; tapping one adds a row (name, AMOUNT input in its `per.unit`, computed kcal right aligned in gold via `makeComponent`), rows removable with `x`. Totals bar under the rows: `kcal · P · C · F` in Cinzel 15 px. Then MEAL NAME and the SAVE TO LIBRARY toggle (saves an assembled meal with its components), then the same footer.

Sticky footer: at rest it holds the FAVOURITES chip row (40 px chips, Cinzel 11 px tracking 0.2em, gold hairline, horizontal scroll, max 8, from `favouriteMeals`; tap = `logMeal(id, 1)` instantly, two taps from home to a strike) above the LOG button (56 px full width, `--gold-grad` fill, obsidian-900 LOG in Cinzel 14 px tracking 0.3em, disabled at 40 percent opacity without calories). When `--vv-h < 620px` the chip row collapses (typing, not tapping) so the footer is 56 px plus 12 px padding. In thumb reach either way.

Submit rule. The zustand write (`logQuick` or `logMeal`) is synchronous and snapshots the numbers; the number, ring and recents update on that write. The sheet dismisses in 200 ms and the strike fires from the store `pulse` (section 7). A toast (Cormorant 15 px, obsidian-800 slab, gold hairline, bottom at `--safe-bottom + 72px`, z 60) reads `Logged · 612 kcal` with an UNDO text button (Cinzel 10 px gold) for 4 s; UNDO calls `deleteEntry` (column sinks, no dust). Never a confirm dialog. If persistence throws (quota, private mode) the entry stays in memory, the strike still plays and the toast reads `Saved for this session only. Export now.` with an EXPORT action.

RECENT (under the footer's scroll content, inside the sheet): header RECENT in Cinzel 10 px tracking 0.4em bone-dim with `LAST 12` right. Source: a new selector `recentEntries(entries, 12)`, the last 12 distinct `name + kcal` pairs across all days, newest first (library-only `recentMeals` would lose unsaved quick logs). Rows 52 px, `<button>`, ruled by 1 px `--gold-line`: a 3 x 30 px gold-400 bar at the left; name Cormorant 500 18 px bone with `P 32 · C 48 · F 12` in Cormorant 13 px bone-dim `.num` beneath; right: kcal in Cinzel 15 px gold-400 and a 40 px `square-plus` ghost icon. Tap the row = re-log the snapshot as it was (`logQuick` with the entry's per-serving macros and `servings`, toast, strike). Long press 450 ms = prefill QUICK with it for editing first. Swipe left = hide from recents. Row hover and press: `--gold-line` wash. Empty: `Nothing logged yet.` in Cormorant italic 15 px bone-dim. A newly logged row rises in from the top (14 px rise, 240 ms) with its gold rule drawing left to right (240 ms).

TODAY sheet (from EATEN or the ring): today's entries from `entriesForDay`, newest first, same row style with the time (`formatTime`), swipe left to delete (column sinks 600 ms, no dust, toast with UNDO), tap to edit the snapshot (`updateEntry`). The kJ toggle applies to every number here.

## 11 Library + favourites folder

Owner `src/screens/Library*`. Header 56 px: LIBRARY in Cinzel 14 px tracking 0.35em; right a 44 px `plus` that asks MEAL or INGREDIENT. Search field 48 px (Cormorant 20 px, `search` icon 16 px). Three inscribed sections, each headed in Cinzel 10 px tracking 0.4em bone-dim over a 1 px `--gold-line-strong` rule:

FAVOURITES (the folder, `folder-heart` icon 14 px beside the heading): pinned at the top, items with `favourite: true` from both `favouriteMeals` and favourite ingredients, ordered by `lastUsedAt` then name. Shows up to 8 rows with ALL at the right when there are more; collapsed state remembered in `localStorage` key `temperance.fav.collapsed`. Empty: `Mark a meal to keep it here.` in Cormorant italic 15 px bone-dim. The same favourites feed the chip row on the LOG sheet. The favourite mark is the `star` icon, outline bone-dim off, filled gold-400 on, 44 px target at the row's trailing edge; long press a row anywhere toggles it.

MEALS: rows 60 px, ruled `--gold-line`: name Cormorant 500 19 px bone; sub-line `612 kcal · P 32 C 48 F 12` Cormorant 13 px bone-dim `.num`; trailing 44 px `square-plus` logs one portion immediately (`logMeal`, toast with UNDO; the strike plays when TODAY is next visible, the entry already counts). Row tap opens the MEAL DETAIL sheet: name, numbers, portion stepper, and four hairline actions LOG, EDIT, FAVOURITE, DELETE (56 px each). Under EDIT a quiet note in Cormorant italic 14 px: `Edits change future logs only. Past days keep their numbers.` Assembled meals list their components with amounts and can be reopened in BUILD. Delete is two-step inline: the row's rule turns ember and shows DELETE? (Cinzel 10 px); a second tap deletes; past entries keep their snapshots.

INGREDIENTS: rows 60 px with the basis in the sub-line (`per 100 g · 165 kcal · P 31 C 0 F 3.6` or `per serve`). Same detail sheet (basis amount instead of portion). Deleting an ingredient never touches entries or saved meals (components keep their snapshot; the line reads `removed` in bone-mute).

Sorting: favourites by last logged, meals and ingredients alphabetical (`libraryMeals`, `libraryIngredients`) with a `most logged` chip that sorts by `useCount`. Plain `ul` with `content-visibility: auto`; 300 items need no virtualisation.

## 12 History

Owner `src/screens/History*`. Header 56 px: the month in Cinzel 12 px tracking 0.3em with `chevron-left` and `chevron-right` 44 px targets.

THE COLONNADE: a horizontal strip 180 px tall of day columns from `historyDays(entries, today, 30)`, one per day, 22 px wide with 8 px gaps, 14 visible, scroll-snapped by week, newest at the right, with a fixed gold-400 hairline across the strip at 60 percent of its height (the goal). Each day is a miniature obsidian column (SVG rect, 3 stop vertical gradient `#1A1A21` / `#0B0B0F` / `#050507`, two flute lines at opacity 0.25 and 0.08) whose height is `eaten / goal` against that line; a day over the line shows an ember-tipped top above it (`--ember-grad`, `filter: drop-shadow(0 0 2px var(--ember-glow))` on high tier only); today has a gold base mark; an untracked day is a 4 px stub. Tap a day: its entries list (snapshots, time, swipe to delete, with a recompute of that day only).

Three stat stones under the colonnade (Cinzel 20 px value over a Cinzel 9 px tracking 0.3em label, bone over bone-dim): `7 DAY AVG`, `UNDER THE LINE` (`5 OF 7`), `STREAK` as a roman numeral from `disciplineStreak`.

Week list: rows 56 px ruled `--gold-line`, newest first: `MON 13` (Cinzel 10 px tracking 0.28em bone-dim, 60 px column), `2 040 kcal` (Cinzel 16 px gold-400), `P 150` (Cormorant 13 px bone-dim `.num`), and the delta right aligned: `260 LEFT` in bone-dim or `340 OVER` in ember-text (Cinzel 10 px tracking 0.2em). Tap expands the day inline (240 ms): entries and the day's ring at 56 px. Days older than 90 collapse into month rows with the same bar and totals.

Goal: v1 compares every day against the current `settings.goalKcal`. An optional `goalByDay: Record<string, number>` snapshot is listed in the schema block (section 13) for a later version; nothing in History may depend on it in v1.

## 13 Settings

Owner `src/screens/Settings*`. Opened from the header icon; a column of rows (Cormorant 19 px values, Cinzel 10 px tracking 0.35em labels, 56 px rows, ruled `--gold-line`):

| Row | Control | Store |
| --- | --- | --- |
| DAILY GOAL | 56 px numeric input in the display unit (kcal or kJ), converted with `fromInputEnergy` on save | `setGoalKcal` |
| MACRO TARGETS | P, C, F gram inputs in one row (optional; 0 hides the ghost arcs) | `setTargets` |
| UNITS | segmented KCAL | KJ; display only, x 4.184 on output, kcal integers stored | `setUnit` |
| HERO FIGURE | segmented REMAINING | EATEN (also set by tapping the number) | `settings.hero` |
| GOLD FOLLOWS TILT | toggle; on iOS the tap calls `DeviceOrientationEvent.requestPermission()` | `settings.tilt` |
| MOTION | segmented SYSTEM | REDUCED | FULL. LOCKED mapping: SYSTEM = `'system'`, REDUCED = `'on'` (forces reduced), FULL = `'off'` (forces full) | `setMotion` |
| OPENING | segmented SHORT | FULL DAILY | OFF, default SHORT after the first launch | `settings.opening` |
| REPLAY OPENING | hairline button; sets `introCount` to 0 and plays the full opening on the next launch | `resetIntro()` |
| DAYS | note only: `Days reset at local midnight.` | |
| EXPORT JSON | `exportData()` as `temperance-YYYY-MM-DD.json`; Web Share API with files when `navigator.canShare({ files })`, else a download link | |
| IMPORT JSON | file input, then MERGE or REPLACE with a two-step confirm; errors read `That file is not a Temperance backup.` | `importData` |
| ERASE ALL | two-step, ember text, second tap reads ERASE EVERYTHING | `resetAll` |

Footer: version and build hash, `Data lives on this device.`, and the stoic sources line (`Long, Gummere, Carter, Higginson translations, public domain`).

Schema additions required (one change, `SCHEMA_VERSION` 2 with a `migrate` that fills defaults): `Settings.tilt: boolean` (default false), `Settings.opening: 'short' | 'full' | 'off'` (default `'short'`), `Settings.hero: 'remaining' | 'eaten'` (default `'remaining'`), store action `resetIntro()`, selector `recentEntries(entries, limit)`, optional `goalByDay?: Record<string, number>` reserved for a later version. Persist `version` and `migrate` ship from day one; the install prompt (ported from Pad King `InstallPrompt`, 20 s delay, 14 day snooze in `localStorage` key `temperance.install.snoozed`) guards against Safari's 7 day storage eviction for uninstalled sites.

## 14 Daily stoic line

Placement: home screen row y 671 to 735 only, under the ring and above the entablature. Cormorant italic 17 px bone-dim, centred, max 2 lines at 326 px, then a 24 x 1 px gold-400 rule and the author in Cinzel 9 px tracking 0.3em bone-dim. Nowhere else, never a push, never a modal, never bold, never boxed. Picked by `daysSinceEpoch(localDayKey) % 30` in `src/lib/stoic.ts` so the same line holds all day. Sources are public-domain translations only: George Long (Meditations 1862, Discourses 1877), Richard Gummere (Letters to Lucilius, Loeb 1917 to 1925), Elizabeth Carter (Enchiridion 1758) and Thomas Higginson (1865). A vitest lint asserts every line has an author, is under 100 characters and contains no U+2013 or U+2014.

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
| 10 | No longer talk at all about the kind of man that a good man ought to be, but be such. | Marcus Aurelius |
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
| 27 | If you want to improve, be content to be thought foolish and stupid with regard to external things. | Epictetus |
| 28 | Practise yourself, for heaven's sake, in little things, and thence proceed to greater. | Epictetus |
| 29 | It is difficulties which show what men are. | Epictetus |
| 30 | Only the educated are free. | Epictetus |

## 15 Non-WebGL fallback + GPU tiering

Owner `src/scene/SafeCanvas.tsx`, `src/scene/webgl.ts`, `src/scene/FallbackMonument.tsx`. Detection at boot (`canUseWebGL`, cached once, throwaway context released with `WEBGL_lose_context`): LOCKED, the 3D path requires a `webgl2` context (`canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })`) because the crack shader's loop bounds come from uniforms (GLSL ES 3.00); webgl1-only devices, `null` contexts, and software renderers (`WEBGL_debug_renderer_info` `UNMASKED_RENDERER_WEBGL` matching `/swiftshader|llvmpipe|software|basic render/i`) all get the SVG monument. `SafeCanvas` makes the decision before `<Canvas>` mounts (so three never throws on context creation) and wraps the canvas in a class error boundary whose fallback is the SVG monument. A vitest file forbids a bare `<Canvas` or `import { Canvas } from '@react-three/fiber'` anywhere except `SafeCanvas.tsx`. Settings MOTION = REDUCED does not force the fallback; a second context loss within 30 s does.

THE SVG MONUMENT (same geometry and screen positions as the 3D, owned by the stage, 390 x 513): plinth as two trapezoids with facet gradients at y 507 to 558; column as a rect 112 px wide anchored at y 507 with a 3 stop horizontal gradient (`#050507` / `#1A1A21` / `#050507`) for roundness and 16 vertical flute lines at alternating opacity 0.25 and 0.08; cap slab 1 px lighter; the capital as a 112 x 6 px gold ellipse; goal line as a 1 px `#F6E3A1` rule across the stage at `--goal-y` with a 6 px `rgba(246,227,161,0.35)` glow box-shadow, plus a 122 x 18 ellipse ring. Height: `scaleY` on the column group with `transform-origin: bottom`, `H * 122px`. Strike: `scaleY` 170 ms `--ease-hit` to 1.015 then 120 ms `--ease-settle`; the stage container runs the same 140 ms shake keyframe; dust is 12 absolutely positioned 6 px spans with an 800 ms rise-and-fade keyframe (omitted under reduced motion). Crack: a group of 7 hand-drawn jagged `<path>`s above the goal line, stroke `#FF5A1F` width 1.2, `stroke-dasharray` draw-on over 700 ms, `filter: drop-shadow(0 0 6px var(--ember-glow))` on high tier only; visible paths scale with overshoot (2 at 5 percent over, 7 at 25 percent or more). Over the line the overflow group also rotates 2.5 degrees about the seam. Light sweep: a `rgba(255,244,214,0.14)` highlight band translating across the column rect on the 14 s loop; no idle turn. The same SVG plays the opening rise when shaders miss the 600 ms window, covers context-loss remounts, and is the static OG image source.

GPU tiering. `src/scene/tier.ts`, result cached in `localStorage` key `temperance.tier` as `{ tier, at }` for 30 days so the second open skips the probe:

| Tier | Condition | Settings |
| --- | --- | --- |
| none | no webgl2, software renderer, two context losses | SVG monument, every DOM and SVG effect intact |
| low | median of the first 30 rendered frame times over 20 ms (measured during the opening while `frameloop` is `always`), or `hardwareConcurrency <= 4`, or `deviceMemory <= 4`, or `dpr * canvas area > 1.2 Mpx` | `dprMax` 1.0, dust 90, `MeshStandardMaterial` (no clearcoat), env resolution 32, `uDepth` 0, no antialias, ticker 12 fps, glint and tilt at 15 Hz, no number grain layer, no history drop-shadows |
| high | everything else | `dprMax` 1.5 (LOCKED cap), dust 220, `MeshPhysicalMaterial` clearcoat, env 64, `uDepth` 1, antialias, ticker 24 fps, 30 Hz tilt |

drei `PerformanceMonitor` (`flipflops={3}`) may additionally lower `dpr` to 1.25 on decline during the strike windows and raise it back; never below 1.0, never above 1.5. The dust count follows the same callbacks.

## 16 Motion tokens

```css
:root {
  --ease-cut: cubic-bezier(0.7, 0, 0.2, 1);        /* chisel reveals, clip-path */
  --ease-stone: cubic-bezier(0.16, 1, 0.3, 1);     /* settles, draws, fades, sinks */
  --ease-hit: cubic-bezier(0.6, 0, 1, 0.4);        /* the strike rise: accelerates, stops hard */
  --ease-settle: cubic-bezier(0.34, 1.56, 0.64, 1);/* overshoot return */
  --ease-sheet: cubic-bezier(0.2, 0.9, 0.2, 1);    /* sheet open */
  --ease-count: cubic-bezier(0.2, 0.9, 0.2, 1);    /* number ticks */

  --t-hit: 170ms;          /* scale.y to 1.015 x target */
  --t-settle: 120ms;       /* to target */
  --t-shake: 140ms;        /* 4 px in 3D, 3 px DOM, two cycles, decaying */
  --t-dust: 1100ms;        /* longest particle life; the always window is 1200ms */
  --t-capital: 300ms;      /* emissive 0 to 0.6 to 0 */
  --t-flash: 90ms;         /* goal line to #FFF7DA, then 500ms decay */
  --t-crack: 700ms;        /* uCrack bloom, --ease-stone; ember light same */
  --t-crack-out: 600ms;    /* uCrack to 0 on delete */
  --t-count: 380ms;        /* big number old to new, --ease-count */
  --t-gold-flash: 600ms;   /* one --tilt-x sweep across the number after a log */
  --t-ring: 520ms;         /* arc angles, --ease-stone */
  --t-sink: 600ms;         /* delete, --ease-stone, no dust */
  --t-sheet-in: 320ms;
  --t-sheet-out: 200ms;
  --t-tab: 180ms;          /* screen crossfade */
  --t-sweep-wipe: 460ms;   /* diagonal gold wipe on tab change */
  --t-row-in: 240ms;       /* new row rise 14px and rule draw */
  --t-digit: 120ms;        /* typed digit clip wipe */
  --t-toast: 4000ms;
  --t-fade: 160ms;
  --t-idle-turn: 180s;     /* one revolution, 0.035 rad/s */
  --t-light-sweep: 14s;    /* sweep light orbit */
  --t-gold-sweep: 9s;      /* goldSweep keyframe, ease-in-out alternate */
  --t-live-idle-cap: 90s;  /* ticker stops after 90 s without a touch */
  --t-coalesce: 600ms;     /* strikes inside this window merge */
  --t-opening: 1900ms;
  --t-opening-short: 700ms;
  --t-opening-reduced: 240ms;
}
```

Entrance stagger on LIBRARY, HISTORY and SETTINGS (mount only, never on state change): 14 px rise and fade, 500 ms `cubic-bezier(0.2, 0.7, 0.2, 1)`, delays 0 / 60 / 120 / 240 / 300 ms by block, `animation-fill-mode: backwards`. GSAP owns the opening and the strike timelines (inside `gsap.context`, reverted on cleanup so StrictMode never double-fires); CSS owns everything else; the `motion` package is not used.

Reduced motion (system `prefers-reduced-motion` or Settings REDUCED): strike 0 ms (snap), no shake, no dust, crack bloom 0 ms, number no count, ring snaps, sheet 160 ms fade, no idle turn, no light sweep, no gold auto sweep, no entrance stagger, no tab wipe. The global CSS block zeroes animation and transition durations (`0.01ms`) and keeps `fill-mode: both` on the fallback keyframes so final states persist. Reduced motion removes movement, never information.

## 17 Icon set

All from `lucide-react` 1.56.0 (verified present), stroke 1.5, `currentColor`, 22 px in bars and 16 to 20 px inline. No emoji anywhere.

| Use | lucide name |
| --- | --- |
| TODAY tab | `landmark` |
| LIBRARY tab | `book-marked` |
| LOG keystone | `plus` |
| HISTORY tab | `scroll-text` |
| SETTINGS tab and header | `settings` |
| Favourite on / off | `star` (fill `currentColor` when on) |
| Favourites folder heading | `folder-heart` |
| Log one portion from a row | `square-plus` |
| Re-log from recents | `rotate-ccw` |
| Undo in toast | `undo-2` |
| Edit | `pencil` |
| Delete, remove row, close sheet | `x` |
| Erase all, delete day entry | `trash-2` |
| Portion stepper | `minus`, `plus` |
| Confirm, saved state | `check` |
| Search fields | `search` |
| Month and week navigation | `chevron-left`, `chevron-right` |
| Expand a day, collapse a section | `chevron-down`, `chevron-up` |
| Export | `share-2` (Web Share) or `download` |
| Import | `upload` |
| Over the line marker in history | `flame` |
| Warnings (import error, quota) | `triangle-alert` |
| Notes and footers | `info` |
| Sheet grab bar | a plain 36 x 3 px div, no icon |

## 18 Copy rules

No em dashes and no en dashes anywhere (UI, quotes, toasts, this file); use a middle dot `·`, a comma or a full stop. No emoji; SVG icons only. Labels short, uppercase Cinzel, one or two words: LOG, EATEN, GOAL, REMAINING, RECENT, LIBRARY, HISTORY. No helper text under fields; the single quiet hint is the macros line. Sentence case in Cormorant for anything longer than a label; full stops on sentences, none on labels. Numbers: thin space U+2009 thousands grouping, kcal integers, grams to one decimal only where stored that way, `kJ` and `kcal` lowercase units after a thin space. Negative energy: LOCKED, no minus sign anywhere; the hero reads OVER THE LINE with the magnitude in ember, lists and history read `340 OVER` in ember-text against `260 LEFT` in bone-dim. Dates `MON 13 OCT`, times `12:40 pm` (`formatTime`). Toasts: `Logged · 612 kcal`, `Removed · 612 kcal`, `Saved for this session only. Export now.` Empty states one line: `Nothing logged yet.`, `Mark a meal to keep it here.`, `Nothing recent.` Errors state the fact, not the apology: `That file is not a Temperance backup.` Never preachy, never a streak nag, never an exclamation mark. Voice: the stone speaks in inscriptions, the app speaks in short sentences, Jacob is never addressed by name on screen.

## 19 Signature moment

THE STRIKE. Jacob taps LOG, the sheet drops away and in the same breath the obsidian column slams up in one 170 ms hit, dust bursts off the plinth, the frame shakes 4 px, the gold capital flares, the brushed number counts down as a highlight flashes across it, and the macro ring re-cuts its three arcs; a toast says `Logged · 612 kcal` and he is already back on the monument. On the day he eats past the goal the column breaks through the gold line, the line flares white gold, ember sparks jump from the top, the stone above the seam tilts two and a half degrees off true, and fissures climb it with ember breathing in the cracks for the rest of the day. The opening foreshadows it: the column rises once and lands with dust. Every log is a strike; the crack is the strike he does not want.

## 20 Risks + mitigations

| Risk | Mitigation |
| --- | --- |
| Shader compile freezes the first open (Pad King PR 19: seconds on Windows ANGLE, older Android) | `frameloop="never"` until `compileAsync` resolves, uniform-driven loop counts, environment bake precompiled, the SVG monument plays the opening if shaders miss 600 ms; test the three join windows. |
| `package.json` ships `motion ^14.1.1`, unverified against React 19.3 and R3F 9.8 | The spec needs no `motion`; remove the dependency (or pin `^12.43.0` if a later feature needs it). |
| Uniform loop bounds need WebGL2 | Probe `webgl2` only; webgl1 devices get the SVG monument by design. |
| The camera tilt makes 122 px per unit approximate | `--goal-y` and `--plinth-y` come from `camera.project` at mount; the fallback and the GOAL label read the same variables; nothing hard-codes 263. |
| Two meshes at the seam | Constant radius 0.46 on both, the `break` group pivots at Y `min(H, 2.0)`. |
| `frameloop` demand plus `always` windows: a missed `invalidate` leaves the column mid-strike | Every tween has `onUpdate: invalidate`, the strike owns its `always` window of 1200 ms, the ticker resumes on `visibilitychange`; Playwright screenshots at 0, 0.6 and 1.5 s after a strike prove it. |
| iOS drops WebGL contexts in the background | Remount once on `webglcontextlost` with the SVG monument covering; a second loss within 30 s falls back for the session; test by backgrounding mid-strike. |
| iOS tilt needs `requestPermission` inside a gesture | Tilt is opt-in from Settings and the post-log offer; the 9 s `goldSweep` covers the default; verify in installed PWA mode. |
| Cinzel digits are proportional | 0.62em digit cells and the `.num` utility; verify `1111` against `8888` at 96 px and the kJ five-digit case (`10 460`). |
| Cormorant oldstyle figures make lists uneven | Every Cormorant numeral carries `.num`; all ledger figures are Cinzel. |
| Background-clip text with two layers and blend mode on Safari | Feature-detect; fall back to the plain `--gold-grad` with no grain. |
| Animated gradient text repaints every frame | Only `background-position` animates, `contain: paint`, `will-change: background-position`, no filters, paused with the frameloop. |
| Keyboard covers LOG on iOS PWA (no Done key) | Sheet height bound to `--vv-h`, LOG in a sticky footer, chips collapse while typing; test Safari and standalone. |
| Fonts swap during the opening | Preloaded woff2 from `public/fonts`, `fonts.ready` gate with a 300 ms cap inside the budget, size-adjusted fallbacks. |
| GitHub Pages under `/temperance/` | Vite `base`, manifest `start_url` and `scope`, font and icon URLs via `%BASE_URL%`, `navigateFallback` scoped to the base; a `404.html` copy of `index.html`. |
| Safari evicts localStorage after 7 days uninstalled | Install prompt, Export one tap away, persist `version` and `migrate` from day one. |
| Local day boundaries | `localDayKey` from local date parts, re-evaluated at midnight and on `visibilitychange` (`useToday`); never `toISOString`. |
| Quota or private-mode write failure | Entry held in memory, strike still plays, toast offers Export. |
| A stoic quote carries a dash in some translation | The quotes file is linted in vitest for U+2013 and U+2014 and length; sources are the named public-domain translations only. |
| Shake and dust turn cheap if repeated | 4 px once per strike, strikes coalesce within 600 ms, never on scroll or tab change. |
| Live idle and ticker cost battery | 24 fps ticker only on TODAY, visible, on screen and within 90 s of a touch; measure on a real phone. |
| Number legibility when the lit column rises behind it | The radial scrim on the number; check contrast at 147 percent overshoot. |
| One canvas kept alive across tabs holds GPU memory on low-end phones | If memory warnings appear, unmount after 5 minutes off TODAY and re-gate on return. |
| The whole bar rests on the first two seconds | Verify the opening and the strike on the owner's actual phone at 390 px, with WebGL on, with WebGL off, and with reduced motion. |
