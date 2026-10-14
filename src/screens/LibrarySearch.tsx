import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onChange(value: string): void
  label: string
}

/** 48 px search field: Cormorant 20 px, lucide search 16 px at the left, a 44 px clear target when there is text. */
export function LibrarySearch({ value, onChange, label, className = '', ...rest }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" size={16} strokeWidth={1.5} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bone-dim" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-[4px] border border-obsidian-600 bg-obsidian-800 pl-11 pr-11 font-body text-[20px] font-medium text-bone placeholder:text-bone-mute outline-none transition-colors duration-150 focus:border-[var(--gold-focus)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        {...rest}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-bone-dim hover:text-bone cursor-pointer"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  )
}
