import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useDueAssignments } from '../hooks/useCanvasQueries'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'

type DueItem = { course_id: string | number; course_name?: string; name: string; dueAt: string; pointsPossible?: number; htmlUrl?: string; assignment_rest_id?: string | number }

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
  const queryClient = useQueryClient()
  const courses = ctx.courses || []
  const sidebar = ctx.sidebar
  const [courseFilter, setCourseFilter] = React.useState<string>('all')
  const [view, setView] = React.useState<'kanban' | 'calendar'>('kanban')
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

  const dueQ = useDueAssignments({ days: 365, includeCourseName: true })
  const allDue = React.useMemo(() => {
    const list = (dueQ.data || []) as DueItem[]
    return list.filter((d) => (courseFilter === 'all' ? true : String(d.course_id) === courseFilter))
  }, [dueQ.data, courseFilter])

  // Image helpers
  function hashString(input: string) { let h = 0; for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i); return Math.abs(h) }
  function courseHueFor(id: string | number, fallback: string) { const key = `${id}|${fallback}`; return hashString(key) % 360 }
  function courseImageUrl(courseId?: string | number | null): string | undefined {
    if (courseId == null) return undefined
    const stored = (imgStore?.[ctx.baseUrl] || {})[String(courseId)]
    if (stored) return stored
    const info = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }
  React.useEffect(() => {
    const ids = new Set<string>()
    for (const d of allDue) { if (d.course_id != null) ids.add(String(d.course_id)) }
    ids.forEach((id) => {
      queryClient.prefetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => { const res = await window.canvas.getCourseInfo?.(id); if (!res?.ok) throw new Error(res?.error || 'Failed to load course info'); return res.data || null },
        staleTime: 1000 * 60 * 60 * 24 * 7,
      }).catch(() => {})
    })
  }, [allDue, queryClient])

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

  const columns = React.useMemo(() => {
    const col: Record<KanbanStatus, DueItem[]> = { todo: [], doing: [], done: [] }
    for (const d of allDue) {
      const id = assignId(d)
      const st = (kanban[id] || 'todo') as KanbanStatus
      col[st].push(d)
    }
    ;(Object.keys(col) as KanbanStatus[]).forEach((k) => col[k].sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt))))
    return col
  }, [allDue, kanban])

  const [dragId, setDragId] = React.useState<string | null>(null)
  const onDragStart = (e: React.DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }
  const onDropTo = (status: KanbanStatus) => (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) setStatus(id, status); setDragId(null) }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center">
            <CalendarClock className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span>Assignments</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-control ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
            {(['kanban','calendar'] as const).map((k) => (
              <button key={k} className={`px-3 py-1.5 text-sm ${view === k ? 'bg-slate-900 text-white' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`} onClick={() => setView(k)}>
                {k === 'kanban' ? 'Kanban' : 'Calendar'}
              </button>
            ))}
          </div>
          <select className="rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
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
            { key: 'todo', label: 'To Do' },
            { key: 'doing', label: 'In Progress' },
            { key: 'done', label: 'Done' },
          ] as Array<{ key: KanbanStatus; label: string }>).map(({ key, label }) => (
            <div key={key} onDragOver={onDragOver} onDrop={onDropTo(key)} className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 min-h-[200px]">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-800 text-sm font-semibold">{label}</div>
              <div className="p-2 space-y-2">
                {columns[key].length === 0 && (
                  <div className="text-xs text-slate-500 dark:text-neutral-400 px-2 py-1">No items</div>
                )}
                {columns[key].map((d, i) => {
                  const id = assignId(d)
                  const open = () => {
                    const rid = String(d.assignment_rest_id || extractIdFromUrl(d.htmlUrl, 'assignments') || '')
                    if (rid) ctx.onOpenAssignment(d.course_id, rid, d.name)
                    else ctx.onOpenCourse(d.course_id)
                  }
                  return (
                    <div key={id + ':' + i} draggable onDragStart={(e) => onDragStart(e, id)} className="rounded-md ring-1 ring-gray-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 px-2 py-2 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm cursor-grab active:cursor-grabbing">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {(() => { const img = courseImageUrl(d.course_id); const hue = courseHueFor(d.course_id, d.course_name || String(d.course_id)); const fallback = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`; return (
                            <div className="w-8 h-8 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover flex-shrink-0" style={img ? { backgroundImage: `url(${img})` } : { background: fallback }} />
                          )})()}
                          <div className="min-w-0">
                            <div className="font-medium truncate" title={d.name}>{d.name}</div>
                            <div className="text-xs text-slate-500 dark:text-neutral-400">
                              <Badge tone="brand">{d.course_name || String(d.course_id)}</Badge>
                              <span className="mx-1">·</span>
                              <span>Due {new Date(d.dueAt).toLocaleString()}</span>
                              {d.pointsPossible ? <span> · {d.pointsPossible} pts</span> : null}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={open}>Open</Button>
                      </div>
                      <div className="mt-1 text-right">
                        <div className="inline-flex gap-1">
                          {(['todo','doing','done'] as KanbanStatus[]).map((s) => (
                            <button key={s} className={`px-2 py-0.5 text-[11px] rounded border ${kanban[id] === s ? 'bg-slate-900 text-white border-transparent' : 'bg-transparent border-gray-300 dark:border-neutral-700'}`} onClick={() => setStatus(id, s)}>
                              {s === 'todo' ? 'To Do' : s === 'doing' ? 'Doing' : 'Done'}
                            </button>
                          ))}
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
  const [month, setMonth] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const prevMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const firstWeekday = startOfMonth.getDay()
  const daysInMonth = endOfMonth.getDate()

  const byDate = React.useMemo(() => {
    const map = new Map<string, DueItem[]>()
    for (const it of items) {
      const dt = new Date(it.dueAt)
      const k = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    }
    for (const v of map.values()) v.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    return map
  }, [items])

  const cells: Array<{ date: Date | null }> = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(month.getFullYear(), month.getMonth(), d) })
  const monthLabel = month.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{monthLabel}</div>
        <div className="inline-flex gap-1">
          <Button size="sm" variant="ghost" onClick={prevMonth}>Prev</Button>
          <Button size="sm" variant="ghost" onClick={nextMonth}>Next</Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-xs text-slate-500 dark:text-neutral-400 px-1 py-1 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const date = cell.date
          if (!date) return <div key={idx} className="h-24 rounded-md bg-transparent" />
          const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const list = byDate.get(k) || []
          return (
            <div key={idx} className="h-28 rounded-md ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-1 overflow-hidden">
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 mb-1">{date.getDate()}</div>
              <div className="space-y-1 overflow-auto max-h-[6rem] pr-1">
                {list.map((it, i) => {
                  const open = () => {
                    const rid = String(it.assignment_rest_id || extractIdFromUrl(it.htmlUrl, 'assignments') || '')
                    if (rid) onOpenAssignment?.(it.course_id, rid, it.name)
                    else onOpenCourse?.(it.course_id)
                  }
                  return (
                    <div key={i} onClick={open} className="text-[11px] rounded px-1 py-0.5 bg-white dark:bg-neutral-900 ring-1 ring-gray-200 dark:ring-neutral-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800">
                      <div className="truncate" title={it.name}>{it.name}</div>
                    </div>
                  )
                })}
                {list.length === 0 && (
                  <div className="text-[11px] text-slate-400">—</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
