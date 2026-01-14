import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'

type Props = {
  assignments: DashboardAssignment[]
  count: number
  onClickAssignment?: (assignment: DashboardAssignment) => void
}

/**
 * Collapsible "Also Due" section showing items beyond the time horizon.
 * Displays as a single line when collapsed, expands to show list.
 */
export const AlsoDue: React.FC<Props> = ({ assignments, count, onClickAssignment }) => {
  const [expanded, setExpanded] = useState(false)
  
  if (count === 0) return null
  
  return (
    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-sm
                   text-slate-500 dark:text-neutral-400
                   hover:text-slate-700 dark:hover:text-neutral-300
                   transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <span>
          {count} more due later
        </span>
      </button>
      
      {expanded && (
        <div className="mt-1 pl-6 space-y-1 animate-fade-in">
          {assignments.map((a) => (
            <button
              key={String(a.id)}
              type="button"
              onClick={() => onClickAssignment?.(a)}
              className="flex items-center justify-between w-full text-left px-2 py-1 rounded
                         text-sm text-slate-600 dark:text-neutral-400
                         hover:bg-slate-50 dark:hover:bg-neutral-800/50
                         transition-colors"
            >
              <span className="truncate">{a.name}</span>
              <span className="text-xs text-slate-400 dark:text-neutral-500 ml-2 flex-shrink-0">
                {a.relativeTime}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
