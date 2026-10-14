/** Version, build, where the data lives, and the stoic sources. The last thing on the SETTINGS column. */
export function SettingsFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 pt-10 pb-4 text-center">
      <p className="font-display num text-[9px] tracking-[0.3em] text-bone-mute">
        Temperance · v{__APP_VERSION__} · <span className="normal-case">{__BUILD_HASH__}</span>
      </p>
      <p className="font-body text-[15px] text-bone-dim">Data lives on this device.</p>
      <p className="max-w-[300px] font-body italic text-[14px] leading-[1.4] text-bone-mute">Long, Gummere, Carter, Higginson translations, public domain</p>
    </footer>
  )
}
