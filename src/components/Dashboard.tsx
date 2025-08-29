import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { useActivityAnnouncements } from '../hooks/useCanvasQueries'

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
  const queryClient = useQueryClient()

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


  // Prefer a precise loading flag for the Coming Up card
  const dueState = queryClient.getQueryState(['due-assignments', { days: 7 }]) as any
  const hasDue = Array.isArray(due) && due.length > 0
  const dueLoading = !hasDue && Boolean(loading || (dueState?.status === 'pending') || (dueState?.fetchStatus === 'fetching'))

  return (
    <div className="space-y-4">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Coming Up</h2>
          {dueLoading && (
            <div className="text-slate-500 dark:text-slate-400 p-4 text-sm">Loading assignments…</div>
          )}
          {!dueLoading && due.length === 0 && (
            <div className="text-slate-500 dark:text-slate-400 p-4 text-sm">No upcoming assignments</div>
          )}
          {!dueLoading && due.length > 0 && (
            <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
              {due
                .slice()
                .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                .map((d, i) => {
                  const open = () => {
                    const rid = String(d.assignment_rest_id || extractAssignmentIdFromUrl(d.htmlUrl) || '')
                    if (rid) onOpenAssignment?.(d.course_id, rid, d.name)
                    else onOpenCourse?.(d.course_id)
                  }
                  return (
                    <li className="py-1" key={i}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                        className="cursor-pointer rounded-md px-2 sm:px-3 py-2 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate hover:underline" title={d.name}>
                              {d.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {d.course_name && (
                                <span className="inline-flex items-center gap-1 mr-1.5">
                                  <Badge>{d.course_name}</Badge>
                                  <span>·</span>
                                </span>
                              )}
                              Due {new Date(d.dueAt).toLocaleString()}
                              {d.pointsPossible ? ` · ${d.pointsPossible} pts` : ''}
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
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Announcements</h2>
          {annsQ.isLoading && (
            <div className="text-slate-500 dark:text-slate-400 p-4 text-sm">Loading…</div>
          )}
          {!annsQ.isLoading && topAnnouncements.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 p-4 text-sm">No announcements</div>
          ) : (
            <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
              {topAnnouncements.map((a, i) => {
                const open = () => {
                  const tid = a.topicId ?? extractAnnouncementIdFromUrl(a.htmlUrl)
                  const cid = a.courseId ?? extractCourseIdFromUrl(a.htmlUrl)
                  if (tid && cid != null) onOpenAnnouncement?.(cid, tid, a.title)
                  else if (cid != null) onOpenCourse?.(cid)
                }
                return (
                  <li key={i} className="py-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                      className="cursor-pointer rounded-md px-2 sm:px-3 py-2 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate hover:underline" title={a.title}>{a.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedVisibleCourses.map((c) => {
              const grade = gradeForCourse(c.id)
              return (
                <Card
                  key={String(c.id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenCourse?.(c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCourse?.(c.id) } }}
                  className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{labelFor(c)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{grade != null ? `${grade}%` : '—'}</div>
                      <div className="text-xs text-slate-500">Current</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpenCourse?.(c.id) }}>Open</Button>
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
