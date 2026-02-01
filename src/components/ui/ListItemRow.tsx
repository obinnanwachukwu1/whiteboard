import React from 'react'

import { useCallback } from 'react'
import type { HTMLAttributes, ReactNode, Ref, KeyboardEvent, MouseEvent } from 'react'

type InteractiveProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

type Props = {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  trailing?: ReactNode
  menu?: ReactNode
  menuOpen?: boolean
  onClick?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  className?: string
  active?: boolean
  density?: 'default' | 'compact'
  /**
   * Extra props to apply to the interactive root element.
   * Useful for hover-prefetch, popover triggers, analytics, etc.
   */
  interactiveProps?: InteractiveProps
  /**
   * Optional sibling node rendered after the row.
   * Useful for popovers/tooltips that are logically tied to this row.
   */
  after?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>

export const ListItemRow: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  badges,
  trailing,
  menu,
  menuOpen,
  onClick,
  onKeyDown,
  className = '',
  active = false,
  density = 'default',
  interactiveProps,
  after,
  ...rest
}) => {
  const { style: restStyle, ...restProps } = rest

  const mergedStyle = React.useMemo(() => {
    return { ...(restStyle || {}), ...((interactiveProps as any)?.style || {}) } as React.CSSProperties
  }, [restStyle, interactiveProps])
  const mergedOnClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    interactiveProps?.onClick?.(e)
    onClick?.()
  }, [interactiveProps, onClick])

  const mergedOnKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    interactiveProps?.onKeyDown?.(e)
    if (onKeyDown) {
      onKeyDown(e)
      return
    }
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }, [interactiveProps, onKeyDown, onClick])

  return (
    <>
      <div
        {...restProps}
        {...interactiveProps}
        role={onClick ? 'button' : interactiveProps?.role}
        tabIndex={onClick ? 0 : interactiveProps?.tabIndex}
        onClick={onClick ? mergedOnClick : interactiveProps?.onClick}
        onKeyDown={onClick ? mergedOnKeyDown : interactiveProps?.onKeyDown}
        style={mergedStyle}
        className={`
          group cursor-pointer flex items-center justify-between gap-3 ring-1
          transition-colors duration-150 ease-out relative
          ${active || menuOpen 
            ? `ring-[var(--app-accent-hover)] bg-[var(--app-accent-bg)]` 
            : `ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]`
          }
          ${density === 'compact' ? 'rounded-lg px-2 py-1.5' : 'rounded-card px-3 py-2'}
          ${interactiveProps?.className || ''}
          ${className}
        `}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`${density === 'compact' ? 'w-8 h-8' : 'w-9 h-9'} rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center shrink-0`}>
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

        {trailing && (
          <div className="shrink-0">
            {trailing}
          </div>
        )}
        
        {menu && (
          <div className="shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
            {menu}
          </div>
        )}
      </div>
      {after}
    </>
  )
}
