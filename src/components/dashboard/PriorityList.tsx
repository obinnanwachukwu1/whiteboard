import React from 'react'
import { Target } from 'lucide-react'
import { Card } from '../ui/Card'
import { PriorityItem } from './PriorityItem'
import { AlsoDue } from './AlsoDue'
import { TimeHorizonDropdown } from './TimeHorizonDropdown'
import { SkeletonList } from '../Skeleton'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import type { TimeHorizon } from '../../hooks/useDashboardSettings'

type Props = {
  assignments: DashboardAssignment[]
  alsoDue: DashboardAssignment[]
  alsoDueCount: number
  isLoading: boolean
  timeHorizon: TimeHorizon
  onTimeHorizonChange: (value: TimeHorizon) => void
  onClickAssignment: (assignment: DashboardAssignment) => void
  courseImageUrl: (courseId: string | number) => string | undefined
}

/**
 * Left column of the dashboard showing prioritized assignments.
 */
export const PriorityList: React.FC<Props> = ({
  assignments,
  alsoDue,
  alsoDueCount,
  isLoading,
  timeHorizon,
  onTimeHorizonChange,
  onClickAssignment,
  courseImageUrl,
}) => {
  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full bg-sky-500/10 dark:bg-sky-400/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </span>
          Priority
        </h2>
        <TimeHorizonDropdown value={timeHorizon} onChange={onTimeHorizonChange} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <SkeletonList count={5} hasAvatar variant="simple" />
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center mb-3">
              <span className="text-2xl">🎉</span>
            </div>
            <p className="text-slate-600 dark:text-neutral-400 font-medium">
              All caught up!
            </p>
            <p className="text-sm text-slate-500 dark:text-neutral-500 mt-1">
              No assignments due in the next {timeHorizon} days
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {assignments.map((assignment) => (
              <PriorityItem
                key={String(assignment.id)}
                assignment={assignment}
                courseImageUrl={courseImageUrl(assignment.courseId)}
                onClick={() => onClickAssignment(assignment)}
              />
            ))}
          </div>
        )}
        
        {/* Also Due */}
        {!isLoading && alsoDueCount > 0 && (
          <AlsoDue
            assignments={alsoDue}
            count={alsoDueCount}
            onClickAssignment={onClickAssignment}
          />
        )}
      </div>
    </Card>
  )
}
