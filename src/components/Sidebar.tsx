import React, { useMemo, useState } from 'react'
import { MoreVertical, GripVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
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
  current?: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions' | 'course' | 'allCourses' | 'settings'
  onSelectDashboard: () => void
  onSelectAnnouncements?: () => void
  onSelectAssignments?: () => void
  onSelectGrades?: () => void
  onSelectDiscussions?: () => void
  onSelectCourse: (courseId: string | number) => void
  onOpenAllCourses: () => void
  onHideCourse: (courseId: string | number) => void
  onPrefetchCourse?: (courseId: string | number) => void
  onPrefetchNav?: (tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions') => void
  onReorder?: (nextOrder: Array<string | number>) => void
}

export const Sidebar: React.FC<Props> = ({ courses, activeCourseId, sidebar, current = 'dashboard', onSelectDashboard, onSelectAnnouncements, onSelectAssignments, onSelectGrades, onSelectDiscussions, onSelectCourse, onOpenAllCourses, onHideCourse, onPrefetchCourse, onPrefetchNav, onReorder }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null)
  const [, setDragId] = useState<string | number | null>(null)
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNavHover = (tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions') => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      onPrefetchNav?.(tab)
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

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
    // Dropdown handles its own mount/animation
    const btnRef = React.useRef<HTMLButtonElement | null>(null)
    return (
      <div ref={setNodeRef} style={style} className={`relative group rounded-md ${isDragging ? 'scale-[0.99]' : ''}`} onMouseEnter={onPrefetch}>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" {...attributes} {...listeners} aria-label="Drag course">
          <GripVertical className="w-4 h-4" />
        </div>
        <button
          className={`w-full text-left py-2 pl-7 pr-8 rounded-md text-sm transition-all outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            active
              ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
          }`}
          onClick={onSelect}
          title={c.name}
          aria-current={active ? 'page' : undefined}
        >
          <span className="block truncate">{label}</span>
        </button>
        <button ref={btnRef} data-sb-more className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" aria-label="Course options" onClick={(e) => { e.stopPropagation(); onMore() }} title="More options">
          <MoreVertical className="w-4 h-4" />
        </button>
        <Dropdown open={moreOpen} onOpenChange={(o) => { if (!o) onMore() }} align="right" offsetY={32} anchorRef={btnRef}>
          <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); onMore(); onHide() }}>
            Hide from sidebar
          </button>
        </Dropdown>
      </div>
    )
  }

  // Dropdown handles outside click/Escape

  // DnD helpers — handled inline in DndContext callbacks above

  return (
    <aside
      className="w-64 min-w-[16rem] text-slate-900 dark:text-slate-100 p-4 overflow-y-auto flex flex-col"
      style={{ backgroundColor: 'var(--app-accent-bg)' }}
    >
      <div className="mb-4">
        <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-brand/70">At A Glance</div>
        <nav className="flex flex-col">
          <button
          className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            current === 'dashboard'
                ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
          }`}
            onClick={onSelectDashboard}
            onMouseEnter={() => handleNavHover('dashboard')}
            onMouseLeave={handleMouseLeave}
            aria-current={current === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button
            className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
              current === 'announcements'
                ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => onSelectAnnouncements?.()}
            onMouseEnter={() => handleNavHover('announcements')}
            onMouseLeave={handleMouseLeave}
            aria-current={current === 'announcements' ? 'page' : undefined}
          >
            Announcements
          </button>
          <button
            className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
              current === 'assignments'
                ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => onSelectAssignments?.()}
            onMouseEnter={() => handleNavHover('assignments')}
            onMouseLeave={handleMouseLeave}
            aria-current={current === 'assignments' ? 'page' : undefined}
          >
            Assignments
          </button>
          <button
            className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
              current === 'grades'
                ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => onSelectGrades?.()}
            onMouseEnter={() => handleNavHover('grades')}
            onMouseLeave={handleMouseLeave}
            aria-current={current === 'grades' ? 'page' : undefined}
          >
            Grades
          </button>
          <button
            className={`text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
              current === 'discussions'
                ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-600 dark:text-slate-300'
            }`}
            onClick={() => onSelectDiscussions?.()}
            onMouseEnter={() => handleNavHover('discussions')}
            onMouseLeave={handleMouseLeave}
            aria-current={current === 'discussions' ? 'page' : undefined}
          >
            Discussions
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
              ? 'bg-[var(--app-accent-active)] text-slate-900 dark:text-slate-100 font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'hover:[background-color:var(--app-accent-hover)] hover:shadow-sm text-slate-700 dark:text-slate-200'
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
