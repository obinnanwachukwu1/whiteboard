import React from 'react'
import { Megaphone, Calendar, Check } from 'lucide-react'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'
import { formatActivityTime } from '../../hooks/useActivityFeed'
import { cleanCourseName } from '../../utils/courseName'
import { useAI } from '../../hooks/useAI'
import { useAppFlags } from '../../context/AppContext'
import { SummaryPopover } from './SummaryPopover'
import { useAIPopover } from '../../hooks/useAIPopover'
import { ListItemRow } from '../ui/ListItemRow'

type Props = {
  item: ActivityFeedItem
  onMarkRead?: (topicId: string) => void
  onClick?: () => void
}

type TriggerProps = ReturnType<typeof useAIPopover>['triggerProps']

type RowProps = Props & {
  triggerProps: TriggerProps
}

const ActivityRow = React.memo(({ item, onMarkRead, onClick, triggerProps }: RowProps) => {
  const Icon = item.type === 'announcement' ? Megaphone : Calendar
  const iconColor = item.type === 'announcement' 
    ? 'text-violet-500 dark:text-violet-400' 
    : 'text-emerald-500 dark:text-emerald-400'

  const handleMarkRead = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.type === 'announcement' && item.topicId && onMarkRead) {
      onMarkRead(item.topicId)
    }
  }, [item, onMarkRead])

  return (
    <ListItemRow
      density="compact"
      interactiveProps={triggerProps}
      onClick={onClick}
      icon={
        <Icon className={`w-4 h-4 ${iconColor}`} />
      }
      title={item.title}
      subtitle={
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{cleanCourseName(item.courseName)}</span>
          <span className="whitespace-nowrap flex-shrink-0">{formatActivityTime(item.timestamp)}</span>
        </span>
      }
      menu={
        item.type === 'announcement' && item.topicId && onMarkRead ? (
          <button
            type="button"
            onClick={handleMarkRead}
            className="p-1 rounded
                      text-slate-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400
                      hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                      transition-all"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        ) : undefined
      }
    />
  )
})

ActivityRow.displayName = 'ActivityRow'

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

/**
 * Single activity feed item (announcement or calendar event).
 */
export const ActivityItem: React.FC<Props> = ({ item, onMarkRead, onClick }) => {
  const { streamSummarize } = useAI()
  const { aiEnabled } = useAppFlags()
  
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
  
  
  return (
    <>
      <ActivityRow
        item={item}
        onMarkRead={onMarkRead}
        onClick={onClick}
        triggerProps={triggerProps}
      />
      <SummaryPopover {...popoverProps} />
    </>
  )
}
