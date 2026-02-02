import React from 'react'
import { useAppData } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades, toAssignmentInputsFromRest } from '../utils/gradeCalc'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownItem } from '../components/ui/Dropdown'
import { PromptModal, ConfirmModal, ActionSheetModal } from '../components/ui/Modal'
import { GpaTrends } from '../components/GpaTrends'
import { CourseGradeCard, GpaStatsCards, SemesterGoalCard } from '../components/grades'
import type { DegreeAuditData } from '../utils/degreeAudit'
import { courseHueFor } from '../utils/colorHelpers'
import { useCourseImages } from '../hooks/useCourseImages'
import { useCourseAvatarPreloadGate } from '../hooks/useCourseAvatarPreloadGate'
import { SkeletonCard } from '../components/Skeleton'

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
  const [goalCourseIds, setGoalCourseIds] = React.useState<string[]>([])
  const [planOpenByCourse, setPlanOpenByCourse] = React.useState<Record<string, boolean>>({})
  const [scenarios, setScenarios] = React.useState<
    Record<string, { targets: Record<string, string>; credits?: Record<string, number> }>
  >({})
  const [selectedScenario, setSelectedScenario] = React.useState<string>('Default')
  const [degreeAudit, setDegreeAudit] = React.useState<DegreeAuditData | null>(null)

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
        if (Array.isArray(gpa.goalCourseIds)) setGoalCourseIds(gpa.goalCourseIds.map(String))
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
        goalCourseIds: string[]
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

  const rows = React.useMemo(() => {
    return orderedCourses
      .filter((c: any) => (courseFilter === 'all' ? true : String(c.id) === courseFilter))
      .map((c: any) => ({ c, pct: currentPercent(c.id) }))
  }, [orderedCourses, courseFilter])

  // Current GPA can be derived from `overall.current`

  // Overall current and predicted GPA using editable credits and What‑If target %
  // If degree audit is available, use it for prior GPA instead of manual priorTotals
  const overall = React.useMemo(() => {
    let curCred = 0,
      curPts = 0
    let predCred = 0,
      predPts = 0
    for (const { c, pct } of rows) {
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
  }, [rows, creditsByCourse, targetPctByCourse, priorTotals, degreeAudit])

  const imagesReady = useCourseAvatarPreloadGate(
    rows.map((r) => r.c?.id),
    { enabled: rows.length > 0, once: true },
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
      for (const { c, pct } of rows) {
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
    <div className="space-y-4">
      {/* Header - Title and GPA badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Grades
        </h1>
        <div className="flex items-center gap-2">
          <Badge
            className="text-xs sm:text-sm font-semibold text-white"
            style={{ background: 'var(--app-accent-hover)' }}
          >
            GPA {overall && overall.current != null ? overall.current.toFixed(2) : '—'}
          </Badge>
          <Badge
            className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-200"
            style={{ background: 'var(--app-accent-bg)' }}
          >
            Pred {overall && overall.predicted != null ? overall.predicted.toFixed(2) : '—'}
          </Badge>
        </div>
      </div>

      {/* Controls row - responsive wrap */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={targetsBtnRef}
          className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
          onClick={() => setTargetsOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={targetsOpen ? 'true' : 'false'}
        >
          Targets
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

        {/* Scenario selector */}
        <div className="inline-flex items-center gap-1">
          <select
            className="rounded-control border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs bg-white/90 dark:bg-neutral-900 max-w-[120px]"
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
          <button
            className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
            onClick={() => setSaveAsModalOpen(true)}
          >
            Save as
          </button>
          <button
            className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
            onClick={() => setScenarioActionsOpen(true)}
          >
            •••
          </button>
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

        {/* Course filter - pushed to end on larger screens */}
        <select
          className="rounded-control border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs bg-white/90 dark:bg-neutral-900 max-w-[140px] sm:ml-auto"
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
      </div>

      {/* Intro + Goal Row */}
      <div className="text-xs text-slate-500 dark:text-neutral-400">
        Predicted uses your targets. GPA mapping and prior credits live in Settings → Grades.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Semester goal card */}
        <SemesterGoalCard
          semesterGoal={semesterGoal}
          defaultValue={overall?.semesterPredicted ?? overall?.semesterCurrent ?? 3.5}
          onGoalChange={(v) => {
            setSemesterGoal(v)
            persistUserGpa({ semesterGoal: v })
          }}
          onNavigateSettings={() => navigate({ to: '/settings' })}
        />

        {/* GPA glance: Cumulative and Semester */}
        <GpaStatsCards
          cumulativeGpa={overall?.current ?? null}
          semesterGpa={overall?.semesterCurrent ?? null}
        />
      </div>

      {/* GPA Trends - shows trend chart, history, and allows manual/PDF entry */}
      <GpaTrends
        data={degreeAudit}
        onDataChange={handleDegreeAuditChange}
        semesterGoal={semesterGoal ? parseFloat(semesterGoal) : null}
        currentSemesterGpa={overall.semesterCurrent}
        predictedSemesterGpa={overall.semesterPredicted}
        currentSemesterCredits={rows.reduce(
          (sum, { c }) => sum + Number(creditsByCourse[String(c.id)] ?? 3),
          0,
        )}
      />

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
                    if (set.has(id)) set.delete(id)
                    else set.add(id)
                    const next = Array.from(set)
                    persistUserGpa({ goalCourseIds: next })
                    return next
                  })
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                  style={{
                    background: `hsl(${courseHueFor(course.id, course.name || '')} 85% 60%)`,
                  }}
                />
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

      {rows.length === 0 ? (
        <div className="p-3 text-sm text-slate-500 dark:text-neutral-400">No courses</div>
      ) : !imagesReady ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: Math.min(rows.length, 9) }).map((_, i) => (
            <SkeletonCard key={i} hasAvatar lines={2} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ c, pct }) => {
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
                planOpen={!!planOpenByCourse[idStr]}
                imageUrl={courseImageUrl(c.id)}
                toGpa={toGpa}
                onNavigate={() =>
                  navigate({
                    to: '/course/$courseId',
                    params: { courseId: idStr },
                    search: { tab: 'grades' },
                  })
                }
                onTogglePlan={() =>
                  setPlanOpenByCourse((prev) => ({ ...prev, [idStr]: !prev[idStr] }))
                }
                onTargetChange={(v) => {
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
                onCreditsChange={(v) => {
                  const val = Math.max(1, Math.round(v))
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
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
