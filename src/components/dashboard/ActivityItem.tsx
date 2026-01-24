import React, { useRef } from 'react'
import { Megaphone, Calendar, Check } from 'lucide-react'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'
import { formatActivityTime } from '../../hooks/useActivityFeed'
import { cleanCourseName } from '../../utils/courseName'
import { useAI } from '../../hooks/useAI'
import { useAppContext } from '../../context/AppContext'
import { SummaryPopover } from './SummaryPopover'
import { useAIPopover } from '../../hooks/useAIPopover'

type Props = {
  item: ActivityFeedItem
  onMarkRead?: (topicId: string) => void
  onClick?: () => void
}

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

/**
 * Single activity feed item (announcement or calendar event).
 */
export const ActivityItem: React.FC<Props> = ({ item, onMarkRead, onClick }) => {
  const { streamSummarize } = useAI()
  const { aiEnabled } = useAppContext()
  
  const showAI = aiEnabled && item.type === 'announcement'
  
  const { triggerProps, popoverProps } = useAIPopover({
    enabled: showAI,
    onGenerate: (update) => {
      const rawText = item.message || item.title
      const cleanText = stripHtml(rawText || '')
      
      if (cleanText.trim()) {
        return streamSummarize(cleanText, update)
      }
      return false
    }
  })
  
  const itemRef = useRef<HTMLDivElement>(null)
  
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
    <>
      <div
        ref={itemRef}
        role="button"
        tabIndex={0}
        onClick={onClick}
        {...triggerProps}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        className="group relative flex flex-col px-3 py-2 rounded-lg cursor-pointer
                   transition-all duration-150 ease-out
                   hover:bg-slate-50 dark:hover:bg-neutral-800/50
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <div className="flex items-start gap-2.5 w-full">
          {/* Type Icon */}
          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {item.title}
            </div>
            <div className="flex items-center justify-between mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              <span className="truncate pr-2">{cleanCourseName(item.courseName)}</span>
              <span className="whitespace-nowrap flex-shrink-0">{formatActivityTime(item.timestamp)}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="absolute right-3 top-2 flex items-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity px-1">
            {/* Mark as read button (announcements only) */}
            {item.type === 'announcement' && item.topicId && onMarkRead && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="p-1 rounded
                          text-slate-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400
                          hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                          transition-all focus-visible:opacity-100"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <SummaryPopover {...popoverProps} />
    </>
  )
}
