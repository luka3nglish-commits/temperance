# TEMPERANCE

A stoic calorie and macro tracker for one person (Jacob). Phone-first installable PWA.
Live at https://luka3nglish-commits.github.io/temperance/ once deployed.

## Stack
Vite 8, React 19, TypeScript 7, Tailwind 4 (tokens in `src/index.css` via `@theme`), zustand 5 with persist (localStorage key `temperance.v1`),
React Three Fiber 9 + drei 10 + three 0.186 for the column scene, gsap 3 for choreography, lucide-react for icons,
vite-plugin-pwa, fonts self-hosted in `public/fonts` (copied from `@fontsource` by `scripts/copy-fonts.mjs`). The `motion` package is not used.

## Commands
- `npm run dev` dev server (http://localhost:5173/temperance/)
- `npm run typecheck` tsc
- `npm test` vitest (store, selectors, units, day helpers, stoic lines)
- `npm run build` production build to `dist/` (base path `/temperance/`)
- `npm run deploy` push `dist/` to the `gh-pages` branch

## Source of truth
- `docs/design-spec.md` is the design spec. Every colour, size, duration, scene number and copy rule lives there. Read your section before coding.
- `src/lib/types.ts` data types. `src/store/useStore.ts` the persisted store. `src/store/selectors.ts` pure selectors. `src/store/useUI.ts` transient UI state (tab, sheets, introDone).
- `src/index.css` tokens: Tailwind `@theme` colours (`bg-obsidian-900`, `text-gold-400`, `text-bone-dim`, `text-ember-text`, `font-display`, `font-body`), root variables (`--gold-grad`, `--gold-line`, `--ease-*`, `--t-*`, `--z-*`, `--safe-*`, `--vv-h`, `--goal-y`, `--plinth-y`, `--tilt-x`) and utilities (`.inscribed`, `.num`, `.digits`, `.gold-num`, `.gold-text`, `.gold-fill`, `.gold-border`, `.rise-in`, `.shake`, `.scrollbar-none`).
- `src/components/ui/*` shared primitives: `Button`, `IconButton`, `Field`, `Input`, `decimalInputProps`, `Segmented`, `Stepper`, `Toggle`, `SectionHeading`, `EmptyLine`, `Sheet`, `Toaster` + `useToast`, `GoldNumber`. Use them; extend them in place only if every consumer benefits.
- `src/lib/motion.ts`: `useReducedMotion()`, `isReducedMotion()`, `vibrate(ms)`. `src/lib/units.ts`: `formatEnergy`, `toDisplayEnergy`, `fromInputEnergy`, `formatInt`, `parseNumber`. `src/lib/day.ts`: `localDayKey`, `formatDayLabel`, `formatTime`. `src/lib/useToday.ts`. `src/lib/stoic.ts`: `stoicLineForDay`. `src/lib/macros.ts`: `macroEnergySplit`, `makeComponent`, `kcalFromMacros`.

## Hard rules
- Energy is stored in kcal. kJ is display only (`src/lib/units.ts`). Convert on input and output symmetrically. Never a minus sign on energy; over the line is shown as a magnitude in ember.
- Log entries are snapshots. Editing or deleting a library meal never changes a past day.
- Day keys are local `YYYY-MM-DD` from `src/lib/day.ts`. Never `toISOString()` for days.
- No em dashes or en dashes anywhere in UI copy (use a middle dot `·`, a comma or a full stop). No emoji. lucide-react SVG icons only, stroke 1.5.
- Typography: Cinzel for titles, labels and numbers (`font-display`, uppercase, tracked), Cormorant Garamond for body (`font-body`). Cormorant numerals always carry `.num`. Never Inter, Arial or system fonts.
- Respect reduced motion (`useReducedMotion`) and the `settings.motion` override. Logging a meal must never wait on an animation: the store write is synchronous and the UI updates on it.
- Mobile first at 390 x 844. Touch targets at least 44 px. No horizontal scroll. Side gutters 16 px (20 px where a shard strip lives).
- The 3D scene must degrade: no WebGL means the SVG monument, never a crash or blank screen. Only `src/scene/SafeCanvas.tsx` may import `Canvas` from `@react-three/fiber`.
- Opening under 2 s and skippable. Logging is live from frame 0.
- Keep `npm run typecheck` and `npm test` green. Run both before you finish.

## File ownership (parallel work)
- scene agent: `src/scene/**` (MonumentLayer, SafeCanvas, webgl.ts, tier.ts, tokens.ts, column, dust, crack shader, goal line, lights, FallbackMonument). Registers a `MonumentHandle` (`src/scene/handle.ts`). Writes `--goal-y` and `--plinth-y` on `:root`.
- today agent: `src/screens/Today*` (TodayScreen, TodayRing, TodaySheet, the header band, inscriptions, stoic line).
- log agent: `src/screens/Log*`, `src/components/MealForm*` (LogSheet with QUICK and BUILD, favourites chips, recents, toast with UNDO). May refine `src/components/ui/Sheet.tsx`.
- library agent: `src/screens/Library*` (favourites folder, meals, ingredients, detail sheet, add and edit forms).
- history + settings agent: `src/screens/History*`, `src/screens/Settings*` (colonnade, stat stones, week list, settings rows, export, import, erase, install prompt).
- intro + shell agent: `src/intro/**`, `src/components/ui/Shards.tsx`, `src/components/Backdrop.tsx`, `src/lib/tilt.ts`, `scripts/shards.mjs`.
Do not edit files outside your ownership. If you need a change elsewhere (a selector, a store action, a primitive), add it in your own files first or describe the exact change in your final report.

## Integration contracts
- App root (`src/App.tsx`) mounts, in order: `Backdrop`, the 430 px frame containing `MonumentLayer visible={tab === 'today'}`, `<main>` with the active screen, the tab wipe, `TabBar`, `Shards`; then `LogSheet`, `Toaster`, `Opening`. Screens are swapped by `useUI().tab`. TODAY is a fixed, non-scrolling frame; the other three scroll inside `<main>` with bottom padding for the bar.
- `useUI()` (`src/store/useUI.ts`): `tab`, `setTab`, `logOpen`, `logPrefill`, `openLog(prefill?)`, `closeLog`, `todayOpen`, `openToday`, `closeToday`, `introDone`, `setIntroDone`, `libraryFocus`, `setLibraryFocus`. The LOG keystone calls `openLog()`. EATEN and the ring call `openToday()`. The TODAY sheet is rendered by the today agent inside TodayScreen (reads `todayOpen`).
- Strikes: the store sets `pulse` (`{ id, kind: 'log' | 'remove', deltaKcal, totalKcal, over, at }`) on every change to today's log. The scene subscribes to `useStore(s => s.pulse)` and plays the strike; if `useUI().logOpen` is true when the pulse arrives it waits until the sheet closes or 220 ms, whichever comes first. Nothing else drives the column.
- `MonumentHandle` (`src/scene/handle.ts`): the scene calls `setMonumentHandle(handle)` on mount. The opening calls `getMonumentHandle()` for `ready()`, `setInstant()`, `playOpeningRise(ms)`, `playGoalLine(ms)`, `sweepOnce(ms)`, `shake(trauma)`, `startIdle()`, `stopIdle()`. The handle is a no-op until the scene registers.
- Opening DOM targets: elements that take part in the opening carry `data-intro` attributes. TodayScreen: `wordmark`, `date`, `label`, `number`, `subline`, `flanks`, `goal-label`, `ring`, `ring-readouts`, `stoic`. TabBar: `tabbar`, `keystone`. Shards: `shards`. The intro hides them with `opacity: 0` and `clip-path` before the timeline runs and leaves them at their final styles; screens must not animate these on mount themselves. The intro calls `useUI().setIntroDone(true)` when done or skipped. Screens may read `introDone` to delay non-essential effects.
- GPU tier (`src/scene/tier.ts`): `getTier()`, `useTier()`, `setTier()`; `'high' | 'low' | 'none'`. The scene sets it. `no-grain` on `<html>` when not high.
- Tilt: `startTilt()` in `src/lib/tilt.ts` is called once from App. It writes `--tilt-x` and `--tilt-angle` on `:root` and toggles `auto-sweep` while tilt is not live. `requestTiltPermission()` is called from Settings inside a tap.
- Toasts: `useToast.getState().show({ text, action: { label: 'Undo', icon: 'undo', onClick } })`. Copy per the spec: `Logged · 612 kcal`, `Removed · 612 kcal`.
- Persist failure: `useStore(s => s.persistFailed)` is true when localStorage writes fail; the log agent shows `Saved for this session only. Export now.` with an EXPORT action that switches to Settings.
