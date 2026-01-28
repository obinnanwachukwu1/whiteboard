import React from 'react'
import { useCourses } from '../hooks/useCanvasQueries'
import { useQueries } from '@tanstack/react-query'
import { BookOpen, MessageCircle, Pin, Lock, Search } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { Badge } from '../components/ui/Badge'
import { ListItemRow } from '../components/ui/ListItemRow'
import { SkeletonList } from '../components/Skeleton'
import type { DiscussionTopic } from '../types/canvas'
import { CourseAvatar } from '../components/CourseAvatar'
import { useCourseImages } from '../hooks/useCourseImages'

export default function DiscussionsPage() {
  const ctx = useAppContext()
  const { courseImageUrl, prefetchCourseImage } = useCourseImages()
  const coursesQ = useCourses()
  const courses = ctx.courses || coursesQ.data || []
  const sidebar = ctx.sidebar
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const orderedCourses = React.useMemo(() => {
    const hidden = new Set(sidebar?.hiddenCourseIds || [])
    const all = courses.filter((c: any) => !hidden.has(c.id))
    const order = sidebar?.order || []
    const index = new Map(order.map((id, i) => [String(id), i]))
    return all
      .map((c: any) => ({ c, i: index.get(String(c.id)) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.i - b.i || String(a.c.name).localeCompare(String(b.c.name)))
      .map((x) => x.c)
  }, [courses, sidebar?.order, sidebar?.hiddenCourseIds])

  const labelFor = (c: any) => sidebar?.customNames?.[String(c.id)] || c.course_code || c.name

  // Fetch discussions for all visible courses
  const coursesToFetch = courseFilter === 'all' 
    ? orderedCourses.map((c: any) => String(c.id))
    : [courseFilter]

  // Construct safe query params matching the hook's normalization logic
  const queryParams: any = {}
  if (debouncedSearch?.trim()) queryParams.searchTerm = debouncedSearch.trim()
  // When showing all courses without search, limit pages to avoid flooding
  if (courseFilter === 'all' && !queryParams.searchTerm) {
    queryParams.maxPages = 2 // Fetch recent items only
  }

  const queries = useQueries({
    queries: coursesToFetch.map((courseId) => ({
      queryKey: ['course-discussions', courseId, 50, queryParams],
      queryFn: async () => {
        const res = await window.canvas.listCourseDiscussions?.(courseId, {
          perPage: 50,
          ...queryParams
        })
        if (!res?.ok) throw new Error(res?.error || 'Failed to load discussions')
        return res.data || []
      },
      staleTime: 1000 * 60 * 5,
    }))
  })

  // Show the full-page skeleton only when we have no cached data at all.
  // Otherwise, render whatever is already cached and let the rest fill in.
  const isHardLoading = queries.every((q) => q.isLoading && !q.data)
  const isBackgroundFetching = !isHardLoading && queries.some((q) => q.isFetching && !q.data)

  const allDiscussions = React.useMemo(() => {
    const results: Array<DiscussionTopic & { courseId: string; courseName: string }> = []
    
    queries.forEach((q, i) => {
      if (q.data && Array.isArray(q.data)) {
        const courseId = coursesToFetch[i]
        const course = orderedCourses.find((c: any) => String(c.id) === courseId)
        const courseName = course ? labelFor(course) : courseId
        for (const d of q.data) {
          results.push({ ...d, courseId, courseName })
        }
      }
    })

    // Sort by last activity
    results.sort((a, b) => {
      const aDate = a.last_reply_at || a.posted_at || ''
      const bDate = b.last_reply_at || b.posted_at || ''
      return bDate.localeCompare(aDate)
    })
    
    return results
  }, [queries, coursesToFetch, orderedCourses])

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

  // Prefetch course info for images
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const d of allDiscussions) {
      if (d.courseId != null) ids.add(String(d.courseId))
    }
    ids.forEach((id) => {
      prefetchCourseImage(id)
    })
  }, [allDiscussions, prefetchCourseImage])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <BookOpen className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Discussions</span>
        </h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search all courses..." 
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-100 dark:bg-neutral-800 border-none rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="rounded-control border px-2 py-1 text-xs sm:text-sm bg-white/90 dark:bg-neutral-900 max-w-[160px] sm:max-w-none"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            {orderedCourses.map((c: any) => (
              <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {isHardLoading ? (
        <SkeletonList count={5} hasAvatar variant="row" />
      ) : allDiscussions.length === 0 ? (
        <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 text-center">
          <MessageCircle className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500 mb-2" />
          <div className="text-sm text-slate-500 dark:text-neutral-400">No discussions</div>
        </div>
      ) : (
        <div className="space-y-2">
          {isBackgroundFetching && (
            <div className="text-xs text-slate-500 dark:text-neutral-400 px-1">Loading more courses…</div>
          )}
          {allDiscussions.map((d, i) => {
            const open = () => {
              if (d.courseId != null) {
                ctx.onOpenDiscussion?.(d.courseId, String(d.id), d.title)
              }
            }
            const img = courseImageUrl(d.courseId)
            const lastActivity = d.last_reply_at || d.posted_at
            const replyCount = d.discussion_subentry_count || 0
            const unreadCount = d.unread_count || 0

            return (
              <ListItemRow
                key={`${d.courseId}-${d.id}-${i}`}
                icon={
                  <CourseAvatar
                    courseId={d.courseId}
                    courseName={d.courseName}
                    src={img}
                    className="w-full h-full rounded-full ring-1 ring-black/10 dark:ring-white/10"
                  />
                }
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
                  <>
                    <Badge tone="brand">{d.courseName}</Badge>
                    <span className="mx-1">·</span>
                    <span>{timeAgo(lastActivity)}</span>
                    <span className="mx-1">·</span>
                    <span className="text-slate-400">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                  </>
                }
                onClick={open}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
