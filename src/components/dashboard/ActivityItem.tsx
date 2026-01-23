import React, { useState } from 'react'
import { Megaphone, Calendar, Check, Wand2 } from 'lucide-react'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'
import { formatActivityTime } from '../../hooks/useActivityFeed'
import { cleanCourseName } from '../../utils/courseName'
import { useAI } from '../../hooks/useAI'
import { useAppContext } from '../../context/AppContext'


type Props = {
  item: ActivityFeedItem
  onMarkRead?: (topicId: string) => void
  onClick?: () => void
}

/**
 * Single activity feed item (announcement or calendar event).
 */
export const ActivityItem: React.FC<Props> = ({ item, onMarkRead, onClick }) => {
  const { summarize, loading: aiLoading } = useAI()
  const { aiEnabled } = useAppContext()
  const [summary, setSummary] = useState<string | null>(null)
  const showAI = aiEnabled
  
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
  
  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showAI) return
    // In a real app, we'd fetch the full message first. 
    // For now, assuming title + message are enough or fetching logic is separate.
    // Simulating usage with just title for demo if message not avail
    const textToSummarize = item.message || item.title
    if (!textToSummarize) return
    
    const res = await summarize(textToSummarize)
    if (res) setSummary(res)
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
          
          {/* AI Summary */}
          {showAI && summary && (
            <div className="mt-2 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded border border-indigo-100 dark:border-indigo-800/30">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1 font-medium">
                <Wand2 className="w-3 h-3" />
                AI Summary
              </div>
              <div className="text-xs text-slate-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                {summary}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="absolute right-3 top-2 flex items-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity px-1">
          {/* AI Summarize Button */}
          {showAI && item.type === 'announcement' && !summary && (
            <button
              type="button"
              onClick={handleSummarize}
              disabled={aiLoading}
              className={`p-1 rounded mr-1 transition-all
                ${aiLoading ? 'animate-pulse text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
              `}
              title="Summarize with AI"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}

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
  )
}
