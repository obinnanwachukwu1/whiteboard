import {
  BookOpen,
  CalendarClock,
  Check,
  CircleDot,
  Columns3,
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { StepProps } from '../OnboardingWizard'
import { Card } from '../../ui/Card'
import { ListItemRow } from '../../ui/ListItemRow'

type TourSlide = {
  title: string
  description: string
  icon: React.ReactNode
  preview: React.ReactNode
}

const noop = () => {}
const stagger = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` })

type SearchPreviewResult = {
  id: string
  title: string
  subtitle: string
  icon: 'folder' | 'book' | 'file'
}

type SearchPreviewStage = {
  id: string
  status: string
  results: SearchPreviewResult[]
}

type AssignmentPreviewItem = {
  id: string
  title: string
  subtitle: string
}

const SEARCH_QUERY = 'lab report rubric'
const SEARCH_TYPE_INTERVAL_MS = 42

const SEARCH_PREVIEW_STAGES: SearchPreviewStage[] = [
  {
    id: 'broad',
    status: 'Looking across assignments, pages, and files...',
    results: [
      {
        id: 'broad-1',
        title: 'Week 4 Lecture Slides',
        subtitle: 'CS 220 · Files',
        icon: 'folder',
      },
      {
        id: 'broad-2',
        title: 'Cell Respiration Notes',
        subtitle: 'BIO 210 · Page',
        icon: 'book',
      },
    ],
  },
  {
    id: 'course',
    status: 'Narrowing to biology materials...',
    results: [
      {
        id: 'course-1',
        title: 'BIO 210 Lab 3 Instructions',
        subtitle: 'BIO 210 · Assignment',
        icon: 'file',
      },
      {
        id: 'course-2',
        title: 'Lab Report Template',
        subtitle: 'BIO 210 · Files',
        icon: 'folder',
      },
      {
        id: 'course-3',
        title: 'Grading Overview',
        subtitle: 'BIO 210 · Syllabus',
        icon: 'book',
      },
    ],
  },
  {
    id: 'target',
    status: 'Matching rubric-related results...',
    results: [
      {
        id: 'target-1',
        title: 'Lab Report Grading Rubric',
        subtitle: 'BIO 210 · Assignment',
        icon: 'file',
      },
      {
        id: 'target-2',
        title: 'Lab Report Template',
        subtitle: 'BIO 210 · Files',
        icon: 'folder',
      },
      {
        id: 'target-3',
        title: 'Sample Lab Report',
        subtitle: 'BIO 210 · Files',
        icon: 'folder',
      },
    ],
  },
  {
    id: 'final',
    status: 'Best matches ready',
    results: [
      {
        id: 'final-1',
        title: 'Lab Report Grading Rubric',
        subtitle: 'BIO 210 · Assignment',
        icon: 'file',
      },
      {
        id: 'final-2',
        title: 'Lab Report Template',
        subtitle: 'BIO 210 · Files',
        icon: 'folder',
      },
      {
        id: 'final-3',
        title: 'Sample Lab Report',
        subtitle: 'BIO 210 · Files',
        icon: 'folder',
      },
    ],
  },
]

function getSearchStageIndex(typedLength: number) {
  if (typedLength < 4) return 0
  if (typedLength < 9) return 1
  if (typedLength < SEARCH_QUERY.length) return 2
  return 3
}

function getResultIcon(icon: SearchPreviewResult['icon']) {
  if (icon === 'folder') return <FolderOpen className="w-4 h-4" />
  if (icon === 'book') return <BookOpen className="w-4 h-4" />
  return <FileText className="w-4 h-4" />
}

function SearchTourPreview() {
  const [typedLength, setTypedLength] = useState(0)

  useEffect(() => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let currentLength = 0

    setTypedLength(0)

    const typeNext = () => {
      if (cancelled) return
      currentLength = Math.min(SEARCH_QUERY.length, currentLength + 1)
      setTypedLength(currentLength)
      if (currentLength < SEARCH_QUERY.length) {
        timeoutHandle = setTimeout(typeNext, SEARCH_TYPE_INTERVAL_MS)
      }
    }

    timeoutHandle = setTimeout(typeNext, 280)

    return () => {
      cancelled = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }, [])

  const typedQuery = SEARCH_QUERY.slice(0, typedLength)
  const stageIndex = useMemo(() => getSearchStageIndex(typedLength), [typedLength])
  const activeStage = SEARCH_PREVIEW_STAGES[stageIndex]
  const hasTyped = typedLength > 0
  const isTyping = typedLength < SEARCH_QUERY.length
  const visibleResults = hasTyped ? activeStage.results : []
  const statusText = hasTyped ? activeStage.status : 'Start typing to search...'

  return (
    <Card className="p-3.5">
      <div className="mb-2.5 rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-neutral-900 animate-oobe-fade-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            readOnly
            value={`${typedQuery}${isTyping && typedLength > 0 ? '|' : ''}`}
            placeholder="Search courses, assignments, files..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500 text-base outline-none"
          />
          <button
            type="button"
            onClick={noop}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="px-4 py-2 text-xs text-slate-500 dark:text-neutral-400 border-t border-gray-200/70 dark:border-neutral-800/80">
          {statusText}
        </p>
      </div>

      <div key={activeStage.id} className="space-y-1.5 animate-oobe-fade-up">
        {visibleResults.map((result, index) => (
          <div key={result.id} className="animate-oobe-fade-up" style={stagger(80 + index * 65)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              active={activeStage.id === 'final' && index === 0}
              icon={getResultIcon(result.icon)}
              title={result.title}
              subtitle={result.subtitle}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

function AssignmentsTourPreview() {
  const [phase, setPhase] = useState<'idle' | 'moving' | 'settled'>('idle')
  const boardRef = useRef<HTMLDivElement | null>(null)
  const sourceCardRef = useRef<HTMLDivElement | null>(null)
  const targetSlotRef = useRef<HTMLDivElement | null>(null)
  const [moveCard, setMoveCard] = useState<{
    fromX: number
    fromY: number
    deltaX: number
    deltaY: number
    width: number
    active: boolean
  } | null>(null)

  useEffect(() => {
    const moveHandle = setTimeout(() => setPhase('moving'), 1300)
    return () => {
      clearTimeout(moveHandle)
    }
  }, [])

  useLayoutEffect(() => {
    if (phase !== 'moving') return

    const boardRect = boardRef.current?.getBoundingClientRect()
    const sourceRect = sourceCardRef.current?.getBoundingClientRect()
    const targetRect = targetSlotRef.current?.getBoundingClientRect()
    if (!boardRect || !sourceRect || !targetRect) return

    const initial = {
      fromX: sourceRect.left - boardRect.left,
      fromY: sourceRect.top - boardRect.top,
      deltaX: targetRect.left - sourceRect.left,
      deltaY: targetRect.top - sourceRect.top,
      width: sourceRect.width,
      active: false,
    }
    setMoveCard(initial)

    const raf = requestAnimationFrame(() => {
      setMoveCard((prev) => (prev ? { ...prev, active: true } : prev))
    })
    const settleHandle = setTimeout(() => {
      setPhase('settled')
      setMoveCard(null)
    }, 820)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settleHandle)
    }
  }, [phase])

  const todoItems = useMemo<AssignmentPreviewItem[]>(() => {
    const base: AssignmentPreviewItem[] = [
      { id: 'bio-lab', title: 'Biology Lab Report', subtitle: 'Due Today' },
      { id: 'history', title: 'History Reflection', subtitle: 'Due Tomorrow' },
    ]
    return phase === 'settled' ? base.filter((item) => item.id !== 'history') : base
  }, [phase])

  const inProgressItems = useMemo<AssignmentPreviewItem[]>(() => {
    const base: AssignmentPreviewItem[] = [
      { id: 'cs-draft', title: 'CS Project Draft', subtitle: 'Working Session' },
    ]
    if (phase === 'settled') {
      base.push({ id: 'history', title: 'History Reflection', subtitle: 'Now In Progress' })
    }
    return base
  }, [phase])

  const statusText =
    phase === 'idle'
      ? 'Board updates live as assignment status changes.'
      : phase === 'moving'
        ? 'Moving "History Reflection" to In Progress...'
        : '"History Reflection" moved to In Progress.'

  return (
    <div className="space-y-2.5">
      <div
        className="inline-flex rounded-control ring-1 ring-black/10 dark:ring-white/10 overflow-hidden animate-oobe-fade-up"
        style={stagger(40)}
      >
        <button
          className="p-1.5 text-[var(--app-accent)] bg-[var(--app-accent-bg)]"
          onClick={noop}
          title="Board view"
          aria-label="Board view"
          type="button"
        >
          <Columns3 className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 text-slate-700 dark:text-neutral-300 bg-white/80 dark:bg-neutral-900/60"
          onClick={noop}
          title="Calendar view"
          aria-label="Calendar view"
          type="button"
        >
          <CalendarClock className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-neutral-400 animate-oobe-fade-up" style={stagger(100)}>
        {statusText}
      </p>

      <div ref={boardRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {phase === 'moving' && moveCard && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${moveCard.fromX}px`,
              top: `${moveCard.fromY}px`,
              width: `${moveCard.width}px`,
              transform: moveCard.active
                ? `translate(${moveCard.deltaX}px, ${moveCard.deltaY}px) scale(0.97)`
                : 'translate(0px, 0px) scale(1)',
              opacity: moveCard.active ? 0.95 : 1,
              transition: 'transform 780ms cubic-bezier(0.22, 1, 0.36, 1), opacity 780ms ease-out',
            }}
          >
            <div className="rounded-lg px-2 py-1.5 ring-1 ring-[var(--app-accent-hover)] bg-[var(--app-accent-bg)] shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                    History Reflection
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Moving to In Progress</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 animate-oobe-fade-up"
          style={stagger(130)}
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
              <span className="text-sm font-semibold">To Do</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
              {todoItems.length}
            </span>
          </div>
          <div className="p-2 space-y-1.5 min-h-[126px]">
            {todoItems.map((item, index) => (
              <div
                key={item.id}
                className={`animate-oobe-fade-up ${
                  item.id === 'history' && phase === 'moving' ? 'opacity-25' : ''
                }`}
                style={stagger(220 + index * 70)}
                ref={item.id === 'history' && phase !== 'settled' ? sourceCardRef : undefined}
              >
                <ListItemRow
                  density="compact"
                  className="cursor-default"
                  icon={<FileText className="w-4 h-4" />}
                  title={item.title}
                  subtitle={item.subtitle}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 animate-oobe-fade-up"
          style={stagger(180)}
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
              <span className="text-sm font-semibold">In Progress</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
              {inProgressItems.length}
            </span>
          </div>
          <div className="p-2 space-y-1.5 min-h-[126px]">
            {phase === 'moving' && (
              <div
                ref={targetSlotRef}
                className="h-[46px] rounded-lg border border-dashed border-[var(--app-accent-hover)] bg-[var(--app-accent-bg)]/50 animate-oobe-fade-up"
                style={stagger(250)}
              />
            )}
            {inProgressItems.map((item, index) => (
              <div key={item.id} className="animate-oobe-fade-up" style={stagger(280 + index * 80)}>
                <ListItemRow
                  density="compact"
                  className="cursor-default"
                  active={item.id === 'history' && phase === 'settled'}
                  icon={<FileText className="w-4 h-4" />}
                  title={item.title}
                  subtitle={item.subtitle}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 animate-oobe-fade-up"
          style={stagger(230)}
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
              <span className="text-sm font-semibold">Done</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
              1
            </span>
          </div>
          <div className="p-2 min-h-[126px] animate-oobe-fade-up" style={stagger(320)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              icon={<FileText className="w-4 h-4" />}
              title="Quiz Review Notes"
              subtitle="Submitted"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const DASHBOARD_TOUR: TourSlide = {
  title: 'Dashboard overview',
  description: 'Priority and activity stay side-by-side so you can decide quickly what to do next.',
  icon: <LayoutDashboard className="w-6 h-6" />,
  preview: (
    <div className="grid lg:grid-cols-[3fr_2fr] gap-3">
      <Card className="p-3.5 animate-oobe-fade-up" style={stagger(50)}>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-100)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-600)' }} />
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Priority</p>
        </div>
        <div className="space-y-1.5">
          <div className="animate-oobe-fade-up" style={stagger(140)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              icon={<CalendarClock className="w-4 h-4" />}
              title="Biology Lab Report"
              subtitle="BIO 210 · Due today"
            />
          </div>
          <div className="animate-oobe-fade-up" style={stagger(220)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              icon={<FileText className="w-4 h-4" />}
              title="History Reflection"
              subtitle="HIST 104 · Due tomorrow"
            />
          </div>
        </div>
      </Card>

      <Card className="p-3.5 animate-oobe-fade-up" style={stagger(120)}>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-100)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-600)' }} />
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activity</p>
        </div>
        <div className="space-y-1.5">
          <div className="animate-oobe-fade-up" style={stagger(240)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              icon={<MessageCircle className="w-4 h-4" />}
              title="New announcement"
              subtitle="CS 220 · 10 min ago"
            />
          </div>
          <div className="animate-oobe-fade-up" style={stagger(320)}>
            <ListItemRow
              density="compact"
              className="cursor-default"
              icon={<MessageCircle className="w-4 h-4" />}
              title="Upcoming event"
              subtitle="CHEM 101 · Tomorrow"
            />
          </div>
        </div>
      </Card>
    </div>
  ),
}

const SEARCH_TOUR: TourSlide = {
  title: 'Search',
  description: 'Search across files, assignments, and pages from one command surface.',
  icon: <Search className="w-6 h-6" />,
  preview: <SearchTourPreview />,
}

const ASSIGNMENTS_TOUR: TourSlide = {
  title: 'Assignments',
  description: 'Track work in a kanban board so you always know what is next, in progress, and done.',
  icon: <Columns3 className="w-6 h-6" />,
  preview: <AssignmentsTourPreview />,
}

function TourFeatureStep({ slide }: { slide: TourSlide }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="mb-6 animate-oobe-fade-up">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-50)', color: 'var(--accent-primary)' }}
        >
          {slide.icon}
        </div>
        <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {slide.title}
        </h2>
        <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-neutral-300 max-w-2xl">
          {slide.description}
        </p>
      </div>

      <div className="animate-oobe-slide-in-right">{slide.preview}</div>
    </div>
  )
}

export function DashboardTourStep(_props: StepProps) {
  return <TourFeatureStep slide={DASHBOARD_TOUR} />
}

export function SearchTourStep(_props: StepProps) {
  return <TourFeatureStep slide={SEARCH_TOUR} />
}

export function AssignmentsTourStep(_props: StepProps) {
  return <TourFeatureStep slide={ASSIGNMENTS_TOUR} />
}
