import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { BookMarked, Landmark, Plus, ScrollText, Settings } from 'lucide-react'
import { useUI, type Tab } from '../store/useUI'
import { vibrate } from '../lib/motion'
import { lightAt } from './ui/press'

type Slot = { tab: Tab; label: string; Icon: typeof Landmark; index: number }

const LEFT: Slot[] = [
  { tab: 'today', label: 'Today', Icon: Landmark, index: 0 },
  { tab: 'library', label: 'Library', Icon: BookMarked, index: 1 },
]
const RIGHT: Slot[] = [
  { tab: 'history', label: 'History', Icon: ScrollText, index: 3 },
  { tab: 'settings', label: 'Settings', Icon: Settings, index: 4 },
]
const INDEX: Record<Tab, number> = { today: 0, library: 1, history: 3, settings: 4 }

function TabButton({ slot, active, onClick }: { slot: Slot; active: boolean; onClick(): void }) {
  const { Icon, label } = slot
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className="tab-slot press flex h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1"
    >
      <Icon size={24} strokeWidth={1.5} />
      <span className="label-tab whitespace-nowrap">{label}</span>
    </button>
  )
}

/**
 * THE ENTABLATURE (polish-spec 4.14). A 56 px bar (plus the safe area) in a dark stone gradient with
 * a 1 px gold top edge; five 20 percent slots (78 px at 390). Tab icons 24 px, labels Cinzel 700
 * 12 px 0.06em, bone-dim; the active tab lifts its icon 2 px in gold-400 with a gold-300 label. One
 * 24 x 2 gold-400 indicator with a glow rides the top edge to the active slot (360 ms, stone ease;
 * the keystone slot is skipped).
 *
 * The LOG keystone: 78 x 64, rising 8 px above the bar, cut as a keystone (narrower at the base),
 * engraved gold with a dark plus and LOG. A warm glow pools under it. Pressed: scale 0.96, a light
 * from the press point, a ring that spreads 14 px and fades over 520 ms, an 8 ms buzz. The focus ring
 * sits on the unclipped button, the gold face inside it carries the clip.
 *
 * On the three scrolling tabs the bar fades the content above it (40 px, `.tabbar::before`).
 */
export function TabBar() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const openLog = useUI((s) => s.openLog)
  const face = useRef<HTMLSpanElement>(null)
  const ring = useRef<HTMLSpanElement>(null)

  const press = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (face.current) lightAt(face.current, e.clientX, e.clientY)
    const r = ring.current
    if (r) {
      r.classList.remove('is-ringing')
      void r.offsetWidth
      r.classList.add('is-ringing')
    }
    vibrate(8)
  }

  const indicator: CSSProperties = { transform: `translateX(${INDEX[tab] * 100}%)` }

  return (
    <nav
      data-intro="tabbar"
      data-fade={tab !== 'today'}
      aria-label="Sections"
      className="tabbar absolute inset-x-0 bottom-0 z-[var(--z-tabbar)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div role="tablist" className="relative mx-auto grid h-14 w-full max-w-[390px] grid-cols-5 items-end">
        {/* the travelling indicator: one slot wide, a centred 24 x 2 bar on the top edge */}
        <span aria-hidden="true" className="tab-indicator pointer-events-none absolute -top-px left-0 flex h-[2px] w-1/5 justify-center" style={indicator}>
          <span className="h-[2px] w-6 bg-gold-400 shadow-[0_0_8px_rgba(216,180,90,0.6)]" />
        </span>
        {LEFT.map((s) => (
          <TabButton key={s.tab} slot={s} active={tab === s.tab} onClick={() => setTab(s.tab)} />
        ))}
        <div className="relative h-14">
          <span aria-hidden="true" className="gold-glow absolute -bottom-1.5 left-1/2 -ml-[39px] h-5 w-[78px]" />
          <span ref={ring} aria-hidden="true" className="keystone-ring absolute bottom-0 left-1/2 -ml-[39px] h-16 w-[78px]" />
          <button
            type="button"
            aria-label="Log a meal"
            data-intro="keystone"
            onPointerDown={press}
            onClick={() => openLog()}
            className="keystone press absolute bottom-0 left-1/2 -ml-[39px] h-16 w-[78px] cursor-pointer rounded-[4px]"
          >
            <span ref={face} className="keystone-face gold-fill press-light flex h-full w-full flex-col items-center justify-center gap-1 rounded-[4px] pb-0.5">
              <span className="press-light-spot" aria-hidden="true" />
              <Plus size={24} strokeWidth={1.5} className="relative" />
              <span className="font-display engraved relative text-[12px] font-bold leading-none tracking-[0.16em]">Log</span>
            </span>
          </button>
        </div>
        {RIGHT.map((s) => (
          <TabButton key={s.tab} slot={s} active={tab === s.tab} onClick={() => setTab(s.tab)} />
        ))}
      </div>
    </nav>
  )
}
