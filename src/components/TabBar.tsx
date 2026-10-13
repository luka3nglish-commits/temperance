import { BookMarked, Landmark, Plus, ScrollText, Settings } from 'lucide-react'
import { useUI, type Tab } from '../store/useUI'

type Slot = { tab: Tab; label: string; Icon: typeof Landmark }

const LEFT: Slot[] = [
  { tab: 'today', label: 'Today', Icon: Landmark },
  { tab: 'library', label: 'Library', Icon: BookMarked },
]
const RIGHT: Slot[] = [
  { tab: 'history', label: 'History', Icon: ScrollText },
  { tab: 'settings', label: 'Settings', Icon: Settings },
]

function TabButton({ slot, active, onClick }: { slot: Slot; active: boolean; onClick(): void }) {
  const { Icon, label } = slot
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className={`relative flex h-14 w-[78px] flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer ${
        active ? 'text-gold-300' : 'text-bone-dim hover:text-bone'
      }`}
    >
      <span aria-hidden="true" className={`absolute top-0 h-px w-4 bg-gold-400 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0'}`} />
      <Icon size={22} strokeWidth={1.5} />
      <span className="font-display text-[9px] tracking-[0.3em]">{label}</span>
    </button>
  )
}

/**
 * THE ENTABLATURE. Fixed 56 px bar on obsidian-900 with a 1 px gold top edge and the LOG keystone
 * (78 x 64 px, rises 8 px above the bar, the only gold-filled element on the home screen).
 */
export function TabBar() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const openLog = useUI((s) => s.openLog)
  return (
    <nav
      data-intro="tabbar"
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-[var(--z-tabbar)] border-t border-[var(--gold-line)] bg-obsidian-900/95 backdrop-blur-[20px]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div role="tablist" className="mx-auto flex h-14 max-w-[430px] items-end justify-center">
        {LEFT.map((s) => (
          <TabButton key={s.tab} slot={s} active={tab === s.tab} onClick={() => setTab(s.tab)} />
        ))}
        <button
          type="button"
          aria-label="Log a meal"
          data-intro="keystone"
          onClick={() => openLog()}
          className="gold-fill relative -top-2 flex h-16 w-[78px] flex-col items-center justify-center gap-0.5 rounded-[4px] text-obsidian-900 shadow-[0_6px_24px_rgba(216,180,90,0.25)] transition-transform duration-150 active:scale-[0.96] cursor-pointer"
        >
          <Plus size={22} strokeWidth={2} />
          <span className="font-display text-[10px] font-bold tracking-[0.3em]">Log</span>
        </button>
        {RIGHT.map((s) => (
          <TabButton key={s.tab} slot={s} active={tab === s.tab} onClick={() => setTab(s.tab)} />
        ))}
      </div>
    </nav>
  )
}
