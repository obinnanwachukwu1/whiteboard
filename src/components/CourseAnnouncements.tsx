import React from 'react'
// no Card wrapper; rendered within page container
// import { Button } from './ui/Button'
import { Megaphone, MoreVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseAnnouncementsInfinite } from '../hooks/useCanvasQueries'

type Props = {
  courseId: string | number
  onOpen: (topicId: string, title: string) => void
}

export const CourseAnnouncements: React.FC<Props> = ({ courseId, onOpen }) => {
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useCourseAnnouncementsInfinite(courseId, 10)
  const list = (data?.pages || []).flat()
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }, { rootMargin: '200px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // No global listeners; handled by Dropdown

  return (
    <div>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Announcements</h3>
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
      {!isLoading && list && list.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 text-sm">No announcements</div>
      )}
      {!isLoading && list && list.length > 0 && (
        <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
          {list.map((a: any, i: number) => {
            const posted = a?.posted_at ? new Date(a.posted_at).toLocaleString() : ''
            return (
              <li key={i} className="py-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(String(a.id), a?.title || 'Announcement')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(String(a.id), a?.title || 'Announcement') } }}
                  className="group cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors relative"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate group-hover:underline decoration-slate-300 dark:decoration-neutral-700">{a?.title || 'Announcement'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">{posted || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {a?.html_url && (
                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === String(a.id) ? null : String(a.id)) }}
                          className="inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <Dropdown open={menuOpenId === String(a.id)} onOpenChange={(o) => setMenuOpenId(o ? String(a.id) : null)} align="right" offsetY={40} style={{ right: 8 }}>
                          <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(a.html_url!) }}>
                            Open in Browser
                          </button>
                        </Dropdown>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {/* Pagination controls */}
      <div ref={sentinelRef} className="py-2 text-center text-xs text-slate-500">
        {isFetchingNextPage ? 'Loading…' : hasNextPage ? '' : ''}
      </div>
    </div>
  )
}
