import React, { useCallback, useMemo, useState, useRef } from 'react'
import { Button } from './ui/Button'
import { Eye, EyeOff, Pencil, RotateCcw } from 'lucide-react'
import { useAppActions } from '../context/AppContext'
import { useCourseImages } from '../hooks/useCourseImages'
import { courseHueFor } from '../utils/colorHelpers'

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
  const actions = useAppActions()
  const { courseImageUrl } = useCourseImages()
  const hiddenSet = useMemo(() => new Set(sidebar.hiddenCourseIds || []), [sidebar.hiddenCourseIds])
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aHidden = hiddenSet.has(a.id)
      const bHidden = hiddenSet.has(b.id)
      if (aHidden !== bHidden) return aHidden ? 1 : -1
      return 0
    })
  }, [courses, hiddenSet])
  const [editingId, setEditingId] = useState<string | null>(null)
  const failedImages = useRef<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)

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

  const resetName = useCallback(async (courseId: string | number) => {
    const custom = { ...(sidebar.customNames || {}) }
    delete custom[String(courseId)]
    const next = { ...sidebar, customNames: custom }
    onChange(next)
    await window.settings.set?.({ sidebar: next })
  }, [sidebar, onChange])

  return (
    <div className="space-y-4">
      <h1 className="mt-0 mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">All Courses</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCourses.map((c) => {
          const idKey = String(c.id)
          const custom = sidebar.customNames?.[idKey] || ''
          const hidden = hiddenSet.has(c.id)
          const imageUrl = courseImageUrl(c.id)
          const imageFailed = failedImages.current.has(idKey)
          const showImage = imageUrl && !imageFailed
          const hue = courseHueFor(c.id, c.name)
          const bannerGradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 30) % 360}, 80%, 45%))`

          return (
            <div
              key={idKey}
              className={`
                relative rounded-xl overflow-hidden
                bg-white/70 dark:bg-neutral-900/70
                ring-1 ring-gray-200/80 dark:ring-neutral-700/80
                shadow-card
                transition-all duration-150
                hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-100)]
                hover:ring-[var(--accent-300)] dark:hover:ring-[var(--accent-300)]
                ${hidden ? 'opacity-60' : ''}
              `}
            >
              {/* Course Banner */}
              <div
                className="h-24 relative cursor-pointer"
                style={{ background: bannerGradient }}
                onClick={() => actions.onOpenCourse(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.onOpenCourse(c.id) } }}
              >
                {showImage && (
                  <>
                    <img
                      src={imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => {
                        failedImages.current.add(idKey)
                        forceUpdate((n) => n + 1)
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Course Name / Edit Input */}
                <div className="mb-3 min-h-[2.5rem]">
                  {editingId === idKey ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-lg border border-slate-200 dark:border-neutral-700 px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand/30"
                        defaultValue={custom || c.name}
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
                          onClick={() => resetName(c.id)}
                          title="Reset to original"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => actions.onOpenCourse(c.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.onOpenCourse(c.id) } }}
                    >
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {custom || c.name}
                      </div>
                      {custom && (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5 truncate">
                          {c.name}
                        </div>
                      )}
                      {c.course_code && !custom && (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                          {c.course_code}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`hover:bg-[var(--accent-200)] dark:hover:bg-[var(--accent-200)] ${editingId === idKey ? 'bg-[var(--accent-200)] dark:bg-[var(--accent-200)]' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEditingId(editingId === idKey ? null : idKey)}
                    title="Rename"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-[var(--accent-200)] dark:hover:bg-[var(--accent-200)]"
                    onClick={() => toggleVisibility(c.id, hidden)}
                    title={hidden ? 'Show in sidebar' : 'Hide from sidebar'}
                  >
                    {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
