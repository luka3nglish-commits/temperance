import { Toggle } from './ui'

type Props = {
  /** the quiet hint on the left, e.g. `macros = 1 012 kcal`; empty hides it */
  hint?: string
  /** adds `· differs from calories` in bone-dim; never blocks */
  differs?: boolean
  saveToLibrary: boolean
  onSaveToLibrary(on: boolean): void
  className?: string
}

/** One 36 px line: the macros hint in Cormorant 14 px bone-dim at the left, SAVE TO LIBRARY at the right. */
export function MealFormHint({ hint, differs, saveToLibrary, onSaveToLibrary, className = '' }: Props) {
  return (
    <div className={`flex min-h-9 items-center justify-between gap-3 ${className}`}>
      <p className="num min-w-0 truncate font-body text-[14px] leading-[1.4] text-bone-dim" aria-live="polite">
        {hint}
        {hint && differs ? <span className="text-bone-dim"> {'·'} differs from calories</span> : null}
      </p>
      <Toggle label="Save to library" checked={saveToLibrary} onChange={onSaveToLibrary} className="shrink-0" />
    </div>
  )
}
