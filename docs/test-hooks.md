# Test hooks

Stable handles for end-to-end tests (Playwright or a browser session). Role and accessible-name queries are the first choice wherever the spec fixes the copy; the `data-testid` values below exist for things with no stable name. Convention: `tp-<area>-<element>[-<id>]`, kebab case, an id suffix only on repeated rows. Test ids are additive and never change layout or copy.

## Globals

| Hook | Where | Meaning |
| --- | --- | --- |
| `window.__tp` | `src/main.tsx` | `{ store: useStore, ui: useUI }`, the live zustand stores |
| `localStorage['temperance.v1']` | store persist | the persisted data, JSON, schema version 3 (settings, meals, ingredients, entries, weights) |
| IndexedDB `temperance-photos`, store `photos` | `src/lib/photos.ts` | progress photos: metadata plus `full` and `thumb` blobs, keyed by `id`; on the device only, never in the JSON backup |
| `localStorage['temperance.tier']` | `src/scene/tier.ts` | cached GPU tier `{ tier, at }` |
| `performance.mark('tp:boot')` | `src/main.tsx` | script start |
| `performance.mark('tp:opening-start')` | `src/intro` | the opening timeline started |
| `performance.mark('tp:opening-done')` | `src/intro` | the opening finished or was skipped |
| `document.documentElement.dataset.introDone` | `src/intro` | `"true"` once `setIntroDone(true)` ran |
| `document.documentElement.dataset.tier` | `src/scene/tier.ts` | `"high"`, `"low"` or `"none"` |
| `document.documentElement.classList` | various | `reduce-motion`, `force-motion`, `no-grain`, `auto-sweep`, `keyboard-up` |

Energy strings on screen come from `formatEnergy`: integers, thousands grouped with a thin space U+2009 (so 2500 kcal renders as `2 500`), kJ as `Math.round(kcal * 4.184)`.

## By role and name (preferred)

- Tabs: `role=tab` named Today, Library, History, Settings. The LOG keystone: `button` named "Log a meal".
- LOG sheet: `dialog` titled "Log"; `radio` Quick / Build; labels Name, Calories, Protein, Carbs, Fat; `group` Portion with buttons "Less portion" / "More portion"; `switch` "Save to library"; the submit `button` "Log".
- Settings: `radiogroup` Units with radios KCAL / KJ; Motion SYSTEM / REDUCED / FULL; Opening SHORT / FULL DAILY / OFF; Hero figure REMAINING / EATEN.
- Opening: `button` named "Skip".

## Intro and shell

`tp-opening` (overlay root, `data-state="playing" | "done"`), `tp-opening-skip`.

## Scene

`tp-monument` (MonumentLayer root, `data-mode="webgl" | "svg"`, `data-ready="true"` once `ready()` resolved, `data-h-target` = the column height the store asks for, to 3 dp), `tp-column` (`data-h` = the rendered column height to 3 dp, updated by whichever renderer is live; H is 2.000 at the goal). `window.__tp.mon` is the live choreography state (h, crack, camera) and `window.__tp.monument` the choreography object.

## Today

`tp-today`, `tp-hero-label`, `tp-hero-number` (its `aria-label` is the plain digits), `tp-subline`, `tp-eaten-value`, `tp-goal-value`, `tp-goal-label`, `tp-ring` (`data-protein-deg`, `data-carbs-deg`, `data-fat-deg` to 1 dp), `tp-ring-centre`, `tp-readout-protein`, `tp-readout-carbs`, `tp-readout-fat` (each `data-grams`, and `data-target` = that macro's target in grams, `"0"` when unset; the right-aligned column inside carries `data-aside`: `"target"` reads `of 180 g`, `"share"` reads the energy share percent when the target is 0, `"progress"` reads the percent of the target while the row is tapped), `tp-stoic`, `tp-today-sheet` (dialog), `tp-today-entry-<entryId>`.

## Log

`tp-log-sheet`, `tp-log-name`, `tp-log-kcal`, `tp-log-portion`, `tp-log-protein`, `tp-log-carbs`, `tp-log-fat`, `tp-log-hint`, `tp-log-save-library`, `tp-log-submit`, `tp-fav-chips` (the chip row in the sticky footer; present when there is a favourite or a yesterday to repeat, gone while the keyboard is up), `tp-repeat-yesterday` (REPEAT YESTERDAY, the first chip of that row while yesterday has at least one entry; `data-count` = yesterday's entries, `data-kcal` = their total in kcal; a tap copies them onto today, closes the sheet and toasts `Logged · 2 140 kcal · yesterday's meals` with UNDO, thin spaces in the energy as above), `tp-fav-chip-<mealId>`, `tp-recents`, `tp-recent-row-<entryId>`, `tp-recent-empty`, `tp-suggest-<mealId>`, `tp-toast`, `tp-toast-undo`.

## Library

`tp-library`, `tp-library-search`, `tp-fav-folder`, `tp-fav-row-<id>`, `tp-fav-empty`, `tp-meals`, `tp-meal-row-<id>`, `tp-meal-fav-<id>` (`aria-pressed`), `tp-meal-log-<id>`, `tp-meal-detail` (dialog), `tp-meal-detail-log`, `tp-meal-detail-edit`, `tp-meal-detail-fav`, `tp-meal-detail-delete`, `tp-meal-delete-confirm`, `tp-meal-edit-name`, `tp-meal-edit-kcal`, `tp-meal-edit-protein`, `tp-meal-edit-carbs`, `tp-meal-edit-fat`, `tp-meal-edit-save`, `tp-ingredients`, `tp-ingredient-row-<id>`.

## History and Settings

`tp-history`, `tp-history-day-<YYYY-MM-DD>` (week list row) with children `tp-history-day-kcal` and `tp-history-day-delta`, `tp-stat-avg`, `tp-stat-under`, `tp-stat-streak`, `tp-settings`, `tp-settings-goal` (input), `tp-settings-target-protein`, `tp-settings-target-carbs`, `tp-settings-target-fat` (inputs), `tp-settings-target-weight` (input under MACRO TARGETS, `inputmode="decimal"`, kg to one decimal; commits on blur or Enter, an empty value clears `settings.targetWeightKg`, a value the store would refuse reverts), `tp-settings-unit`, `tp-settings-motion`, `tp-settings-opening`, `tp-settings-replay`, `tp-settings-export`, `tp-settings-import-file` (the file input, kept in the DOM and visually hidden), `tp-settings-import-merge`, `tp-settings-import-replace`, `tp-settings-import-confirm`, `tp-settings-import-error`, `tp-settings-erase`, `tp-settings-erase-confirm`, `tp-settings-photos` (footer line under `Data lives on this device.`: `12 photos · 8.4 MB. Photos stay on this device and are not in the backup.`, the sentence alone with no photos; `data-count` and `data-bytes` once the photo store has been read; absent where photos are not supported).

## History BODY (weight and photos)

HISTORY has a second mode, BODY, for the weight tracker and progress photos. `tp-history-mode` (the mode switch), `tp-body` (the BODY view).

Weight: `tp-weight-latest` (the latest weigh-in), `tp-weight-trend` (the 7 day trend, last 7 days against the 7 before), `tp-weight-target` (distance to `settings.targetWeightKg`), `tp-weight-chart`, `tp-weight-input` (kg), `tp-weight-log` (records the weigh-in for today; a second one the same day replaces the first), `tp-weight-row-<id>` (one weigh-in), `tp-weight-delete-<id>` (deletes it). Weights live in `useStore().weights` and are part of the JSON backup.

Photos: `tp-photos` (the photos section), `tp-photo-add`, `tp-photo-grid` (thumbnails, newest first), `tp-photo-<id>` (one thumbnail; ids come from `newId`, so they never collide with the fixed names here), `tp-photo-viewer` (the full-size view), `tp-photo-note`, `tp-photo-delete`, `tp-photo-delete-confirm` (two-step delete), `tp-photo-compare`, `tp-photo-compare-view` (two photos side by side). Photos live in IndexedDB (see Globals), never in the JSON backup.

## Status

Ids listed here are the contract. An id missing from a build is a gap to report, not a reason to invent a different one.
