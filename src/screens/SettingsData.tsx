import { useEffect, useRef, useState } from 'react'
import { Download, Share2, TriangleAlert, Upload, X } from 'lucide-react'
import { Button, IconButton, useToast } from '../components/ui'
import type { ImportMode, ImportResult } from '../lib/types'
import { localDayKey } from '../lib/day'
import { backupFileName } from '../lib/exportFile'
import { useStore } from '../store/useStore'
import { SettingsNote, SettingsRow } from './SettingsRow'

/** True when the page runs as an installed app. */
export function isStandalone(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    return (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** True on iPhone and iPad (including iPadOS reporting itself as a Mac with touch). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Share a file where the platform can, otherwise hand it to the browser as a download. Returns how. */
async function deliverFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?(data: ShareData): boolean }
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    let can = false
    try {
      can = nav.canShare({ files: [file] })
    } catch {
      can = false
    }
    if (can) {
      try {
        await nav.share({ files: [file], title: 'Temperance backup' })
        return 'shared'
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
        // anything else: fall through to the download link
      }
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function importedText(r: ImportResult): string {
  return `Imported · ${plural(r.meals, 'meal', 'meals')} · ${plural(r.entries, 'entry', 'entries')}`
}

const ARM_MS = 6000

/**
 * EXPORT JSON, IMPORT JSON and ERASE ALL rows. Import and erase confirm inline (no modal):
 * import asks MERGE or REPLACE, erase asks a second time in ember.
 */
export function SettingsData() {
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const toast = useToast((s) => s.show)

  const canShare = typeof navigator !== 'undefined' && typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function'

  // ---------- export ----------
  const onExport = async () => {
    const name = backupFileName(localDayKey())
    const json = JSON.stringify(exportData(), null, 2)
    const file = new File([json], name, { type: 'application/json' })
    const how = await deliverFile(file)
    if (how === 'cancelled') return
    toast({ text: `Exported · ${name}` })
  }

  // ---------- import ----------
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ name: string; parsed: unknown } | null>(null)

  const onPick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const input = ev.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      setPending({ name: file.name, parsed })
    } catch {
      toast({ text: 'That file is not a Temperance backup.', tone: 'warn' })
    }
  }

  const runImport = (mode: ImportMode) => {
    const p = pending
    setPending(null)
    if (!p) return
    try {
      const result = importData(p.parsed, mode)
      toast({ text: importedText(result) })
    } catch {
      toast({ text: 'That file is not a Temperance backup.', tone: 'warn' })
    }
  }

  // ---------- erase ----------
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), ARM_MS)
    return () => window.clearTimeout(t)
  }, [armed])
  const onErase = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    setArmed(false)
    setPending(null)
    resetAll()
    toast({ text: 'Erased.' })
  }

  const showEvictionNote = isIOS() && !isStandalone()

  return (
    <div>
      <SettingsRow
        label="Export JSON"
        below={showEvictionNote ? <SettingsNote>Safari clears unused sites after 7 days. Install the app or keep a backup.</SettingsNote> : null}
      >
        <Button variant="hairline" size="sm" onClick={() => void onExport()} icon={canShare ? <Share2 size={16} strokeWidth={1.5} /> : <Download size={16} strokeWidth={1.5} />}>
          Export
        </Button>
      </SettingsRow>

      <SettingsRow
        label="Import JSON"
        below={
          pending ? (
            <div className="flex flex-col gap-2">
              <p className="truncate font-body text-[15px] text-bone-dim">{pending.name}</p>
              <div className="flex items-center gap-2">
                <Button variant="hairline" size="sm" onClick={() => runImport('merge')}>
                  Merge
                </Button>
                <Button variant="hairline" size="sm" onClick={() => runImport('replace')}>
                  Replace
                </Button>
                <IconButton label="Cancel import" onClick={() => setPending(null)}>
                  <X size={18} strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>
          ) : null
        }
      >
        <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onPick(e)} />
        <Button variant="hairline" size="sm" onClick={() => fileInput.current?.click()} icon={<Upload size={16} strokeWidth={1.5} />}>
          Import
        </Button>
      </SettingsRow>

      <SettingsRow label="Erase all">
        {armed ? (
          <IconButton label="Keep everything" onClick={() => setArmed(false)}>
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        ) : null}
        <Button
          variant="ember"
          size="sm"
          onClick={onErase}
          aria-live="polite"
          icon={armed ? <TriangleAlert size={16} strokeWidth={1.5} /> : undefined}
          className={armed ? 'border-[rgba(255,90,31,0.7)] bg-[rgba(255,90,31,0.08)]' : ''}
        >
          {armed ? 'Erase everything' : 'Erase'}
        </Button>
      </SettingsRow>
    </div>
  )
}
