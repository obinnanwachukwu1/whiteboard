import React from 'react'
import { useAppData } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { useNavigate } from '@tanstack/react-router'
import { Dropdown, DropdownItem } from '../components/ui/Dropdown'
import { PromptModal, ConfirmModal, ActionSheetModal } from '../components/ui/Modal'
import { GpaTrends } from '../components/GpaTrends'
import { CourseGradeCard } from '../components/grades'
import type { DegreeAuditData } from '../utils/degreeAudit'
import { useCourseImages } from '../hooks/useCourseImages'
import { useCourseAvatarPreloadGate } from '../hooks/useCourseAvatarPreloadGate'
import { SkeletonCard } from '../components/Skeleton'
import { Tabs, TabsPanel } from '../components/ui/Tabs'
import { FloatingTabs, type FloatingTab } from '../components/FloatingTabs'
import { LayoutGrid, Target, TrendingUp } from 'lucide-react'
import { ListItemRow } from '../components/ui/ListItemRow'
import { CourseAvatar } from '../components/CourseAvatar'

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
  const data = useAppData()
  const navigate = useNavigate()
  const courses = data.courses || []
  const sidebar = data.sidebar
  const qc = useQueryClient()
  const { courseImageUrl } = useCourseImages()
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [creditsByCourse, setCreditsByCourse] = React.useState<Record<string, number>>({})
  const [targetPctByCourse, setTargetPctByCourse] = React.useState<Record<string, string>>({})
  const [priorTotals, setPriorTotals] = React.useState<{ credits: string; gpa: string }>({
    credits: '',
    gpa: '',
  })
  const [gpaMap, setGpaMap] = React.useState<GpaThreshold[]>(defaultGpaMap)
  const [viewMode, setViewMode] = React.useState<'real' | 'whatIf'>('real')
  const [semesterGoal, setSemesterGoal] = React.useState<string>('')
  const [scenarios, setScenarios] = React.useState<
    Record<string, { targets: Record<string, string>; credits?: Record<string, number> }>
  >({})
  const [selectedScenario, setSelectedScenario] = React.useState<string>('Default')
  const [degreeAudit, setDegreeAudit] = React.useState<DegreeAuditData | null>(null)
  type GradesTab = 'overview' | 'plan' | 'history'
  const [activeTab, setActiveTab] = React.useState<GradesTab>('overview')

  const gradeTabs = React.useMemo<FloatingTab<GradesTab>[]>(
    () => [
      { key: 'overview', label: 'Overview', Icon: LayoutGrid },
      { key: 'plan', label: 'Plan', Icon: Target },
      { key: 'history', label: 'History', Icon: TrendingUp },
    ],
    [],
  )

  // Modal states
  const [saveAsModalOpen, setSaveAsModalOpen] = React.useState(false)
  const [scenarioActionsOpen, setScenarioActionsOpen] = React.useState(false)
  const [renameModalOpen, setRenameModalOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  // Compute userKey for per-user persistence
  const userKey = React.useMemo(() => {
    const uid = (data?.profile as any)?.id
    return data?.baseUrl && uid ? `${data.baseUrl}|${uid}` : null
  }, [data?.baseUrl, (data?.profile as any)?.id])

  // Load per-user GPA settings (credits/targets/prior/mapping)
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const perUser = userKey ? data.userSettings?.[userKey] || {} : {}
        const gpa = (perUser?.gpa || data.gpa || {}) as any
        if (!mounted) return
        if (gpa.creditsByCourse && typeof gpa.creditsByCourse === 'object')
          setCreditsByCourse(gpa.creditsByCourse)
        if (gpa.targetPctByCourse && typeof gpa.targetPctByCourse === 'object')
          setTargetPctByCourse(gpa.targetPctByCourse)
        if (gpa.priorTotals && typeof gpa.priorTotals === 'object')
          setPriorTotals({
            credits: String((gpa.priorTotals as any).credits ?? ''),
            gpa: String((gpa.priorTotals as any).gpa ?? ''),
          })
        if (Array.isArray(gpa.mapping) && gpa.mapping.length)
          setGpaMap(
            gpa.mapping
              .map((r: any) => ({ min: Number(r.min ?? 0), gpa: Number(r.gpa ?? 0) }))
              .filter((r: any) => Number.isFinite(r.min) && Number.isFinite(r.gpa))
              .sort((a: any, b: any) => b.min - a.min),
          )
        if (gpa.semesterGoal != null) setSemesterGoal(String(gpa.semesterGoal))
        if (gpa.scenarios && typeof gpa.scenarios === 'object') {
          setScenarios(gpa.scenarios as any)
          const sel =
            typeof gpa.selectedScenario === 'string' && gpa.selectedScenario
              ? gpa.selectedScenario
              : 'Default'
          setSelectedScenario(sel)
          const s = (gpa.scenarios as any)[sel]
          if (s) {
            if (s.targets) setTargetPctByCourse(s.targets)
            if (s.credits) setCreditsByCourse(s.credits)
          }
        } else {
          // seed a Default scenario from current values
          setScenarios({
            Default: { targets: gpa.targetPctByCourse || {}, credits: gpa.creditsByCourse || {} },
          })
          setSelectedScenario('Default')
        }
        // Load degree audit data
        if (gpa.degreeAudit && typeof gpa.degreeAudit === 'object') {
          setDegreeAudit(gpa.degreeAudit as DegreeAuditData)
        }
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [userKey])

  const persistUserGpa = React.useCallback(
    async (
      partial: Partial<{
        creditsByCourse: Record<string, number>
        targetPctByCourse: Record<string, string>
        priorTotals: { credits: string; gpa: string }
        mapping: GpaThreshold[]
        semesterGoal: string | number
        scenarios: Record<
          string,
          { targets: Record<string, string>; credits?: Record<string, number> }
        >
        selectedScenario: string
        degreeAudit: DegreeAuditData | null
      }>,
    ) => {
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
    },
    [userKey],
  )

  const saveScenario = React.useCallback(
    (
      name: string,
      updater: (cur: { targets: Record<string, string>; credits?: Record<string, number> }) => {
        targets: Record<string, string>
        credits?: Record<string, number>
      },
    ) => {
      setScenarios((prev) => {
        const cur = prev[name] || { targets: {}, credits: {} }
        const nextEntry = updater(cur)
        const next = { ...prev, [name]: nextEntry }
        // persist alongside top-level for backward compat
        persistUserGpa({
          scenarios: next,
          selectedScenario: selectedScenario,
          targetPctByCourse: nextEntry.targets,
          creditsByCourse: nextEntry.credits || {},
        })
        return next
      })
    },
    [persistUserGpa, selectedScenario],
  )

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
            queryKey: ['course-gradebook', String(c.id)],
            queryFn: async () => {
              const [groupsRes, assignmentsRes] = await Promise.all([
                window.canvas.listAssignmentGroups(String(c.id), false),
                window.canvas.listAssignmentsWithSubmission(String(c.id), 100),
              ])
              if (!groupsRes?.ok)
                throw new Error(groupsRes?.error || 'Failed to load assignment groups')
              if (!assignmentsRes?.ok)
                throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
              return {
                groups: groupsRes.data || [],
                raw: assignmentsRes.data || [],
                assignments: [] as any[],
              }
            },
            staleTime: 1000 * 60 * 5,
          })
        })
      })
    })
  }, [orderedCourses, qc])

  function currentPercent(courseId: string | number): number | null {
    const data = qc.getQueryData<any>(['course-gradebook', String(courseId)]) as any
    const groups = data?.groups || []
    const raw = data?.raw || []
    if (!groups?.length || !raw?.length) return null
    const assignments = toAssignmentInputsFromRest(raw)
    const calc = calculateCourseGrades(groups, assignments, {
      useWeights: 'auto',
      treatUngradedAsZero: true,
      whatIf: {},
    })
    const pct = calc?.current?.totals?.percent
    return typeof pct === 'number' && Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null
  }

  // Use mapping to convert percent -> GPA
  const toGpa = React.useCallback(
    (pct: number): number => {
      const rows = (gpaMap && gpaMap.length ? gpaMap : defaultGpaMap)
        .slice()
        .sort((a, b) => b.min - a.min)
      for (const r of rows) {
        if (pct >= r.min) return Math.round(r.gpa * 100) / 100
      }
      return 0
    },
    [gpaMap],
  )

  const allRows = React.useMemo(() => {
    return orderedCourses.map((c: any) => ({ c, pct: currentPercent(c.id) }))
  }, [orderedCourses])

  const visibleRows = React.useMemo(() => {
    return allRows.filter((c: any) => (courseFilter === 'all' ? true : String(c.c.id) === courseFilter))
  }, [allRows, courseFilter])

  // Current GPA can be derived from `overall.current`

  // Overall current and predicted GPA using editable credits and What‑If target %
  // If degree audit is available, use it for prior GPA instead of manual priorTotals
  const overall = React.useMemo(() => {
    let curCred = 0,
      curPts = 0
    let predCred = 0,
      predPts = 0
    for (const { c, pct } of allRows) {
      const id = String(c.id)
      const credits = Number(creditsByCourse[id] ?? 3)
      const cur = pct != null ? toGpa(pct) : null
      const tStr = targetPctByCourse[id]
      const tNum = tStr && tStr.trim() !== '' ? parseFloat(tStr) : undefined
      const pred = tNum != null && Number.isFinite(tNum) ? toGpa(tNum!) : cur
      if (cur != null) {
        curCred += credits
        curPts += credits * cur
      }
      if (pred != null) {
        predCred += credits
        predPts += credits * pred
      }
    }
    const semesterCurrent = curCred > 0 ? Math.round((curPts / curCred) * 100) / 100 : null
    const semesterPredicted = predCred > 0 ? Math.round((predPts / predCred) * 100) / 100 : null

    // Use degree audit data if available, otherwise fall back to manual priorTotals
    let priorC = 0,
      priorG = 0
    if (degreeAudit && degreeAudit.overall.gpa != null && degreeAudit.overall.gradedCredits > 0) {
      priorC = degreeAudit.overall.gradedCredits
      priorG = degreeAudit.overall.gpa
    } else {
      priorC = Number(priorTotals.credits || 0)
      priorG = Number(priorTotals.gpa || 0)
    }

    if (priorC > 0 && Number.isFinite(priorG)) {
      curPts += priorC * priorG
      curCred += priorC
      predPts += priorC * priorG
      predCred += priorC
    }
    const current = curCred > 0 ? Math.round((curPts / curCred) * 100) / 100 : null
    const predicted = predCred > 0 ? Math.round((predPts / predCred) * 100) / 100 : null
    return {
      current,
      predicted,
      semesterCurrent,
      semesterPredicted,
      priorCredits: priorC,
      priorGpa: priorG,
    }
  }, [allRows, creditsByCourse, targetPctByCourse, priorTotals, degreeAudit])

  const imagesReady = useCourseAvatarPreloadGate(
    visibleRows.map((r) => r.c?.id),
    { enabled: visibleRows.length > 0, once: true },
  )

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
      for (const { c, pct } of allRows) {
        if (pct != null) next[String(c.id)] = String(pct)
      }
      persistUserGpa({ targetPctByCourse: next })
      return next
    })
  }

  const handleDegreeAuditChange = (data: DegreeAuditData | null) => {
    setDegreeAudit(data)
    persistUserGpa({ degreeAudit: data })
  }

  return (
    <div id="grades-content-anchor" className="relative">
      <FloatingTabs
        current={activeTab}
        onChange={setActiveTab}
        anchorId="grades-content-anchor"
        tabs={gradeTabs}
      />

      <div className="pt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Grades
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        <TabsPanel value="overview" className="space-y-4">
          <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400 mb-3">
              GPA Snapshot
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Cumulative', value: overall?.current },
                { label: 'Semester', value: overall?.semesterCurrent },
                { label: 'Predicted', value: overall?.predicted },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 mb-1">
                    {item.label}
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {item.value != null ? item.value.toFixed(2) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-lg font-semibold">Class at a Glance</div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-control border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs bg-white/90 dark:bg-neutral-900 max-w-[140px]"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="all">All Courses</option>
                {orderedCourses.map((c: any) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {labelFor(c)}
                  </option>
                ))}
              </select>
              <div className="inline-flex rounded-md overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-800">
                <button
                  className={`px-3 py-1 text-sm ${viewMode === 'real' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`}
                  onClick={() => setViewMode('real')}
                >
                  Real Grade
                </button>
                <button
                  className={`px-3 py-1 text-sm ${viewMode === 'whatIf' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`}
                  onClick={() => setViewMode('whatIf')}
                >
                  What‑If
                </button>
              </div>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
          ) : !imagesReady ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: Math.min(visibleRows.length, 9) }).map((_, i) => (
                <SkeletonCard key={i} hasAvatar lines={2} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleRows.map(({ c, pct }) => {
                const idStr = String(c.id)
                return (
                  <CourseGradeCard
                    key={idStr}
                    course={c}
                    courseLabel={labelFor(c)}
                    currentPercent={pct}
                    targetPercent={targetPctByCourse[idStr] || ''}
                    credits={Number(creditsByCourse[idStr] ?? 3) || 3}
                    viewMode={viewMode}
                    planOpen={false}
                    imageUrl={courseImageUrl(c.id)}
                    toGpa={toGpa}
                    variant="overview"
                    onNavigate={() =>
                      navigate({
                        to: '/course/$courseId',
                        params: { courseId: idStr },
                        search: { tab: 'grades' },
                      })
                    }
                    onTogglePlan={() => {}}
                    onTargetChange={() => {}}
                    onCreditsChange={() => {}}
                  />
                )
              })}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="plan" className="space-y-4">
          <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[180px]">
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mb-1">Scenario</div>
                <select
                  className="rounded-control border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs bg-white/90 dark:bg-neutral-900 w-full"
                  value={selectedScenario}
                  onChange={(e) => {
                    const name = e.target.value
                    setSelectedScenario(name)
                    const s = scenarios[name]
                    if (s) {
                      setTargetPctByCourse(s.targets || {})
                      setCreditsByCourse(s.credits || {})
                      persistUserGpa({
                        selectedScenario: name,
                        targetPctByCourse: s.targets || {},
                        creditsByCourse: s.credits || {},
                      })
                    } else {
                      persistUserGpa({ selectedScenario: name })
                    }
                  }}
                >
                  {Object.keys(scenarios).length ? (
                    Object.keys(scenarios).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))
                  ) : (
                    <option value="Default">Default</option>
                  )}
                </select>
              </div>
              <button
                className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
                onClick={() => setSaveAsModalOpen(true)}
              >
                Save as
              </button>
              <button
                className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
                onClick={() => setScenarioActionsOpen(true)}
                aria-label="Manage scenario"
              >
                •••
              </button>
              <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
                <span>Current {overall?.current != null ? overall.current.toFixed(2) : '—'}</span>
                <span>Pred {overall?.predicted != null ? overall.predicted.toFixed(2) : '—'}</span>
                <span>Semester {overall?.semesterCurrent != null ? overall.semesterCurrent.toFixed(2) : '—'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mb-1">
                  Semester goal
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.1}
                    value={
                      Number.isFinite(parseFloat(semesterGoal || ''))
                        ? parseFloat(semesterGoal)
                        : overall?.semesterPredicted ?? overall?.semesterCurrent ?? 3.5
                    }
                    onChange={(e) => {
                      setSemesterGoal(e.target.value)
                      persistUserGpa({ semesterGoal: e.target.value })
                    }}
                    className="w-full accent-[var(--app-accent-hover)]"
                  />
                  <div className="w-12 text-right text-sm font-semibold">
                    {Number.isFinite(parseFloat(semesterGoal || '')) ? Number(semesterGoal).toFixed(1) : '—'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  ref={targetsBtnRef}
                  className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
                  onClick={() => setTargetsOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={targetsOpen ? 'true' : 'false'}
                >
                  Bulk targets
                </button>
                <Dropdown open={targetsOpen} onOpenChange={setTargetsOpen} anchorRef={targetsBtnRef}>
                  <div className="py-1">
                    {[
                      { label: 'Set all to A (93%)', val: 93 },
                      { label: 'Set all to A- (90%)', val: 90 },
                      { label: 'Set all to B+ (87%)', val: 87 },
                      { label: 'Set all to B (83%)', val: 83 },
                    ].map((opt) => (
                      <DropdownItem
                        key={opt.label}
                        onClick={() => {
                          applyBulkTargets(opt.val)
                          setTargetsOpen(false)
                        }}
                      >
                        {opt.label}
                      </DropdownItem>
                    ))}
                    <div className="my-1 h-px bg-gray-100 dark:bg-neutral-800" />
                    <DropdownItem
                      onClick={() => {
                        copyCurrentToTargets()
                        setTargetsOpen(false)
                      }}
                    >
                      Copy current → target
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => {
                        applyBulkTargets(null)
                        setTargetsOpen(false)
                      }}
                    >
                      Clear targets
                    </DropdownItem>
                  </div>
                </Dropdown>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-neutral-400">
              Predicted uses your targets. GPA mapping and prior credits live in Settings → Grades.
            </div>
          </div>

          {/* Scenario Modals */}
          <PromptModal
            open={saveAsModalOpen}
            onClose={() => setSaveAsModalOpen(false)}
            onConfirm={(name) => {
              setScenarios((prev) => {
                const next = {
                  ...prev,
                  [name]: { targets: { ...targetPctByCourse }, credits: { ...creditsByCourse } },
                }
                setSelectedScenario(name)
                persistUserGpa({ scenarios: next, selectedScenario: name })
                return next
              })
            }}
            title="Save Scenario"
            message="Enter a name for this scenario"
            placeholder="Scenario name"
            defaultValue="New Plan"
            confirmLabel="Save"
          />

          <ActionSheetModal
            open={scenarioActionsOpen}
            onClose={() => setScenarioActionsOpen(false)}
            onSelect={(action) => {
              if (action === 'rename') {
                setRenameModalOpen(true)
              } else if (action === 'delete') {
                setDeleteConfirmOpen(true)
              }
            }}
            title={`Manage "${selectedScenario}"`}
            options={[
              { label: 'Rename scenario', value: 'rename' },
              { label: 'Delete scenario', value: 'delete', variant: 'danger' },
            ]}
          />

          <PromptModal
            open={renameModalOpen}
            onClose={() => setRenameModalOpen(false)}
            onConfirm={(newName) => {
              if (newName === selectedScenario) return
              setScenarios((prev) => {
                const entry = prev[selectedScenario]
                const { [selectedScenario]: _, ...rest } = prev
                const next = { ...rest, [newName]: entry }
                setSelectedScenario(newName)
                persistUserGpa({ scenarios: next, selectedScenario: newName })
                return next
              })
            }}
            title="Rename Scenario"
            message="Enter a new name for this scenario"
            placeholder="New name"
            defaultValue={selectedScenario}
            confirmLabel="Rename"
          />

          <ConfirmModal
            open={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            onConfirm={() => {
              setScenarios((prev) => {
                const next = { ...prev }
                delete next[selectedScenario]
                const fallback = Object.keys(next)[0] || 'Default'
                setSelectedScenario(fallback)
                const s = next[fallback] || { targets: {}, credits: {} }
                setTargetPctByCourse(s.targets || {})
                setCreditsByCourse(s.credits || {})
                persistUserGpa({
                  scenarios: next,
                  selectedScenario: fallback,
                  targetPctByCourse: s.targets || {},
                  creditsByCourse: s.credits || {},
                })
                return next
              })
            }}
            title="Delete Scenario"
            message={`Are you sure you want to delete "${selectedScenario}"? This cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
          />

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Plan by Course</div>
          </div>

          {allRows.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
          ) : (
            <div className="space-y-2">
              <div className="px-3 text-[11px] uppercase tracking-wide text-slate-400 dark:text-neutral-500 flex items-center justify-between">
                <span>Course</span>
                <div className="flex items-center gap-6">
                  <span className="w-16 text-right">Target</span>
                  <span className="w-20 text-right">Credits</span>
                </div>
              </div>
              {allRows.map(({ c, pct }) => {
                const idStr = String(c.id)
                const currentLabel =
                  pct != null ? `${Math.round(pct * 10) / 10}%` : '—'
                const gpaLabel = pct != null ? `${toGpa(pct).toFixed(2)} GPA` : 'No grade yet'
                const targetVal = targetPctByCourse[idStr] || ''
                return (
                  <ListItemRow
                    key={idStr}
                    density="compact"
                    className="cursor-default"
                    icon={
                      <CourseAvatar
                        courseId={c.id}
                        courseName={c.name}
                        src={courseImageUrl(c.id)}
                        className="w-8 h-8"
                      />
                    }
                    title={labelFor(c)}
                    subtitle={`${currentLabel} • ${gpaLabel}`}
                    trailing={
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={targetVal}
                          onChange={(e) => {
                            const v = e.target.value
                            setTargetPctByCourse((prev) => {
                              const next = { ...prev, [idStr]: v }
                              saveScenario(selectedScenario, (cur) => ({
                                ...cur,
                                targets: { ...(cur.targets || {}), [idStr]: v },
                                credits: cur.credits,
                              }))
                              persistUserGpa({ targetPctByCourse: next })
                              return next
                            })
                          }}
                          placeholder="—"
                          className="w-16 px-2 py-1 text-xs rounded-control border border-gray-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900 text-right"
                        />
                        <div className="inline-flex items-center overflow-hidden rounded-control ring-1 ring-black/10 dark:ring-white/10">
                          <button
                            className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]"
                            onClick={() => {
                              const val = Math.max(1, (Number(creditsByCourse[idStr] ?? 3) || 3) - 1)
                              setCreditsByCourse((prev) => {
                                const next = { ...prev, [idStr]: val }
                                saveScenario(selectedScenario, (cur) => ({
                                  ...cur,
                                  credits: { ...(cur.credits || {}), [idStr]: val },
                                  targets: cur.targets,
                                }))
                                persistUserGpa({ creditsByCourse: next })
                                return next
                              })
                            }}
                          >
                            -
                          </button>
                          <div className="px-2 py-1 w-10 text-center text-sm bg-white/80 dark:bg-neutral-900/80">
                            {Number(creditsByCourse[idStr] ?? 3) || 3}
                          </div>
                          <button
                            className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]"
                            onClick={() => {
                              const val = (Number(creditsByCourse[idStr] ?? 3) || 3) + 1
                              setCreditsByCourse((prev) => {
                                const next = { ...prev, [idStr]: val }
                                saveScenario(selectedScenario, (cur) => ({
                                  ...cur,
                                  credits: { ...(cur.credits || {}), [idStr]: val },
                                  targets: cur.targets,
                                }))
                                persistUserGpa({ creditsByCourse: next })
                                return next
                              })
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    }
                  />
                )
              })}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="history" className="space-y-4">
          <GpaTrends
            data={degreeAudit}
            onDataChange={handleDegreeAuditChange}
            semesterGoal={semesterGoal ? parseFloat(semesterGoal) : null}
            currentSemesterGpa={overall.semesterCurrent}
            predictedSemesterGpa={overall.semesterPredicted}
            currentSemesterCredits={allRows.reduce(
              (sum, { c }) => sum + Number(creditsByCourse[String(c.id)] ?? 3),
              0,
            )}
          />
        </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}
