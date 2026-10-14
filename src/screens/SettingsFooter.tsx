import { useEffect, useState } from 'react'
import { listPhotos, photoStorageBytes, photosSupported } from '../lib/photos'
import { formatInt } from '../lib/units'

/** The one sentence about where progress photos live. Shown wherever photos are possible. */
export const PHOTOS_NOTE = 'Photos stay on this device and are not in the backup.'

/** Bytes as a phone counts storage (decimal units): `340 KB`, `8.4 MB`, `240 MB`, `1.2 GB`. */
export function formatBytes(bytes: number): string {
  const b = Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  const kb = Math.round(b / 1e3)
  if (kb < 1000) return `${b > 0 ? Math.max(1, kb) : 0} KB`
  const mb = Math.round(b / 1e5) / 10
  if (mb < 100) return `${mb.toFixed(1)} MB`
  if (Math.round(mb) < 1000) return `${Math.round(mb)} MB`
  return `${(Math.round(b / 1e8) / 10).toFixed(1)} GB`
}

/** `12 photos · 8.4 MB`, `1 photo · 340 KB`; null when there are none (the note alone says enough). */
export function photoCountLine(count: number, bytes: number): string | null {
  if (!(count > 0)) return null
  return `${formatInt(count)} ${count === 1 ? 'photo' : 'photos'} · ${formatBytes(bytes)}`
}

type PhotoStat = { count: number; bytes: number }

/** Version, build, where the data lives (photos included), and the stoic sources. The last thing on the SETTINGS column. */
export function SettingsFooter() {
  const [supported] = useState(photosSupported)
  const [stat, setStat] = useState<PhotoStat | null>(null)

  useEffect(() => {
    if (!supported) return
    let live = true
    Promise.all([listPhotos(), photoStorageBytes()])
      .then(([list, bytes]) => {
        if (live) setStat({ count: list.length, bytes })
      })
      .catch(() => {
        /* IndexedDB refused (private mode, another tab blocking): the note stands without a count */
      })
    return () => {
      live = false
    }
  }, [supported])

  const countLine = stat ? photoCountLine(stat.count, stat.bytes) : null

  return (
    <footer className="flex flex-col items-center gap-2 pt-10 pb-4 text-center">
      <p className="font-display num text-[9px] tracking-[0.3em] text-bone-mute">
        Temperance · v{__APP_VERSION__} · <span className="normal-case">{__BUILD_HASH__}</span>
      </p>
      <p className="font-body text-[15px] text-bone-dim">Data lives on this device.</p>
      {supported ? (
        <p data-testid="tp-settings-photos" data-count={stat?.count} data-bytes={stat?.bytes} className="max-w-[300px] font-body text-[15px] leading-[1.4] text-bone-dim">
          {countLine ? (
            <>
              <span className="num whitespace-nowrap">{countLine}</span>.{' '}
            </>
          ) : null}
          {PHOTOS_NOTE}
        </p>
      ) : null}
      <p className="max-w-[300px] font-body italic text-[14px] leading-[1.4] text-bone-mute">Long, Gummere, Carter, Higginson translations, public domain</p>
    </footer>
  )
}
