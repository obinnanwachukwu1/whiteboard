import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useCourseAssignments } from '../hooks/useCanvasQueries'
import { CourseGrades } from './CourseGrades'


type Props = {
  courseId: string | number
  courseName?: string
}

export const CourseView: React.FC<Props> = ({ courseId, courseName }) => {
  const { data: items = [], isLoading, error } = useCourseAssignments(courseId, 200)
  const showLoading = (!items || items.length === 0) && isLoading

  return (
    <Card className="flex-1 overflow-y-auto">
      <h2 className="mt-0 mb-4 text-slate-900 dark:text-slate-100 text-lg font-semibold">{courseName || 'Course'}</h2>
      <CourseGrades courseId={courseId} />
      <h3 className="mt-6 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Assignments</h3>
      {showLoading && <div className="text-slate-500 dark:text-slate-400 p-2">Loading…</div>}
      {error && <div className="text-red-600 p-2">{String(error.message || error)}</div>}
      {!showLoading && !error && items.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 p-3 flex items-center gap-2">📭 <span>No assignments found</span></div>
      )}
      {!showLoading && !error && items.length > 0 && (
        <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
          {items.map((a, i) => {
            const dueStr = a.dueAt ? new Date(a.dueAt).toLocaleString() : null
            return (
              <li className="py-3" key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium leading-snug hover:text-slate-700 transition-colors dark:hover:text-slate-100/90">{a.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {a.pointsPossible ? `${a.pointsPossible} pts` : '—'}
                      {dueStr ? ` · Due ${dueStr}` : ' · No due date'}
                    </div>
                  </div>
                  {a.htmlUrl && (
                    <a className="no-underline" href={a.htmlUrl} target="_blank" rel="noreferrer">
                      <Button size="sm">Open</Button>
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
