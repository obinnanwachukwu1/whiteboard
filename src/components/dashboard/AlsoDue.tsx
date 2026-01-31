import React, { useState } from 'react'
import { ChevronRight, CalendarClock } from 'lucide-react'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import { ListItemRow } from '../ui/ListItemRow'

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
        <div className="mt-2 pl-6 space-y-2">
          {assignments.map((a) => (
            <ListItemRow
              key={String(a.id)}
              density="compact"
              onClick={() => onClickAssignment?.(a)}
              icon={<CalendarClock className="w-4 h-4" />}
              title={a.name}
              trailing={<span className="text-xs text-slate-400 dark:text-neutral-500">{a.relativeTime}</span>}
              className="text-sm text-slate-600 dark:text-neutral-400"
            />
          ))}
        </div>
      )}
    </div>
  )
}
