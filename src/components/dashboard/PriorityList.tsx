import React from 'react'
import { Target } from 'lucide-react'
import { Card } from '../ui/Card'
import { PriorityItem } from './PriorityItem'
import { AlsoDue } from './AlsoDue'
import { TimeHorizonDropdown } from './TimeHorizonDropdown'
import { SkeletonList } from '../Skeleton'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import type { TimeHorizon } from '../../hooks/useDashboardSettings'
import { useCourseAvatarPreloadGate } from '../../hooks/useCourseAvatarPreloadGate'

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
  const imagesReady = useCourseAvatarPreloadGate(
    assignments.map((a) => a.courseId),
    { enabled: !isLoading && assignments.length > 0, once: true }
  )

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-100)' }}>
            <Target className="w-4 h-4" style={{ color: 'var(--accent-600)' }} />
          </span>
          Priority
        </h2>
        <TimeHorizonDropdown value={timeHorizon} onChange={onTimeHorizonChange} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoading || (!imagesReady && assignments.length > 0) ? (
          <SkeletonList count={5} hasAvatar variant="simple" />
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--accent-100)' }}>
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
          <div className="space-y-2">
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
