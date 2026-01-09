import React from 'react'
import { useQueryClient, useQueries } from '@tanstack/react-query'
import { useActivityAnnouncements } from './useCanvasQueries'
import { useCourseImages } from './useCourseImages'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { extractCourseIdFromUrl } from '../utils/urlHelpers'

export type DueItem = {
  course_id: number | string
  course_name?: string
  name: string
  dueAt: string
  pointsPossible?: number
  htmlUrl?: string
  assignment_rest_id?: number | string
}

type UseDashboardDataProps = {
  courses: Array<{ id: string | number; name: string; course_code?: string }>
  sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
  due: DueItem[]
  loading: boolean
}

export function useDashboardData({ courses, sidebar, due, loading }: UseDashboardDataProps) {
  const queryClient = useQueryClient()
  const { courseImageUrl, persistImages } = useCourseImages()

  // 1. Order visible courses
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

  const labelFor = React.useCallback((c: { id: string | number; name: string; course_code?: string }) => {
    return sidebar?.customNames?.[String(c.id)] || c.course_code || c.name
  }, [sidebar?.customNames])

  // 2. Optimized Gradebook Calculation (useQueries + memoized results)
  const gradeQueries = useQueries({
    queries: orderedVisibleCourses.map((c) => ({
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
      staleTime: 1000 * 60 * 15, // 15 minutes
      enabled: true // Always try to fetch/read from cache
    }))
  })

  // Memoize the grade for each course based on the query data
  const gradesMap = React.useMemo(() => {
    const map = new Map<string, number | null>()
    
    gradeQueries.forEach((q, i) => {
      const courseId = orderedVisibleCourses[i]?.id
      if (!courseId) return
      
      const data = q.data as any
      if (!data?.groups || !data?.raw) {
        map.set(String(courseId), null)
        return
      }

      // Perform heavy calculation only when data changes
      try {
        const assignments = toAssignmentInputsFromRest(data.raw)
        const calc = calculateCourseGrades(data.groups, assignments, { useWeights: 'auto', treatUngradedAsZero: true, whatIf: {} })
        const pct = calc?.current?.totals?.percent
        const val = typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null
        map.set(String(courseId), val)
      } catch {
        map.set(String(courseId), null)
      }
    })
    return map
  }, [gradeQueries, orderedVisibleCourses])

  const gradeForCourse = React.useCallback((courseId: string | number) => {
    return gradesMap.get(String(courseId)) ?? null
  }, [gradesMap])

  // 3. Announcements
  const annsQ = useActivityAnnouncements(20)
  const topAnnouncements = React.useMemo(() => {
    const list = annsQ.data || []
    return list.slice(0, 5).map((a: any) => {
      const cid = a?.course_id ?? extractCourseIdFromUrl(a?.html_url)
      const course = orderedVisibleCourses.find((x) => String(x.id) === String(cid))
      
      // Extract topic ID
      let tid: string | undefined
      try {
        const u = new URL(a?.html_url || '')
        const parts = u.pathname.split('/')
        const idxDT = parts.indexOf('discussion_topics')
        if (idxDT >= 0 && parts[idxDT + 1]) tid = String(parts[idxDT + 1])
        const idxAnn = parts.indexOf('announcements')
        if (idxAnn >= 0 && parts[idxAnn + 1]) tid = String(parts[idxAnn + 1])
      } catch {}

      return {
        courseId: cid,
        courseName: course ? labelFor(course) : String(cid || 'Course'),
        title: a?.title || 'Announcement',
        postedAt: a?.created_at,
        htmlUrl: a?.html_url,
        topicId: tid,
      }
    }).filter((x: any) => x.courseId != null)
  }, [annsQ.data, orderedVisibleCourses, labelFor])

  // 4. Prefetch Images (Low priority)
  React.useEffect(() => {
    const allIds = new Set<string | number>()
    orderedVisibleCourses.forEach((c) => allIds.add(c.id))
    due?.forEach((d) => { if (d?.course_id != null) allIds.add(d.course_id) })
    ;(annsQ.data || []).forEach((a: any) => { 
      const id = a?.course_id ?? extractCourseIdFromUrl(a?.html_url); 
      if (id != null) allIds.add(id) 
    })

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

  // 5. Derived Stats
  const avgGrade = React.useMemo(() => {
    const vals = Array.from(gradesMap.values()).filter((n) => typeof n === 'number') as number[]
    if (!vals.length) return null as number | null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round(avg * 10) / 10
  }, [gradesMap])

  const dueState = queryClient.getQueryState(['due-assignments', { days: 7 }]) as any
  const hasDue = Array.isArray(due) && due.length > 0
  // Only show loading if we are hard-loading (no data yet).
  // If we have data (even empty), don't show loading during background refetches.
  const dueLoading = !hasDue && Boolean(loading || (dueState?.status === 'pending' && dueState?.fetchStatus === 'fetching'))

  return {
    orderedVisibleCourses,
    topAnnouncements,
    annsLoading: annsQ.isLoading,
    dueLoading,
    hasDue,
    avgGrade,
    labelFor,
    gradeForCourse,
    courseImageUrl,
  }
}
