import React from 'react'
// no Card wrapper; rendered within page container
import { ExternalLink, EyeOff, Link as LinkIcon } from 'lucide-react'
import { useCourseTabs } from '../hooks/useCanvasQueries'

type Props = {
  courseId: string | number
}

export const CourseLinks: React.FC<Props> = ({ courseId }) => {
  const { data: tabs = [], isLoading, error } = useCourseTabs(courseId, true)

  return (
    <div>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Course Links</h3>
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
                <li key={i} className="py-1">
                  <div className="flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="font-medium">{t.label || t.id}</span>
                        {type && (<span className="ml-2 text-xs text-slate-500">{type}</span>)}
                        {isHidden && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"><EyeOff className="w-3 h-3" /> hidden</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {url && (
                        <button onClick={() => window.system?.openExternal?.(url)} className="inline-flex items-center px-2.5 py-1.5 rounded-control text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
                          <ExternalLink className="w-4 h-4 mr-1" /> Open in Browser
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
