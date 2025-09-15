import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'

function percentToGpa(pct: number): number {
  if (pct >= 93) return 4.0
  if (pct >= 90) return 3.7
  if (pct >= 87) return 3.3
  if (pct >= 83) return 3.0
  if (pct >= 80) return 2.7
  if (pct >= 77) return 2.3
  if (pct >= 73) return 2.0
  if (pct >= 70) return 1.7
  if (pct >= 67) return 1.3
  if (pct >= 60) return 1.0
  return 0.0
}

export default function GradesPage() {
  const ctx = useAppContext()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
  const qc = useQueryClient()
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

  // Prefetch gradebooks for visible courses on idle
  React.useEffect(() => {
    const list = orderedCourses.slice()
    requestIdle(() => {
      list.forEach((c: any) => {
        enqueuePrefetch(async () => {
          await qc.prefetchQuery({
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
  }, [orderedCourses, qc])

  function currentPercent(courseId: string | number): number | null {
    const data = qc.getQueryData<any>(['course-gradebook', courseId]) as any
    const groups = data?.groups || []
    const raw = data?.raw || []
    if (!groups?.length || !raw?.length) return null
    const assignments = toAssignmentInputsFromRest(raw)
    const calc = calculateCourseGrades(groups, assignments, { useWeights: 'auto', treatUngradedAsZero: true, whatIf: {} })
    const pct = calc?.current?.totals?.percent
    return typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null
  }

  const rows = React.useMemo(() => {
    return orderedCourses
      .filter((c: any) => (courseFilter === 'all' ? true : String(c.id) === courseFilter))
      .map((c: any) => ({ c, pct: currentPercent(c.id) }))
  }, [orderedCourses, courseFilter])

  const gpa = React.useMemo(() => {
    const vals = rows.map((r) => r.pct).filter((n): n is number => typeof n === 'number')
    if (!vals.length) return null
    const points = vals.map(percentToGpa)
    const avg = points.reduce((a, b) => a + b, 0) / points.length
    return Math.round(avg * 100) / 100
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Grades</h1>
        <div className="text-sm flex items-center gap-2">
          <div>Current GPA:</div>
          <div className="font-semibold">{gpa != null ? gpa.toFixed(2) : '—'}</div>
          <select className="rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {orderedCourses.map((c: any) => (
              <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-neutral-800 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70">
        {rows.length === 0 && (
          <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
        )}
        {rows.map(({ c, pct }) => (
          <div key={String(c.id)} className="py-3 px-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium truncate">{labelFor(c)}</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{c.name}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{pct != null ? `${pct}%` : '—'}</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">{pct != null ? `${percentToGpa(pct).toFixed(2)} GPA pts` : '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

