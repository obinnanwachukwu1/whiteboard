import React from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { CalendarClock } from 'lucide-react'
import { extractAssignmentIdFromUrl } from '../../utils/urlHelpers'
import { formatDateTime } from '../../utils/dateFormat'
import type { DueItem } from '../../hooks/useDashboardData'
import { SkeletonList } from '../Skeleton'
import { CourseAvatar } from '../CourseAvatar'
import { ListItemRow } from '../ui/ListItemRow'

type Props = {
  due: DueItem[]
  loading: boolean
  onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void
  onOpenCourse?: (courseId: string | number) => void
  courseImageUrl: (courseId: string | number | undefined | null) => string | undefined
  navigate: (opts: { to: string }) => void
}

export const AssignmentList: React.FC<Props> = ({ due, loading, onOpenAssignment, onOpenCourse, courseImageUrl, navigate }) => {
  // Memoize sorted list to avoid re-sorting on unrelated renders
  const sortedDue = React.useMemo(
    () => [...due].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [due]
  )

  return (
    <Card>
      <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center shrink-0">
            <CalendarClock className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span className="truncate">Assignments</span>
        </span>
        <Button size="sm" variant="ghost" className="shrink-0 ml-auto" onClick={() => navigate({ to: '/assignments' })}>View all</Button>
      </h2>
      {loading && (
        <SkeletonList count={3} hasAvatar variant="simple" />
      )}
      {!loading && due.length === 0 && (
        <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">No upcoming assignments</div>
      )}
      {!loading && due.length > 0 && (
        <div className="space-y-2">
          {sortedDue.map((d) => {
              const open = () => {
                const rid = String(d.assignment_rest_id || extractAssignmentIdFromUrl(d.htmlUrl) || '')
                if (rid) onOpenAssignment?.(d.course_id, rid, d.name)
                else onOpenCourse?.(d.course_id)
              }
              const cid = d.course_id
              const img = courseImageUrl(cid)
              return (
                <ListItemRow
                  key={`${d.course_id}-${d.assignment_rest_id ?? d.htmlUrl ?? d.name}`}
                  icon={
                    <CourseAvatar
                      courseId={cid}
                      courseName={d.course_name}
                      src={img}
                      className="w-full h-full rounded-full"
                    />
                  }
                  title={d.name}
                  subtitle={
                    <>
                      {d.course_name && <Badge tone="brand">{d.course_name}</Badge>}
                      {d.course_name && <span className="mx-1">·</span>}
                      <span>Due {formatDateTime(d.dueAt)}{d.pointsPossible ? ` · ${d.pointsPossible} pts` : ''}</span>
                    </>
                  }
                  onClick={open}
                />
              )
            })}
        </div>
      )}
    </Card>
  )
}
