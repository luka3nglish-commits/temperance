import { ChevronRight } from 'lucide-react'
import { Sheet } from '../components/ui'

type Props = {
  open: boolean
  onClose(): void
  onClosed?(): void
  onPick(kind: 'meal' | 'ingredient'): void
}

const OPTIONS: { kind: 'meal' | 'ingredient'; label: string; note: string }[] = [
  { kind: 'meal', label: 'New meal', note: 'Its numbers per serve or per 100 g, or built from ingredients.' },
  { kind: 'ingredient', label: 'New ingredient', note: 'Numbers per 100 g, per 100 ml or per serve.' },
]

/** The small action sheet behind the header plus: NEW MEAL or NEW INGREDIENT, 64 px rows. */
export function LibraryAddMenu({ open, onClose, onClosed, onPick }: Props) {
  return (
    <Sheet open={open} onClose={onClose} onClosed={onClosed} title="Add" height="auto">
      <ul data-testid="tp-library-add-menu" className="pb-2">
        {OPTIONS.map(({ kind, label, note }) => (
          <li key={kind} className="row-rule">
            <button
              type="button"
              data-testid={`tp-library-add-${kind}`}
              onClick={() => onPick(kind)}
              className="row-press flex min-h-16 w-full items-center gap-4 py-3 text-left cursor-pointer"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="font-display text-[14px] font-bold uppercase leading-none tracking-[0.16em] text-gold-300">{label}</span>
                <span className="hint">{note}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-bone-dim" />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
