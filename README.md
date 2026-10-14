# Temperance

A stoic calorie and macro tracker for one person, built as a phone-first installable PWA. One obsidian column rises toward a gold goal line as the day is logged, and breaks through it when the goal is passed.

Live: https://luka3nglish-commits.github.io/temperance/

## Features

- TODAY: the column against the gold line, the remaining (or eaten) figure, the macro ring and the day's stoic line. Every log is a strike; past the line the stone breaks.
- LOG: QUICK (calories alone are enough) or BUILD from saved ingredients, favourites as one-tap chips, the last 12 logs one tap from logging again, UNDO on every log.
- LIBRARY: meals and ingredients with a favourites folder. Editing a meal never changes a past day.
- HISTORY: the last 30 days as a colonnade, the 7 day average, days under the line, the streak, week and month lists.
- Settings: daily goal, macro targets, kcal or kJ, motion and opening options, JSON export and import.
- Weight tracker in HISTORY, BODY: one weigh-in a day, the latest, the 7 day trend, the distance to a target weight set in Settings (TARGET WEIGHT) and a chart. Weigh-ins are in the JSON backup.
- Progress photos in HISTORY, BODY: add, view, note, compare side by side, delete. They stay on the phone (IndexedDB) and are never in the JSON backup.
- REPEAT YESTERDAY: the first chip on the LOG sheet logs every entry from yesterday again today in one tap, with UNDO.
- Macro goals on TODAY: with a target set, each readout beside the ring reads `of 180 g` next to the grams eaten; a tap still shows progress on the ring.

## Stack

- Vite 8, React 19, TypeScript (strict)
- Tailwind 4, tokens declared with `@theme` in `src/index.css`
- zustand 5 with `persist` (localStorage key `temperance.v1`, schema version 3 with a `migrate`)
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

Everything is on the device. The store persists to `localStorage` under the key `temperance.v1` as JSON: settings (with the intro counter and the optional target weight), meal and ingredient library, log entries and weigh-ins. There is no account and no server.

Progress photos are too big for localStorage. `src/lib/photos.ts` keeps them in IndexedDB (database `temperance-photos`), downscaled to 1600 px on the long edge plus a 360 px thumbnail. They never leave the device and are not part of the JSON backup; the Settings footer shows their count and size.

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
- The export file shape is `ExportFile` in `src/lib/types.ts`: `app: "temperance"`, `version` (3), `exportedAt`, and the data: settings, meals, ingredients, entries and weights. Progress photos are never in it.

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
