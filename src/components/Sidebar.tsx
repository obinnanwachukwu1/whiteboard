import React, { useMemo, useState } from 'react'
import { MoreVertical } from 'lucide-react'

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
  current?: 'dashboard' | 'course' | 'allCourses'
  onSelectDashboard: () => void
  onSelectCourse: (courseId: string | number) => void
  onOpenAllCourses: () => void
  onHideCourse: (courseId: string | number) => void
  onPrefetchCourse?: (courseId: string | number) => void
  prefetchEnabled?: boolean
  onTogglePrefetch?: (enabled: boolean) => void
}

export const Sidebar: React.FC<Props> = ({ courses, activeCourseId, sidebar, current = 'dashboard', onSelectDashboard, onSelectCourse, onOpenAllCourses, onHideCourse, onPrefetchCourse, prefetchEnabled = true, onTogglePrefetch }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null)
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
                : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:shadow-sm text-slate-600 dark:text-slate-200 border-l-2 border-transparent'
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
        <nav className="flex flex-col gap-1">
          {orderedVisibleCourses.map((c) => (
            <div key={c.id} className="relative group" onMouseEnter={() => onPrefetchCourse?.(c.id)}>
              <button
                className={`w-full text-left py-2 pl-3 pr-8 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
                  activeCourseId === c.id
                    ? 'bg-brand/10 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border-l-2 border-brand'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:shadow-sm text-slate-600 dark:text-slate-200 border-l-2 border-transparent'
                }`}
                onClick={() => onSelectCourse(c.id)}
                title={c.name}
                aria-current={activeCourseId === c.id ? 'page' : undefined}
              >
                {labelFor(c)}
              </button>
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                aria-label="Course options"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id) }}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpenId === c.id && (
                <div className="absolute right-2 top-8 z-10 min-w-[140px] rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/10 dark:ring-white/10">
                  <button
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onHideCourse(c.id) }}
                  >
                    Hide from sidebar
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-2">
        <button
          className={`w-full text-left py-2 px-3 rounded-md text-sm transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            current === 'allCourses'
              ? 'bg-brand/10 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border-l-2 border-brand'
              : 'hover:bg-slate-100 dark:hover:bg-slate-900 hover:shadow-sm text-slate-700 dark:text-slate-200 border-l-2 border-transparent'
          }`}
          onClick={onOpenAllCourses}
          aria-current={current === 'allCourses' ? 'page' : undefined}
        >
          All Courses
        </button>
        <div className="mt-2 px-1 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span>Speed up navigation</span>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prefetchEnabled}
              onChange={(e) => onTogglePrefetch?.(e.target.checked)}
            />
          </label>
        </div>
      </div>
    </aside>
  )
}
