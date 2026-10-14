import { useEffect, useRef, useState } from 'react'
import { Check, Download, Share2, TriangleAlert, Upload, X } from 'lucide-react'
import { Button, IconButton, useToast } from '../components/ui'
import type { ExportFile, ImportMode, ImportResult } from '../lib/types'
import { localDayKey } from '../lib/day'
import { backupFileName, validateExportFile } from '../lib/exportFile'
import { clearPhotos } from '../lib/photos'
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

/** "Imported · 12 meals · 48 entries" from an ImportResult (ingredients only when any came in). */
export function importedText(r: ImportResult): string {
  const parts = [`${plural(r.meals, 'meal', 'meals')}`, `${plural(r.entries, 'entry', 'entries')}`]
  if (r.ingredients > 0) parts.splice(1, 0, plural(r.ingredients, 'ingredient', 'ingredients'))
  return `Imported · ${parts.join(' · ')}`
}

/** What a validated backup holds, for the line above MERGE and REPLACE. */
function previewText(f: ExportFile): string {
  const meals = Object.keys(f.meals).length
  const ingredients = Object.keys(f.ingredients).length
  const parts = [plural(meals, 'meal', 'meals'), plural(f.entries.length, 'entry', 'entries')]
  if (ingredients > 0) parts.splice(1, 0, plural(ingredients, 'ingredient', 'ingredients'))
  return parts.join(' · ')
}

const NOT_A_BACKUP = 'That file is not a Temperance backup.'
const ARM_MS = 6000

type Pending = { name: string; file: ExportFile; mode: ImportMode | null }

/**
 * EXPORT JSON, IMPORT JSON and ERASE ALL rows. Import and erase confirm inline (no modal):
 * import asks MERGE or REPLACE and then a confirm, erase asks a second time in ember.
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
  const [pending, setPending] = useState<Pending | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // the inline error line clears with the toast
  useEffect(() => {
    if (!importError) return
    const t = window.setTimeout(() => setImportError(null), 4000)
    return () => window.clearTimeout(t)
  }, [importError])

  const failImport = () => {
    setPending(null)
    setImportError(NOT_A_BACKUP)
    toast({ text: NOT_A_BACKUP, tone: 'warn' })
  }

  const onPick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const input = ev.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      failImport()
      return
    }
    const valid = validateExportFile(parsed)
    if (!valid) {
      failImport()
      return
    }
    setImportError(null)
    setPending({ name: file.name, file: valid, mode: null })
  }

  const chooseMode = (mode: ImportMode) => setPending((p) => (p ? { ...p, mode } : p))

  const confirmImport = () => {
    const p = pending
    if (!p || !p.mode) return
    setPending(null)
    try {
      const result = importData(p.file, p.mode)
      toast({ text: importedText(result) })
    } catch {
      failImport()
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
    void clearPhotos().catch(() => {})
    toast({ text: 'Erased.' })
  }

  const showEvictionNote = isIOS() && !isStandalone()

  const modeButton = (mode: ImportMode, label: string) => {
    const on = pending?.mode === mode
    return (
      <Button
        variant="hairline"
        size="sm"
        role="radio"
        aria-checked={on}
        data-testid={`tp-settings-import-${mode}`}
        onClick={() => chooseMode(mode)}
        className={on ? 'bg-[var(--gold-line)] text-gold-300' : 'text-bone-dim'}
      >
        {label}
      </Button>
    )
  }

  return (
    <div>
      <SettingsRow
        label="Export JSON"
        below={showEvictionNote ? <SettingsNote>Safari clears unused sites after 7 days. Install the app or keep a backup.</SettingsNote> : null}
      >
        <Button
          variant="hairline"
          size="sm"
          data-testid="tp-settings-export"
          onClick={() => void onExport()}
          icon={canShare ? <Share2 size={16} strokeWidth={1.5} /> : <Download size={16} strokeWidth={1.5} />}
        >
          Export
        </Button>
      </SettingsRow>

      <SettingsRow
        label="Import JSON"
        below={
          pending ? (
            <div className="flex flex-col gap-2" data-testid="tp-settings-import-pending">
              <p className="font-body text-[15px] leading-[1.4] text-bone-dim">
                <span className="block truncate text-bone">{pending.name}</span>
                <span className="num">{previewText(pending.file)}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label="Import mode" className="flex items-center gap-2">
                  {modeButton('merge', 'Merge')}
                  {modeButton('replace', 'Replace')}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {pending.mode ? (
                    <Button
                      variant={pending.mode === 'replace' ? 'ember' : 'hairline'}
                      size="sm"
                      data-testid="tp-settings-import-confirm"
                      onClick={confirmImport}
                      icon={<Check size={16} strokeWidth={1.5} />}
                      className={pending.mode === 'replace' ? 'border-[rgba(255,90,31,0.7)] bg-[rgba(255,90,31,0.08)]' : ''}
                    >
                      {pending.mode === 'replace' ? 'Replace everything' : 'Import'}
                    </Button>
                  ) : null}
                  <IconButton label="Cancel import" onClick={() => setPending(null)}>
                    <X size={18} strokeWidth={1.5} />
                  </IconButton>
                </div>
              </div>
              {pending.mode === 'replace' ? <SettingsNote>Replace clears what is on this device first.</SettingsNote> : null}
            </div>
          ) : importError ? (
            <p data-testid="tp-settings-import-error" role="alert" className="flex items-center gap-2 font-body text-[15px] leading-[1.4] text-ember-text">
              <TriangleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
              {importError}
            </p>
          ) : null
        }
      >
        <input
          ref={fileInput}
          data-testid="tp-settings-import-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onPick(e)}
        />
        <Button variant="hairline" size="sm" data-testid="tp-settings-import" onClick={() => fileInput.current?.click()} icon={<Upload size={16} strokeWidth={1.5} />}>
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
          data-testid={armed ? 'tp-settings-erase-confirm' : 'tp-settings-erase'}
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
