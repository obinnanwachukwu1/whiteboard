import React from 'react'
import { BookOpen, Megaphone, FileText, Percent, Link as LinkIcon } from 'lucide-react'

export type CourseTabKey = 'home' | 'wiki' | 'syllabus' | 'announcements' | 'files' | 'modules' | 'links' | 'assignments' | 'grades'

type TabDesc = { key: CourseTabKey; label: string; Icon: React.ComponentType<any> }
type Props = {
  current: CourseTabKey
  onChange: (tab: CourseTabKey) => void
  anchorId?: string // element whose width/center we align to
  tabs?: TabDesc[]
}

const defaultTabs: TabDesc[] = [
  { key: 'announcements', label: 'Announcements', Icon: Megaphone },
  { key: 'modules', label: 'Modules', Icon: BookOpen },
  { key: 'links', label: 'Links', Icon: LinkIcon },
  { key: 'assignments', label: 'Assignments', Icon: FileText },
  { key: 'grades', label: 'Grades', Icon: Percent },
]

export const FloatingCourseTabs: React.FC<Props> = ({ current, onChange, anchorId, tabs }) => {
  const [left, setLeft] = React.useState<number | null>(null)

  React.useEffect(() => {
    function compute() {
      if (!anchorId) { setLeft(null); return }
      const el = document.getElementById(anchorId)
      if (!el) { setLeft(null); return }
      const rect = el.getBoundingClientRect()
      setLeft(rect.left + rect.width / 2)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [anchorId])

  return (
    <div
      className="fixed top-20 z-50 px-2 py-2 pointer-events-none"
      style={{ left: left ?? '50%', transform: 'translateX(-50%)' }}
    >
      <div className="pointer-events-auto inline-flex items-center gap-px rounded-full overflow-hidden ring-1 ring-gray-200/80 dark:ring-neutral-800/80 bg-white/60 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg">
        {(tabs || defaultTabs).map(({ key, label, Icon }) => {
          const active = key === current
          return (
            <button
              key={key}
              className={`px-3 sm:px-4 py-1.5 text-sm inline-flex items-center gap-2 transition-colors ${
                active
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'bg-transparent text-slate-700 dark:text-neutral-200 hover:[background-color:var(--app-accent-hover)]'
              }`}
              style={active ? { backgroundColor: 'var(--app-accent-hover)' } as React.CSSProperties : undefined}
              onClick={() => onChange(key)}
              aria-pressed={active}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
