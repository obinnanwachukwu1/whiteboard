import React from 'react'
import { Pin } from 'lucide-react'

type Props = {
  onClick: () => void
  count?: number
}

export const PinnedButton: React.FC<Props> = ({ onClick, count = 0 }) => {
  const hasCount = count > 0

  return (
    <button
      onClick={onClick}
      className="relative group inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-600 dark:text-slate-300 hover:[background-color:var(--app-accent-hover)] ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50 transition-all"
      title="Pinned pages"
      aria-label={`Pinned pages${hasCount ? ` (${count} items)` : ''}`}
    >
      <Pin className="w-4.5 h-4.5" />
      {hasCount && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold rounded-full text-white ring-2 ring-white dark:ring-neutral-900 bg-[var(--accent-600)]">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
