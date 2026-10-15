import { ShieldAlert } from 'lucide-react'
import { Button, SectionHeading } from '../components/ui'
import { safeLevel, tryFullMode } from '../lib/boot'

export const SAFE_MODE_LINE = 'The 3D column and moving gold are off because the app stopped on this phone.'

/**
 * The SAFE MODE notice at the top of SETTINGS, shown only while the crash-loop guard (index.html,
 * src/lib/boot.ts) has this launch at level 1 or 2. TRY FULL MODE forgets the sticky level and
 * this boot, then reloads on `?safe=0`. Nothing renders at level 0.
 */
export function SettingsSafeMode() {
  if (safeLevel() < 1) return null
  return (
    <section data-testid="tp-safe-mode" aria-label="Safe mode" className="border-b border-[var(--gold-line)] pt-4 pb-4">
      <SectionHeading rule="none" icon={<ShieldAlert size={14} strokeWidth={1.5} aria-hidden="true" className="text-gold-400" />}>
        Safe mode
      </SectionHeading>
      <p className="font-body text-[16px] leading-[1.4] text-bone">{SAFE_MODE_LINE}</p>
      <Button variant="hairline" size="sm" className="mt-3" data-testid="tp-safe-mode-full" onClick={() => tryFullMode()}>
        Try full mode
      </Button>
    </section>
  )
}
