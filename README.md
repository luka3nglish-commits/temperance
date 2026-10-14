# Temperance

A stoic calorie and macro tracker for one person, built as a phone-first installable PWA. One obsidian column rises toward a gold goal line as the day is logged, and breaks through it when the goal is passed.

Live: https://luka3nglish-commits.github.io/temperance/

## Stack

- Vite 8, React 19, TypeScript (strict)
- Tailwind 4, tokens declared with `@theme` in `src/index.css`
- zustand 5 with `persist` (localStorage key `temperance.v1`, schema version 2 with a `migrate`)
- React Three Fiber 9, drei 10, three 0.186 for the column scene, with a CSS fallback when WebGL is missing
- gsap for choreography, lucide-react for icons
- vite-plugin-pwa (Workbox) for the manifest and service worker
- Fonts self-hosted from `@fontsource/cinzel` and `@fontsource/cormorant-garamond`, copied into `public/fonts` by `scripts/copy-fonts.mjs`

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest (store, units, day helpers, export file) |
| `npm run build` | runs `prebuild` (copies fonts), then a production build to `dist/` with base path `/temperance/` |
| `npm run preview` | serves `dist/` locally |
| `npm run deploy` | pushes `dist/` to the `gh-pages` branch (`gh-pages -d dist --nojekyll`) |
| `python scripts/make-icons.py` | regenerates the PWA icons in `public/icons` |
| `python scripts/make-og.py` | regenerates `public/og.png` (1200 x 630) from the same column language; needs Pillow, uses fontTools when installed |

## Where data lives

Everything is on the device. The store persists to `localStorage` under the key `temperance.v1` as JSON: settings, meal and ingredient library, log entries and the intro counter. There is no account and no server.

Rules the store enforces:

- Energy is stored in kcal. kJ is display only (`src/lib/units.ts`) and is converted symmetrically on input and output.
- Log entries are snapshots. Editing or deleting a library meal never changes a past day.
- Day keys are local `YYYY-MM-DD` strings from `src/lib/day.ts`, never `toISOString()`.
- The persisted object carries a `version`; `migrate` fills defaults when the schema moves.

Safari can evict localStorage for a site that has not been used in 7 days unless it is installed to the home screen. The install prompt and the Export action exist for that reason.

## Export and import

Both live in Settings.

- EXPORT JSON calls `exportData()` and writes `temperance-YYYY-MM-DD.json`. On phones that support the Web Share API with files it opens the share sheet, otherwise it downloads the file.
- IMPORT JSON takes a file input, validates it with `validateExportFile` (`src/lib/exportFile.ts`), then asks MERGE or REPLACE with a two-step confirm. A bad file reads `That file is not a Temperance backup.`
- The export file shape is `ExportFile` in `src/lib/types.ts`: `app: "temperance"`, `version`, `exportedAt`, and the data.

## Deployment

The app is served by GitHub Pages from the `gh-pages` branch at `https://<owner>.github.io/temperance/`.

- `vite.config.ts` sets `base: '/temperance/'`. The manifest `start_url` and `scope` use the same value, and `navigateFallback` is scoped to `/temperance/index.html`.
- `index.html` references fonts and icons through `%BASE_URL%` so they resolve under the base path.
- `public/404.html` redirects unknown paths back to `/temperance/`.
- `npm run build` writes `dist/`; `npm run deploy` publishes it with `--nojekyll` so files beginning with an underscore are served.
- In the repository settings, Pages must point at the `gh-pages` branch, root folder.

## Design spec

`docs/design-spec.md` is the source of truth for colours, type scale, layout numbers, motion tokens, the scene, copy rules and risks. `src/lib/types.ts` holds the data types, `src/store/useStore.ts` the store and `src/store/selectors.ts` the pure selectors. `CLAUDE.md` holds the hard rules and the file ownership map.

For the non-technical walkthrough see `docs/HANDOVER.md`.
