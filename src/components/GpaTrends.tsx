import React from 'react'
import {
  Upload,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  PenLine,
  Plus,
  X,
  TrendingUp,
  Target,
  History,
  Check,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { extractTextFromPdf } from '../utils/pdfTextExtract'
import {
  parseDegreeAudit,
  computeCourseMetrics,
  type DegreeAuditData,
  type TermSummary,
  type CourseWithMetrics,
  type RawCourse,
  type GradeConfig,
  DEFAULT_GRADE_CONFIG,
  EDITABLE_GRADES,
} from '../utils/degreeAudit'

type Props = {
  data: DegreeAuditData | null
  onDataChange: (data: DegreeAuditData | null) => void
  semesterGoal?: number | null
  currentSemesterGpa?: number | null
  predictedSemesterGpa?: number | null
  currentSemesterCredits?: number | null
  config?: GradeConfig
  className?: string
}

type EntryMode = 'choose' | 'upload' | 'manual'
type ViewMode = 'view' | 'edit'
type TabView = 'trend' | 'history'

// Editable course entry
interface EditableCourse {
  id: string
  course: string
  grade: string
  credits: string
}

// Editable term with courses
interface EditableTerm {
  id: string
  term: string
  courses: EditableCourse[]
  isExpanded: boolean
}

// Generate unique IDs
let idCounter = 0
const genId = () => `id_${++idCounter}_${Date.now()}`

export const GpaTrends: React.FC<Props> = ({
  data,
  onDataChange,
  semesterGoal,
  currentSemesterGpa,
  predictedSemesterGpa,
  currentSemesterCredits,
  config = DEFAULT_GRADE_CONFIG,
  className = '',
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [entryMode, setEntryMode] = React.useState<EntryMode>('choose')
  const [viewMode, setViewMode] = React.useState<ViewMode>('view')
  const [activeTab, setActiveTab] = React.useState<TabView>('trend')
  const [expandedTerms, setExpandedTerms] = React.useState<Set<string>>(new Set())
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Edit state - course-level editing
  const [editTerms, setEditTerms] = React.useState<EditableTerm[]>([])

  // Reset entry mode when data changes externally
  React.useEffect(() => {
    if (data && viewMode !== 'edit') {
      setEntryMode('choose')
    }
  }, [data, viewMode])

  /** Parse term string to a sortable number (e.g., "Fall 2023" -> 20233) */
  const termToSortKey = (term: string): number => {
    const match = term.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/)
    if (!match) return 0
    const season = match[1]
    const year = parseInt(match[2], 10)
    const seasonOrder: Record<string, number> = { Spring: 1, Summer: 2, Fall: 3, Winter: 4 }
    return year * 10 + (seasonOrder[season] || 0)
  }

  // Initialize edit form from existing data
  const initEditForm = () => {
    if (!data) {
      // Start with one empty term
      setEditTerms([
        {
          id: genId(),
          term: '',
          courses: [{ id: genId(), course: '', grade: 'A', credits: '3' }],
          isExpanded: true,
        },
      ])
      return
    }

    // Convert existing data to editable format
    const terms: EditableTerm[] = data.terms.map((t) => ({
      id: genId(),
      term: t.term,
      courses:
        t.courses.length > 0
          ? t.courses.map((c) => ({
              id: genId(),
              course: c.course,
              grade: c.effectiveGrade || c.grade,
              credits: String(c.credits),
            }))
          : [{ id: genId(), course: '', grade: 'A', credits: '3' }],
      isExpanded: false,
    }))

    // If no terms, add an empty one
    if (terms.length === 0) {
      terms.push({
        id: genId(),
        term: '',
        courses: [{ id: genId(), course: '', grade: 'A', credits: '3' }],
        isExpanded: true,
      })
    }

    setEditTerms(terms)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const text = await extractTextFromPdf(file)
      const parsed = parseDegreeAudit(text, config)

      if (parsed.courses.length === 0) {
        setError('No courses found in the PDF. Make sure this is a degree audit export.')
        setIsLoading(false)
        return
      }

      onDataChange({ ...parsed, source: 'pdf' })
    } catch (err) {
      console.error('Failed to parse degree audit:', err)
      const msg = err instanceof Error ? err.message : 'Failed to parse PDF. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Build DegreeAuditData from editable terms
  const buildDataFromEditTerms = (): DegreeAuditData | null => {
    // Filter valid terms and courses
    const validTerms = editTerms.filter((t) => t.term.trim())

    if (validTerms.length === 0) {
      setError('Please add at least one semester')
      return null
    }

    const allCourses: CourseWithMetrics[] = []
    const terms: TermSummary[] = []

    for (const et of validTerms) {
      const termCourses: CourseWithMetrics[] = []

      for (const ec of et.courses) {
        if (!ec.course.trim()) continue

        const credits = parseFloat(ec.credits) || 0
        if (credits <= 0) continue

        const rawCourse: RawCourse = {
          course: ec.course.trim(),
          grade: ec.grade,
          credits,
          term: et.term.trim(),
        }

        const withMetrics = computeCourseMetrics(rawCourse, config)
        termCourses.push(withMetrics)
        allCourses.push(withMetrics)
      }

      // Calculate term GPA
      let gradedCredits = 0
      let qualityPoints = 0
      for (const c of termCourses) {
        if (c.gradePoints !== null) {
          gradedCredits += c.credits
          qualityPoints += c.weightedCredits
        }
      }

      terms.push({
        term: et.term.trim(),
        courses: termCourses,
        gradedCredits,
        gpa: gradedCredits > 0 ? Math.round((qualityPoints / gradedCredits) * 100) / 100 : null,
        sortKey: termToSortKey(et.term.trim()),
      })
    }

    // Sort terms chronologically
    terms.sort((a, b) => a.sortKey - b.sortKey)

    // Calculate overall GPA
    let totalGradedCredits = 0
    let totalQualityPoints = 0
    for (const c of allCourses) {
      if (c.gradePoints !== null) {
        totalGradedCredits += c.credits
        totalQualityPoints += c.weightedCredits
      }
    }

    return {
      courses: allCourses,
      terms,
      overall: {
        gradedCredits: totalGradedCredits,
        gpa:
          totalGradedCredits > 0
            ? Math.round((totalQualityPoints / totalGradedCredits) * 100) / 100
            : null,
      },
      uploadedAt: new Date().toISOString(),
      source: 'manual',
    }
  }

  const handleSaveEdit = () => {
    const newData = buildDataFromEditTerms()
    if (newData) {
      onDataChange(newData)
      setViewMode('view')
      setError(null)
    }
  }

  const handleClear = () => {
    onDataChange(null)
    setExpandedTerms(new Set())
    setEditTerms([])
    setEntryMode('choose')
    setViewMode('view')
  }

  const toggleTerm = (term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev)
      if (next.has(term)) next.delete(term)
      else next.add(term)
      return next
    })
  }

  // Edit term handlers
  const addTerm = () => {
    setEditTerms((prev) => [
      ...prev,
      {
        id: genId(),
        term: '',
        courses: [{ id: genId(), course: '', grade: 'A', credits: '3' }],
        isExpanded: true,
      },
    ])
  }

  const removeTerm = (termId: string) => {
    setEditTerms((prev) => prev.filter((t) => t.id !== termId))
  }

  const updateTermName = (termId: string, name: string) => {
    setEditTerms((prev) => prev.map((t) => (t.id === termId ? { ...t, term: name } : t)))
  }

  const toggleTermExpanded = (termId: string) => {
    setEditTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, isExpanded: !t.isExpanded } : t))
    )
  }

  const addCourse = (termId: string) => {
    setEditTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? {
              ...t,
              courses: [...t.courses, { id: genId(), course: '', grade: 'A', credits: '3' }],
            }
          : t
      )
    )
  }

  const removeCourse = (termId: string, courseId: string) => {
    setEditTerms((prev) =>
      prev.map((t) =>
        t.id === termId ? { ...t, courses: t.courses.filter((c) => c.id !== courseId) } : t
      )
    )
  }

  const updateCourse = (
    termId: string,
    courseId: string,
    field: keyof EditableCourse,
    value: string
  ) => {
    setEditTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? {
              ...t,
              courses: t.courses.map((c) => (c.id === courseId ? { ...c, [field]: value } : c)),
            }
          : t
      )
    )
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
    } catch {
      return '—'
    }
  }

  // Grade color helper
  const gradeColor = (grade: string | null) => {
    if (!grade) return 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
    const first = grade[0]
    if (first === 'A')
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
    if (first === 'B') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    if (first === 'C') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    if (first === 'D')
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    if (first === 'F') return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
    return 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
  }

  // Build chart data points
  const chartData = React.useMemo(() => {
    if (!data?.terms.length) return []

    // Calculate running cumulative GPA
    let totalCredits = 0
    let totalPoints = 0
    const points: Array<{
      term: string
      termGpa: number | null
      cumulativeGpa: number | null
      credits: number
      type: 'historical' | 'current' | 'predicted'
    }> = []

    for (const term of data.terms) {
      if (term.gpa !== null && term.gradedCredits > 0) {
        totalCredits += term.gradedCredits
        totalPoints += term.gpa * term.gradedCredits
      }
      points.push({
        term: term.term,
        termGpa: term.gpa,
        cumulativeGpa: totalCredits > 0 ? totalPoints / totalCredits : null,
        credits: term.gradedCredits,
        type: 'historical',
      })
    }

    const semCredits = currentSemesterCredits ?? 15

    // Add current semester actual if available
    if (currentSemesterGpa !== null && currentSemesterGpa !== undefined) {
      const currentCumulative =
        totalCredits > 0
          ? (totalPoints + currentSemesterGpa * semCredits) / (totalCredits + semCredits)
          : currentSemesterGpa

      points.push({
        term: 'Current',
        termGpa: currentSemesterGpa,
        cumulativeGpa: currentCumulative,
        credits: semCredits,
        type: 'current',
      })
    }

    // Add predicted/what-if projection if different from current
    if (
      predictedSemesterGpa !== null &&
      predictedSemesterGpa !== undefined &&
      predictedSemesterGpa !== currentSemesterGpa
    ) {
      const predictedCumulative =
        totalCredits > 0
          ? (totalPoints + predictedSemesterGpa * semCredits) / (totalCredits + semCredits)
          : predictedSemesterGpa

      points.push({
        term: 'What-If',
        termGpa: predictedSemesterGpa,
        cumulativeGpa: predictedCumulative,
        credits: semCredits,
        type: 'predicted',
      })
    }

    return points
  }, [data, currentSemesterGpa, predictedSemesterGpa, currentSemesterCredits])

  // Chart container size - use callback ref for reliable measurement
  const [chartSize, setChartSize] = React.useState({ width: 0, height: 0 })
  const observerRef = React.useRef<ResizeObserver | null>(null)
  
  const chartContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (node) {
      // Get initial size immediately
      const rect = node.getBoundingClientRect()
      setChartSize({ width: rect.width, height: rect.height })

      // Set up observer for future resizes
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          setChartSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      })
      observerRef.current.observe(node)
    }
  }, [])

  // SVG Chart renderer
  const chartContent = React.useMemo(() => {
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-neutral-400">
          Add semester data to see your GPA trend
        </div>
      )
    }

    const { width, height } = chartSize
    if (width === 0 || height === 0) {
      return (
        <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-neutral-800 rounded" />
      )
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // GPA scale (dynamically fit to data with some padding)
    const gpas = chartData.flatMap((d) => [d.cumulativeGpa, d.termGpa]).filter((g): g is number => g !== null)
    const dataMin = Math.min(...gpas)
    const dataMax = Math.max(...gpas)
    // Round to nice values
    const minGpa = Math.max(0, Math.floor(dataMin * 2) / 2 - 0.5)
    const maxGpa = Math.min(4, Math.ceil(dataMax * 2) / 2 + 0.5)
    const gpaRange = maxGpa - minGpa || 1

    const yScale = (gpa: number) =>
      padding.top + chartHeight - ((gpa - minGpa) / gpaRange) * chartHeight
    const xScale = (i: number) =>
      padding.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2)

    // Build paths for different segments
    const historicalData = chartData.filter((d) => d.type === 'historical')
    const currentData = chartData.find((d) => d.type === 'current')
    const predictedData = chartData.find((d) => d.type === 'predicted')

    // Historical cumulative line points
    const historicalCumPoints = historicalData
      .map((d, i) =>
        d.cumulativeGpa !== null ? { x: xScale(i), y: yScale(d.cumulativeGpa), gpa: d.cumulativeGpa } : null
      )
      .filter(Boolean) as Array<{ x: number; y: number; gpa: number }>

    const historicalCumPath =
      historicalCumPoints.length > 1
        ? `M ${historicalCumPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`
        : ''

    // Historical term GPA points
    const historicalTermPoints = historicalData
      .map((d, i) => (d.termGpa !== null ? { x: xScale(i), y: yScale(d.termGpa), gpa: d.termGpa } : null))
      .filter(Boolean) as Array<{ x: number; y: number; gpa: number }>

    const historicalTermPath =
      historicalTermPoints.length > 1 ? `M ${historicalTermPoints.map((p) => `${p.x},${p.y}`).join(' L ')}` : ''

    // Current semester point
    const currentIdx = historicalData.length
    const currentCumPoint = currentData?.cumulativeGpa !== null && currentData?.cumulativeGpa !== undefined
      ? { x: xScale(currentIdx), y: yScale(currentData.cumulativeGpa), gpa: currentData.cumulativeGpa }
      : null
    const currentTermPoint = currentData?.termGpa !== null && currentData?.termGpa !== undefined
      ? { x: xScale(currentIdx), y: yScale(currentData.termGpa), gpa: currentData.termGpa }
      : null

    // Predicted point (What-If)
    const predictedIdx = currentData ? currentIdx + 1 : currentIdx
    const predictedCumPoint = predictedData?.cumulativeGpa !== null && predictedData?.cumulativeGpa !== undefined
      ? { x: xScale(predictedIdx), y: yScale(predictedData.cumulativeGpa), gpa: predictedData.cumulativeGpa }
      : null
    const predictedTermPoint = predictedData?.termGpa !== null && predictedData?.termGpa !== undefined
      ? { x: xScale(predictedIdx), y: yScale(predictedData.termGpa), gpa: predictedData.termGpa }
      : null

    // Connection line from last historical to current (solid)
    const lastHistCumPoint = historicalCumPoints[historicalCumPoints.length - 1]
    const connectionPath = lastHistCumPoint && currentCumPoint
      ? `M ${lastHistCumPoint.x},${lastHistCumPoint.y} L ${currentCumPoint.x},${currentCumPoint.y}`
      : ''

    // Projection line from current to predicted (dashed)
    const projectionPath = currentCumPoint && predictedCumPoint
      ? `M ${currentCumPoint.x},${currentCumPoint.y} L ${predictedCumPoint.x},${predictedCumPoint.y}`
      : ''

    // Goal line
    const goalY = semesterGoal && semesterGoal >= minGpa && semesterGoal <= maxGpa ? yScale(semesterGoal) : null

    // Y-axis ticks
    const yTicks: number[] = []
    for (let g = Math.ceil(minGpa * 2) / 2; g <= maxGpa; g += 0.5) {
      yTicks.push(g)
    }

    // Check if we have what-if data to show
    const hasWhatIf = predictedData && predictedData.cumulativeGpa !== currentData?.cumulativeGpa

    return (
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          {yTicks.map((gpa) => (
            <g key={gpa}>
              <line
                x1={padding.left}
                y1={yScale(gpa)}
                x2={width - padding.right}
                y2={yScale(gpa)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 8}
                y={yScale(gpa)}
                fontSize="11"
                fill="currentColor"
                fillOpacity={0.5}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {gpa.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Goal line */}
          {goalY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={goalY}
                x2={width - padding.right}
                y2={goalY}
                stroke="var(--app-accent-hover)"
                strokeWidth="2"
                strokeDasharray="6,4"
                strokeOpacity={0.7}
              />
              <text
                x={width - padding.right + 4}
                y={goalY}
                fontSize="10"
                fill="var(--app-accent-hover)"
                dominantBaseline="middle"
              >
                Goal
              </text>
            </g>
          )}

          {/* Area fill under historical cumulative line */}
          {historicalCumPoints.length > 1 && (
            <path
              d={`${historicalCumPath} L ${historicalCumPoints[historicalCumPoints.length - 1].x},${yScale(minGpa)} L ${historicalCumPoints[0].x},${yScale(minGpa)} Z`}
              fill="url(#cumulativeGradient)"
            />
          )}

          {/* Historical term GPA line (dashed, purple) */}
          {historicalTermPath && (
            <path
              d={historicalTermPath}
              fill="none"
              stroke="rgb(168, 85, 247)"
              strokeWidth="2"
              strokeDasharray="4,4"
              strokeOpacity={0.6}
            />
          )}

          {/* Historical cumulative GPA line (solid, blue) */}
          {historicalCumPath && (
            <path
              d={historicalCumPath}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Connection to current (solid blue) */}
          {connectionPath && (
            <path
              d={connectionPath}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Projection to what-if (dashed green) */}
          {projectionPath && (
            <path
              d={projectionPath}
              fill="none"
              stroke="rgb(16, 185, 129)"
              strokeWidth="2"
              strokeDasharray="6,4"
              strokeLinecap="round"
            />
          )}

          {/* Historical term GPA points */}
          {historicalTermPoints.map((p, i) => (
            <g key={`term-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="rgb(168, 85, 247)"
                stroke="white"
                strokeWidth="2"
                opacity={0.8}
              />
              <title>{`${historicalData[i]?.term} Semester: ${p.gpa.toFixed(2)} GPA`}</title>
            </g>
          ))}

          {/* Historical cumulative GPA points */}
          {historicalCumPoints.map((p, i) => (
            <g key={`cum-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="rgb(59, 130, 246)"
                stroke="white"
                strokeWidth="2"
              />
              <title>{`${historicalData[i]?.term} Cumulative: ${p.gpa.toFixed(2)} GPA`}</title>
            </g>
          ))}

          {/* Current semester point */}
          {currentCumPoint && (
            <g>
              <circle
                cx={currentCumPoint.x}
                cy={currentCumPoint.y}
                r="6"
                fill="rgb(59, 130, 246)"
                stroke="white"
                strokeWidth="2"
              />
              <title>{`Current Cumulative: ${currentCumPoint.gpa.toFixed(2)} GPA`}</title>
            </g>
          )}
          {currentTermPoint && (
            <g>
              <circle
                cx={currentTermPoint.x}
                cy={currentTermPoint.y}
                r="5"
                fill="rgb(168, 85, 247)"
                stroke="white"
                strokeWidth="2"
              />
              <title>{`Current Semester: ${currentTermPoint.gpa.toFixed(2)} GPA`}</title>
            </g>
          )}

          {/* Predicted/What-If point */}
          {predictedCumPoint && (
            <g>
              <circle
                cx={predictedCumPoint.x}
                cy={predictedCumPoint.y}
                r="6"
                fill="rgb(16, 185, 129)"
                stroke="white"
                strokeWidth="2"
              />
              <title>{`What-If Cumulative: ${predictedCumPoint.gpa.toFixed(2)} GPA`}</title>
            </g>
          )}
          {predictedTermPoint && (
            <g>
              <circle
                cx={predictedTermPoint.x}
                cy={predictedTermPoint.y}
                r="5"
                fill="rgb(16, 185, 129)"
                stroke="white"
                strokeWidth="2"
                opacity={0.8}
              />
              <title>{`What-If Semester: ${predictedTermPoint.gpa.toFixed(2)} GPA`}</title>
            </g>
          )}

          {/* X-axis labels */}
          {chartData.map((d, i) => (
            <text
              key={`${d.type}:${d.term}`}
              x={xScale(i)}
              y={height - padding.bottom + 20}
              fontSize="11"
              fill={d.type === 'predicted' ? 'rgb(16, 185, 129)' : d.type === 'current' ? 'rgb(59, 130, 246)' : 'currentColor'}
              fillOpacity={d.type === 'historical' ? 0.6 : 1}
              textAnchor="middle"
              fontWeight={d.type !== 'historical' ? 500 : 400}
            >
              {d.term === 'Current' ? 'Now' : d.term === 'What-If' ? 'Target' : d.term.replace(/^(Spring|Summer|Fall|Winter)\s+(\d{4})$/, (_, s, y) => `${s[0]}'${y.slice(2)}`)}
            </text>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-neutral-400">Cumulative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500 opacity-80" />
            <span className="text-slate-600 dark:text-neutral-400">Semester</span>
          </div>
          {hasWhatIf && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-neutral-400">What-If</span>
            </div>
          )}
          {semesterGoal && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ background: 'var(--app-accent-hover)' }} />
              <span className="text-slate-600 dark:text-neutral-400">Goal ({semesterGoal.toFixed(1)})</span>
            </div>
          )}
        </div>
      </div>
    )
  }, [chartData, chartSize, semesterGoal])

  // Stats cards
  const renderStats = () => {
    if (!data) return null

    const latestTerm = data.terms[data.terms.length - 1]
    const previousTerm = data.terms.length > 1 ? data.terms[data.terms.length - 2] : null
    const gpaTrend =
      latestTerm?.gpa && previousTerm?.gpa ? latestTerm.gpa - previousTerm.gpa : null

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-2.5 text-center">
          <div className="text-xl font-bold text-[color:var(--accent-primary)]">
            {data.overall.gpa?.toFixed(2) ?? '—'}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-neutral-400">Cumulative</div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-2.5 text-center">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {latestTerm?.gpa?.toFixed(2) ?? '—'}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-neutral-400">Last Sem</div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-2.5 text-center">
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
            {data.overall.gradedCredits}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-neutral-400">Credits</div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-2.5 text-center">
          <div className="text-xl font-bold flex items-center justify-center gap-0.5">
            {gpaTrend !== null ? (
              <span
                className={
                  gpaTrend >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {gpaTrend >= 0 ? '+' : ''}
                {gpaTrend.toFixed(2)}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-neutral-400">Trend</div>
        </div>
      </div>
    )
  }

  // Entry mode chooser (when no data)
  const renderChooser = () => (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-neutral-400">
        Add your academic history to track GPA trends and projections.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setEntryMode('upload')}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]/30 transition-colors"
        >
          <Upload className="w-6 h-6 text-slate-500 dark:text-neutral-400" />
          <span className="font-medium text-sm">Upload PDF</span>
          <span className="text-xs text-slate-500 dark:text-neutral-400 text-center">
            Import from degree audit
          </span>
        </button>
        <button
          onClick={() => {
            setEntryMode('manual')
            initEditForm()
            setViewMode('edit')
          }}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]/30 transition-colors"
        >
          <PenLine className="w-6 h-6 text-slate-500 dark:text-neutral-400" />
          <span className="font-medium text-sm">Enter Manually</span>
          <span className="text-xs text-slate-500 dark:text-neutral-400 text-center">
            Add your courses by semester
          </span>
        </button>
      </div>
    </div>
  )

  // PDF upload area
  const renderUpload = () => (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading}
      />
      <div
        className={`border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-6 text-center transition-colors ${isLoading ? 'opacity-50' : 'hover:border-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]/30'}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 dark:text-neutral-400">Processing PDF...</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500 mb-2" />
            <div className="text-sm font-medium text-slate-700 dark:text-neutral-200">
              Upload Degree Audit PDF
            </div>
            <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Click or drag to upload
            </div>
          </>
        )}
      </div>
      {error && <div className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</div>}
      <button
        onClick={() => setEntryMode('choose')}
        className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        ← Back to options
      </button>
    </div>
  )

  // Course-level edit form
  const renderEditForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          Add your courses by semester to calculate GPA
        </p>
        <button
          onClick={addTerm}
          className="text-xs text-[var(--app-accent-hover)] hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Semester
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {editTerms.map((term) => (
          <div
            key={term.id}
            className="rounded-lg ring-1 ring-gray-200 dark:ring-neutral-700 overflow-hidden"
          >
            {/* Term header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-neutral-800/50">
              <button
                onClick={() => toggleTermExpanded(term.id)}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded"
              >
                {term.isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <select
                value={term.term}
                onChange={(e) => updateTermName(term.id, e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[var(--app-accent-hover)]"
              >
                <option value="">Select semester...</option>
                {(() => {
                  const currentYear = new Date().getFullYear()
                  const options: string[] = []
                  for (let y = currentYear + 1; y >= currentYear - 6; y--) {
                    options.push(`Fall ${y}`, `Summer ${y}`, `Spring ${y}`)
                  }
                  return options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))
                })()}
              </select>
              <span className="text-xs text-slate-500 dark:text-neutral-400">
                {term.courses.filter((c) => c.course.trim()).length} courses
              </span>
              <button
                onClick={() => removeTerm(term.id)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Courses */}
            {term.isExpanded && (
              <div className="p-3 space-y-2">
                {/* Header row */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-neutral-400 uppercase tracking-wide px-1">
                  <div className="flex-1">Course</div>
                  <div className="w-20">Grade</div>
                  <div className="w-16">Credits</div>
                  <div className="w-6" />
                </div>

                {term.courses.map((course) => (
                  <div key={course.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={course.course}
                      onChange={(e) => updateCourse(term.id, course.id, 'course', e.target.value)}
                      placeholder="MATH 1001"
                      className="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[var(--app-accent-hover)]"
                    />
                    <select
                      value={course.grade}
                      onChange={(e) => updateCourse(term.id, course.id, 'grade', e.target.value)}
                      className="w-20 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[var(--app-accent-hover)]"
                    >
                      {EDITABLE_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.5"
                      max="6"
                      step="0.5"
                      value={course.credits}
                      onChange={(e) => updateCourse(term.id, course.id, 'credits', e.target.value)}
                      className="w-16 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[var(--app-accent-hover)] text-center"
                    />
                    <button
                      onClick={() => removeCourse(term.id, course.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      disabled={term.courses.length <= 1}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addCourse(term.id)}
                  className="w-full py-1.5 text-xs text-slate-500 dark:text-neutral-400 hover:text-[var(--app-accent-hover)] hover:bg-slate-50 dark:hover:bg-neutral-800 rounded border border-dashed border-gray-300 dark:border-neutral-700 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Course
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-neutral-800">
        <Button size="sm" onClick={handleSaveEdit}>
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
        <button
          onClick={() => {
            if (data) {
              setViewMode('view')
            } else {
              setEntryMode('choose')
            }
            setError(null)
          }}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // History list view
  const renderHistory = () => {
    if (!data?.terms.length) {
      return (
        <div className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">
          No semester history available
        </div>
      )
    }

    return (
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {data.terms
          .slice()
          .reverse()
          .map((term) => (
            <div
              key={term.term}
              className="rounded-lg ring-1 ring-gray-200 dark:ring-neutral-800 overflow-hidden"
            >
              <button
                onClick={() => toggleTerm(term.term)}
                className="w-full px-3 py-2 flex items-center justify-between bg-slate-50 dark:bg-neutral-800/50 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{term.term}</span>
                  {term.courses.length > 0 && (
                    <Badge className="text-[10px]">{term.courses.length} courses</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{term.gpa?.toFixed(2) ?? '—'}</span>
                  <span className="text-xs text-slate-500">{term.gradedCredits} cr</span>
                  {term.courses.length > 0 &&
                    (expandedTerms.has(term.term) ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ))}
                </div>
              </button>

              {expandedTerms.has(term.term) && term.courses.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {term.courses.map((course) => (
                    <div
                      key={`${term.term}:${course.course}:${course.credits}:${course.effectiveGrade}`}
                      className="px-3 py-2 flex items-center justify-between text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{course.course}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-slate-500">{course.credits} cr</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${gradeColor(course.effectiveGrade)}`}
                        >
                          {course.effectiveGrade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    )
  }

  // Main content when data exists
  const renderDataView = () => (
    <div>
      {renderStats()}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 border-b border-gray-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('trend')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'trend'
              ? 'border-[var(--app-accent-hover)] text-[var(--app-accent-hover)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
          Trend
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-[var(--app-accent-hover)] text-[var(--app-accent-hover)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1" />
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'trend' ? (
        <div ref={chartContainerRef} className="h-48 w-full">
          {chartContent}
        </div>
      ) : (
        renderHistory()
      )}

      {/* Goal indicator */}
      {semesterGoal && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-neutral-400">
              <Target className="w-4 h-4" />
              <span>Semester Goal</span>
            </div>
            <span className="font-semibold">{semesterGoal.toFixed(2)} GPA</span>
          </div>
          {currentSemesterGpa !== null && currentSemesterGpa !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
                <span>Progress</span>
                <span>
                  {currentSemesterGpa >= semesterGoal ? (
                    <span className="text-emerald-600 dark:text-emerald-400">On track!</span>
                  ) : (
                    <span>Need +{(semesterGoal - currentSemesterGpa).toFixed(2)} more</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (currentSemesterGpa / semesterGoal) * 100)}%`,
                    background:
                      currentSemesterGpa >= semesterGoal
                        ? 'rgb(16, 185, 129)'
                        : 'var(--app-accent-hover)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-neutral-800 flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            initEditForm()
            setViewMode('edit')
          }}
          className="text-xs"
        >
          <PenLine className="w-3 h-3 mr-1" />
          Edit
        </Button>
        {data?.source !== 'manual' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Re-upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
          </>
        )}
      </div>

      {/* Meta info */}
      <div className="mt-2 text-[10px] text-slate-400 dark:text-neutral-500 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        {data?.source === 'manual' ? 'Entered manually' : 'From PDF'} •{' '}
        {formatDate(data!.uploadedAt)}
      </div>
    </div>
  )

  // Determine what to render
  const renderContent = () => {
    if (viewMode === 'edit') {
      return renderEditForm()
    }

    if (data) {
      return renderDataView()
    }

    switch (entryMode) {
      case 'upload':
        return renderUpload()
      default:
        return renderChooser()
    }
  }

  return (
    <div
      className={`rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 overflow-hidden shadow-card ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-600 dark:text-neutral-300" />
            <span className="font-semibold text-sm">GPA Trends</span>
            {data && (
              <Badge className="text-[11px]" tone="brand">
                {data.overall.gpa?.toFixed(2)} GPA
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && viewMode === 'view' && (
              <button
                onClick={handleClear}
                className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                title="Clear data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{renderContent()}</div>
    </div>
  )
}
