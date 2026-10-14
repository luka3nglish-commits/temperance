import { ChevronRight } from 'lucide-react'
import { Sheet } from '../components/ui'

type Props = {
  open: boolean
  onClose(): void
  onClosed?(): void
  onPick(kind: 'meal' | 'ingredient'): void
}

const OPTIONS: { kind: 'meal' | 'ingredient'; label: string; note: string }[] = [
  { kind: 'meal', label: 'Meal', note: 'A name and its numbers, or built from ingredients.' },
  { kind: 'ingredient', label: 'Ingredient', note: 'Numbers per 100 g, per 100 ml or per serve.' },
]

/** The small action sheet behind the header plus: MEAL or INGREDIENT. */
export function LibraryAddMenu({ open, onClose, onClosed, onPick }: Props) {
  return (
    <Sheet open={open} onClose={onClose} onClosed={onClosed} title="Add" height="auto">
      <ul data-testid="tp-library-add-menu" className="pb-2">
        {OPTIONS.map(({ kind, label, note }) => (
          <li key={kind} className="border-t border-[var(--gold-line)] last:border-b">
            <button
              type="button"
              data-testid={`tp-library-add-${kind}`}
              onClick={() => onPick(kind)}
              className="flex min-h-14 w-full items-center gap-4 py-2 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)] cursor-pointer"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display inscribed text-[14px] tracking-[0.3em] text-gold-400">{label}</span>
                <span className="font-body text-[15px] leading-[1.4] text-bone-dim">{note}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-bone-mute" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
