import React from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'
import { ActivityItem } from './ActivityItem'
import { SkeletonList } from '../Skeleton'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'

type Props = {
  items: ActivityFeedItem[]
  isLoading: boolean
  isEmpty: boolean
  onMarkRead: (topicId: string) => void
  onClickItem: (item: ActivityFeedItem) => void
}

/**
 * Right column of the dashboard showing activity feed (announcements + events).
 */
export const ActivityPanel: React.FC<Props> = ({
  items,
  isLoading,
  isEmpty,
  onMarkRead,
  onClickItem,
}) => {
  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full bg-violet-500/10 dark:bg-violet-400/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </span>
          Activity
        </h2>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <SkeletonList count={4} hasAvatar variant="simple" />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center mb-3">
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-slate-600 dark:text-neutral-400 font-medium">
              All caught up!
            </p>
            <p className="text-sm text-slate-500 dark:text-neutral-500 mt-1">
              No new announcements or events
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {items.map((item) => (
              <ActivityItem
                key={item.id}
                item={item}
                onMarkRead={item.type === 'announcement' ? onMarkRead : undefined}
                onClick={() => onClickItem(item)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
