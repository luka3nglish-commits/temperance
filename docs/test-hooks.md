# Test hooks

Stable handles for end-to-end tests (Playwright or a browser session). Role and accessible-name queries are the first choice wherever the code fixes the copy; the `data-testid` values below exist for things with no stable name. Convention: `tp-<area>-<element>[-<id>]`, kebab case, an id suffix only on repeated rows. Test ids are additive and never change layout or copy. Classes that start `tp-` (`tp-stagger`, `tp-sweep`, `tp-shaft`, `tp-temple-layer`, `tp-svg-crack`) are styling, not hooks.

## Globals

| Hook | Where | Meaning |
| --- | --- | --- |
| `window.__tp` | `src/main.tsx` | `{ store: useStore, ui: useUI, boot }`, the live zustand stores plus `boot` = `bootInfo()` captured at script start (`{ level, flags, reason }`, below); the scene adds `mon`, `monument` and `programs` (see Scene) |
| `window.__tpBoot` | `index.html` `<script id="tp-boot">` | the crash-loop guard's decision, set before any module runs: `{ level: 0 \| 1 \| 2, flags, reason: 'crash' \| 'sticky' \| 'url' \| 'none' }`; `flags` holds the URL switches in force (`safe`, `gl`, `fx`, `sweep`, `intro`, string values). `bootInfo()` (`src/lib/boot.ts`) returns it, or `{ level, flags: {}, reason: 'none' }` without it |
| `<html>` boot attributes | `index.html` `tp-boot`, read by `src/lib/boot.ts` | `data-safe="0" \| "1" \| "2"` (always set); `data-gl="0"`, `data-fx="0"`, `data-sweep="0"`, `data-intro="0"` at any safe level of 1 or more, or each alone from its URL switch set to `0`; `data-bare="1"` at level 2. Absent means on. The `<html>` `data-intro` is the guard's switch, not one of the opening's `[data-intro]` targets |
| `localStorage['temperance.boot']` | `index.html` `tp-boot`, `src/lib/boot.ts` | this boot: `{ at, stable, level }`; `stable` turns true after 30 s (`STABLE_MS`) or on `pagehide` or the page going hidden. A boot under 90 s old that never became stable is read as a crash on the next launch |
| `localStorage['temperance.safe']` | `index.html` `tp-boot` | the sticky safe level `{ level, at }`, written only by a real crash and honoured for 14 days |
| `sessionStorage['temperance.flags']` | `index.html` `tp-boot` | the URL switches kept for this tab, except `safe=0` |
| URL switches | `index.html` `tp-boot` | `?safe=1` and `?safe=2` force a level for this tab without making it sticky; `?gl=0`, `?fx=0`, `?sweep=0`, `?intro=0` switch one feature off for this tab. `?safe=0` clears the sticky level for good, the same as TRY FULL MODE, and is not kept for the tab session; a new crash re-arms the guard |
| `localStorage['temperance.v1']` | `src/store/useStore.ts` | the persisted data, JSON, schema version 4 (`SCHEMA_VERSION`, `src/lib/types.ts`): settings, meals, ingredients, entries, weights |
| IndexedDB `temperance-photos` v1, store `photos` | `src/lib/photos.ts` | progress photos: metadata plus `full` and `thumb` blobs, keyPath `id`, indexes `day` and `at`; on the device only, never in the JSON backup |
| `localStorage['temperance.tier']` | `src/scene/tier.ts` | cached GPU tier `{ tier, at }`, trusted for 30 days (`TIER_TTL`) |
| `performance.mark('tp:boot')` | `src/main.tsx` | script start |
| `performance.mark('tp:gl-context')` | `src/scene/SafeCanvas.tsx` | the early WebGL renderer was built |
| `tp:gl-env-done`, `tp:gl-compile-start`, `tp:gl-compile-done`, `tp:gl-first-frame` | `src/scene/ColumnScene.tsx` | the shader gate: start, all programs linked, first frame drawn (`tp:gl-env-done` fires at once; there is no environment bake) |
| `tp:gl-chunk-<key>` | `src/scene/ColumnScene.tsx` | one per program chunk, only with `?tp-chunks`; keys `obsidian`, `gold`, `fx`, `dust`, `basic-map`, else the material type |
| `performance.mark('tp:opening-start')` | `src/intro/useOpening.ts` | the opening timeline started |
| `performance.mark('tp:opening-done')` | `src/intro/useOpening.ts` | the opening finished or was skipped |
| `document.documentElement.dataset.introDone` | `src/intro/useOpening.ts` | `"true"`, set with `tp:opening-done` just before `setIntroDone(true)` |
| `document.documentElement.dataset.tier` | `src/scene/tier.ts` | `"high"`, `"low"` or `"none"` |
| `document.documentElement.classList` | various | `reduce-motion`, `force-motion` (`src/lib/motion.ts`), `no-grain` (tier not high), `keyboard-up` (`Sheet.tsx`, visual viewport under 620 px) |
| Query switches | `src/scene/debugFlags.ts` | measurement only: `?tp-noenv`, `?tp-nocrack`, `?tp-chunks`, `?tp-notemple` (no DOM temple), `?tp-nomask` (no stage mask); `?tp-std` is parsed but nothing reads it |

Energy strings on screen come from `formatEnergy` (`src/lib/units.ts`): integers, thousands grouped with a thin space U+2009 (2500 kcal renders as `2 500`), kJ as `Math.round(kcal * 4.184)`, a leading `-` for negatives. `energyLine` (`MealForm.tsx`) puts a second U+2009 (`THIN`) before the unit and always prints the magnitude: `2 140 kcal`. `ValueUnit` also puts U+2009 before its unit. The LIBRARY, HISTORY and TODAY sheet strings (`energyText`, the `Removed · 612 kcal` toasts) put a plain space before the unit but keep U+2009 in the grouping. Copy in this file is shown with plain spaces, so match on the real characters in assertions.

## By role and name (preferred)

- Tabs: `role=tab` named Today, Library, History, Settings. The LOG keystone: `button` named "Log a meal".
- LOG sheet: `dialog` titled "Log"; `radiogroup` Mode with radios Quick / Build; Name, Calories; `radiogroup` Counted with Per serve / Per 100 g / Per 100 ml; `group` Portion with buttons "Less portion" / "More portion"; `group` Quick amounts; `switch` "Save to library"; the submit `button` "Log".
- Settings: `radiogroup` Energy unit with radios kcal / kJ; Hero figure Remaining / Eaten; Motion System / Reduced / Full; Opening Short / Full daily / Off; `switch` "Gold follows tilt".
- History: `radiogroup` History view with Ledger / Body; buttons "Earlier month" / "Later month".
- Opening: `button` named "Skip" (no test id).

## Intro and shell

`tp-opening` (overlay root, `data-state="playing" | "done"`). The Skip pill has no test id; query it by role.

Opening targets are `data-intro` attributes, read by `src/intro/targets.ts`: `colonnade`, `shaft`, `wordmark`, `date`, `streak`, `label`, `number`, `subline`, `flanks`, `goal-label`, `ring`, `ring-readouts`, `stoic`, `tabbar`, `shards` (`TARGET_NAMES`, missing names are skipped), plus `stage` (the landing shake, also `[data-stage]`). `data-intro="keystone"` is on the LOG keystone but nothing queries it. The tab bar `nav` carries `data-fade` (`"false"` on TODAY, `"true"` elsewhere). `[data-intro=shards]` reads `--shard-glint` (rest 0.4).

`tp-toast` (the slab, `data-key` = the id passed to `show({ id })`, e.g. `install`; the test id drops for the 200 ms exit; docked at the top while a sheet is open), `tp-toast-undo` (an UNDO action), `tp-toast-action` (any other action). `tp-kit`: the primitives kit at `#kit`, behind `import.meta.env.DEV` in `App.tsx`, absent from production builds.

## Scene

`tp-monument` (MonumentLayer root, `data-mode="webgl" | "svg"`, `data-ready="true" | "false"`, `data-h-target` = the column height the store asks for, to 3 dp, `data-live` while the idle ticker runs, `data-over` on an over day), `tp-column` (the SVG shaft group, always mounted; `data-h` = the choreography height to 3 dp, reported by whichever renderer is live, so it equals `data-h-target` at rest; H is 2.000 at the goal, `GOAL_Y`). `[data-tp-flare]` is the shaft flare inside the temple. SVG crack paths carry class `tp-svg-crack`, plus `on` when drawn.

`window.__tp.mon` is the live choreography state (`h`, `crack`, `ghost`, camera fields), `window.__tp.monument` the choreography object, `window.__tp.programs` the linked program count after `tp:gl-compile-done` (`null` if unknown). The glass ghost has no test id: read `window.__tp.mon.ghost` (0 to 1, the opening reveal); in svg mode it is the `g` clipped by `#tpGhostClip`.

## Today

`tp-today`, `tp-streak` (header button, `data-intro="streak"`, `data-streak`, `aria-label` `Streak 12 days`, opens HISTORY; rendered only when the streak is above 0, an unmarked 44 px spacer otherwise), `tp-hero-label` (`Remaining`, `Eaten` or `Over the line`), `tp-hero-number` (`data-value` = the figure in the display unit, `data-over="true" | "false"`; the `[data-odometer]` span inside has `aria-label` = the plain digits; do not read `textContent`, the odometer holds digit strips), `tp-subline` (`51% of goal`), `tp-eaten-value` (left plaque, `data-kcal`; becomes `tp-left-value` with label LEFT and the remaining figure when the hero is EATEN and the day is not over), `tp-goal-value` (`data-kcal`), `tp-goal-label` (the 7 x 7 rhombus on the line, `aria-label` `Goal 2 500 kcal`), `tp-ring` (`data-protein-deg`, `data-carbs-deg`, `data-fat-deg` to 1 dp, `"0.0"` on the empty-day placeholder; `data-focus` = the tapped macro; `data-empty="true"` on the placeholder), `tp-ring-centre` (`data-grams`: the tapped macro, else protein, 0 on the placeholder), `tp-readout-protein`, `tp-readout-carbs`, `tp-readout-fat` (each `aria-pressed`, `data-grams`, `data-target` = the target in grams, `"0"` when unset; the right column carries `data-aside`: `"target"` reads `of 180 g`, `"share"` the energy share percent when the target is 0, `"progress"` the percent of the target while the row is tapped; under 372 px wide the aside is screen-reader only and, when the target is set, `[data-underline=<macro>]` shows progress), `tp-stoic` (`data-room="roomy" | "snug" | "tight"`).

TODAY sheet: `tp-today-sheet` (dialog, titled Today, or Edit while editing), `tp-today-sheet-total`, `tp-today-list`, `tp-today-entry-<entryId>` (`data-kcal`, `data-newest="true"` on the newest), `tp-today-entry-remove-<entryId>` (removes with an UNDO toast). Edit: `tp-today-edit` (form), `tp-today-edit-name`, `tp-today-edit-portion` (PortionField, see Log), `tp-today-edit-was` (`was 180 g`, only once the portion changed), `tp-today-edit-kcal`, `tp-today-edit-protein`, `tp-today-edit-carbs`, `tp-today-edit-fat`, `tp-today-edit-save`.

## Log

`tp-log-sheet` (dialog), `tp-log-name`, `tp-suggest-<entryId>` (suggestion chips under the name; ids are log entry ids), `tp-log-basis` (radiogroup) with `tp-log-basis-serve`, `tp-log-basis-g`, `tp-log-basis-ml`, `tp-log-kcal`, `tp-log-basis-tag` (`Per serve`, `Per 100 g`, `Per 100 ml` on the Calories label row), `tp-log-protein`, `tp-log-carbs`, `tp-log-fat`, `tp-log-result` (what LOG adds, `302 kcal · P 16`; `data-kcal` in kcal, absent until the calories parse), `tp-log-hint` (always in the DOM; `Macros add to 526 kcal.` only when the macros differ, empty otherwise), `tp-log-save-library`, `tp-log-submit`.

PortionField, shared by LOG, the TODAY edit and the LIBRARY detail: `<testId>` (group, `data-unit`, `data-value`), `<testId>-input` (`inputmode="decimal"`), `<testId>-less`, `<testId>-more`; PortionPicks add `<testId>-pick-<n>` with `n` from `formatAmountNumber` (`tp-log-portion-pick-0.5`, `tp-log-portion-pick-100`), `aria-pressed` on the pick equal to the value. Default picks: serve 0.5, 1, 1.5, 2; g 100, 150, 200, 250; ml 150, 250, 330, 500; a usual amount outside the set replaces the first. In LOG the testId is `tp-log-portion`.

Footer: `tp-fav-chips` (the chip row; present when there is a favourite or a yesterday to repeat, gone while `keyboard-up`), `tp-repeat-yesterday` (label REPEAT, the first chip while yesterday has at least one entry; `data-count` = yesterday's entries, `data-kcal` = their total in kcal, `aria-label` `Repeat yesterday's meals, 2 140 kcal`; a tap copies them onto today, closes the sheet and toasts `Logged · 2 140 kcal · yesterday's meals` with UNDO), `tp-fav-chip-<mealId>`. A log toasts `Logged · 180 g · 175 kcal`. Recents: `tp-recents`, `tp-recent-row-<entryId>`, `tp-recent-empty`. The BUILD form has no test ids.

## Library

`tp-library` (`data-empty` with nothing saved), `tp-library-add` (header plus), `tp-library-add-menu` (in the Add sheet) with `tp-library-add-meal`, `tp-library-add-ingredient`, `tp-library-search`, `tp-library-empty` (EmptyState `Nothing saved yet.`) with `tp-library-empty-meal`, `tp-library-empty-ingredient`.

Favourites: `tp-fav-folder` (`data-open`), `tp-fav-row-<id>`, `tp-fav-star-<id>`, `tp-fav-log-<id>` (meal rows only), `tp-fav-empty` (`Nothing matches.` while searching). Meals: `tp-meals` (`data-sort="alpha" | "logged"`), `tp-meals-sort` with `tp-meals-sort-alpha`, `tp-meals-sort-logged`, `tp-meal-row-<id>`, `tp-meal-fav-<id>` (`aria-pressed`), `tp-meal-log-<id>`. Ingredients: `tp-ingredients`, `tp-ingredient-row-<id>`, `tp-ingredient-fav-<id>`.

Detail (dialog titled Meal detail or Ingredient, no test id on the dialog): `tp-meal-detail` and `tp-ingredient-detail` (the body `div`, `data-unit`; the meal one also `data-kind`), `tp-detail-numbers`, `tp-detail-kcal`, then per kind `tp-<kind>-detail-portion` (PortionField, plus `-basis` for the basis line), `tp-<kind>-detail-log`, `tp-<kind>-detail-meta` (`180 g · 175 kcal`), `tp-<kind>-detail-edit`, `tp-<kind>-detail-fav` (`aria-pressed`), `tp-<kind>-detail-delete` (`data-armed` on the first tap), `tp-<kind>-delete-confirm`, and `tp-meal-detail-build` (BUILD in the Built from heading).

Editor: `tp-meal-editor` (`data-kind`), `tp-meal-edit-kind` with `tp-meal-edit-kind-quick`, `tp-meal-edit-kind-built` (new meals only), `tp-meal-edit-name`; Numbers kind: `tp-meal-edit-basis` with `-serve`, `-g`, `-ml`, `tp-meal-edit-basis-tag`, `tp-meal-edit-kcal`, `tp-meal-edit-protein`, `tp-meal-edit-carbs`, `tp-meal-edit-fat`, `tp-meal-edit-hint` (`data-shown` when the macros differ); Built kind: `tp-meal-edit-totals`; both kinds: `tp-meal-edit-usual-energy`, `tp-meal-edit-usual` (PortionField, no picks), `tp-meal-edit-save`. `tp-ingredient-editor`, `tp-ingredient-edit-name`, `tp-ingredient-edit-per`, `tp-ingredient-edit-unit` with `-g`, `-ml`, `-serve`, `tp-ingredient-edit-kcal`, `tp-ingredient-edit-protein`, `tp-ingredient-edit-carbs`, `tp-ingredient-edit-fat`, `tp-ingredient-edit-hint`, `tp-ingredient-edit-save`.

## History and Settings

`tp-history` (`data-mode="ledger" | "body"`), `tp-history-mode` (`data-mode`), `tp-history-prev`, `tp-history-next`, `tp-history-colonnade` (`data-empty` before the first meal; day buttons carry `data-day`), `tp-stat-avg`, `tp-stat-under`, `tp-stat-streak` (each `data-value`), `tp-history-day-<YYYY-MM-DD>` (week row, `data-tracked`; tracked rows hold `tp-history-day-kcal` with `data-kcal`, and `tp-history-day-delta` with `data-over` and `data-kcal` = the distance to the goal), `tp-history-week-empty` (`Nothing logged this week.`). Day sheet: the dialog has no test id; its scroll body has element id `tp-history-day-sheet` (select `#tp-history-day-sheet`), `tp-history-day-total` in the header, `tp-history-entry-<entryId>` per row.

`tp-settings`, `tp-safe-mode` (the SAFE MODE tablet at the top of SETTINGS, `aria-label="Safe mode"`, rendered only at safe level 1 or 2) with `tp-safe-mode-full` (TRY FULL MODE: clears `temperance.safe`, `temperance.boot` and `temperance.flags`, then reloads on `?safe=0`), `tp-settings-group-goals`, `tp-settings-group-display`, `tp-settings-group-data`, `tp-settings-goal`, `tp-settings-target-protein`, `tp-settings-target-carbs`, `tp-settings-target-fat` (inputs), `tp-settings-target-weight` (`inputmode="decimal"`, kg to one decimal; commits on blur or Enter, an empty value clears `settings.targetWeightKg`, a value the store would refuse reverts), `tp-settings-unit`, `tp-settings-hero`, `tp-settings-tilt`, `tp-settings-motion`, `tp-settings-opening`, `tp-settings-replay`, `tp-settings-install-row` and `tp-settings-install` (only while the browser offers an install), `tp-settings-export`, `tp-settings-import` (the visible button), `tp-settings-import-file` (the file input, kept in the DOM and visually hidden), `tp-settings-import-pending` with `tp-settings-import-merge`, `tp-settings-import-replace`, `tp-settings-import-confirm`, `tp-settings-import-error`, `tp-settings-erase`, `tp-settings-erase-confirm`, `tp-settings-footer`, `tp-settings-photos` (`12 photos · 8.4 MB. Photos stay on this device and are not in the backup.`, the sentence alone with no photos; `data-count` and `data-bytes` once the photo store has been read; absent where photos are not supported), `tp-settings-version` (`Temperance · v<version> · <hash>`).

## History BODY (weight and photos)

HISTORY has a second mode, BODY. `tp-body` (the BODY view).

Weight: `tp-weight-latest` (the hero, `data-kg`, `aria-label` `84.1 kg`; read those, `GoldNumber` draws the digits three times; with no weigh-in the same id is on the EmptyState `No weigh-ins yet.`), `tp-weight-trend` (`data-delta`, `data-dir`), `tp-weight-target` (`data-kg` = distance to `settings.targetWeightKg`), `tp-weight-chart` (`data-points`, `data-min`, `data-max`); the trend, target and chart render only after the first weigh-in. `tp-weight-input` (kg), `tp-weight-log` (records today's weigh-in; a second one the same day replaces it), `tp-weight-row-<id>` (`data-day`, `data-kg`), `tp-weight-delete-<id>` (deletes with an UNDO toast that calls `restoreWeight(entry)`). Weights live in `useStore().weights` and are part of the JSON backup.

Photos: `tp-photos`, `tp-photo-add` (the hidden file input), `tp-photo-add-button` (the visible button, in the empty state or the toolbar), `tp-photo-compare` (`aria-pressed`, from 2 photos), `tp-photo-grid` (newest first), `tp-photo-<id>` (one tile, `data-selected="1" | "2"` when picked for compare; ids come from `newId`), `tp-photo-viewer` (set on the dialog by `markDialog`), `tp-photo-viewer-image`, `tp-photo-note`, `tp-photo-share`, `tp-photo-viewer-compare`, `tp-photo-delete` (`data-armed` on the first tap), `tp-photo-delete-confirm`, `tp-photo-compare-view` (the compare dialog, also by `markDialog`), `tp-photo-compare-<id>` (one figure; its kg span carries `data-kg`). Photos live in IndexedDB (see Globals), never in the JSON backup.

## Status

Ids listed here are the contract. An id missing from a build is a gap to report, not a reason to invent a different one. No lint guards them; what breaks when one goes is the `*.test.*` files and `scripts/tour.mjs` that select by them.
