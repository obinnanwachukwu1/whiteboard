import React from 'react'
import { Mail } from 'lucide-react'
import { useUnreadCount } from '../hooks/useCanvasQueries'

type Props = {
  onClick: () => void
}

export const InboxButton: React.FC<Props> = ({ onClick }) => {
  const { data: unreadCount = 0 } = useUnreadCount()

  return (
    <button
      onClick={onClick}
      className="relative group inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-600 dark:text-slate-300 hover:[background-color:var(--app-accent-hover)] ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50 transition-all"
      title="Inbox"
      aria-label={`Inbox${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Mail className="w-4.5 h-4.5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold rounded-full bg-red-500 text-white ring-2 ring-white dark:ring-neutral-900">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
