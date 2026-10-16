import { ShieldAlert } from 'lucide-react'
import { Button, SectionHeading, Tablet } from '../components/ui'
import { safeLevel, tryFullMode } from '../lib/boot'

export const SAFE_MODE_LINE = 'The 3D column and moving gold are off because the app stopped on this phone.'

/**
 * The SAFE MODE notice at the top of SETTINGS, shown only while the crash-loop guard (index.html,
 * src/lib/boot.ts) has this launch at level 1 or 2: a bracketed stone tablet like the three setting
 * groups. TRY FULL MODE forgets the sticky level and this boot, then reloads on `?safe=0`. Nothing
 * renders at level 0.
 */
export function SettingsSafeMode() {
  if (safeLevel() < 1) return null
  return (
    <Tablet as="section" bracketed aria-label="Safe mode" testId="tp-safe-mode" className="px-4 pt-3 pb-4">
      <SectionHeading rule="none" icon={<ShieldAlert size={16} strokeWidth={1.5} aria-hidden="true" />}>
        Safe mode
      </SectionHeading>
      <p className="mt-2 font-body text-[17px] font-medium leading-[1.4] text-bone">{SAFE_MODE_LINE}</p>
      <Button variant="hairline" size="sm" full className="mt-4" data-testid="tp-safe-mode-full" onClick={() => tryFullMode()}>
        Try full mode
      </Button>
    </Tablet>
  )
}
