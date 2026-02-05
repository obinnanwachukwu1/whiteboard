import React, { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Megaphone, FileText, Percent, Link as LinkIcon } from 'lucide-react'
import { useAIPanelState } from '../context/AIPanelContext'
import { useAppFlags } from '../context/AppContext'

export type CourseTabKey =
  | 'home'
  | 'wiki'
  | 'syllabus'
  | 'announcements'
  | 'discussions'
  | 'files'
  | 'modules'
  | 'links'
  | 'assignments'
  | 'quizzes'
  | 'grades'
  | 'people'

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
  { key: 'quizzes', label: 'Quizzes', Icon: FileText },
  { key: 'grades', label: 'Grades', Icon: Percent },
]

// Sidebar width constant (matches Sidebar.tsx)
const SIDEBAR_WIDTH = 256
// AI panel width (360px) + margin (16px)
const AI_PANEL_WIDTH = 376
// Approximate width per tab with label: icon (16px) + gap (8px) + label (~80px) + padding (24px) ≈ 120px
const LABEL_TAB_WIDTH = 120
// Match the AI side panel width animation duration so tabs track smoothly while it animates.
const AI_PANEL_ANIMATION_MS = 350

export const FloatingCourseTabs: React.FC<Props> = ({ current, onChange, anchorId, tabs, onHover }) => {
  const [left, setLeft] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const [visible, setVisible] = useState(false)
  const hasShownRef = useRef(false) // Track if we've already shown once
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<any>(null)
  const anchorObserver = useRef<ResizeObserver | null>(null)
  const aiPanelState = useAIPanelState()
  const { reduceEffectsEnabled } = useAppFlags()
  const lastAiOpenRef = useRef<boolean>(aiPanelState.isOpen)

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
      // Calculate collapsed state, accounting for AI panel if open
      const aiPanelOffset = aiPanelState.isOpen ? AI_PANEL_WIDTH : 0
      const availableWidth = window.innerWidth - SIDEBAR_WIDTH - 80 - aiPanelOffset
      const fullWidthWithLabels = tabList.length * LABEL_TAB_WIDTH
      const nextCollapsed = fullWidthWithLabels > availableWidth
      setCollapsed((prev) => (prev === nextCollapsed ? prev : nextCollapsed))

      // Calculate position
      if (!anchorId) {
        setLeft((prev) => (prev === null ? prev : null))
        return
      }
      const el = document.getElementById(anchorId)
      if (!el) {
        setLeft((prev) => (prev === null ? prev : null))
        return
      }
      const rect = el.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      setLeft((prev) => {
        if (prev != null && Math.abs(prev - center) < 0.5) return prev
        return center
      })
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

    // The AI panel animates its width, which can shift the anchor horizontally
    // even if its size stays the same (e.g. max-width layouts). Track it smoothly
    // for the duration of the animation after open/close toggles.
    let rafId: number | null = null
    const aiOpenChanged = lastAiOpenRef.current !== aiPanelState.isOpen
    lastAiOpenRef.current = aiPanelState.isOpen

    if (aiOpenChanged) {
      const endAt = performance.now() + AI_PANEL_ANIMATION_MS + 40
      const tick = () => {
        compute()
        if (performance.now() < endAt) {
          rafId = requestAnimationFrame(tick)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('resize', compute)
      if (showTimer) cancelAnimationFrame(showTimer)
      if (rafId) cancelAnimationFrame(rafId)
      if (anchorObserver.current && anchorEl) anchorObserver.current.unobserve(anchorEl)
      anchorObserver.current = null
    }
  }, [anchorId, tabList.length, aiPanelState.isOpen])

  // Use portal to escape backdrop-filter containing block from Card
  const content = (
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
        className={`pointer-events-auto inline-flex items-center gap-px rounded-full overflow-hidden ring-1 ring-gray-200/80 dark:ring-neutral-800/80 ${
          reduceEffectsEnabled ? 'bg-white dark:bg-neutral-900' : 'bg-white/60 dark:bg-neutral-900/70'
        } shadow-lg`}
        style={{ contain: 'paint' }}
      >
        {tabList.map(({ key, label, Icon }) => {
          const active = key === current
          return (
            <button
              key={key}
              className={`group relative px-3 py-1.5 text-sm inline-flex items-center gap-2 ${
                active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-neutral-200'
              }`}
              onClick={() => onChange(key)}
              aria-pressed={active}
              aria-label={label}
              title={label}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
            >
              <span
                aria-hidden
                className={`absolute inset-0 opacity-0 ${active ? 'opacity-100' : 'group-hover:opacity-100'}`}
                style={{ backgroundColor: 'var(--app-accent-hover)' }}
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {!collapsed && <span>{label}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
