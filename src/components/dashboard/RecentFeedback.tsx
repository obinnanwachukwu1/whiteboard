import React from 'react'
import { GraduationCap, Eye, EyeOff, CheckCircle2, MessageSquare } from 'lucide-react'
import { Card } from '../ui/Card'
import { SkeletonList, SkeletonText } from '../Skeleton'
import type { FeedbackItem } from '../../hooks/useDashboardData'

type Props = {
  items: FeedbackItem[]
  isLoading: boolean
  showGrades: boolean
  onToggleGrades: (show: boolean) => void
  onClickItem: (item: FeedbackItem) => void
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
}) => {
  return (
    <Card className="h-full flex flex-col min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
        {isLoading ? (
          <SkeletonList count={5} variant="simple" />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-slate-400 dark:text-neutral-500" />
            </div>
            <p className="text-slate-600 dark:text-neutral-400 font-medium">
              No recent grades
            </p>
            <p className="text-sm text-slate-500 dark:text-neutral-500 mt-1">
              Assignments will appear here when graded
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {items.map((item) => (
              <button
                key={`${item.courseId}-${item.id}`}
                onClick={() => onClickItem(item)}
                className="w-full text-left py-3 px-1 group hover:bg-slate-50 dark:hover:bg-neutral-800/50 rounded-md -mx-1 transition-colors flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-500 truncate">
                    {item.courseName} &bull; {new Date(item.gradedAt).toLocaleDateString()}
                  </p>
                  
                  {/* Latest Comment Preview */}
                  {(item.latestComment || item.commentStatus === 'loading') && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800/50 p-2 rounded-md">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                      {item.latestComment ? (
                        <span className="line-clamp-2 italic">
                          {showGrades ? `"${item.latestComment.comment}"` : 'Feedback available'}
                        </span>
                      ) : (
                        <div className="flex-1">
                          <SkeletonText lines={2} lastLineWidth="w-1/2" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={`text-sm font-semibold whitespace-nowrap ${
                  showGrades 
                    ? 'text-slate-900 dark:text-slate-100' 
                    : 'text-transparent bg-slate-200 dark:bg-neutral-700 rounded select-none'
                }`}>
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
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
