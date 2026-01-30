import React, { useRef, useState, useLayoutEffect } from 'react'
import { BookOpen, Megaphone, FileText, Percent, Link as LinkIcon } from 'lucide-react'

export type CourseTabKey = 'home' | 'wiki' | 'syllabus' | 'announcements' | 'discussions' | 'files' | 'modules' | 'links' | 'assignments' | 'grades' | 'people'

type TabDesc = { key: CourseTabKey; label: string; Icon: React.ComponentType<any> }
type Props = {
  current: CourseTabKey
  onChange: (tab: CourseTabKey) => void
  anchorId?: string // element whose width/center we align to
  tabs?: TabDesc[]
  onHover?: (tab: CourseTabKey) => void
}

const defaultTabs: TabDesc[] = [
  { key: 'announcements', label: 'Announcements', Icon: Megaphone },
  { key: 'modules', label: 'Modules', Icon: BookOpen },
  { key: 'links', label: 'Links', Icon: LinkIcon },
  { key: 'assignments', label: 'Assignments', Icon: FileText },
  { key: 'grades', label: 'Grades', Icon: Percent },
]

// Sidebar width constant (matches Sidebar.tsx)
const SIDEBAR_WIDTH = 256
// Approximate width per tab with label: icon (16px) + gap (8px) + label (~80px) + padding (24px) ≈ 120px
const LABEL_TAB_WIDTH = 120

export const FloatingCourseTabs: React.FC<Props> = ({ current, onChange, anchorId, tabs, onHover }) => {
  const [left, setLeft] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const [visible, setVisible] = useState(false)
  const hasShownRef = useRef(false) // Track if we've already shown once
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<any>(null)
  const anchorObserver = useRef<ResizeObserver | null>(null)

  const tabList = tabs || defaultTabs

  const handleMouseEnter = (key: CourseTabKey) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      onHover?.(key)
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  // Calculate position and collapsed state synchronously before paint
  useLayoutEffect(() => {
    const compute = () => {
      // Calculate collapsed state
      const availableWidth = window.innerWidth - SIDEBAR_WIDTH - 80
      const fullWidthWithLabels = tabList.length * LABEL_TAB_WIDTH
      setCollapsed(fullWidthWithLabels > availableWidth)

      // Calculate position
      if (!anchorId) {
        setLeft(null)
        return
      }
      const el = document.getElementById(anchorId)
      if (!el) {
        setLeft(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setLeft(rect.left + rect.width / 2)
    }

    // Compute immediately
    compute()

    // Only fade in once per mount - subsequent tab list changes shouldn't re-fade
    let showTimer: number | null = null
    if (!hasShownRef.current) {
      showTimer = requestAnimationFrame(() => {
        hasShownRef.current = true
        setVisible(true)
      })
    }

    // Set up observers for future changes
    const anchorEl = anchorId ? document.getElementById(anchorId) : null
    if (anchorEl && typeof ResizeObserver !== 'undefined') {
      anchorObserver.current = new ResizeObserver(compute)
      anchorObserver.current.observe(anchorEl)
    }

    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('resize', compute)
      if (showTimer) cancelAnimationFrame(showTimer)
      if (anchorObserver.current && anchorEl) anchorObserver.current.unobserve(anchorEl)
      anchorObserver.current = null
    }
  }, [anchorId, tabList.length])

  return (
    <div
      ref={containerRef}
      className="fixed top-20 z-50 px-2 py-2 pointer-events-none transition-opacity duration-150"
      style={{
        left: left ?? '50%',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="pointer-events-auto inline-flex items-center gap-px rounded-full overflow-hidden ring-1 ring-gray-200/80 dark:ring-neutral-800/80 bg-white/60 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg"
      >
        {tabList.map(({ key, label, Icon }) => {
          const active = key === current
          return (
            <button
              key={key}
              className={`px-3 py-1.5 text-sm inline-flex items-center gap-2 transition-colors ${
                active
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'bg-transparent text-slate-700 dark:text-neutral-200 hover:[background-color:var(--app-accent-hover)]'
              }`}
              style={active ? { backgroundColor: 'var(--app-accent-hover)' } as React.CSSProperties : undefined}
              onClick={() => onChange(key)}
              aria-pressed={active}
              aria-label={label}
              title={label}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
            >
              <Icon className="w-4 h-4" />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
