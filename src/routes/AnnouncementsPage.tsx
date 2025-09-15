import React from 'react'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'
import { useAppContext } from '../context/AppContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Announcements</h1>
        <select className="rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="all">All Courses</option>
          {orderedCourses.map((c: any) => (
            <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
          ))}
        </select>
      </div>

      {annsQ.isLoading ? (
        <div className="text-slate-500 dark:text-neutral-400 p-2 text-sm">Loading announcements…</div>
      ) : list.length === 0 ? (
        <div className="text-slate-500 dark:text-neutral-400 p-2 text-sm">No announcements</div>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-neutral-700">
          {list.map((a: any, i: number) => {
            const open = () => {
              const cid = a.courseId
              const tid = a.topicId
              if (cid != null && tid) ctx.onOpenAnnouncement(cid, String(tid), a.title)
              else if (cid != null) ctx.onOpenCourse(cid)
            }
            return (
              <li key={i} className="py-1">
                <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }} className="cursor-pointer rounded-md px-2 sm:px-3 py-2 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate hover:underline" title={a.title}>{a.title}</div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        <Badge>{a.courseName}</Badge>
                        <span className="mx-1">·</span>
                        <span>{a.postedAt ? new Date(a.postedAt).toLocaleString() : '—'}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); open() }}>Open</Button>
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

