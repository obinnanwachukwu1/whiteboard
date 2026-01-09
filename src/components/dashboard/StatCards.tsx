import React from 'react'
import { Card } from '../ui/Card'
import { CalendarClock, BookOpen, BarChart3 } from 'lucide-react'

type Props = {
  dueCount: number
  dueLoading: boolean
  hasDue: boolean
  nextDue: { title: string; when: string } | null
  courseCount: number
  avgGrade: number | null
}

export const StatCards: React.FC<Props> = ({ dueCount, dueLoading, hasDue, nextDue, courseCount, avgGrade }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-neutral-400">Due this week</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {dueLoading ? '—' : hasDue ? `${dueCount} item${dueCount === 1 ? '' : 's'}` : 'All clear'}
            </div>
            {nextDue && (
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate" title={nextDue.title}>
                Next: {nextDue.when}
              </div>
            )}
          </div>
        </div>
      </Card>
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-neutral-400">Courses</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{courseCount || '—'}</div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Visible in sidebar</div>
          </div>
        </div>
      </Card>
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-neutral-400">Avg grade</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{avgGrade != null ? `${avgGrade}%` : '—'}</div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">Across loaded courses</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
