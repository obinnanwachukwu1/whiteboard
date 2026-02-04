import React from 'react'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'
import { Megaphone } from 'lucide-react'
import { useAppActions, useAppData } from '../context/AppContext'
import { Badge } from '../components/ui/Badge'
import { ListItemRow } from '../components/ui/ListItemRow'
import { formatDateTime } from '../utils/dateFormat'
import { SkeletonList } from '../components/Skeleton'
import { CourseAvatar } from '../components/CourseAvatar'
import { useCourseImages } from '../hooks/useCourseImages'
import { useCourseAvatarPreloadGate } from '../hooks/useCourseAvatarPreloadGate'
import { useAIContextOffer } from '../hooks/useAIContextOffer'

function extractIdFromUrl(url?: string, key?: string): string | null {
  if (!url || !key) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idx = parts.indexOf(key)
    if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
  } catch {}
  return null
}

export default function AnnouncementsPage() {
  const data = useAppData()
  const actions = useAppActions()
  const { courseImageUrl } = useCourseImages()
  const courses = data.courses || []
  const sidebar = data.sidebar
  const annsQ = useActivityAnnouncements(200)
  const [courseFilter, setCourseFilter] = React.useState<string>('all')

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

  const list = React.useMemo(() => {
    const raw = annsQ.data || []
    return raw
      .map((a: any) => {
        const cid = a?.course_id ?? extractIdFromUrl(a?.html_url, 'courses')
        const tid = extractIdFromUrl(a?.html_url, 'discussion_topics') || extractIdFromUrl(a?.html_url, 'announcements')
        const c = orderedCourses.find((x: any) => String(x.id) === String(cid))
        return { courseId: cid, courseName: c ? labelFor(c) : String(cid || 'Course'), title: a?.title || 'Announcement', postedAt: a?.created_at, htmlUrl: a?.html_url, topicId: tid }
      })
      .filter((x: any) => x.courseId != null)
      .filter((x: any) => (courseFilter === 'all' ? true : String(x.courseId) === courseFilter))
  }, [annsQ.data, orderedCourses, courseFilter, sidebar?.customNames])

  const selectedCourseName = React.useMemo(() => {
    if (courseFilter === 'all') return 'All Courses'
    const course = orderedCourses.find((c: any) => String(c.id) === courseFilter)
    if (!course) return 'Course'
    return sidebar?.customNames?.[String(course.id)] || course.course_code || course.name
  }, [courseFilter, orderedCourses, sidebar?.customNames])

  const announcementContext = React.useMemo(() => {
    if (!list.length) return ''
    return list.slice(0, 20).map((a: any) => {
      const date = formatDateTime(a.postedAt)
      const dateLabel = date && date !== '—' ? ` (${date})` : ''
      const courseLabel = a.courseName ? ` — ${a.courseName}` : ''
      return `- ${a.title}${courseLabel}${dateLabel}`
    }).join('\n')
  }, [list])

  const announcementsOffer = React.useMemo(() => {
    if (!announcementContext) return null
    return {
      id: `announcements:${courseFilter}`,
      slot: 'view' as const,
      kind: 'announcements' as const,
      title: 'Announcements',
      courseName: selectedCourseName,
      contentText: announcementContext.slice(0, 4000),
    }
  }, [announcementContext, courseFilter, selectedCourseName])

  useAIContextOffer(`announcements:${courseFilter}`, announcementsOffer)

  const imagesReady = useCourseAvatarPreloadGate(
    list.map((a: any) => a.courseId),
    { enabled: !annsQ.isLoading && list.length > 0, once: true }
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Announcements</h1>
        <select className="rounded-control border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs sm:text-sm bg-white/90 dark:bg-neutral-900 max-w-[160px] sm:max-w-none" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="all">All Courses</option>
          {orderedCourses.map((c: any) => (
            <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
          ))}
        </select>
      </div>

      {annsQ.isLoading || (!imagesReady && list.length > 0) ? (
        <SkeletonList count={5} hasAvatar variant="row" />
      ) : list.length === 0 ? (
        <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 text-center">
          <Megaphone className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500 mb-2" />
          <div className="text-sm text-slate-500 dark:text-neutral-400">No announcements</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a: any) => {
            const open = () => {
              const cid = a.courseId
              const tid = a.topicId
              if (cid != null && tid) actions.onOpenAnnouncement(cid, String(tid), a.title)
              else if (cid != null) actions.onOpenCourse(cid)
            }
            const img = courseImageUrl(a.courseId)
            
            return (
              <ListItemRow
                key={`${a.courseId ?? 'course'}-${a.topicId ?? a.htmlUrl ?? a.title}`}
                icon={
                  <CourseAvatar
                    courseId={a.courseId || ''}
                    courseName={a.courseName}
                    src={img}
                    className="w-full h-full rounded-full"
                  />
                }
                title={a.title}
                subtitle={
                  <>
                    <Badge tone="brand">{a.courseName}</Badge>
                    <span className="mx-1">·</span>
                    <span>{formatDateTime(a.postedAt)}</span>
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
