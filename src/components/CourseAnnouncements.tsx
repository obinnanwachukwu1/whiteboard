import React from 'react'
// no Card wrapper; rendered within page container
// import { Button } from './ui/Button'
import { Megaphone, MoreVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseAnnouncementsInfinite } from '../hooks/useCanvasQueries'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Announcements</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
        {!isLoading && list && list.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No announcements</div>
        )}
        {!isLoading && list && list.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-1">
            {list.map((a: any, i: number) => {
              const posted = a?.posted_at ? new Date(a.posted_at).toLocaleString() : ''
              const menuId = String(a.id)
              const isMenuOpen = menuOpenId === menuId
              
              return (
                <li key={i}>
                  <ListItemRow
                    icon={<Megaphone className="w-4 h-4" />}
                    title={a?.title || 'Announcement'}
                    subtitle={posted && <MetadataBadge>{posted}</MetadataBadge>}
                    onClick={() => onOpen(String(a.id), a?.title || 'Announcement')}
                    menuOpen={isMenuOpen}
                    menu={
                      a?.html_url ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : menuId) }}
                            className={`inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
                            aria-label="More options"
                            ref={(el) => { anchorEls.current.set(menuId, el) }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <Dropdown open={isMenuOpen} onOpenChange={(o) => setMenuOpenId(o ? menuId : null)} align="right" offsetY={32} anchorEl={anchorEls.current.get(menuId)}>
                            <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(a.html_url!) }}>
                              Open in Browser
                            </button>
                          </Dropdown>
                        </>
                      ) : undefined
                    }
                  />
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
    </div>
  )
}
