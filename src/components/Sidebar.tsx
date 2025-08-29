import React, { useEffect, useMemo, useState } from 'react'
import { MoreVertical, GripVertical } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Course = { id: number | string; name: string; course_code?: string }

export type SidebarConfig = {
  hiddenCourseIds?: Array<string | number>
  customNames?: Record<string, string>
  order?: Array<string | number>
}

type Props = {
  courses: Course[]
  activeCourseId?: string | number | null
  sidebar?: SidebarConfig
  current?: 'dashboard' | 'course' | 'allCourses' | 'settings'
  onSelectDashboard: () => void
  onSelectCourse: (courseId: string | number) => void
  onOpenAllCourses: () => void
  onHideCourse: (courseId: string | number) => void
  onPrefetchCourse?: (courseId: string | number) => void
  prefetchEnabled?: boolean
  onTogglePrefetch?: (enabled: boolean) => void
  onReorder?: (nextOrder: Array<string | number>) => void
}

export const Sidebar: React.FC<Props> = ({ courses, activeCourseId, sidebar, current = 'dashboard', onSelectDashboard, onSelectCourse, onOpenAllCourses, onHideCourse, onPrefetchCourse, prefetchEnabled = true, onTogglePrefetch, onReorder }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null)
  const [dragId, setDragId] = useState<string | number | null>(null)
  const [overId, setOverId] = useState<string | number | null>(null)
  const [insertIdx, setInsertIdx] = useState<number | null>(null)
  const hidden = useMemo(() => new Set(sidebar?.hiddenCourseIds || []), [sidebar?.hiddenCourseIds])

  const orderedVisibleCourses = useMemo(() => {
    const all = courses.filter((c) => !hidden.has(c.id))
    const order = sidebar?.order || []
    const index = new Map(order.map((id, i) => [String(id), i]))
    return all
      .map((c) => ({ c, i: index.get(String(c.id)) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.i - b.i || String(a.c.name).localeCompare(String(b.c.name)))
      .map((x) => x.c)
  }, [courses, sidebar?.order, hidden])

  const labelFor = (c: Course) => sidebar?.customNames?.[String(c.id)] || c.course_code || c.name


  function SortableCourseRow({ c, active, label, onSelect, onMore, moreOpen, onHide, onPrefetch }: { c: Course; active: boolean; label: string; onSelect: () => void; onMore: () => void; moreOpen: boolean; onHide: () => void; onPrefetch: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(c.id) })
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }
    const [menuVisible, setMenuVisible] = useState(false)
    const [renderMenu, setRenderMenu] = useState(false)
    useEffect(() => {
      if (moreOpen) {
        setRenderMenu(true)
        const raf = requestAnimationFrame(() => setMenuVisible(true))
        return () => cancelAnimationFrame(raf)
      } else {
        setMenuVisible(false)
        const t = setTimeout(() => setRenderMenu(false), 200)
        return () => clearTimeout(t)
      }
    }, [moreOpen])
    return (
      <div ref={setNodeRef} style={style} className={`relative group rounded-md ${isDragging ? 'scale-[0.99]' : ''}`} onMouseEnter={onPrefetch}>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" {...attributes} {...listeners} aria-label="Drag course">
          <GripVertical className="w-4 h-4" />
        </div>
        <button
          className={`w-full text-left py-2 pl-7 pr-8 rounded-md text-sm transition-all outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            active
              ? 'bg-brand/10 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border-l-2 border-brand'
              : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-200 border-l-2 border-transparent'
          }`}
          onClick={onSelect}
          title={c.name}
          aria-current={active ? 'page' : undefined}
        >
          <span className="block truncate">{label}</span>
        </button>
        <button data-sb-more className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" aria-label="Course options" onClick={(e) => { e.stopPropagation(); onMore() }} title="More options">
          <MoreVertical className="w-4 h-4" />
        </button>
        {renderMenu && (
          <>
            <div className="fixed inset-0 z-[105]" aria-hidden onClick={() => onMore()} />
            <div data-sb-menu
              role="menu"
              className={`absolute right-0 top-8 z-[110] min-w-[200px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md overflow-hidden origin-top-right transition-all duration-200 ease-out ${menuVisible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'}`}
            >
              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); onMore(); onHide() }}>
                Hide from sidebar
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Global handlers to close any open menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpenId(null) }
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpenId) return
      const target = e.target as HTMLElement
      if (target.closest('[data-sb-menu]') || target.closest('[data-sb-more]')) return
      setMenuOpenId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDocClick) }
  }, [menuOpenId])

  // DnD helpers
  const onDragStart = (id: string | number, e?: React.DragEvent) => {
    setDragId(id)
    setOverId(null)
    const uiOrder = orderedVisibleCourses.map((c) => String(c.id))
    setInsertIdx(uiOrder.indexOf(String(id)))
    try { e?.dataTransfer?.setData('text/plain', String(id)); if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move' } catch {}
  }
  const onDragOverItem = (id: string | number, e: React.DragEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    setOverId(id)
    const idx = orderedVisibleCourses.findIndex((c) => String(c.id) === String(id))
    const targetIdx = e.clientY < mid ? idx : idx + 1
    setInsertIdx(targetIdx)
  }
  const onDragLeaveItem = (id: string | number) => {
    if (overId === id) { setOverId(null) }
  }
  const onDragEnd = () => { setDragId(null); setOverId(null); setInsertIdx(null) }
  const onDropOn = (targetId: string | number) => {
    if (!dragId) { onDragEnd(); return }
    const uiOrder = orderedVisibleCourses.map((c) => String(c.id))
    const movedId = String(dragId)
    const base = uiOrder.filter((id) => id !== movedId)
    const idx = insertIdx == null ? base.length : Math.max(0, Math.min(insertIdx, base.length))
    base.splice(idx, 0, movedId)
    const existing = (sidebar?.order || []).map(String)
    const existingRest = existing.filter((id) => !base.includes(id))
    const allIds = courses.map((c) => String(c.id))
    const remaining = allIds.filter((id) => !base.includes(id) && !existingRest.includes(id))
    const finalOrder = [...base, ...existingRest, ...remaining]
    onReorder?.(finalOrder)
    onDragEnd()
  }

  return (
    <aside
      className="w-64 min-w-[16rem] backdrop-blur text-slate-900 dark:text-slate-100 p-4 overflow-y-auto flex flex-col"
      style={{ backgroundColor: 'var(--app-accent-bg)' }}
    >
      <div className="mb-4">
        <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-brand/70">Navigation</div>
        <nav className="flex flex-col">
          <button
          className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            current === 'dashboard'
                ? 'bg-brand/10 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border-l-2 border-brand'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-200 border-l-2 border-transparent'
          }`}
            onClick={onSelectDashboard}
            aria-current={current === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
        </nav>
      </div>

      <div className="mb-2">
        <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-brand/70">Courses</div>
        <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))} collisionDetection={closestCenter} onDragStart={(e) => setDragId(e?.active?.id ?? null)} onDragEnd={(evt) => {
          const { active, over } = evt as DragEndEvent
          setDragId(null)
          if (!active?.id || !over?.id || active.id === over.id) return
          const ids = orderedVisibleCourses.map((c) => String(c.id))
          const from = ids.indexOf(String(active.id))
          const to = ids.indexOf(String(over.id))
          if (from < 0 || to < 0) return
          const nextVisible = arrayMove(ids, from, to)
          const existing = (sidebar?.order || []).map(String)
          const existingRest = existing.filter((id) => !nextVisible.includes(id))
          const allIds = courses.map((c) => String(c.id))
          const remaining = allIds.filter((id) => !nextVisible.includes(id) && !existingRest.includes(id))
          const finalOrder = [...nextVisible, ...existingRest, ...remaining]
          onReorder?.(finalOrder)
        }}>
          <SortableContext items={orderedVisibleCourses.map((c) => String(c.id))} strategy={verticalListSortingStrategy}>
            <nav className="flex flex-col gap-1">
              {orderedVisibleCourses.map((c) => (
                <SortableCourseRow
                  key={c.id}
                  c={c}
                  active={activeCourseId != null && String(activeCourseId) === String(c.id)}
                  label={labelFor(c)}
                  onSelect={() => onSelectCourse(c.id)}
                  onMore={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                  moreOpen={menuOpenId === c.id}
                  onHide={() => onHideCourse(c.id)}
                  onPrefetch={() => onPrefetchCourse?.(c.id)}
                />
              ))}
            </nav>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-auto pt-2">
        <button
          className={`w-full text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            current === 'allCourses'
              ? 'bg-brand/10 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border-l-2 border-brand'
              : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-700 dark:text-slate-200 border-l-2 border-transparent'
          }`}
          onClick={onOpenAllCourses}
          aria-current={current === 'allCourses' ? 'page' : undefined}
        >
          All Courses
        </button>
      </div>
    </aside>
  )
}
