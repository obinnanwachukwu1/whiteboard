import React from 'react'

type Props = {
  icon: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  badges?: React.ReactNode
  menu?: React.ReactNode
  menuOpen?: boolean
  onClick?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  className?: string
  active?: boolean
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>

export const ListItemRow: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  badges,
  menu,
  menuOpen,
  onClick,
  onKeyDown,
  className = '',
  active = false,
  ...rest
}) => {
  return (
    <div
      {...rest}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown || (onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined)}
      className={`
        group cursor-pointer flex items-center justify-between gap-3 rounded-card ring-1 px-3 py-2
        transition duration-200 ease-out relative
        ${active || menuOpen 
          ? 'scale-[1.01] shadow-sm ring-[var(--app-accent-hover)] bg-[var(--app-accent-bg)]' 
          : 'ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 hover:scale-[1.01] hover:shadow-sm hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          {(subtitle || badges) && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              {subtitle}
              {badges}
            </div>
          )}
        </div>
      </div>
      
      {menu && (
        <div className="shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
          {menu}
        </div>
      )}
    </div>
  )
}
