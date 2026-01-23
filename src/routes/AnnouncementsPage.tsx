import React from 'react'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'
import { BookOpen, Megaphone } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { Badge } from '../components/ui/Badge'
import { ListItemRow } from '../components/ui/ListItemRow'
import { formatDateTime } from '../utils/dateFormat'
import { SkeletonList } from '../components/Skeleton'
import { CourseAvatar } from '../components/CourseAvatar'
import { useCourseImages } from '../hooks/useCourseImages'

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
  const ctx = useAppContext()
  const { courseImageUrl, prefetchCourseImage } = useCourseImages()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
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

  // Prefetch course info for listed announcements (for images)
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const a of list) { if (a.courseId != null) ids.add(String(a.courseId)) }
    ids.forEach((id) => {
      prefetchCourseImage(id)
    })
  }, [list, prefetchCourseImage])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <BookOpen className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Announcements</span>
        </h1>
        <select className="rounded-control border px-2 py-1 text-xs sm:text-sm bg-white/90 dark:bg-neutral-900 max-w-[160px] sm:max-w-none" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="all">All Courses</option>
          {orderedCourses.map((c: any) => (
            <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
          ))}
        </select>
      </div>

      {annsQ.isLoading ? (
        <SkeletonList count={5} hasAvatar variant="row" />
      ) : list.length === 0 ? (
        <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 text-center">
          <Megaphone className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500 mb-2" />
          <div className="text-sm text-slate-500 dark:text-neutral-400">No announcements</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a: any, i: number) => {
            const open = () => {
              const cid = a.courseId
              const tid = a.topicId
              if (cid != null && tid) ctx.onOpenAnnouncement(cid, String(tid), a.title)
              else if (cid != null) ctx.onOpenCourse(cid)
            }
            const img = courseImageUrl(a.courseId)
            
            return (
              <ListItemRow
                key={i}
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
