import React from 'react'
import { Search, Command } from 'lucide-react'

type Props = {
  isWin: boolean
  onClick: () => void
}

export const SearchButton: React.FC<Props> = ({ isWin, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:[background-color:var(--app-accent-hover)] ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50 transition-all"
      title={isWin ? 'Search (Ctrl+K)' : 'Search (⌘K)'}
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
        <Command className="w-2.5 h-2.5" />K
      </kbd>
    </button>
  )
}
