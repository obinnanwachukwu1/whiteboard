import React from 'react'
import { Card } from './ui/Card'
import { ExternalLink, EyeOff, Link as LinkIcon } from 'lucide-react'
import { useCourseTabs } from '../hooks/useCanvasQueries'

type Props = {
  courseId: string | number
}

export const CourseLinks: React.FC<Props> = ({ courseId }) => {
  const { data: tabs = [], isLoading, error } = useCourseTabs(courseId, true)

  return (
    <Card>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Course Links</h3>
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
      {!isLoading && tabs && tabs.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 text-sm">No links</div>
      )}
      {!isLoading && tabs && tabs.length > 0 && (
        <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
          {tabs
            .slice()
            .sort((a: any, b: any) => (Number(a.position || 0) - Number(b.position || 0)))
            .map((t: any, i: number) => {
              const isHidden = !!t.hidden
              const url = t.html_url
              const type = (t.type || '').toLowerCase()
              return (
                <li key={i} className="py-2 px-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="w-4 h-4" />
                      <div className="truncate">
                        <span className="font-medium">{t.label || t.id}</span>
                        {type && (<span className="ml-2 text-xs text-slate-500">{type}</span>)}
                        {isHidden && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500"><EyeOff className="w-3 h-3" /> hidden</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" className="text-slate-600 dark:text-slate-300 text-sm inline-flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" /> Open
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
        </ul>
      )}
    </Card>
  )
}

