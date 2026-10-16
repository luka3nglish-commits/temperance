import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onChange(value: string): void
  label: string
}

/**
 * The carved search field (polish-spec 6.3): `.tablet-inset`, h 48, a gold-500 search icon 18 px at
 * the left, Cormorant 600 20 px bone with a bone-mute placeholder, the gold-300 border and ring on
 * focus (from `.tablet-inset:focus-within`), and a 44 px clear target while there is text.
 */
export function LibrarySearch({ value, onChange, label, className = '', ...rest }: Props) {
  return (
    <div className={`tablet-inset relative flex h-12 items-center ${className}`}>
      <Search aria-hidden="true" size={18} strokeWidth={1.5} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold-500" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full bg-transparent pl-12 pr-11 font-body text-[20px] font-semibold text-bone caret-gold-400 placeholder:text-bone-mute outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        {...rest}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="icon-btn press absolute right-0.5 top-1/2 -translate-y-1/2"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  )
}
