type Props = {
  checked: boolean
  onChange(checked: boolean): void
  label: string
  /** hide the text label visually (still announced) */
  hideLabel?: boolean
  className?: string
  testId?: string
}

/** 36 x 20 px hairline switch with a Cinzel 10 px label. */
export function Toggle({ checked, onChange, label, hideLabel, className = '', testId }: Props) {
  return (
    <button
      type="button"
      role="switch"
      data-testid={testId}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-11 items-center gap-3 cursor-pointer ${className}`}
    >
      {!hideLabel ? <span className={`font-display text-[10px] tracking-[0.3em] ${checked ? 'text-gold-300' : 'text-bone-dim'}`}>{label}</span> : <span className="sr-only">{label}</span>}
      <span
        aria-hidden="true"
        className={`relative inline-block h-5 w-9 rounded-[3px] border transition-colors duration-150 ${
          checked ? 'border-gold-400 bg-[var(--gold-line)]' : 'border-obsidian-600 bg-obsidian-800'
        }`}
      >
        <span
          className={`absolute top-[3px] h-3 w-3 rounded-[2px] transition-[left,background-color] duration-150 ${
            checked ? 'left-[21px] bg-gold-400' : 'left-[3px] bg-bone-mute'
          }`}
        />
      </span>
    </button>
  )
}
