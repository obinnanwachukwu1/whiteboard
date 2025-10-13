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
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())

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
      {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
      {!isLoading && list && list.length === 0 && (
        <div className="text-slate-500 dark:text-neutral-400 text-sm">No announcements</div>
      )}
      {!isLoading && list && list.length > 0 && (
        <ul className="list-none m-0 p-0">
          {list.map((a: any, i: number) => {
            const posted = a?.posted_at ? new Date(a.posted_at).toLocaleString() : ''
            return (
              <li key={i} className="py-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(String(a.id), a?.title || 'Announcement')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(String(a.id), a?.title || 'Announcement') } }}
                  className="group cursor-pointer flex items-center justify-between gap-3 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-2 transition duration-200 ease-out hover:scale-[1.01] hover:shadow-sm hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)] relative"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a?.title || 'Announcement'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80">{posted || '—'}</span>
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
                          ref={(el) => { anchorEls.current.set(String(a.id), el) }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <Dropdown open={menuOpenId === String(a.id)} onOpenChange={(o) => setMenuOpenId(o ? String(a.id) : null)} align="right" offsetY={40} anchorEl={anchorEls.current.get(String(a.id))}>
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
