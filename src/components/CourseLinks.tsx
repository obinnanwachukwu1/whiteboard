import React from 'react'
// no Card wrapper; rendered within page container
import { MoreVertical, EyeOff, Link as LinkIcon } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseTabs } from '../hooks/useCanvasQueries'

type Props = {
  courseId: string | number
}

export const CourseLinks: React.FC<Props> = ({ courseId }) => {
  const { data: tabs = [], isLoading, error } = useCourseTabs(courseId, true)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())

  return (
    <div>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Course Links</h3>
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
      {!isLoading && tabs && tabs.length === 0 && (
        <div className="text-slate-500 dark:text-neutral-400 text-sm">No links</div>
      )}
      {!isLoading && tabs && tabs.length > 0 && (
        <ul className="list-none m-0 p-0">
          {tabs
            .slice()
            .sort((a: any, b: any) => (Number(a.position || 0) - Number(b.position || 0)))
            .map((t: any, i: number) => {
              const isHidden = !!t.hidden
              const url = t.html_url
              const type = (t.type || '').toLowerCase()
              return (
                <li key={i} className="py-1">
                  <div className="flex items-center justify-between gap-3 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-2 transition duration-200 ease-out hover:scale-[1.01] hover:shadow-sm hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="font-medium">{t.label || t.id}</span>
                        {type && (<span className="ml-2 text-xs text-slate-500">{type}</span>)}
                        {isHidden && (<span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80"><EyeOff className="w-3 h-3" /> hidden</span>)}
                      </div>
                    </div>
                    <div className="shrink-0 relative">
                      {url && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === String(t.id) ? null : String(t.id)) }}
                            className="inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label="More options"
                            ref={(el) => { anchorEls.current.set(String(t.id), el) }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <Dropdown open={menuOpenId === String(t.id)} onOpenChange={(o) => setMenuOpenId(o ? String(t.id) : null)} align="right" offsetY={40} anchorEl={anchorEls.current.get(String(t.id))}>
                            <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(url) }}>
                              Open in Browser
                            </button>
                          </Dropdown>
                        </>
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
