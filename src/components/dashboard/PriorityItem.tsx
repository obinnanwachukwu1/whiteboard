import React from 'react'
import { cleanCourseName } from '../../utils/courseName'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import { BrainCircuit } from 'lucide-react'
import { useAI } from '../../hooks/useAI'
import { useAppContext } from '../../context/AppContext'
import { CourseAvatar } from '../CourseAvatar'

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
  const { explainPriority, loading: aiLoading } = useAI()
  const { aiEnabled } = useAppContext()
  const showAI = aiEnabled
  
  const isPastDue = assignment.hoursUntilDue !== null && assignment.hoursUntilDue < 0
  
  const handleExplain = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showAI) return
    const explanation = await explainPriority(
      assignment.name,
      assignment.relativeTime,
      assignment.weightDisplay.text
    )
    if (explanation) {
      alert(`AI Coach says:\n\n${explanation}`) // Temporary until we have a tooltip component
    }
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
      className="group relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                 transition-all duration-150 ease-out
                 hover:bg-slate-50 dark:hover:bg-neutral-800/50
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* Course Avatar */}
      <CourseAvatar 
        courseId={assignment.courseId}
        courseName={assignment.courseName}
        src={courseImageUrl}
        className="w-9 h-9 rounded-full ring-1 ring-black/10 dark:ring-white/10"
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {assignment.name}
        </div>
        
        {/* Meta row: course · time · weight */}
        <div className="flex items-center justify-between mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
          <div className="flex items-center min-w-0 pr-2">
            <span className="truncate">{cleanCourseName(assignment.courseLabel)}</span>
            {assignment.weightDisplay.text && (
              <>
                <span className="text-slate-300 dark:text-neutral-600 mx-1.5">·</span>
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
          
          <span className={`whitespace-nowrap flex-shrink-0 ${isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
            {assignment.relativeTime}
          </span>
        </div>
      </div>
      
      {/* AI Analysis Button */}
      {showAI && (
        <button
          type="button"
          onClick={handleExplain}
          disabled={aiLoading}
          className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-neutral-800 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 backdrop-blur-sm"
          title="Why is this prioritized?"
        >
          <BrainCircuit className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
        </button>
      )}
    </div>
  )
}
