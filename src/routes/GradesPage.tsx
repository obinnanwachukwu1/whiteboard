import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { BarChart3 } from 'lucide-react'

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

  // Image helpers
  function hashString(input: string) { let h = 0; for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i); return Math.abs(h) }
  function courseHueFor(id: string | number, fallback: string) { const key = `${id}|${fallback}`; return hashString(key) % 360 }
  function courseImageUrl(courseId?: string | number | null): string | undefined {
    if (courseId == null) return undefined
    const stored = (imgStore?.[ctx.baseUrl] || {})[String(courseId)]
    if (stored) return stored
    const info = qc.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const r of rows) { if (r.c?.id != null) ids.add(String(r.c.id)) }
    ids.forEach((id) => {
      qc.prefetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => { const res = await window.canvas.getCourseInfo?.(id); if (!res?.ok) throw new Error(res?.error || 'Failed to load course info'); return res.data || null },
        staleTime: 1000 * 60 * 60 * 24 * 7,
      }).catch(() => {})
    })
  }, [rows, qc])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <BarChart3 className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Grades</span>
        </h1>
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

      {rows.length === 0 ? (
        <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-neutral-800 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70">
          {rows.map(({ c, pct }) => {
            const img = courseImageUrl(c.id)
            const hue = courseHueFor(c.id, c.name || '')
            const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
            return (
              <li key={String(c.id)} className="py-1">
                <div className="py-3 px-3 flex items-center justify-between rounded-md transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover flex-shrink-0" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{labelFor(c)}</div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{c.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{pct != null ? `${pct}%` : '—'}</div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">{pct != null ? `${percentToGpa(pct).toFixed(2)} GPA pts` : '—'}</div>
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
