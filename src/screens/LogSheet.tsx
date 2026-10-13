/** PLACEHOLDER owned by the log agent (src/screens/Log*, src/components/MealForm*). See docs/design-spec.md section 10. */
import { Sheet } from '../components/ui'
import { useUI } from '../store/useUI'

export function LogSheet() {
  const open = useUI((s) => s.logOpen)
  const close = useUI((s) => s.closeLog)
  return (
    <Sheet open={open} onClose={close} title="Log">
      <p className="font-body italic text-[15px] text-bone-dim">Nothing here yet.</p>
    </Sheet>
  )
}
