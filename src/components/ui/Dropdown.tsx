import React from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  align?: 'left' | 'right'
  offsetY?: number
  className?: string
  style?: React.CSSProperties
  anchorEl?: HTMLElement | null
}

export const Dropdown: React.FC<Props> = ({ open, onOpenChange, children, align = 'right', offsetY = 32, className = '', style, anchorEl }) => {
  const [visible, setVisible] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const ANIM_MS = 180
  const [coords, setCoords] = React.useState<{ top: number; left?: number; right?: number } | null>(null)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        const top = rect.bottom + (offsetY - 32)
        if (align === 'right') setCoords({ top, right: Math.max(0, window.innerWidth - rect.right) })
        else setCoords({ top, left: Math.max(0, rect.left) })
      } else {
        setCoords(null)
      }
      const raf = requestAnimationFrame(() => setVisible(true))
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
      document.addEventListener('keydown', onKey)
      return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey) }
    } else {
      // start exit animation
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open, onOpenChange, anchorEl, align, offsetY])

  if (!mounted) return null

  // Keep class parity with earlier alignment when no anchorEl is provided

  const overlay = (
    <div
      className="fixed inset-0 z-[105]"
      aria-hidden
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onOpenChange(false) }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
    />
  )

  const menu = (
    <div
      role="menu"
      className={`fixed z-[110] min-w-[180px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md overflow-hidden origin-top-right transition-all duration-150 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'} ${className}`}
      style={coords ? { top: coords.top, left: coords.left, right: coords.right, ...style } : { top: offsetY, ...(align === 'right' ? { right: 0 } : { left: 0 }), ...style }}
      onMouseDown={(e) => { e.stopPropagation() }}
      onClick={(e) => { e.stopPropagation() }}
    >
      {children}
    </div>
  )

  return createPortal(
    <>
      {overlay}
      {menu}
    </>,
    document.body,
  )
}
