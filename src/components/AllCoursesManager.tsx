import React, { useCallback, useMemo } from 'react'
import { TextField } from './ui/TextField'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'

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
  const hiddenSet = useMemo(() => new Set(sidebar.hiddenCourseIds || []), [sidebar.hiddenCourseIds])

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

  const move = useCallback(async (courseId: string | number, direction: 'up' | 'down') => {
    const ids = courses.map(c => c.id)
    // Ensure id is in order array; if not, start from current visual order based on ids
    const currentOrder = (sidebar.order && sidebar.order.length > 0)
      ? sidebar.order.filter(id => ids.includes(id))
      : ids.slice()

    const idx = currentOrder.indexOf(courseId)
    if (idx === -1) currentOrder.push(courseId)
    const i = currentOrder.indexOf(courseId)
    const j = direction === 'up' ? Math.max(0, i - 1) : Math.min(currentOrder.length - 1, i + 1)
    if (i !== j) {
      const copy = currentOrder.slice()
      const [spliced] = copy.splice(i, 1)
      copy.splice(j, 0, spliced)
      const next = { ...sidebar, order: copy }
      onChange(next)
      await window.settings.set?.({ sidebar: next })
    }
  }, [sidebar, onChange, courses])

  const resetName = useCallback(async (courseId: string | number) => {
    const custom = { ...(sidebar.customNames || {}) }
    delete custom[String(courseId)]
    const next = { ...sidebar, customNames: custom }
    onChange(next)
    await window.settings.set?.({ sidebar: next })
  }, [sidebar, onChange])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mt-0 mb-2 text-slate-900 dark:text-slate-100 text-lg font-semibold">All Courses</h2>
        <div className="text-slate-500 dark:text-slate-400 text-sm">Show/hide, rename, and reorder what appears in the sidebar.</div>
      </div>

      <div className="rounded-card bg-white p-0 dark:bg-slate-900 ring-1 ring-gray-200 dark:ring-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-left px-4 py-2">Course</th>
              <th className="text-left px-4 py-2">Custom name</th>
              <th className="text-left px-4 py-2">Visibility</th>
              <th className="text-left px-4 py-2">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {courses.map((c) => {
              const idKey = String(c.id)
              const custom = sidebar.customNames?.[idKey] || ''
              const hidden = hiddenSet.has(c.id)
              return (
                <tr key={idKey} className="align-middle">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{c.course_code || 'COURSE'}</Badge>
                      <div className="text-slate-900 dark:text-slate-100">{c.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 w-[320px]">
                    <div className="flex items-center gap-2">
                      <TextField
                        value={custom}
                        onChange={(e) => setCustomName(c.id, e.target.value)}
                        placeholder="Optional display name"
                      />
                      {custom && (
                        <Button size="sm" variant="ghost" onClick={() => resetName(c.id)} title="Reset name">
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleVisibility(c.id, hidden)} title={hidden ? 'Show in sidebar' : 'Hide from sidebar'}>
                      {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <span className="ml-2">{hidden ? 'Show' : 'Hide'}</span>
                    </Button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="inline-flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => move(c.id, 'up')} title="Move up">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => move(c.id, 'down')} title="Move down">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


