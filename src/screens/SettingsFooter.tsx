import { useEffect, useState } from 'react'
import { Meander } from '../components/ornaments'
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

/**
 * The last thing on the SETTINGS column (polish-spec 6.6): a 120 px meander, where the data lives,
 * when days turn, the photos line, the stoic sources, then the version in Cinzel bone-mute.
 */
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
    <footer data-testid="tp-settings-footer" className="flex flex-col items-center px-2 pt-10 pb-6 text-center">
      <Meander width={120} />
      <div className="mt-6 flex max-w-[320px] flex-col items-center gap-1">
        <p className="hint">Data lives on this device.</p>
        <p className="hint">Days reset at local midnight.</p>
        {supported ? (
          <p data-testid="tp-settings-photos" data-count={stat?.count} data-bytes={stat?.bytes} className="hint">
            {countLine ? (
              <>
                <span className="num whitespace-nowrap">{countLine}</span>.{' '}
              </>
            ) : null}
            {PHOTOS_NOTE}
          </p>
        ) : null}
      </div>
      <p className="mt-5 max-w-[300px] font-body text-[15px] font-medium leading-[1.4] text-bone-soft">
        Long, Gummere, Carter, Higginson translations, public domain
      </p>
      <p data-testid="tp-settings-version" className="label mt-6 tracking-[0.08em] text-bone-mute">
        Temperance · v{__APP_VERSION__} · {__BUILD_HASH__}
      </p>
    </footer>
  )
}
