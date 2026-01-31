import React from 'react'
// no Card wrapper; rendered within page container
// import { Button } from './ui/Button'
import { Megaphone, MoreVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseAnnouncementsInfinite } from '../hooks/useCanvasQueries'
import { ListItemRow } from './ui/ListItemRow'
import { SkeletonList } from './Skeleton'
import { MetadataBadge } from './ui/MetadataBadge'
import { useQueryClient } from '@tanstack/react-query'
import { enqueuePrefetch } from '../utils/prefetchQueue'
import { usePrefetchOnHover } from '../hooks/usePrefetchOnHover'

type Props = {
  courseId: string | number
  onOpen: (topicId: string, title: string) => void
}

const AnnouncementItem: React.FC<{ 
  a: any, 
  onOpen: (id: string, title: string) => void 
  courseId: string | number
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  anchorEls: React.MutableRefObject<Map<string, HTMLElement | null>>
}> = ({ a, onOpen, courseId, menuOpenId, setMenuOpenId, anchorEls }) => {
  const posted = a?.posted_at ? new Date(a.posted_at).toLocaleString() : ''
  const menuId = String(a.id)
  const isMenuOpen = menuOpenId === menuId

  // Hover prefetch for this specific item
  const hoverHandlers = usePrefetchOnHover({
    queryKey: ['announcement', String(courseId), String(a.id)],
    queryFn: async () => {
      const res = await window.canvas.getAnnouncement?.(courseId, a.id)
      if (!res?.ok) throw new Error(res?.error || 'Failed')
      return res.data
    },
    staleTime: 1000 * 60 * 5
  })

  return (
    <ListItemRow
      interactiveProps={hoverHandlers}
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
  )
}

const MAX_RENDER = 200

export const CourseAnnouncements: React.FC<Props> = ({ courseId, onOpen }) => {
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useCourseAnnouncementsInfinite(courseId, 10)
  const allItems = React.useMemo(() => (data?.pages || []).flat(), [data])
  // Track whether user wants to see all items
  const [showAll, setShowAll] = React.useState(false)
  // Bound DOM: only render the most recent MAX_RENDER items (slice from end to keep newest)
  const list = React.useMemo(() => {
    if (showAll || allItems.length <= MAX_RENDER) return allItems
    // Keep most recent items (end of array since API returns oldest first typically,
    // but if API returns newest first, this still works - we show the first MAX_RENDER)
    // Actually, the infinite query appends pages, so most recent are at the start
    // So slice(0, MAX_RENDER) is correct for newest-first APIs
    // But to be safe for oldest-first APIs, we should slice from end
    // Let's slice from end to keep most recent regardless of API order
    return allItems.slice(-MAX_RENDER)
  }, [allItems, showAll])
  const hiddenCount = allItems.length - list.length
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())
  const queryClient = useQueryClient()

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

  // Prefetch top 5 announcements automatically
  React.useEffect(() => {
    if (!list || list.length === 0) return
    const top5 = list.slice(0, 5)
    
    top5.forEach((a: any) => {
      enqueuePrefetch(async () => {
        await queryClient.prefetchQuery({
          queryKey: ['announcement', String(courseId), String(a.id)],
          queryFn: async () => {
            const res = await window.canvas.getAnnouncement?.(courseId, a.id)
            if (!res?.ok) throw new Error(res?.error || 'Failed')
            return res.data
          },
          staleTime: 1000 * 60 * 5
        })
      })
    })
  }, [list && list.length > 0]) // Only run when list loads

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Announcements</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <SkeletonList count={6} hasAvatar variant="row" />}
        {!isLoading && list && list.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No announcements</div>
        )}
        {!isLoading && list && list.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-3">
            {list.map((a: any) => (
              <li key={String(a.id)}>
                <AnnouncementItem 
                  a={a} 
                  courseId={courseId}
                  onOpen={onOpen}
                  menuOpenId={menuOpenId}
                  setMenuOpenId={setMenuOpenId}
                  anchorEls={anchorEls}
                />
              </li>
            ))}
          </ul>
        )}
        {/* Show older button when items are hidden */}
        {hiddenCount > 0 && !showAll && (
          <div className="py-2 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Show {hiddenCount} older announcements
            </button>
          </div>
        )}
        {/* Pagination sentinel for infinite scroll */}
        <div ref={sentinelRef} className="py-2 text-center text-xs text-slate-500">
          {isFetchingNextPage ? 'Loading…' : ''}
        </div>
      </div>
    </div>
  )
}
