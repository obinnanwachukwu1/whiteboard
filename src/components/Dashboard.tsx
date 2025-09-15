import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'
import { useAppContext } from '../context/AppContext'
import { CalendarClock, BookOpen, BarChart3 } from 'lucide-react'
//

type DueItem = {
  course_id: number | string
  course_name?: string
  name: string
  dueAt: string
  pointsPossible?: number
  htmlUrl?: string
  assignment_rest_id?: number | string
}

type Props = {
  due: DueItem[]
  loading: boolean
  courses?: Array<{ id: string | number; name: string; course_code?: string }>
  sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
  onOpenCourse?: (courseId: string | number) => void
  onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void
  onOpenAnnouncement?: (courseId: string | number, topicId: string, title: string) => void
}

export const Dashboard: React.FC<Props> = ({ due, loading, courses = [], sidebar, onOpenCourse, onOpenAssignment, onOpenAnnouncement }) => {
  const app = useAppContext()
  const queryClient = useQueryClient()

  // Persisted course image URLs per baseUrl
  const [imgStore, setImgStore] = React.useState<Record<string, Record<string, string>>>({})
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const map = (cfg?.ok ? (cfg.data as any)?.courseImages : undefined) || {}
        if (mounted) setImgStore(map)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])
  const getStoredImage = React.useCallback((courseId: string | number) => {
    const byHost = imgStore?.[app.baseUrl] || {}
    return byHost[String(courseId)]
  }, [imgStore, app.baseUrl])
  const persistImages = React.useCallback(async (entries: Array<[string | number, string]>) => {
    if (!entries.length) return
    setImgStore((prev) => {
      const byHost = { ...(prev[app.baseUrl] || {}) }
      let changed = false
      for (const [id, url] of entries) {
        if (url && byHost[String(id)] !== url) { byHost[String(id)] = url; changed = true }
      }
      if (!changed) return prev
      const next = { ...prev, [app.baseUrl]: byHost }
      // Fire-and-forget persist
      window.settings.set?.({ courseImages: next }).catch(() => {})
      return next
    })
  }, [app.baseUrl])

  const hidden = React.useMemo(() => new Set(sidebar?.hiddenCourseIds || []), [sidebar?.hiddenCourseIds])
  const orderedVisibleCourses = React.useMemo(() => {
    const all = courses.filter((c) => !hidden.has(c.id))
    const order = sidebar?.order || []
    const index = new Map(order.map((id, i) => [String(id), i]))
    return all
      .map((c) => ({ c, i: index.get(String(c.id)) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.i - b.i || String(a.c.name).localeCompare(String(b.c.name)))
      .map((x) => x.c)
  }, [courses, sidebar?.order, hidden])

  const labelFor = (c: { id: string | number; name: string; course_code?: string }) => sidebar?.customNames?.[String(c.id)] || c.course_code || c.name

  // Background prefetch small slices for dashboard cards (gradebook only; announcements use activity_stream)
  React.useEffect(() => {
    const slice = orderedVisibleCourses.slice(0, 5)
    requestIdle(() => {
      slice.forEach((c) => {
        enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-gradebook', c.id],
            queryFn: async () => {
              const [groupsRes, assignmentsRes] = await Promise.all([
                window.canvas.listAssignmentGroups(c.id, false),
                window.canvas.listAssignmentsWithSubmission(c.id, 100),
              ])
              if (!groupsRes?.ok) throw new Error(groupsRes?.error || 'Failed to load assignment groups')
              if (!assignmentsRes?.ok) throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
              return { groups: groupsRes.data || [], raw: assignmentsRes.data || [], assignments: [] as any[] }
            },
            staleTime: 1000 * 60 * 5,
          })
        })
      })
    })
  }, [orderedVisibleCourses, queryClient])

  // Prefetch course info for banners/avatars (cache long)
  // Note: annsQ defined below; keep this effect below annsQ or guard access.

  // Announcements via activity_stream (single API call)
  const annsQ = useActivityAnnouncements(20)
  const [showAllAnns, setShowAllAnns] = React.useState(false)
  const topAnnouncements = React.useMemo(() => {
    const list = annsQ.data || []
    return (showAllAnns ? list : list.slice(0, 5)).map((a: any) => {
      const cid = a?.course_id ?? (() => {
        try {
          const u = new URL(a?.html_url || '')
          const parts = u.pathname.split('/')
          const idx = parts.indexOf('courses')
          if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
        } catch {}
        return undefined
      })()
      const course = orderedVisibleCourses.find((x) => String(x.id) === String(cid))
      const tid = (() => {
        try {
          const u = new URL(a?.html_url || '')
          const parts = u.pathname.split('/')
          const idxDT = parts.indexOf('discussion_topics')
          if (idxDT >= 0 && parts[idxDT + 1]) return String(parts[idxDT + 1])
          const idxAnn = parts.indexOf('announcements')
          if (idxAnn >= 0 && parts[idxAnn + 1]) return String(parts[idxAnn + 1])
        } catch {}
        return undefined
      })()
      return {
        courseId: cid,
        courseName: course ? labelFor(course) : String(cid || 'Course'),
        title: a?.title || 'Announcement',
        postedAt: a?.created_at,
        htmlUrl: a?.html_url,
        topicId: tid,
      }
    }).filter((x) => x.courseId != null)
  }, [annsQ.data, showAllAnns, orderedVisibleCourses])

  // Prefetch course info for banners/avatars (cache long) and persist URLs
  React.useEffect(() => {
    const allIds = new Set<string | number>()
    orderedVisibleCourses.forEach((c) => allIds.add(c.id))
    // also prefetch for courses referenced by due/announcements
    due?.forEach((d) => { if (d?.course_id != null) allIds.add(d.course_id) })
    ;(annsQ.data || []).forEach((a: any) => { const id = a?.course_id ?? extractCourseIdFromUrl(a?.html_url); if (id != null) allIds.add(id) })
    requestIdle(() => {
      allIds.forEach((id) => {
        enqueuePrefetch(async () => {
          const data = await queryClient.fetchQuery({
            queryKey: ['course-info', String(id)],
            queryFn: async () => {
              const res = await window.canvas.getCourseInfo?.(String(id))
              if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
              return res.data || null
            },
            staleTime: 1000 * 60 * 60 * 24 * 7,
            gcTime: 1000 * 60 * 60 * 24 * 14,
          })
          try {
            const url = (data as any)?.image_download_url || (data as any)?.image_url
            if (url) await persistImages([[id, url]])
          } catch {}
        })
      })
    })
  }, [orderedVisibleCourses, due, annsQ.data, queryClient, persistImages])

  // Helper to get quick grade percent from cached gradebook
  function gradeForCourse(courseId: string | number): number | null {
    const data = queryClient.getQueryData<any>(['course-gradebook', courseId]) as any
    const groups = data?.groups || []
    const raw = data?.raw || []
    if (!groups?.length || !raw?.length) return null
    const assignments = toAssignmentInputsFromRest(raw)
    const calc = calculateCourseGrades(groups, assignments, { useWeights: 'auto', treatUngradedAsZero: true, whatIf: {} })
    const pct = calc?.current?.totals?.percent
    return typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null
  }

  function extractAssignmentIdFromUrl(url?: string): string | null {
    if (!url) return null
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const idx = parts.indexOf('assignments')
      if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
      return null
    } catch { return null }
  }
  function extractAnnouncementIdFromUrl(url?: string): string | null {
    if (!url) return null
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const idxDT = parts.indexOf('discussion_topics')
      if (idxDT >= 0 && parts[idxDT + 1]) return String(parts[idxDT + 1])
      const idxAnn = parts.indexOf('announcements')
      if (idxAnn >= 0 && parts[idxAnn + 1]) return String(parts[idxAnn + 1])
      return null
    } catch { return null }
  }
  function extractCourseIdFromUrl(url?: string): string | null {
    if (!url) return null
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      const idx = parts.indexOf('courses')
      if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
      return null
    } catch { return null }
  }

  function courseImageUrl(courseId: string | number | undefined | null): string | undefined {
    if (courseId == null) return undefined
    const stored = getStoredImage(courseId)
    if (stored) return stored
    const info = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }


  // Prefer a precise loading flag for the Coming Up card
  const dueState = queryClient.getQueryState(['due-assignments', { days: 7 }]) as any
  const hasDue = Array.isArray(due) && due.length > 0
  const dueLoading = !hasDue && Boolean(loading || (dueState?.status === 'pending') || (dueState?.fetchStatus === 'fetching'))
  const nextDue = React.useMemo(() => {
    if (!hasDue) return null as null | { title: string; when: string }
    const sorted = due.slice().sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    const first = sorted[0]
    return first ? { title: first.name, when: new Date(first.dueAt).toLocaleString() } : null
  }, [due, hasDue])

  const courseCount = orderedVisibleCourses.length
  const avgGrade = React.useMemo(() => {
    const vals = orderedVisibleCourses
      .map((c) => gradeForCourse(c.id))
      .filter((n) => typeof n === 'number') as number[]
    if (!vals.length) return null as number | null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round(avg * 10) / 10
  }, [orderedVisibleCourses])

  // Visual identity helpers for course cards
  function hashString(input: string) {
    let h = 0
    for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i)
    return Math.abs(h)
  }
  function courseHueFor(id: string | number, fallback: string) {
    const key = `${id}|${fallback}`
    return hashString(key) % 360
  }
  function courseInitials(name?: string, courseCode?: string) {
    const base = (courseCode || name || '').trim()
    if (!base) return '—'
    const words = base.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      const letters = words[0].replace(/[^A-Za-z0-9]/g, '')
      return letters.slice(0, 2).toUpperCase()
    }
    return (words[0][0] + words[1][0]).toUpperCase()
  }

  return (
    <div className="space-y-5">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
      {/* Quick glance stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-neutral-400">Due this week</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {dueLoading ? '—' : hasDue ? `${due.length} item${due.length === 1 ? '' : 's'}` : 'All clear'}
              </div>
              {nextDue && (
                <div className="text-xs text-slate-500 dark:text-neutral-400 truncate" title={nextDue.title}>
                  Next: {nextDue.when}
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-neutral-400">Courses</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{courseCount || '—'}</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">Visible in sidebar</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-neutral-400">Avg grade</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{avgGrade != null ? `${avgGrade}%` : '—'}</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">Across loaded courses</div>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
              <CalendarClock className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
            </span>
            <span>Coming Up</span>
          </h2>
          {dueLoading && (
            <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">Loading assignments…</div>
          )}
          {!dueLoading && due.length === 0 && (
            <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">No upcoming assignments</div>
          )}
          {!dueLoading && due.length > 0 && (
            <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-neutral-800">
              {due
                .slice()
                .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                .map((d, i) => {
                  const open = () => {
                    const rid = String(d.assignment_rest_id || extractAssignmentIdFromUrl(d.htmlUrl) || '')
                    if (rid) onOpenAssignment?.(d.course_id, rid, d.name)
                    else onOpenCourse?.(d.course_id)
                  }
                  const cid = d.course_id
                  const img = courseImageUrl(cid)
                  const hue = courseHueFor(cid, d.course_name || String(cid))
                  const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
                  return (
                    <li className="py-1" key={i}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                        className="cursor-pointer rounded-md px-2 sm:px-3 py-2 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover flex-shrink-0" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                            <div className="min-w-0">
                              <div className="font-medium truncate" title={d.name}>
                                {d.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                                {d.course_name && (
                                  <span className="inline-flex items-center gap-1 mr-1.5">
                                  <Badge tone="brand">{d.course_name}</Badge>
                                  <span>·</span>
                                  </span>
                                )}
                                Due {new Date(d.dueAt).toLocaleString()}
                                {d.pointsPossible ? ` · ${d.pointsPossible} pts` : ''}
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
        </Card>

        <Card>
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
              <BookOpen className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
            </span>
            <span>Announcements</span>
          </h2>
          {annsQ.isLoading && (
            <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">Loading…</div>
          )}
          {!annsQ.isLoading && topAnnouncements.length === 0 ? (
            <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">No announcements</div>
          ) : (
            <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-neutral-800">
              {topAnnouncements.map((a, i) => {
                const open = () => {
                  const tid = a.topicId ?? extractAnnouncementIdFromUrl(a.htmlUrl)
                  const cid = a.courseId ?? extractCourseIdFromUrl(a.htmlUrl)
                  if (tid && cid != null) onOpenAnnouncement?.(cid, tid, a.title)
                  else if (cid != null) onOpenCourse?.(cid)
                }
                const cid = a.courseId ?? extractCourseIdFromUrl(a.htmlUrl)
                const img = courseImageUrl(cid as any)
                const hue = courseHueFor(cid || '', a.courseName || '')
                const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
                return (
                  <li key={i} className="py-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                      className="cursor-pointer rounded-md px-2 sm:px-3 py-2 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover flex-shrink-0" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                          <div className="min-w-0">
                            <div className="font-medium truncate" title={a.title}>{a.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
          <div className="pt-2 text-right">
            <Button size="sm" variant="ghost" onClick={() => setShowAllAnns((v) => !v)}>
              {showAllAnns ? 'Show less' : 'View all'}
            </Button>
          </div>
        </Card>
      </div>

      {orderedVisibleCourses.length > 0 && (
        <div>
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Your Courses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderedVisibleCourses.map((c) => {
              const grade = gradeForCourse(c.id)
              const imgUrl = courseImageUrl(c.id)
              const hue = courseHueFor(c.id, c.name || String(c.id))
              const banner = imgUrl ? undefined : `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 18) % 360} 85% 50%))`
              const avatarBg = imgUrl ? undefined : `hsl(${hue} 75% 42%)`
              const initials = courseInitials(c.name, c.course_code)
              return (
                <Card
                  key={String(c.id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenCourse?.(c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCourse?.(c.id) } }}
                  className="cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:ring-black/15 dark:hover:ring-white/20"
                >
                  {/* Banner */}
                  <div
                    className="-mx-5 -mt-5 h-28 relative bg-center bg-cover"
                    style={banner ? { background: banner } : (imgUrl ? { backgroundImage: `url(${imgUrl})` } : {})}
                  >
                    {/* Dim overlay for readability when image present */}
                    {imgUrl && <div className="absolute inset-0 bg-black/20" />}
                    {grade != null && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-white/90 dark:bg-neutral-900/80 ring-1 ring-black/10 dark:ring-white/10">
                        {grade}%
                      </div>
                    )}
                    {/* Avatar overlapping bottom-left */}
                    {imgUrl ? (
                      <img
                        className="absolute -bottom-5 left-5 w-10 h-10 rounded-full ring-2 ring-white dark:ring-neutral-900 object-cover shadow"
                        src={imgUrl}
                        alt={labelFor(c)}
                      />
                    ) : (
                      <div className="absolute -bottom-5 left-5 w-10 h-10 rounded-full ring-2 ring-white dark:ring-neutral-900 flex items-center justify-center text-white text-sm font-semibold shadow" style={{ background: avatarBg }}>
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="mt-6 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{labelFor(c)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={c.name}>{c.name}</div>
                    </div>
                    <div className="shrink-0">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpenCourse?.(c.id) }}>Open</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
