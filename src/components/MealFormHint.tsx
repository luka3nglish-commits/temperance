import { Toggle } from './ui'

type Props = {
  /** the quiet hint on the left, `Macros add to 526 kcal.`, only while the macros differ; empty otherwise */
  hint?: string
  saveToLibrary: boolean
  onSaveToLibrary(on: boolean): void
  className?: string
}

/**
 * One 36 px line: the macro hint at the left (Cormorant 600 15 px bone-soft; `tp-log-hint` is always
 * rendered, empty unless the calories and the 4/4/9 sum differ), SAVE TO LIBRARY at the right.
 */
export function MealFormHint({ hint, saveToLibrary, onSaveToLibrary, className = '' }: Props) {
  return (
    // the hint never truncates: on a narrow phone it takes its own line and the toggle wraps under it, right aligned
    <div className={`flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 ${className}`}>
      <p data-testid="tp-log-hint" aria-live="polite" className="hint num min-w-0 whitespace-nowrap">
        {hint}
      </p>
      <Toggle testId="tp-log-save-library" label="Save to library" checked={saveToLibrary} onChange={onSaveToLibrary} className="ml-auto shrink-0" />
    </div>
  )
}
