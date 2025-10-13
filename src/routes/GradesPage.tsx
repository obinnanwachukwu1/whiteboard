import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { BarChart3 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '../components/ui/Badge'
import { Dropdown } from '../components/ui/Dropdown'

type GpaThreshold = { min: number; gpa: number }
const defaultGpaMap: GpaThreshold[] = [
  { min: 93, gpa: 4.0 },
  { min: 90, gpa: 3.7 },
  { min: 87, gpa: 3.3 },
  { min: 83, gpa: 3.0 },
  { min: 80, gpa: 2.7 },
  { min: 77, gpa: 2.3 },
  { min: 73, gpa: 2.0 },
  { min: 70, gpa: 1.7 },
  { min: 67, gpa: 1.3 },
  { min: 60, gpa: 1.0 },
  { min: 0, gpa: 0.0 },
]

export default function GradesPage() {
  const ctx = useAppContext()
  const navigate = useNavigate()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
  const qc = useQueryClient()
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [imgStore, setImgStore] = React.useState<Record<string, Record<string, string>>>({})
  React.useEffect(() => { (async () => { try { const cfg = await window.settings.get?.(); const map = (cfg?.ok ? (cfg.data as any)?.courseImages : undefined) || {}; setImgStore(map) } catch {} })() }, [])
  const [creditsByCourse, setCreditsByCourse] = React.useState<Record<string, number>>({})
  const [targetPctByCourse, setTargetPctByCourse] = React.useState<Record<string, string>>({})
  const [priorTotals, setPriorTotals] = React.useState<{ credits: string; gpa: string }>({ credits: '', gpa: '' })
  const [gpaMap, setGpaMap] = React.useState<GpaThreshold[]>(defaultGpaMap)
  const [viewMode, setViewMode] = React.useState<'real' | 'whatIf'>('real')
  const [semesterGoal, setSemesterGoal] = React.useState<string>('')
  const [goalCourseIds, setGoalCourseIds] = React.useState<string[]>([])
  const [planOpenByCourse, setPlanOpenByCourse] = React.useState<Record<string, boolean>>({})
  const [scenarios, setScenarios] = React.useState<Record<string, { targets: Record<string, string>; credits?: Record<string, number> }>>({})
  const [selectedScenario, setSelectedScenario] = React.useState<string>('Default')

  // Compute userKey for per-user persistence
  const userKey = React.useMemo(() => {
    const uid = (ctx?.profile as any)?.id
    return ctx?.baseUrl && uid ? `${ctx.baseUrl}|${uid}` : null
  }, [ctx?.baseUrl, (ctx?.profile as any)?.id])

  // Load per-user GPA settings (credits/targets/prior/mapping)
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const perUser = userKey ? (data.userSettings?.[userKey] || {}) : {}
        const gpa = (perUser?.gpa || data.gpa || {}) as any
        if (!mounted) return
        if (gpa.creditsByCourse && typeof gpa.creditsByCourse === 'object') setCreditsByCourse(gpa.creditsByCourse)
        if (gpa.targetPctByCourse && typeof gpa.targetPctByCourse === 'object') setTargetPctByCourse(gpa.targetPctByCourse)
        if (gpa.priorTotals && typeof gpa.priorTotals === 'object') setPriorTotals({
          credits: String((gpa.priorTotals as any).credits ?? ''),
          gpa: String((gpa.priorTotals as any).gpa ?? ''),
        })
        if (Array.isArray(gpa.mapping) && gpa.mapping.length) setGpaMap(
          gpa.mapping
            .map((r: any) => ({ min: Number(r.min ?? 0), gpa: Number(r.gpa ?? 0) }))
            .filter((r: any) => Number.isFinite(r.min) && Number.isFinite(r.gpa))
            .sort((a: any, b: any) => b.min - a.min),
        )
        if (gpa.semesterGoal != null) setSemesterGoal(String(gpa.semesterGoal))
        if (Array.isArray(gpa.goalCourseIds)) setGoalCourseIds(gpa.goalCourseIds.map(String))
        if (gpa.scenarios && typeof gpa.scenarios === 'object') {
          setScenarios(gpa.scenarios as any)
          const sel = typeof gpa.selectedScenario === 'string' && gpa.selectedScenario ? gpa.selectedScenario : 'Default'
          setSelectedScenario(sel)
          const s = (gpa.scenarios as any)[sel]
          if (s) {
            if (s.targets) setTargetPctByCourse(s.targets)
            if (s.credits) setCreditsByCourse(s.credits)
          }
        } else {
          // seed a Default scenario from current values
          setScenarios({ Default: { targets: (gpa.targetPctByCourse || {}), credits: (gpa.creditsByCourse || {}) } })
          setSelectedScenario('Default')
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [userKey])

  const persistUserGpa = React.useCallback(async (partial: Partial<{ creditsByCourse: Record<string, number>; targetPctByCourse: Record<string, string>; priorTotals: { credits: string; gpa: string }; mapping: GpaThreshold[]; semesterGoal: string | number; goalCourseIds: string[]; scenarios: Record<string, { targets: Record<string, string>; credits?: Record<string, number> }>; selectedScenario: string }>) => {
    try {
      const cfg = await window.settings.get?.()
      const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
      const map = (data.userSettings || {}) as Record<string, any>
      if (userKey) {
        const cur = map[userKey] || {}
        const nextGpa = { ...(cur.gpa || {}), ...partial }
        map[userKey] = { ...cur, gpa: nextGpa }
        await window.settings.set?.({ userSettings: map })
      } else {
        const nextGpa = { ...(data.gpa || {}), ...partial }
        await window.settings.set?.({ gpa: nextGpa } as any)
      }
    } catch {}
  }, [userKey])

  const saveScenario = React.useCallback((name: string, updater: (cur: { targets: Record<string, string>; credits?: Record<string, number> }) => { targets: Record<string, string>; credits?: Record<string, number> }) => {
    setScenarios((prev) => {
      const cur = prev[name] || { targets: {}, credits: {} }
      const nextEntry = updater(cur)
      const next = { ...prev, [name]: nextEntry }
      // persist alongside top-level for backward compat
      persistUserGpa({ scenarios: next, selectedScenario: selectedScenario, targetPctByCourse: nextEntry.targets, creditsByCourse: nextEntry.credits || {} })
      return next
    })
  }, [persistUserGpa, selectedScenario])

  // GPA mapping editor can be added later (persisted per user)

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

  // Use mapping to convert percent -> GPA
  const toGpa = React.useCallback((pct: number): number => {
    const rows = (gpaMap && gpaMap.length ? gpaMap : defaultGpaMap).slice().sort((a, b) => b.min - a.min)
    for (const r of rows) {
      if (pct >= r.min) return Math.round(r.gpa * 100) / 100
    }
    return 0
  }, [gpaMap])

  const rows = React.useMemo(() => {
    return orderedCourses
      .filter((c: any) => (courseFilter === 'all' ? true : String(c.id) === courseFilter))
      .map((c: any) => ({ c, pct: currentPercent(c.id) }))
  }, [orderedCourses, courseFilter])

  // Current GPA can be derived from `overall.current`

  // Overall current and predicted GPA using editable credits and What‑If target %
  const overall = React.useMemo(() => {
    let curCred = 0, curPts = 0
    let predCred = 0, predPts = 0
    for (const { c, pct } of rows) {
      const id = String(c.id)
      const credits = Number(creditsByCourse[id] ?? 3)
      const cur = pct != null ? toGpa(pct) : null
      const tStr = targetPctByCourse[id]
      const tNum = tStr && tStr.trim() !== '' ? parseFloat(tStr) : undefined
      const pred = (tNum != null && Number.isFinite(tNum)) ? toGpa(tNum!) : cur
      if (cur != null) { curCred += credits; curPts += credits * cur }
      if (pred != null) { predCred += credits; predPts += credits * pred }
    }
    const priorC = Number(priorTotals.credits || 0)
    const priorG = Number(priorTotals.gpa || 0)
    const semesterCurrent = curCred > 0 ? Math.round((curPts / curCred) * 100) / 100 : null
    const semesterPredicted = predCred > 0 ? Math.round((predPts / predCred) * 100) / 100 : null
    if (priorC > 0 && Number.isFinite(priorG)) {
      curPts += priorC * priorG; curCred += priorC
      predPts += priorC * priorG; predCred += priorC
    }
    const current = curCred > 0 ? Math.round((curPts / curCred) * 100) / 100 : null
    const predicted = predCred > 0 ? Math.round((predPts / predCred) * 100) / 100 : null
    return { current, predicted, semesterCurrent, semesterPredicted }
  }, [rows, creditsByCourse, targetPctByCourse, priorTotals])

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

  const [targetsOpen, setTargetsOpen] = React.useState(false)
  const targetsBtnRef = React.useRef<HTMLButtonElement | null>(null)

  const applyBulkTargets = (val: number | null) => {
    if (val == null) {
      setTargetPctByCourse(() => {
        const next: Record<string, string> = {}
        for (const c of orderedCourses) next[String(c.id)] = ''
        persistUserGpa({ targetPctByCourse: next })
        return next
      })
      return
    }
    setTargetPctByCourse((prev) => {
      const next: Record<string, string> = { ...prev }
      for (const c of orderedCourses) {
        const id = String(c.id)
        if (!next[id]) next[id] = String(val)
      }
      persistUserGpa({ targetPctByCourse: next })
      return next
    })
  }

  const copyCurrentToTargets = () => {
    setTargetPctByCourse((prev) => {
      const next: Record<string, string> = { ...prev }
      for (const { c, pct } of rows) {
        if (pct != null) next[String(c.id)] = String(pct)
      }
      persistUserGpa({ targetPctByCourse: next })
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <BarChart3 className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Grades</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge className="text-sm md:text-base font-semibold text-white" style={{ background: 'var(--app-accent-hover)' }}>
              GPA {overall && overall.current != null ? overall.current.toFixed(2) : '—'}
            </Badge>
            <Badge className="text-sm md:text-base font-semibold text-slate-800 dark:text-neutral-200" style={{ background: 'var(--app-accent-bg)' }}>
              Pred {overall && overall.predicted != null ? overall.predicted.toFixed(2) : '—'}
            </Badge>
          </div>
          <button
            ref={targetsBtnRef}
            className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
            onClick={() => setTargetsOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={targetsOpen ? 'true' : 'false'}
          >Targets</button>
          {/* Scenario selector */}
          <div className="inline-flex items-center gap-1">
            <select
              className="rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900"
              value={selectedScenario}
              onChange={(e) => {
                const name = e.target.value
                setSelectedScenario(name)
                const s = scenarios[name]
                if (s) {
                  setTargetPctByCourse(s.targets || {})
                  setCreditsByCourse(s.credits || {})
                  persistUserGpa({ selectedScenario: name, targetPctByCourse: s.targets || {}, creditsByCourse: s.credits || {} })
                } else {
                  persistUserGpa({ selectedScenario: name })
                }
              }}
            >
              {Object.keys(scenarios).length ? Object.keys(scenarios).map((n) => (
                <option key={n} value={n}>{n}</option>
              )) : <option value="Default">Default</option>}
            </select>
            <button
              className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
              onClick={() => {
                const name = prompt('New scenario name', 'New Plan')?.trim()
                if (!name) return
                setScenarios((prev) => {
                  const next = { ...prev, [name]: { targets: { ...targetPctByCourse }, credits: { ...creditsByCourse } } }
                  setSelectedScenario(name)
                  persistUserGpa({ scenarios: next, selectedScenario: name })
                  return next
                })
              }}
            >Save as</button>
            <button
              className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
              onClick={() => {
                const name = selectedScenario
                if (!name) return
                const action = prompt('Type: rename or delete', 'rename')?.toLowerCase()
                if (action === 'delete' && confirm(`Delete scenario "${name}"?`)) {
                  setScenarios((prev) => {
                    const next = { ...prev }
                    delete next[name]
                    const fallback = Object.keys(next)[0] || 'Default'
                    setSelectedScenario(fallback)
                    const s = next[fallback] || { targets: {}, credits: {} }
                    setTargetPctByCourse(s.targets || {})
                    setCreditsByCourse(s.credits || {})
                    persistUserGpa({ scenarios: next, selectedScenario: fallback, targetPctByCourse: s.targets || {}, creditsByCourse: s.credits || {} })
                    return next
                  })
                } else if (action === 'rename') {
                  const newName = prompt('Rename to', name)?.trim()
                  if (!newName || newName === name) return
                  setScenarios((prev) => {
                    const entry = prev[name]
                    const { [name]: _, ...rest } = prev
                    const next = { ...rest, [newName]: entry }
                    setSelectedScenario(newName)
                    persistUserGpa({ scenarios: next, selectedScenario: newName })
                    return next
                  })
                }
              }}
            >•••</button>
          </div>
          <Dropdown open={targetsOpen} onOpenChange={setTargetsOpen} anchorRef={targetsBtnRef}>
            <div className="py-1">
              {[
                { label: 'Set all to A (93%)', val: 93 },
                { label: 'Set all to A- (90%)', val: 90 },
                { label: 'Set all to B+ (87%)', val: 87 },
                { label: 'Set all to B (83%)', val: 83 },
              ].map((opt) => (
                <button key={opt.label} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800" onClick={() => { applyBulkTargets(opt.val); setTargetsOpen(false) }}>{opt.label}</button>
              ))}
              <div className="my-1 h-px bg-gray-100 dark:bg-neutral-800" />
              <button className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800" onClick={() => { copyCurrentToTargets(); setTargetsOpen(false) }}>Copy current → target</button>
              <button className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800" onClick={() => { applyBulkTargets(null); setTargetsOpen(false) }}>Clear targets</button>
            </div>
          </Dropdown>
          <select className="rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {orderedCourses.map((c: any) => (
              <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Intro + Goal Row */}
      <div className="text-xs text-slate-500 dark:text-neutral-400">Predicted uses your targets. GPA mapping and prior credits live in Settings → Grades.</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Semester goal card */}
        <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Set semester goal</div>
            <button className="text-xs px-2 py-0.5 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:opacity-95" onClick={() => navigate({ to: '/settings' })}>Settings</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={Number.isFinite(parseFloat(semesterGoal || '')) ? parseFloat(semesterGoal) : (overall?.semesterPredicted ?? overall?.semesterCurrent ?? 3.5)}
                onChange={(e) => { const v = e.target.value; setSemesterGoal(v); persistUserGpa({ semesterGoal: v }) }}
                className="w-full accent-[var(--app-accent-hover)]"
              />
            </div>
            <div className="w-16 text-right text-lg font-semibold">{Number.isFinite(parseFloat(semesterGoal || '')) ? Number(semesterGoal).toFixed(1) : '—'}</div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">Tip: use the Targets menu to see what gets you there.</div>
        </div>

        {/* GPA glance: Cumulative and Semester */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="rounded-card p-4 ring-1 ring-gray-200 dark:ring-neutral-800 shadow-card overflow-hidden" style={{ background: 'radial-gradient(80% 120% at 0% 0%, rgba(59,130,246,0.25), transparent), radial-gradient(80% 120% at 100% 100%, rgba(168,85,247,0.25), transparent)' }}>
            <div className="text-[11px] text-slate-600 dark:text-neutral-400 mb-1">Cumulative GPA</div>
            <div className="text-4xl md:text-5xl font-semibold tracking-tight">{overall?.current != null ? overall.current.toFixed(2) : '—'}</div>
          </div>
          <div className="rounded-card p-4 ring-1 ring-gray-200 dark:ring-neutral-800 shadow-card overflow-hidden" style={{ background: 'radial-gradient(80% 120% at 0% 0%, rgba(16,185,129,0.25), transparent), radial-gradient(80% 120% at 100% 100%, rgba(234,179,8,0.25), transparent)' }}>
            <div className="text-[11px] text-slate-600 dark:text-neutral-400 mb-1">Current Semester</div>
            <div className="text-4xl md:text-5xl font-semibold tracking-tight">{overall?.semesterCurrent != null ? overall.semesterCurrent.toFixed(2) : '—'}</div>
          </div>
        </div>
      </div>

      {/* Trend placeholder card to occupy space (optional) */}
      <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">GPA Trend</div>
          <div className="inline-flex items-center gap-2">
            <button className={`px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 ${true ? 'bg-[var(--app-accent-bg)]' : ''}`}>Cumulative</button>
            <button className={`px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10`}>Semester</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-neutral-400">Add past GPA to see a trend over time.
          <button className="ml-2 inline-flex items-center px-2 py-1 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:opacity-95" onClick={() => navigate({ to: '/settings' })}>Add past GPA</button>
        </div>
        <div className="mt-3 h-24 rounded-md bg-gradient-to-r from-transparent via-[var(--app-accent-bg)]/40 to-transparent" />
      </div>

      {/* Optional: Class Goals selection */}
      <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card">
        <div className="text-sm font-semibold mb-2">Class Goals</div>
        <div className="flex flex-wrap gap-2">
          {orderedCourses.slice(0, 12).map((course) => {
            const id = String(course.id)
            const active = goalCourseIds.includes(id)
            return (
              <button
                key={id}
                className={`px-2 py-1 text-xs rounded-full ring-1 transition ${active ? 'ring-[var(--app-accent-hover)] bg-[var(--app-accent-bg)]' : 'ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-neutral-900/70'}`}
                onClick={() => {
                  setGoalCourseIds((prev) => {
                    const set = new Set(prev)
                    if (set.has(id)) set.delete(id); else set.add(id)
                    const next = Array.from(set)
                    persistUserGpa({ goalCourseIds: next })
                    return next
                  })
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: `hsl(${courseHueFor(course.id, course.name || '')} 85% 60%)` }} />
                {labelFor(course)}
              </button>
            )
          })}
        </div>
      </div>

      {/* View mode for cards */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Class at a Glance</div>
        <div className="inline-flex rounded-md overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-800">
          <button className={`px-3 py-1 text-sm ${viewMode === 'real' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`} onClick={() => setViewMode('real')}>Real Grade</button>
          <button className={`px-3 py-1 text-sm ${viewMode === 'whatIf' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`} onClick={() => setViewMode('whatIf')}>What‑If</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ c, pct }) => {
            const img = courseImageUrl(c.id)
            const hue = courseHueFor(c.id, c.name || '')
            const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
            return (
              <div key={String(c.id)} className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3 transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-sm hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ to: '/course/$courseId', params: { courseId: String(c.id) }, search: { tab: 'grades' } })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ to: '/course/$courseId', params: { courseId: String(c.id) }, search: { tab: 'grades' } }) } }}
                >
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    {/* Avatar with radial gauge */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full" style={{
                        background: pct != null ? `conic-gradient(var(--app-accent-hover) ${Math.max(0, Math.min(100, pct)) * 3.6}deg, rgba(0,0,0,0.08) 0deg)` : 'rgba(0,0,0,0.08)'
                      }} />
                      <div className="absolute inset-1 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{labelFor(c)}</div>
                      {(labelFor(c) !== (c.name || '') && c.name) ? (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{c.name}</div>
                      ) : (c.course_code && c.course_code !== labelFor(c)) ? (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{c.course_code}</div>
                      ) : null}
                    </div>
                    <div className="text-right ml-auto">
                      {(() => {
                        const targStr = targetPctByCourse[String(c.id)]
                        const targ = targStr && targStr.trim() !== '' ? parseFloat(targStr) : undefined
                        const disp = viewMode === 'whatIf' ? (Number.isFinite(targ!) ? targ! : pct) : pct
                        return (
                          <>
                            <div className="text-2xl md:text-3xl font-semibold leading-none">{disp != null ? `${disp}%` : '—'}</div>
                            {disp != null ? (
                              <Badge className="mt-0.5 text-[11px] font-semibold text-white" style={{ background: 'var(--app-accent-hover)' }}>{toGpa(disp).toFixed(2)}</Badge>
                            ) : (
                              <span className="block h-[1.375rem]" />
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                {/* Status pill if a target is set */}
                {(() => {
                  const tStr = targetPctByCourse[String(c.id)]
                  const t = tStr && tStr.trim() !== '' ? Number(tStr) : null
                  if (pct == null || t == null || !Number.isFinite(t)) return null
                  const diff = Math.round((t - pct) * 10) / 10
                  const onTrack = diff <= 0
                  const close = diff > 0 && diff <= 5
                  const cls = onTrack
                    ? 'bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-200'
                    : close
                    ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                    : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                  return (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${cls}`}>
                        {onTrack ? 'On track' : close ? `Need +${diff}%` : `Need +${diff}%`}
                      </span>
                    </div>
                  )
                })()}
                {(() => {
                  const targStr = targetPctByCourse[String(c.id)]
                  const targ = targStr && targStr.trim() !== '' ? parseFloat(targStr) : undefined
                  const disp = viewMode === 'whatIf' ? (Number.isFinite(targ!) ? targ! : pct) : pct
                  return disp != null ? (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, disp))}%`, background: 'var(--app-accent-hover)' }} />
                  </div>
                  ) : null
                })()}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
                    onClick={() => setPlanOpenByCourse((prev) => ({ ...prev, [String(c.id)]: !prev[String(c.id)] }))}
                  >{planOpenByCourse[String(c.id)] ? 'Hide plan' : 'Plan'}</button>
                  {!planOpenByCourse[String(c.id)] && <div className="text-xs text-slate-500 dark:text-neutral-400">Targets and credits hidden</div>}
                </div>
                {planOpenByCourse[String(c.id)] && (
                <div className="mt-2 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const idStr = String(c.id)
                    const tStr = targetPctByCourse[idStr]
                    const tVal = Number.isFinite(parseFloat(tStr || '')) ? Math.max(0, Math.min(100, parseFloat(tStr!))) : (pct ?? 90)
                    const tGpa = Number.isFinite(tVal) ? toGpa(tVal) : null
                    return (
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <input
                          type="range"
                          min={50}
                          max={100}
                          step={1}
                          value={tVal}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setTargetPctByCourse((prev) => { const next = { ...prev, [idStr]: String(v) }; saveScenario(selectedScenario, (cur) => ({ ...cur, targets: { ...(cur.targets || {}), [idStr]: String(v) }, credits: cur.credits })); persistUserGpa({ targetPctByCourse: next }); return next })
                          }}
                          className="w-full accent-[var(--app-accent-hover)]"
                        />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 whitespace-nowrap">
                          Target {tVal}%{tGpa != null ? <span className="opacity-70">→ {tGpa.toFixed(2)}</span> : null}
                        </span>
                      </div>
                    )
                  })()}
                  {(() => {
                    const idStr = String(c.id)
                    const val = Math.max(1, Number(creditsByCourse[idStr] ?? 3) || 3)
                    const setVal = (nextNum: number) => {
                      const v = Math.max(1, Math.round(nextNum))
                      setCreditsByCourse((prev) => { const next = { ...prev, [idStr]: v }; saveScenario(selectedScenario, (cur) => ({ ...cur, credits: { ...(cur.credits || {}), [idStr]: v }, targets: cur.targets })); persistUserGpa({ creditsByCourse: next }); return next })
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-neutral-400">Credits</span>
                        <div className="inline-flex items-center overflow-hidden rounded-control ring-1 ring-black/10 dark:ring-white/10">
                          <button className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]" onClick={() => setVal(val - 1)}>-</button>
                          <div className="px-2 py-1 w-10 text-center text-sm bg-white/80 dark:bg-neutral-900/80">{val}</div>
                          <button className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]" onClick={() => setVal(val + 1)}>+</button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
