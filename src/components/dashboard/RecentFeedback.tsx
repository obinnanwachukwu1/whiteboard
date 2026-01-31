import React from 'react'
import { GraduationCap, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { SkeletonList } from '../Skeleton'
import type { FeedbackItem } from '../../hooks/useDashboardData'
import { CourseAvatar } from '../CourseAvatar'
import { ListItemRow } from '../ui/ListItemRow'
import { useCourseAvatarPreloadGate } from '../../hooks/useCourseAvatarPreloadGate'

type Props = {
  items: FeedbackItem[]
  isLoading: boolean
  showGrades: boolean
  onToggleGrades: (show: boolean) => void
  onClickItem: (item: FeedbackItem) => void
  courseImageUrl?: (courseId: string | number) => string | undefined
}

/**
 * Shows recently graded assignments.
 */
export const RecentFeedback: React.FC<Props> = ({
  items,
  isLoading,
  showGrades,
  onToggleGrades,
  onClickItem,
  courseImageUrl,
}) => {
  const imagesReady = useCourseAvatarPreloadGate(
    items.map((it) => it.courseId),
    { enabled: !isLoading && items.length > 0, once: true }
  )

  return (
    <Card className="h-full flex flex-col min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-100)' }}>
            <GraduationCap className="w-4 h-4" style={{ color: 'var(--accent-600)' }} />
          </span>
          Recent Feedback
        </h2>
        <button
          onClick={() => onToggleGrades(!showGrades)}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title={showGrades ? 'Hide grades' : 'Show grades'}
        >
          {showGrades ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoading || (!imagesReady && items.length > 0) ? (
          <SkeletonList count={5} variant="simple" />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--accent-100)' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--accent-600)' }} />
            </div>
            <p className="text-slate-600 dark:text-neutral-400 font-medium">
              No recent grades
            </p>
            <p className="text-sm text-slate-500 dark:text-neutral-500 mt-1">
              Assignments will appear here when graded
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ListItemRow
                key={`${item.courseId}-${item.id}`}
                onClick={() => onClickItem(item)}
                icon={
                  <CourseAvatar
                    courseId={item.courseId}
                    courseName={item.courseName}
                    src={courseImageUrl?.(item.courseId)}
                    className="w-full h-full rounded-full"
                  />
                }
                title={
                  <span className="truncate">{item.name}</span>
                }
                subtitle={
                  <div className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{item.courseName}</span>
                      <span className="text-slate-300 dark:text-neutral-600">·</span>
                      <span className="shrink-0">{new Date(item.gradedAt).toLocaleDateString()}</span>
                    </span>
                    {item.latestComment && (
                      <span className="mt-0.5 truncate text-slate-500 dark:text-neutral-500">
                        {showGrades ? item.latestComment.comment : 'Feedback available'}
                      </span>
                    )}
                  </div>
                }
                trailing={
                  <div
                    className={`text-sm font-semibold whitespace-nowrap ${
                      showGrades
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-transparent bg-slate-200 dark:bg-neutral-700 rounded select-none'
                    }`}
                  >
                    {showGrades ? (
                      <>
                        {item.score}
                        <span className="text-slate-400 dark:text-neutral-500 font-normal text-xs ml-0.5">
                          /{item.pointsPossible}
                        </span>
                      </>
                    ) : (
                      <span className="opacity-0">88/100</span>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
