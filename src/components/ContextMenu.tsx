import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  id?: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number } | null
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [cachedItems, setCachedItems] = useState<ContextMenuItem[]>([])

  useEffect(() => {
    if (position) {
      setCoords(position)
      setCachedItems(items) // Snapshot items when opening
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 150)
      return () => clearTimeout(t)
    }
  }, [position, items]) // Re-snapshot if items change while open (optional, but good for dynamic menus)

  // Optimization: If closing (position is null), do NOT update cachedItems even if 'items' prop changes
  useEffect(() => {
    if (position && items !== cachedItems) {
      setCachedItems(items)
    }
  }, [items, position])

  useEffect(() => {
    if (!mounted) return
    const handleClickOutside = (event: MouseEvent) => {
      // Prevent closing if clicking inside the menu (already handled by stopPropagation but safety net)
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleScroll = () => onClose()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted, onClose])

  const keyedItems = React.useMemo(() => {
    const seen = new Map<string, number>()
    return cachedItems.map((item) => {
      const base =
        item.id ||
        `${item.label}:${item.danger ? 'danger' : 'normal'}:${item.disabled ? 'disabled' : 'enabled'}`
      const count = seen.get(base) || 0
      seen.set(base, count + 1)
      const key = count === 0 ? base : `${base}:${count + 1}`
      return { item, key }
    })
  }, [cachedItems])

  if (!mounted || !coords) return null

  // Adjust position to keep in viewport
  const style: React.CSSProperties = {
    top: coords.y,
    left: coords.x,
  }

  // Simple viewport check
  if (coords.x + 200 > window.innerWidth) {
    style.left = undefined
    style.right = window.innerWidth - coords.x
  }
  if (coords.y + cachedItems.length * 36 > window.innerHeight) {
    style.top = undefined
    style.bottom = window.innerHeight - coords.y
  }

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-[9999] min-w-[180px] bg-white dark:bg-neutral-900 rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-white/10 py-1 overflow-hidden transition-all duration-150 ease-out origin-top-left ${
        visible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'
      }`}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {keyedItems.map(({ item, key }) => (
        <button
          key={key}
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors ${
            item.danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
          } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          disabled={item.disabled}
        >
          {item.icon && <span className="w-4 h-4 shrink-0 opacity-70">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}
