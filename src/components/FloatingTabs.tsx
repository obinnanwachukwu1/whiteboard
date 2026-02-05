import React, { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAIPanelState } from '../context/AIPanelContext'
import { useAppFlags } from '../context/AppContext'
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs'

export type FloatingTab<T extends string> = {
  key: T
  label: string
  Icon: React.ComponentType<any>
}

type Props<T extends string> = {
  current: T
  onChange: (tab: T) => void
  anchorId?: string
  tabs: Array<FloatingTab<T>>
  onHover?: (tab: T) => void
}

// Sidebar width constant (matches Sidebar.tsx)
const SIDEBAR_WIDTH = 256
// AI panel width (360px) + margin (16px)
const AI_PANEL_WIDTH = 376
// Approximate width per tab with label
const LABEL_TAB_WIDTH = 120
// Match the AI side panel width animation duration so tabs track smoothly while it animates.
const AI_PANEL_ANIMATION_MS = 350

export function FloatingTabs<T extends string>({
  current,
  onChange,
  anchorId,
  tabs,
  onHover,
}: Props<T>) {
  const [left, setLeft] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const [visible, setVisible] = useState(false)
  const hasShownRef = useRef(false)
  const hoverTimer = useRef<any>(null)
  const anchorObserver = useRef<ResizeObserver | null>(null)
  const aiPanelState = useAIPanelState()
  const { reduceEffectsEnabled } = useAppFlags()
  const lastAiOpenRef = useRef<boolean>(aiPanelState.isOpen)

  const handleMouseEnter = (key: T) => {
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
      const aiPanelOffset = aiPanelState.isOpen ? AI_PANEL_WIDTH : 0
      const availableWidth = window.innerWidth - SIDEBAR_WIDTH - 80 - aiPanelOffset
      const fullWidthWithLabels = tabs.length * LABEL_TAB_WIDTH
      const nextCollapsed = fullWidthWithLabels > availableWidth
      setCollapsed((prev) => (prev === nextCollapsed ? prev : nextCollapsed))

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

    compute()

    let showTimer: number | null = null
    if (!hasShownRef.current) {
      showTimer = requestAnimationFrame(() => {
        hasShownRef.current = true
        setVisible(true)
      })
    }

    const anchorEl = anchorId ? document.getElementById(anchorId) : null
    if (anchorEl && typeof ResizeObserver !== 'undefined') {
      anchorObserver.current = new ResizeObserver(compute)
      anchorObserver.current.observe(anchorEl)
    }

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
  }, [anchorId, tabs.length, aiPanelState.isOpen])

  const content = (
    <div
      className="fixed top-20 z-50 px-2 py-2 pointer-events-none transition-opacity duration-150"
      style={{
        left: left ?? '50%',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <Tabs value={current} onValueChange={onChange}>
        <TabsList
          className={`pointer-events-auto ${
            reduceEffectsEnabled ? 'bg-white dark:bg-neutral-900' : 'bg-white/60 dark:bg-neutral-900/70'
          } shadow-lg`}
          style={{ contain: 'paint' }}
        >
          {tabs.map(({ key, label, Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              aria-label={label}
              title={label}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
            >
              <Icon className="w-4 h-4" />
              {!collapsed && <span>{label}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )

  return createPortal(content, document.body)
}
