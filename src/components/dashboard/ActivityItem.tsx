import React from 'react'
import { Megaphone, Calendar, Check } from 'lucide-react'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'
import { formatActivityTime } from '../../hooks/useActivityFeed'

type Props = {
  item: ActivityFeedItem
  onMarkRead?: (topicId: string) => void
  onClick?: () => void
}

/**
 * Single activity feed item (announcement or calendar event).
 */
export const ActivityItem: React.FC<Props> = ({ item, onMarkRead, onClick }) => {
  const Icon = item.type === 'announcement' ? Megaphone : Calendar
  const iconColor = item.type === 'announcement' 
    ? 'text-violet-500 dark:text-violet-400' 
    : 'text-emerald-500 dark:text-emerald-400'
  const iconBg = item.type === 'announcement'
    ? 'bg-violet-500/10 dark:bg-violet-400/10'
    : 'bg-emerald-500/10 dark:bg-emerald-400/10'
  
  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.type === 'announcement' && item.topicId && onMarkRead) {
      onMarkRead(item.topicId)
    }
  }
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className="group flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer
                 transition-all duration-150 ease-out
                 hover:bg-slate-50 dark:hover:bg-neutral-800/50
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* Type Icon */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {item.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
          <span className="truncate max-w-[100px]">{item.courseName}</span>
          <span className="text-slate-300 dark:text-neutral-600">·</span>
          <span>{formatActivityTime(item.timestamp)}</span>
        </div>
      </div>
      
      {/* Mark as read button (announcements only) */}
      {item.type === 'announcement' && item.topicId && onMarkRead && (
        <button
          type="button"
          onClick={handleMarkRead}
          className="opacity-0 group-hover:opacity-100 p-1 rounded
                     text-slate-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400
                     hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                     transition-all focus-visible:opacity-100"
          title="Mark as read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
