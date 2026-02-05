import React from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'
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
  const MAX_VISIBLE = 5
  const [expanded, setExpanded] = React.useState(false)

  React.useEffect(() => {
    if (items.length <= MAX_VISIBLE && expanded) {
      setExpanded(false)
    }
  }, [expanded, items.length])

  const visibleItems = React.useMemo(() => items.slice(0, MAX_VISIBLE), [items])
  const hiddenItems = React.useMemo(() => items.slice(MAX_VISIBLE), [items])
  const hasMore = items.length > MAX_VISIBLE

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-100)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-600)' }} />
          </span>
          Activity
        </h2>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-1">
        {isLoading ? (
          <SkeletonList count={4} hasAvatar variant="simple" />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--accent-100)' }}>
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
          <div className="space-y-2 pt-1">
            {visibleItems.map((item) => (
              <ActivityItem
                key={item.id}
                item={item}
                onMarkRead={item.type === 'announcement' ? onMarkRead : undefined}
                onClick={() => onClickItem(item)}
              />
            ))}
            {hasMore && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-sm
                             text-slate-500 dark:text-neutral-400
                             hover:text-slate-700 dark:hover:text-neutral-300
                             transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                  <span>
                    {expanded ? 'Show less' : `${hiddenItems.length} more activity items`}
                  </span>
                </button>
                {expanded && (
                  <div className="mt-2 pl-6 space-y-2">
                    {hiddenItems.map((item) => (
                      <ActivityItem
                        key={item.id}
                        item={item}
                        compact
                        onMarkRead={item.type === 'announcement' ? onMarkRead : undefined}
                        onClick={() => onClickItem(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
