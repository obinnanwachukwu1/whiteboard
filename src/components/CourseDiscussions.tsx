import React from 'react'
import { MessageCircle, MoreVertical, Pin, Lock } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseDiscussions } from '../hooks/useCanvasQueries'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import type { DiscussionTopic } from '../types/canvas'
import { useQueryClient } from '@tanstack/react-query'
import { enqueuePrefetch } from '../utils/prefetchQueue'
import { usePrefetchOnHover } from '../hooks/usePrefetchOnHover'

type Props = {
  courseId: string | number
  onOpen: (topicId: string, title: string) => void
}

const DiscussionItemRow: React.FC<{
  d: DiscussionTopic
  courseId: string | number
  onOpen: (id: string, title: string) => void
  isMenuOpen: boolean
  menuId: string
  setMenuOpenId: (id: string | null) => void
  anchorEls: React.MutableRefObject<Map<string, HTMLElement | null>>
  timeAgo: (date?: string) => string
}> = ({ d, courseId, onOpen, isMenuOpen, menuId, setMenuOpenId, anchorEls, timeAgo }) => {
  const lastActivity = d.last_reply_at || d.posted_at
  const replyCount = d.discussion_subentry_count || 0
  const unreadCount = d.unread_count || 0

  const hoverHandlers = usePrefetchOnHover({
    queryKey: ['discussion', String(courseId), String(d.id)],
    queryFn: async () => {
      const res = await window.canvas.getDiscussion?.(courseId, d.id)
      if (!res?.ok) throw new Error(res?.error || 'Failed')
      return res.data
    },
    staleTime: 1000 * 60 * 5
  })

  return (
    <ListItemRow
      {...hoverHandlers}
      icon={<MessageCircle className="w-4 h-4" />}
      title={
        <span className="flex items-center gap-1.5">
          {d.pinned && <Pin className="w-3 h-3 text-amber-500" />}
          {d.locked && <Lock className="w-3 h-3 text-slate-400" />}
          <span className={d.read_state === 'unread' ? 'font-semibold' : ''}>
            {d.title || 'Discussion'}
          </span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white">
              {unreadCount}
            </span>
          )}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-2">
          <MetadataBadge>{timeAgo(lastActivity)}</MetadataBadge>
          <span className="text-xs text-slate-400 dark:text-neutral-500">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </span>
      }
      onClick={() => onOpen(String(d.id), d.title || 'Discussion')}
      menuOpen={isMenuOpen}
      menu={
        d.html_url ? (
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
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(d.html_url!) }}>
                Open in Browser
              </button>
            </Dropdown>
          </>
        ) : undefined
      }
    />
  )
}

export const CourseDiscussions: React.FC<Props> = ({ courseId, onOpen }) => {
  const { data: list, isLoading, error } = useCourseDiscussions(courseId, 50)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())
  const queryClient = useQueryClient()

  // Auto-prefetch top 5
  React.useEffect(() => {
    if (!list || list.length === 0) return
    const top5 = list.slice(0, 5)
    
    top5.forEach((d: DiscussionTopic) => {
      enqueuePrefetch(async () => {
        await queryClient.prefetchQuery({
          queryKey: ['discussion', String(courseId), String(d.id)],
          queryFn: async () => {
            const res = await window.canvas.getDiscussion?.(courseId, d.id)
            if (!res?.ok) throw new Error(res?.error || 'Failed')
            return res.data
          },
          staleTime: 1000 * 60 * 5
        })
      })
    })
  }, [list, courseId, queryClient])

  // Format time ago
  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Discussions</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
        {!isLoading && list && list.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No discussions</div>
        )}
        {!isLoading && list && list.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-3">
            {list.map((d: DiscussionTopic, i: number) => {
              const menuId = String(d.id)
              const isMenuOpen = menuOpenId === menuId
              
              return (
                <li key={i}>
                  <DiscussionItemRow 
                    d={d}
                    courseId={courseId}
                    onOpen={onOpen}
                    isMenuOpen={isMenuOpen}
                    menuId={menuId}
                    setMenuOpenId={setMenuOpenId}
                    anchorEls={anchorEls}
                    timeAgo={timeAgo}
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

