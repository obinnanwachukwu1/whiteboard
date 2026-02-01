import React from 'react'
import { Link } from '@tanstack/react-router'

type SidebarNavItemProps = {
  to: string
  label: string
  active: boolean
  onClick: () => void
  onHover?: () => void
  onLeave?: () => void
  inactiveTextClass?: string
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  to,
  label,
  active,
  onClick,
  onHover,
  onLeave,
  inactiveTextClass = 'text-slate-600 dark:text-slate-300',
}) => {
  return (
    <Link
      to={to}
      className={`cursor-default text-left py-2 px-3 rounded-lg text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
        active
          ? 'bg-[var(--accent-200)] dark:bg-[var(--accent-50)] text-slate-900 dark:text-slate-100 font-medium shadow-sm ring-1 ring-[var(--accent-300)] dark:ring-[var(--accent-300)]'
          : `hover:bg-[var(--glass-hover)] ${inactiveTextClass}`
      }`}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}
