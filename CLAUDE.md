# TEMPERANCE

A stoic calorie and macro tracker for one person (Jacob). Phone-first installable PWA.
Live at https://luka3nglish-commits.github.io/temperance/ once deployed.

## Stack
Vite 8, React 19, TypeScript, Tailwind 4 (tokens in `src/index.css` via `@theme`), zustand 5 with persist (localStorage key `temperance.v1`),
React Three Fiber 9 + drei 10 + three 0.186 for the column scene, gsap for choreography, lucide-react for icons,
vite-plugin-pwa, fonts self-hosted via `@fontsource/cinzel` and `@fontsource/cormorant-garamond`.

## Commands
- `npm run dev` dev server
- `npm run typecheck` tsc
- `npm test` vitest (store, units, day helpers)
- `npm run build` production build to `dist/` (base path `/temperance/`)
- `npm run deploy` push `dist/` to the `gh-pages` branch

## Source of truth
- `docs/design-spec.md` is the design spec. Colours, type scale, motion tokens, scene numbers live there.
- `src/lib/types.ts` data types. `src/store/useStore.ts` the store. `src/store/selectors.ts` pure selectors.

## Hard rules
- Energy is stored in kcal. kJ is display only (`src/lib/units.ts`). Convert on input and output symmetrically.
- Log entries are snapshots. Editing or deleting a library meal never changes a past day.
- Day keys are local `YYYY-MM-DD` from `src/lib/day.ts`. Never `toISOString()` for days.
- No em dashes anywhere in UI copy. No emoji as icons. lucide-react SVG icons only.
- Typography: Cinzel for titles and numbers (`.font-display`), Cormorant Garamond for body. Never Inter, Arial or system fonts.
- Respect `prefers-reduced-motion` and the `settings.motion` override. Logging a meal must never wait on an animation.
- Mobile first at 390 px. Touch targets at least 44 px. No horizontal scroll.
- The 3D scene must degrade: no WebGL means a CSS fallback column, never a crash or blank screen.
- Keep the opening sequence under 2 s and skippable.

## File ownership (parallel work)
- `src/scene/**` the 3D column, dust, crack shader, fallback
- `src/screens/Today*` home screen, counter, macro ring
- `src/screens/Log*` and `src/components/MealForm*` logging form and recents
- `src/screens/Library*` meal and ingredient library, favourites folder
- `src/screens/History*` and `src/screens/Settings*`
- `src/intro/**` the opening sequence
- `src/components/ui/**` shared primitives (buttons, inputs, sheet, tabs)
Do not edit files outside your ownership without saying so.
