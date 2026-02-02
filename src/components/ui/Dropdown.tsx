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
  anchorRef?: React.RefObject<HTMLElement>
}

export const Dropdown: React.FC<Props> = ({
  open,
  onOpenChange,
  children,
  align = 'right',
  offsetY = 32,
  className = '',
  style,
  anchorEl,
  anchorRef,
}) => {
  const [visible, setVisible] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const ANIM_MS = 180
  const [coords, setCoords] = React.useState<{ top: number; left?: number; right?: number } | null>(
    null,
  )

  const compute = React.useCallback(() => {
    const el = anchorRef?.current ?? anchorEl
    if (el) {
      const rect = el.getBoundingClientRect()
      const top = rect.bottom + (offsetY - 32)
      if (align === 'right') setCoords({ top, right: Math.max(0, window.innerWidth - rect.right) })
      else setCoords({ top, left: Math.max(0, rect.left) })
    } else {
      setCoords(null)
    }
  }, [anchorRef, anchorEl, align, offsetY])

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      compute()
      const raf = requestAnimationFrame(() => setVisible(true))
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false)
      }
      const onScroll = () => compute()
      const onResize = () => compute()
      document.addEventListener('keydown', onKey)
      window.addEventListener('scroll', onScroll, true)
      window.addEventListener('resize', onResize)
      // Recompute after paint in case ref settles late
      const t = setTimeout(compute, 0)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t)
        document.removeEventListener('keydown', onKey)
        window.removeEventListener('scroll', onScroll, true)
        window.removeEventListener('resize', onResize)
      }
    } else {
      // start exit animation
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open, onOpenChange, compute])

  if (!mounted) return null

  // Keep class parity with earlier alignment when no anchorEl is provided

  const overlay = (
    <div
      className="fixed inset-0 z-[105]"
      aria-hidden
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    />
  )

  const menu = (
    <div
      role="menu"
      className={`fixed z-[110] min-w-[180px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-neutral-900 overflow-hidden origin-top-right transition-[opacity,transform] duration-150 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'} ${className}`}
      style={
        coords
          ? { top: coords.top, left: coords.left, right: coords.right, ...style }
          : { top: offsetY, ...(align === 'right' ? { right: 0 } : { left: 0 }), ...style }
      }
      onMouseDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
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

type DropdownItemProps = {
  onClick?: (e: React.MouseEvent) => void
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  disabled?: boolean
  variant?: 'default' | 'danger'
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onClick,
  icon,
  children,
  className = '',
  disabled,
  variant = 'default',
}) => {
  const baseClasses = 'flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors'
  const stateClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
      : 'hover:[background-color:var(--app-accent-hover)] text-slate-700 dark:text-neutral-200'

  return (
    <button
      className={`${baseClasses} ${stateClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {icon}
      {children}
    </button>
  )
}

export const DropdownLabel: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`px-3 py-2 text-[11px] text-slate-600 dark:text-neutral-400 border-b border-black/5 dark:border-white/10 ${className}`}
    >
      {children}
    </div>
  )
}
