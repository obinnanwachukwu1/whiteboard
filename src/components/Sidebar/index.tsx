import React, { useMemo, useState } from 'react'
import { requestIdle } from '../../utils/prefetchQueue'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarCourseRow } from './SidebarCourseRow'

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
  current?:
    | 'dashboard'
    | 'announcements'
    | 'assignments'
    | 'grades'
    | 'discussions'
    | 'course'
    | 'allCourses'
  onSelectDashboard: () => void
  onSelectAnnouncements?: () => void
  onSelectAssignments?: () => void
  onSelectGrades?: () => void
  onSelectDiscussions?: () => void
  onSelectCourse: (courseId: string | number) => void
  onOpenAllCourses: () => void
  onHideCourse: (courseId: string | number) => void
  onPrefetchCourse?: (courseId: string | number) => void
  onPrefetchNav?: (
    tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  ) => void
  onReorder?: (nextOrder: Array<string | number>) => void
}

export const Sidebar: React.FC<Props> = ({
  courses,
  activeCourseId,
  sidebar,
  current = 'dashboard',
  onSelectDashboard,
  onSelectAnnouncements,
  onSelectAssignments,
  onSelectGrades,
  onSelectDiscussions,
  onSelectCourse,
  onOpenAllCourses,
  onHideCourse,
  onPrefetchCourse,
  onPrefetchNav,
  onReorder,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null)
  const [, setDragId] = useState<string | number | null>(null)
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const courseHoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastHoveredCourseId = React.useRef<string | number | null>(null)

  const handleNavHover = (
    tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  ) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      requestIdle(() => onPrefetchNav?.(tab))
    }, 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  const handleCourseEnter = (courseId: string | number) => {
    if (!onPrefetchCourse) return
    lastHoveredCourseId.current = courseId
    if (courseHoverTimer.current) clearTimeout(courseHoverTimer.current)
    courseHoverTimer.current = setTimeout(() => {
      if (lastHoveredCourseId.current === courseId) {
        onPrefetchCourse(courseId)
      }
    }, 350)
  }

  const handleCourseLeave = (courseId: string | number) => {
    if (lastHoveredCourseId.current === courseId) {
      lastHoveredCourseId.current = null
    }
    if (courseHoverTimer.current) clearTimeout(courseHoverTimer.current)
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

  return (
    <aside className="w-64 min-w-[16rem] text-slate-900 dark:text-slate-100 p-4 overflow-y-auto overflow-x-hidden flex flex-col">
      <div className="mb-4">
        <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-brand/70">
          At A Glance
        </div>
        <nav className="flex flex-col">
          <SidebarNavItem
            to="/dashboard"
            label="Dashboard"
            active={current === 'dashboard'}
            onClick={onSelectDashboard}
            onHover={() => handleNavHover('dashboard')}
            onLeave={handleMouseLeave}
          />
          <SidebarNavItem
            to="/announcements"
            label="Announcements"
            active={current === 'announcements'}
            onClick={() => onSelectAnnouncements?.()}
            onHover={() => handleNavHover('announcements')}
            onLeave={handleMouseLeave}
          />
          <SidebarNavItem
            to="/assignments"
            label="Assignments"
            active={current === 'assignments'}
            onClick={() => onSelectAssignments?.()}
            onHover={() => handleNavHover('assignments')}
            onLeave={handleMouseLeave}
          />
          <SidebarNavItem
            to="/grades"
            label="Grades"
            active={current === 'grades'}
            onClick={() => onSelectGrades?.()}
            onHover={() => handleNavHover('grades')}
            onLeave={handleMouseLeave}
          />
          <SidebarNavItem
            to="/discussions"
            label="Discussions"
            active={current === 'discussions'}
            onClick={() => onSelectDiscussions?.()}
            onHover={() => handleNavHover('discussions')}
            onLeave={handleMouseLeave}
          />
        </nav>
      </div>

      <div className="mb-2">
        <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-brand/70">
          Courses
        </div>
        <DndContext
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setDragId(e?.active?.id ?? null)}
          onDragEnd={(evt: DragEndEvent) => {
            const { active, over } = evt
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
            const remaining = allIds.filter(
              (id) => !nextVisible.includes(id) && !existingRest.includes(id),
            )
            const finalOrder = [...nextVisible, ...existingRest, ...remaining]
            onReorder?.(finalOrder)
          }}
        >
          <SortableContext
            items={orderedVisibleCourses.map((c) => String(c.id))}
            strategy={verticalListSortingStrategy}
          >
            <nav className="flex flex-col gap-1">
              {orderedVisibleCourses.map((c) => (
                <SidebarCourseRow
                  key={c.id}
                  course={c}
                  active={activeCourseId != null && String(activeCourseId) === String(c.id)}
                  label={labelFor(c)}
                  onSelect={() => onSelectCourse(c.id)}
                  onMore={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                  moreOpen={menuOpenId === c.id}
                  onHideCourse={() => onHideCourse(c.id)}
                  onPrefetch={() => handleCourseEnter(c.id)}
                  onHoverLeave={() => handleCourseLeave(c.id)}
                />
              ))}
            </nav>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-auto pt-2 flex flex-col">
        <SidebarNavItem
          to="/all-courses"
          label="All Courses"
          active={current === 'allCourses'}
          onClick={onOpenAllCourses}
          inactiveTextClass="text-slate-700 dark:text-slate-200"
        />
      </div>
    </aside>
  )
}
