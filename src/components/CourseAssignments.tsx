import React from 'react'
import { FileText, Calendar, Star } from 'lucide-react'
import { useCourseAssignments } from '../hooks/useCanvasQueries'
import type { CanvasAssignment } from '../types/canvas'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import { SkeletonList } from './Skeleton'
import { formatDateTime } from '../utils/dateFormat'
import { useAIContextOffer } from '../hooks/useAIContextOffer'

type Props = {
  courseId: string | number
  courseName?: string
  onOpenDetail: (detail: { contentType: 'assignment'; contentId: string; title: string }) => void
}

export const CourseAssignments: React.FC<Props> = ({ courseId, courseName, onOpenDetail }) => {
  const assignmentsQ = useCourseAssignments(courseId, 200)
  const assignments: CanvasAssignment[] = (assignmentsQ.data || []) as CanvasAssignment[]
  const showLoading = (!assignments || assignments.length === 0) && assignmentsQ.isLoading

  const assignmentsContext = React.useMemo(() => {
    if (!assignments.length) return ''
    const sorted = [...assignments].sort((a, b) =>
      String(a?.due_at || a?.dueAt || '').localeCompare(String(b?.due_at || b?.dueAt || '')),
    )
    return sorted.slice(0, 20).map((a) => {
      const dueAt = a.due_at || a.dueAt
      const points = a.points_possible ?? a.pointsPossible
      const dueStr = dueAt ? formatDateTime(dueAt) : 'No due date'
      const pointsStr = typeof points === 'number' ? `${points} pts` : '—'
      return `- ${a.name || 'Assignment'} (Due: ${dueStr}, ${pointsStr})`
    }).join('\n')
  }, [assignments])

  const assignmentsOffer = React.useMemo(() => {
    if (!assignmentsContext) return null
    return {
      id: `course-assignments:${String(courseId)}`,
      slot: 'view' as const,
      kind: 'assignments' as const,
      title: 'Assignments',
      courseId,
      courseName,
      contentText: assignmentsContext.slice(0, 4000),
    }
  }, [assignmentsContext, courseId, courseName])

  useAIContextOffer(`course-assignments:${String(courseId)}`, assignmentsOffer)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Assignments</h3>
        {/* Optional: Add search/sort controls here later */}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {showLoading && <SkeletonList count={8} hasAvatar variant="row" />}
        {assignmentsQ.error && <div className="text-red-600 p-2">{String((assignmentsQ.error as any).message || assignmentsQ.error)}</div>}
        
        {!showLoading && !assignmentsQ.error && assignments.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 p-3 flex items-center gap-2">📭 <span>No assignments found</span></div>
        )}
        
        {!showLoading && !assignmentsQ.error && assignments.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-3 pb-4">
            {assignments.map((a) => {
              const dueAt = a.due_at || a.dueAt
              const points = a.points_possible ?? a.pointsPossible
              const dueStr = dueAt ? new Date(dueAt).toLocaleString() : null
              const restId = String((a.id ?? a._id ?? '') as any)
              const stableKey =
                restId ||
                `assignment-${String(courseId)}-${a.name || 'assignment'}-${String(dueAt || '')}`
              
              const isSubmitted = Boolean(a.submission?.submitted_at) || 
                                  a.submission?.workflow_state === 'submitted' || 
                                  a.submission?.workflow_state === 'graded' ||
                                  a.submission?.workflow_state === 'pending_review'
              
              return (
                <li key={stableKey}>
                  <ListItemRow
                    icon={<FileText className={`w-4 h-4 ${isSubmitted ? 'text-green-600 dark:text-green-400' : ''}`} />}
                    title={
                      <div className="flex items-center gap-2">
                        <span>{a.name || 'Assignment'}</span>
                        {isSubmitted && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            Done
                          </span>
                        )}
                      </div>
                    }
                    onClick={() => restId && onOpenDetail({ contentType: 'assignment', contentId: restId, title: a.name || 'Assignment' })}
                    subtitle={
                      <>
                        <MetadataBadge><Star className="w-3 h-3" /> {typeof points === 'number' ? `${points} pts` : '—'}</MetadataBadge>
                        <MetadataBadge><Calendar className="w-3 h-3" /> {dueStr ? `Due ${dueStr}` : 'No due date'}</MetadataBadge>
                      </>
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
