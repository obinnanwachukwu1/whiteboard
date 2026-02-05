import React from 'react'
import { ClipboardCheck, Calendar, Star } from 'lucide-react'
import { useCourseQuizzes } from '../hooks/useCanvasQueries'
import type { CanvasQuiz } from '../types/canvas'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import { SkeletonList } from './Skeleton'
import { formatDateTime } from '../utils/dateFormat'

type Props = {
  courseId: string | number
  courseName?: string
  onOpenDetail: (detail: { contentType: 'quiz'; contentId: string; title: string }) => void
}

export const CourseQuizzes: React.FC<Props> = ({ courseId, onOpenDetail }) => {
  const quizzesQ = useCourseQuizzes(courseId, 100)
  const quizzes: CanvasQuiz[] = (quizzesQ.data || []) as CanvasQuiz[]
  const showLoading = (!quizzes || quizzes.length === 0) && quizzesQ.isLoading

  const sorted = React.useMemo(() => {
    const list = [...quizzes]
    list.sort((a, b) => String(a?.due_at || '').localeCompare(String(b?.due_at || '')))
    return list
  }, [quizzes])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Quizzes</h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {showLoading && <SkeletonList count={8} hasAvatar variant="row" />}
        {quizzesQ.error && (
          <div className="text-red-600 p-2">
            {String((quizzesQ.error as any).message || quizzesQ.error)}
          </div>
        )}

        {!showLoading && !quizzesQ.error && sorted.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 p-3">No quizzes found</div>
        )}

        {!showLoading && !quizzesQ.error && sorted.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-3 pb-4">
            {sorted.map((q) => {
              const dueAt = q.due_at
              const points = q.points_possible ?? null
              const dueStr = dueAt ? formatDateTime(dueAt) : null
              const quizId = String(q.isNewQuiz ? q.assignment_id || q.id || '' : q.id || '')
              const title = q.title || 'Quiz'
              const stableKey = quizId || `${String(courseId)}-${title}-${String(dueAt || '')}`

              return (
                <li key={stableKey}>
                  <ListItemRow
                    icon={<ClipboardCheck className="w-4 h-4" />}
                    title={title}
                    onClick={() => quizId && onOpenDetail({ contentType: 'quiz', contentId: quizId, title })}
                    subtitle={
                      <>
                        <MetadataBadge>
                          <Star className="w-3 h-3" />{' '}
                          {typeof points === 'number' ? `${points} pts` : '—'}
                        </MetadataBadge>
                        <MetadataBadge>
                          <Calendar className="w-3 h-3" /> {dueStr ? `Due ${dueStr}` : 'No due date'}
                        </MetadataBadge>
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
