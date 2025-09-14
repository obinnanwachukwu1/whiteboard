import React, { useCallback, useMemo, useState, useRef } from 'react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Eye, EyeOff, RotateCcw, MoreVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { Card } from './ui/Card'
import { useAppContext } from '../context/AppContext'

type Course = { id: number | string; name: string; course_code?: string }

type SidebarConfig = {
  hiddenCourseIds?: Array<string | number>
  customNames?: Record<string, string>
  order?: Array<string | number>
}

type Props = {
  courses: Course[]
  sidebar: SidebarConfig
  onChange: (next: SidebarConfig) => void
}

export const AllCoursesManager: React.FC<Props> = ({ courses, sidebar, onChange }) => {
  const ctx = useAppContext()
  const hiddenSet = useMemo(() => new Set(sidebar.hiddenCourseIds || []), [sidebar.hiddenCourseIds])
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const toggleVisibility = useCallback(async (courseId: string | number, show: boolean) => {
    const hidden = new Set(sidebar.hiddenCourseIds || [])
    if (show) hidden.delete(courseId)
    else hidden.add(courseId)
    const next = { ...sidebar, hiddenCourseIds: Array.from(hidden) }
    onChange(next)
    await window.settings.set?.({ sidebar: next })
  }, [sidebar, onChange])

  const setCustomName = useCallback(async (courseId: string | number, name: string) => {
    const custom = { ...(sidebar.customNames || {}) }
    if (name.trim()) custom[String(courseId)] = name
    else delete custom[String(courseId)]
    const next = { ...sidebar, customNames: custom }
    onChange(next)
    await window.settings.set?.({ sidebar: next })
  }, [sidebar, onChange])

  // Dropdown handles outside click/Escape

  const resetName = useCallback(async (courseId: string | number) => {
    const custom = { ...(sidebar.customNames || {}) }
    delete custom[String(courseId)]
    const next = { ...sidebar, customNames: custom }
    onChange(next)
    await window.settings.set?.({ sidebar: next })
  }, [sidebar, onChange])

  return (
    <div className="space-y-4">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">All Courses</h1>
      <div className="text-slate-500 dark:text-neutral-400 text-sm">Show/hide and rename courses. Drag to reorder directly in the sidebar.</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses.map((c) => {
          const idKey = String(c.id)
          const custom = sidebar.customNames?.[idKey] || ''
          const hidden = hiddenSet.has(c.id)
          const open = menuOpenId === idKey
          return (
            <Card
              key={idKey}
              className="relative min-h-40 flex flex-col justify-between cursor-pointer hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
              role="button"
              tabIndex={0}
              onClick={(e) => { if (editingId === idKey) { e.preventDefault(); return } ctx.onOpenCourse(c.id) }}
              onKeyDown={(e) => { if (editingId === idKey) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.onOpenCourse(c.id) } }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 dark:text-neutral-400 mb-1">
                    <Badge tone="brand">{c.course_code || 'COURSE'}</Badge>
                  </div>
                  {editingId === idKey ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="w-full rounded-control border px-2 py-1 bg-white/90 dark:bg-neutral-900"
                        value={custom}
                        onChange={(e) => setCustomName(c.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null) }}
                        placeholder="Display name"
                      />
                      {custom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => { e.stopPropagation(); resetName(c.id) }}
                          title="Reset name"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold whitespace-normal break-words leading-snug" title={c.name}>{custom || c.name}</div>
                        {custom && (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 whitespace-normal break-words" title={c.name}>Original: {c.name}</div>
                      )}
                    </>
                  )}
                </div>
                <div className="app-no-drag relative" onClick={(e) => e.stopPropagation()}>
                  <Button ref={open ? (btnRef as any) : undefined} size="sm" variant="ghost" onClick={() => setMenuOpenId(open ? null : idKey)} aria-expanded={open} aria-haspopup="menu" title="Options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  <Dropdown open={open} onOpenChange={(o) => setMenuOpenId(o ? idKey : null)} align="right" offsetY={32} className="min-w-[220px]" anchorEl={btnRef.current}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => { setEditingId(idKey); setMenuOpenId(null) }}
                    >
                      Edit display name
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      onClick={() => { toggleVisibility(c.id, hidden); setMenuOpenId(null) }}
                    >
                      {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <span>{hidden ? 'Show in sidebar' : 'Hide from sidebar'}</span>
                    </button>
                  </Dropdown>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
