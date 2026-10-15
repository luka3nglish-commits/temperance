/**
 * Toggle switch, polish-spec 4.5. Track 48 x 28 (hit 48 x 44), a carved well with a 1 px gold edge;
 * knob 20 x 20. Off: knob #9C9791 (6.65:1). On: the knob is engraved gold and slides 22 px (180 ms,
 * --ease-stone), the track takes a gold wash and a gold-300 edge. Pressed: knob scale 0.9. Keyboard
 * focus rings the track. Label Cinzel 700 12 px 0.12em bone-dim, left of the track.
 *
 *   <Toggle label="Save to library" checked={save} onChange={setSave} testId="tp-log-save-library" />
 *   <Toggle label="Gold follows tilt" hideLabel checked={on} onChange={set} />
 */

type Props = {
  checked: boolean
  onChange(checked: boolean): void
  label: string
  /** hide the text label visually (still announced) */
  hideLabel?: boolean
  disabled?: boolean
  className?: string
  testId?: string
}

export function Toggle({ checked, onChange, label, hideLabel, disabled, className = '', testId }: Props) {
  return (
    <button
      type="button"
      role="switch"
      data-testid={testId}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`toggle inline-flex min-h-11 cursor-pointer items-center gap-3 disabled:cursor-default ${className}`}
    >
      {!hideLabel ? <span className="label">{label}</span> : <span className="sr-only">{label}</span>}
      <span aria-hidden="true" className="toggle-track">
        <span className="toggle-knob" />
      </span>
    </button>
  )
}
