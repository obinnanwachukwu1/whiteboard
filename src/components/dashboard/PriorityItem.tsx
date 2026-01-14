import React from 'react'
import { courseHueFor } from '../../utils/colorHelpers'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'

type Props = {
  assignment: DashboardAssignment
  courseImageUrl?: string
  onClick?: () => void
}

/**
 * Single priority assignment row for the dashboard.
 * Shows: course avatar, title, course label, relative time, weight indicator
 */
export const PriorityItem: React.FC<Props> = ({ assignment, courseImageUrl, onClick }) => {
  const hue = courseHueFor(assignment.courseId, assignment.courseName || '')
  const fallbackBg = `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 30) % 360} 80% 45%))`
  
  const isPastDue = assignment.hoursUntilDue !== null && assignment.hoursUntilDue < 0
  
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
      className="group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                 transition-all duration-150 ease-out
                 hover:bg-slate-50 dark:hover:bg-neutral-800/50
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* Course Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10 bg-cover bg-center"
        style={courseImageUrl ? { backgroundImage: `url(${courseImageUrl})` } : { background: fallbackBg }}
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {assignment.name}
        </div>
        
        {/* Meta row: course · time · weight */}
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
          <span className="truncate max-w-[120px]">{assignment.courseLabel}</span>
          <span className="text-slate-300 dark:text-neutral-600">·</span>
          <span className={isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
            {assignment.relativeTime}
          </span>
          
          {/* Weight indicator */}
          {assignment.weightDisplay.text && (
            <>
              <span className="text-slate-300 dark:text-neutral-600">·</span>
              <span
                className={
                  assignment.weightDisplay.emphasis === 'high'
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : assignment.weightDisplay.emphasis === 'medium'
                    ? 'text-slate-600 dark:text-neutral-300'
                    : 'text-slate-400 dark:text-neutral-500'
                }
              >
                {assignment.weightDisplay.text}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
