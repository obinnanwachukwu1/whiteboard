import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useDueAssignments } from '../hooks/useCanvasQueries'
import { Columns3, Calendar, CircleDot, Check, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { CourseAvatar } from '../components/CourseAvatar'
import { useCourseImages } from '../hooks/useCourseImages'
import { courseHueFor } from '../utils/colorHelpers'
import { cleanCourseName } from '../utils/courseName'
import { AssignmentPopover, useAssignmentPopover } from '../components/AssignmentPopover'
import type { DueItem } from '../types/canvas'

function extractIdFromUrl(url?: string, key?: string): string | null {
  if (!url || !key) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idx = parts.indexOf(key)
    if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
  } catch {}
  return null
}

type KanbanStatus = 'todo' | 'doing' | 'done'
const LS_KANBAN = 'kanbanStatusByAssignment'

export default function AssignmentsPage() {
  const ctx = useAppContext()
  const { courseImageUrl, prefetchCourseImage } = useCourseImages()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [view, setView] = React.useState<'kanban' | 'calendar'>('kanban')

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

  const dueQ = useDueAssignments({ days: 365, includeCourseName: true })
  const allDue = React.useMemo(() => {
    const list = (dueQ.data || []) as DueItem[]
    return list.filter((d) => (courseFilter === 'all' ? true : String(d.course_id) === courseFilter))
  }, [dueQ.data, courseFilter])

  // Image helpers
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const d of allDue) { if (d.course_id != null) ids.add(String(d.course_id)) }
    ids.forEach((id) => {
      prefetchCourseImage(id)
    })
  }, [allDue, prefetchCourseImage])

  const [kanban, setKanban] = React.useState<Record<string, KanbanStatus>>(() => {
    try {
      const raw = localStorage.getItem(LS_KANBAN)
      if (!raw) return {}
      const obj = JSON.parse(raw)
      return typeof obj === 'object' && obj ? obj : {}
    } catch { return {} }
  })
  React.useEffect(() => { try { localStorage.setItem(LS_KANBAN, JSON.stringify(kanban)) } catch {} }, [kanban])
  const setStatus = (id: string, status: KanbanStatus) => setKanban((prev) => ({ ...prev, [id]: status }))
  const assignId = (d: DueItem) => String(d.assignment_rest_id || extractIdFromUrl(d.htmlUrl, 'assignments') || `${d.course_id}:${d.name}:${d.dueAt}`)

  // Derive effective status, forcing 'done' if Canvas says submitted
  const effectiveKanban = React.useMemo(() => {
    const next = { ...kanban }
    let changed = false
    for (const d of allDue) {
      const isSubmitted = Boolean(d.submission?.submittedAt) || 
                          d.submission?.workflowState === 'submitted' || 
                          d.submission?.workflowState === 'graded'
      
      if (isSubmitted) {
        const id = assignId(d)
        if (next[id] !== 'done') {
          next[id] = 'done'
          changed = true
        }
      }
    }
    return { status: next, changed }
  }, [allDue, kanban])

  // Persist auto-done updates
  React.useEffect(() => {
    if (effectiveKanban.changed) {
      setKanban(effectiveKanban.status)
    }
  }, [effectiveKanban])

  const columns = React.useMemo(() => {
    const col: Record<KanbanStatus, DueItem[]> = { todo: [], doing: [], done: [] }
    for (const d of allDue) {
      const id = assignId(d)
      const st = (effectiveKanban.status[id] || 'todo') as KanbanStatus
      col[st].push(d)
    }
    ;(Object.keys(col) as KanbanStatus[]).forEach((k) => col[k].sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt))))
    return col
  }, [allDue, effectiveKanban.status])

  const [dragId, setDragId] = React.useState<string | null>(null)
  const onDragStart = (e: React.DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }
  const onDragEnd = () => setDragId(null)
  const onDropTo = (status: KanbanStatus) => (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) setStatus(id, status); setDragId(null) }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="mt-0 mb-0 text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Assignments</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-control ring-1 ring-black/10 dark:ring-white/10 overflow-hidden flex-shrink-0">
            <button
              title="Board view"
              className={`p-1.5 sm:p-2 ${view === 'kanban' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`}
              onClick={() => setView('kanban')}
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              title="Calendar view"
              className={`p-1.5 sm:p-2 ${view === 'calendar' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`}
              onClick={() => setView('calendar')}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <select
            className="rounded-control border px-2 py-1.5 text-xs sm:text-sm bg-white/90 dark:bg-neutral-900 min-w-0 flex-1 sm:flex-none sm:w-auto truncate"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            {orderedCourses.map((c: any) => (
              <option key={String(c.id)} value={String(c.id)}>{labelFor(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { key: 'todo', label: 'To Do', icon: Clock, count: columns.todo.length },
            { key: 'doing', label: 'In Progress', icon: CircleDot, count: columns.doing.length },
            { key: 'done', label: 'Done', icon: Check, count: columns.done.length },
          ] as Array<{ key: KanbanStatus; label: string; icon: typeof Clock; count: number }>).map(({ key, label, icon: Icon, count }) => (
            <div
              key={key}
              onDragOver={onDragOver}
              onDrop={onDropTo(key)}
              className={`rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 min-h-[200px] ${dragId ? 'ring-2 ring-dashed ring-slate-300 dark:ring-neutral-600' : ''}`}
            >
              <div className="px-3 py-2.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{count}</span>
              </div>
              <div className="p-2 space-y-2">
                {columns[key].length === 0 && (
                  <div className="text-xs text-slate-400 dark:text-neutral-500 px-2 py-4 text-center">
                    {key === 'todo' ? 'No pending items' : key === 'doing' ? 'Drag items here' : 'Completed items appear here'}
                  </div>
                )}
                {columns[key].map((d, i) => {
                  const id = assignId(d)
                  const open = () => {
                    const rid = String(d.assignment_rest_id || extractIdFromUrl(d.htmlUrl, 'assignments') || '')
                    if (rid) ctx.onOpenAssignment(d.course_id, rid, d.name)
                    else ctx.onOpenCourse(d.course_id)
                  }
                  const img = courseImageUrl(d.course_id)
                  const dueDate = new Date(d.dueAt)
                  const now = new Date()
                  const isPastDue = dueDate < now && key !== 'done'
                  const isToday = dueDate.toDateString() === now.toDateString()
                  const isTomorrow = dueDate.toDateString() === new Date(now.getTime() + 86400000).toDateString()

                  // Format due date concisely
                  const formatDue = () => {
                    if (isToday) return `Today ${dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                    if (isTomorrow) return `Tomorrow ${dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                    return dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  }

                  return (
                    <div
                      key={id + ':' + i}
                      draggable
                      onDragStart={(e) => onDragStart(e, id)}
                      onDragEnd={onDragEnd}
                      onClick={open}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                      className={`group rounded-lg ring-1 ${isPastDue ? 'ring-red-200 dark:ring-red-900/50 bg-red-50/50 dark:bg-red-950/20' : 'ring-gray-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900'} p-2.5 cursor-pointer hover:ring-[var(--app-accent)] hover:shadow-sm active:cursor-grabbing transition-all duration-150`}
                    >
                      <div className="flex items-start gap-2.5">
                        <CourseAvatar
                          courseId={d.course_id}
                          courseName={d.course_name || String(d.course_id)}
                          src={img}
                          className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm leading-snug line-clamp-2" title={d.name}>{d.name}</div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 truncate">{cleanCourseName(d.course_name)}</div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-neutral-400">
                            <span className={`${isPastDue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                              {isPastDue && 'Overdue · '}{formatDue()}
                            </span>
                            {d.pointsPossible ? (
                              <>
                                <span className="text-slate-300 dark:text-neutral-600">·</span>
                                <span>{d.pointsPossible} pts</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView items={allDue} onOpenCourse={ctx.onOpenCourse} onOpenAssignment={(courseId, rid, title) => ctx.onOpenAssignment(courseId, rid, title)} />
      )}
    </div>
  )
}

const CalendarView: React.FC<{ items: DueItem[]; onOpenCourse?: (courseId: string | number) => void; onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void }>
  = ({ items, onOpenCourse, onOpenAssignment }) => {
  const { courseImageUrl } = useCourseImages()
  const [month, setMonth] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  // Assignment hover popover
  const { handleMouseEnter, handleMouseLeave, popoverProps } = useAssignmentPopover()

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const prevMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToToday = () => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  const firstWeekday = startOfMonth.getDay()
  const daysInMonth = endOfMonth.getDate()
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()

  const byDate = React.useMemo(() => {
    const map = new Map<string, DueItem[]>()
    for (const it of items) {
      const dt = new Date(it.dueAt)
      const k = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    }
    for (const v of map.values()) v.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    return map
  }, [items])

  // Get items in this month for mobile list view
  const itemsInMonth = React.useMemo(() => {
    return items.filter((it) => {
      const dt = new Date(it.dueAt)
      return dt.getFullYear() === month.getFullYear() && dt.getMonth() === month.getMonth()
    }).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [items, month])

  // Group by date for mobile list
  const groupedByDate = React.useMemo(() => {
    const groups: { date: Date; items: DueItem[] }[] = []
    let currentDate: string | null = null
    for (const it of itemsInMonth) {
      const dt = new Date(it.dueAt)
      const dateKey = dt.toDateString()
      if (dateKey !== currentDate) {
        groups.push({ date: dt, items: [] })
        currentDate = dateKey
      }
      groups[groups.length - 1].items.push(it)
    }
    return groups
  }, [itemsInMonth])

  // Selected date items
  const selectedDateItems = React.useMemo(() => {
    if (!selectedDate) return []
    const k = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    return byDate.get(k) || []
  }, [selectedDate, byDate])

  const cells: Array<{ date: Date | null }> = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(month.getFullYear(), month.getMonth(), d) })

  // Pad to complete the last week
  const remainder = cells.length % 7
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push({ date: null })
  }

  const monthLabel = month.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  // Helper to get course color
  const getCourseColor = (item: DueItem) => {
    const hue = courseHueFor(item.course_id, item.course_name || String(item.course_id))
    return `hsl(${hue}, 70%, 50%)`
  }

  const openItem = (it: DueItem) => {
    const rid = String(it.assignment_rest_id || extractIdFromUrl(it.htmlUrl, 'assignments') || '')
    if (rid) onOpenAssignment?.(it.course_id, rid, it.name)
    else onOpenCourse?.(it.course_id)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-900 dark:text-slate-100 min-w-[140px] text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded-md bg-[var(--app-accent-bg)] text-[var(--app-accent)] hover:opacity-80"
          >
            Today
          </button>
        )}
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:block rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-neutral-800">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
            <div key={d} className={`text-xs font-medium py-2 text-center ${i === 0 || i === 6 ? 'text-slate-400 dark:text-neutral-500' : 'text-slate-600 dark:text-neutral-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const date = cell.date
            const isWeekend = idx % 7 === 0 || idx % 7 === 6

            if (!date) {
              return (
                <div key={idx} className={`min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-neutral-800 ${isWeekend ? 'bg-slate-50/50 dark:bg-neutral-900/50' : ''}`} />
              )
            }

            const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
            const list = byDate.get(k) || []
            const isToday = k === todayKey
            const isPast = date < today && !isToday
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
            const hasItems = list.length > 0

            return (
              <div
                key={idx}
                onClick={() => hasItems && setSelectedDate(isSelected ? null : date)}
                className={`min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-neutral-800 transition-colors ${
                  isWeekend ? 'bg-slate-50/50 dark:bg-neutral-900/50' : ''
                } ${hasItems ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50' : ''} ${
                  isSelected ? 'bg-[var(--app-accent-bg)]' : ''
                }`}
              >
                {/* Date number */}
                <div className={`text-sm font-medium mb-1 ${
                  isToday
                    ? 'w-7 h-7 rounded-full bg-[var(--app-accent)] text-white flex items-center justify-center'
                    : isPast
                      ? 'text-slate-400 dark:text-neutral-500'
                      : 'text-slate-700 dark:text-neutral-300'
                }`}>
                  {date.getDate()}
                </div>

                {/* Assignment items */}
                <div className="space-y-0.5">
                  {list.slice(0, 3).map((it, i) => {
                    const time = new Date(it.dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                    const isOverdue = new Date(it.dueAt) < today
                    const assignmentInfo = {
                      id: it.assignment_rest_id || extractIdFromUrl(it.htmlUrl, 'assignments') || `${it.course_id}:${it.name}`,
                      name: it.name,
                      courseId: it.course_id,
                      courseName: it.course_name,
                      dueAt: it.dueAt,
                      pointsPossible: it.pointsPossible,
                      htmlUrl: it.htmlUrl,
                      courseImageUrl: courseImageUrl(it.course_id)
                    }
                    return (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); openItem(it) }}
                        onMouseEnter={(e) => handleMouseEnter(assignmentInfo, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`group flex items-center gap-1 px-1 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${
                          isOverdue
                            ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40'
                            : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCourseColor(it) }}
                        />
                        <span className={`truncate flex-1 ${isOverdue ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-neutral-300'}`}>
                          {it.name}
                        </span>
                        <span className="text-slate-400 dark:text-neutral-500 flex-shrink-0 hidden group-hover:inline">
                          {time}
                        </span>
                      </div>
                    )
                  })}
                  {list.length > 3 && (
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 px-1">
                      +{list.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date detail panel (desktop) */}
      {selectedDate && selectedDateItems.length > 0 && (
        <div className="hidden md:block rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-semibold text-sm">
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-neutral-800">
            {selectedDateItems.map((it, i) => {
              const time = new Date(it.dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
              const isOverdue = new Date(it.dueAt) < today
              return (
                <div
                  key={i}
                  onClick={() => openItem(it)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                >
                  <CourseAvatar
                    courseId={it.course_id}
                    courseName={it.course_name || String(it.course_id)}
                    src={courseImageUrl(it.course_id)}
                    className="w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-sm ${isOverdue ? 'text-red-700 dark:text-red-400' : ''}`}>
                      {it.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <span>{it.course_name}</span>
                      <span>·</span>
                      <span className={isOverdue ? 'text-red-600 dark:text-red-400' : ''}>{time}</span>
                      {it.pointsPossible ? <><span>·</span><span>{it.pointsPossible} pts</span></> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {groupedByDate.length === 0 && (
          <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 text-center">
            <Calendar className="w-8 h-8 text-slate-300 dark:text-neutral-600 mx-auto mb-2" />
            <div className="text-sm text-slate-500 dark:text-neutral-400">No assignments this month</div>
          </div>
        )}
        {groupedByDate.map(({ date, items: dayItems }, gi) => {
          const isDateToday = date.toDateString() === today.toDateString()
          const isPastDate = date < today && !isDateToday
          return (
            <div key={gi}>
              <div className={`text-xs font-semibold mb-1.5 px-1 flex items-center gap-2 ${
                isDateToday
                  ? 'text-[var(--app-accent)]'
                  : isPastDate
                    ? 'text-slate-400 dark:text-neutral-500'
                    : 'text-slate-600 dark:text-neutral-300'
              }`}>
                {isDateToday && <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />}
                {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                {isDateToday && <span className="text-[10px] uppercase tracking-wide">Today</span>}
              </div>
              <div className="space-y-2">
                {dayItems.map((it, i) => {
                  const time = new Date(it.dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                  const isOverdue = new Date(it.dueAt) < today
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => openItem(it)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(it) } }}
                      className={`rounded-card ring-1 bg-white/70 dark:bg-neutral-900/70 px-3 py-2.5 cursor-pointer transition-all ${
                        isOverdue
                          ? 'ring-red-200 dark:ring-red-900/50 hover:ring-red-300 dark:hover:ring-red-800'
                          : 'ring-gray-200 dark:ring-neutral-800 hover:ring-[var(--app-accent)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCourseColor(it) }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className={`font-medium text-sm ${isOverdue ? 'text-red-700 dark:text-red-400' : ''}`} title={it.name}>
                            {it.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
                            <span className="truncate">{it.course_name || String(it.course_id)}</span>
                            <span>·</span>
                            <span className={`flex-shrink-0 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                              {isOverdue && 'Overdue · '}{time}
                            </span>
                            {it.pointsPossible ? <><span>·</span><span className="flex-shrink-0">{it.pointsPossible} pts</span></> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Assignment Hover Popover */}
      <AssignmentPopover {...popoverProps} />
    </div>
  )
}
