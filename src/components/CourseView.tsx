import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useCourseAssignments } from '../hooks/useCanvasQueries'
import { CourseGrades } from './CourseGrades'
import { CourseModules } from './CourseModules'
import { CanvasContentView } from './CanvasContentView'
import { CourseLinks } from './CourseLinks'


type Props = {
  courseId: string | number
  courseName?: string
}

export const CourseView: React.FC<Props> = ({ courseId, courseName }) => {
  const { data: items = [], isLoading, error } = useCourseAssignments(courseId, 200)
  const showLoading = (!items || items.length === 0) && isLoading
  const [content, setContent] = React.useState<{
    contentType: 'page' | 'assignment' | 'file'
    contentId: string
    title: string
  } | null>(null)

  if (content) {
    return (
      <Card className="flex-1 overflow-hidden p-0">
        <CanvasContentView
          courseId={courseId}
          contentType={content.contentType}
          contentId={content.contentId}
          title={content.title}
          onBack={() => setContent(null)}
        />
      </Card>
    )
  }

  return (
    <Card className="flex-1 overflow-y-auto">
      <h2 className="mt-0 mb-4 text-slate-900 dark:text-slate-100 text-lg font-semibold">{courseName || 'Course'}</h2>
      <CourseGrades courseId={courseId} />
      <div className="mt-6">
        <CourseModules
          courseId={courseId}
          onOpenExternal={(url) => window.open(url, '_blank', 'noreferrer')}
          onOpenContent={(c) => setContent({ contentType: c.contentType, contentId: String(c.contentId), title: c.title })}
        />
      </div>
      <div className="mt-6">
        <CourseLinks courseId={courseId} />
      </div>
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
