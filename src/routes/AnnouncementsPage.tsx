import React from 'react'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
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
  const queryClient = useQueryClient()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
  const annsQ = useActivityAnnouncements(200)
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [imgStore, setImgStore] = React.useState<Record<string, Record<string, string>>>({})
  React.useEffect(() => { (async () => { try { const cfg = await window.settings.get?.(); const map = (cfg?.ok ? (cfg.data as any)?.courseImages : undefined) || {}; setImgStore(map) } catch {} })() }, [])

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

  // Visual helpers
  function hashString(input: string) { let h = 0; for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i); return Math.abs(h) }
  function courseHueFor(id: string | number, fallback: string) { const key = `${id}|${fallback}`; return hashString(key) % 360 }
  function courseImageUrl(courseId?: string | number | null): string | undefined {
    if (courseId == null) return undefined
    const stored = (imgStore?.[ctx.baseUrl] || {})[String(courseId)]
    if (stored) return stored
    const info = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }

  // Prefetch course info for listed announcements (for images)
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const a of list) { if (a.courseId != null) ids.add(String(a.courseId)) }
    ids.forEach((id) => {
      queryClient.prefetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => { const res = await window.canvas.getCourseInfo?.(id); if (!res?.ok) throw new Error(res?.error || 'Failed to load course info'); return res.data || null },
        staleTime: 1000 * 60 * 60 * 24 * 7,
      }).catch(() => {})
    })
  }, [list, queryClient])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <BookOpen className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Announcements</span>
        </h1>
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
        <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-neutral-800">
          {list.map((a: any, i: number) => {
            const open = () => {
              const cid = a.courseId
              const tid = a.topicId
              if (cid != null && tid) ctx.onOpenAnnouncement(cid, String(tid), a.title)
              else if (cid != null) ctx.onOpenCourse(cid)
            }
            const img = courseImageUrl(a.courseId)
            const hue = courseHueFor(a.courseId || '', a.courseName || '')
            const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
            return (
              <li key={i} className="py-1">
                <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }} className="cursor-pointer rounded-md px-2 sm:px-3 py-2 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover flex-shrink-0" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                      <div className="min-w-0">
                        <div className="font-medium truncate" title={a.title}>{a.title}</div>
                        <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                          <Badge tone="brand">{a.courseName}</Badge>
                          <span className="mx-1">·</span>
                          <span>{a.postedAt ? new Date(a.postedAt).toLocaleString() : '—'}</span>
                        </div>
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
