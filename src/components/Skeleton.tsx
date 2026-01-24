import React from 'react'

type SkeletonProps = {
  className?: string
  /** Width - can be a Tailwind class (w-32) or CSS value (120px) */
  width?: string
  /** Height - can be a Tailwind class (h-4) or CSS value (16px) */
  height?: string
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none'
}

/**
 * Base skeleton element for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-slate-200/70 dark:bg-neutral-800/70'
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    none: '',
  }

  // Check if width/height are Tailwind classes or CSS values
  const isWidthClass = width?.startsWith('w-')
  const isHeightClass = height?.startsWith('h-')

  const style: React.CSSProperties = {}
  if (width && !isWidthClass) style.width = width
  if (height && !isHeightClass) style.height = height

  const classes = [
    baseClasses,
    variantClasses[variant],
    animationClasses[animation],
    isWidthClass ? width : '',
    isHeightClass ? height : '',
    className,
  ].filter(Boolean).join(' ')

  return <div className={classes} style={Object.keys(style).length ? style : undefined} />
}

type SkeletonTextProps = {
  lines?: number
  className?: string
  lineClassName?: string
  /** Make last line shorter */
  lastLineWidth?: string
}

/**
 * Multi-line text skeleton
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = '',
  lineClassName = '',
  lastLineWidth = 'w-3/4',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="h-4"
          width={i === lines - 1 ? lastLineWidth : 'w-full'}
          className={lineClassName}
        />
      ))}
    </div>
  )
}

type SkeletonCardProps = {
  className?: string
  /** Show image placeholder at top */
  hasImage?: boolean
  /** Number of text lines */
  lines?: number
  /** Show avatar */
  hasAvatar?: boolean
}

/**
 * Card-shaped skeleton for list items
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  hasImage = false,
  lines = 2,
  hasAvatar = false,
}) => {
  return (
    <div className={`rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 ${className}`}>
      {hasImage && (
        <Skeleton height="h-32" width="w-full" variant="rounded" className="mb-4" />
      )}
      <div className="flex items-start gap-3">
        {hasAvatar && (
          <div className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 flex items-center justify-center shrink-0">
            <Skeleton width="w-6" height="h-6" variant="circular" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Skeleton height="h-5" width="w-3/4" className="mb-2" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  )
}

type SkeletonListProps = {
  count?: number
  className?: string
  itemClassName?: string
  /** Show avatars on items */
  hasAvatar?: boolean
  /** Variant for list items */
  variant?: 'simple' | 'card' | 'row'
}

/**
 * List of skeleton items
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  className = '',
  itemClassName = '',
  hasAvatar = false,
  variant = 'simple',
}) => {
  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} hasAvatar={hasAvatar} className={itemClassName} />
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 rounded-card ring-1 px-3 py-2 bg-white/70 dark:bg-neutral-900/70 ring-gray-200 dark:ring-neutral-800 ${itemClassName}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-neutral-600/15 flex items-center justify-center shrink-0">
                <Skeleton width="w-5" height="h-5" variant="circular" />
              </div>
              <div className="min-w-0 flex-1">
                <Skeleton height="h-4" width="w-1/2" className="mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton height="h-3" width="w-16" className="rounded-full" />
                  <Skeleton height="h-3" width="w-20" className="rounded-full" />
                </div>
              </div>
            </div>
            {hasAvatar && <Skeleton height="h-4" width="w-12" className="rounded-full" />}
          </div>
        ))}
      </div>
    )
  }

  // Simple variant
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 ${itemClassName}`}>
          {hasAvatar && <Skeleton width="w-10" height="h-10" variant="circular" />}
          <div className="flex-1">
            <Skeleton height="h-4" width="w-2/3" className="mb-2" />
            <Skeleton height="h-3" width="w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

type SkeletonTableProps = {
  rows?: number
  columns?: number
  className?: string
  hasHeader?: boolean
}

/**
 * Table skeleton for data grids
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = '',
  hasHeader = true,
}) => {
  return (
    <div className={`w-full ${className}`}>
      {hasHeader && (
        <div className="flex gap-4 p-3 border-b border-gray-200 dark:border-neutral-800">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height="h-4" className="flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-3 border-b border-gray-100 dark:border-neutral-900">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="h-4" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

type SkeletonStatsProps = {
  count?: number
  className?: string
}

/**
 * Stats cards skeleton (like dashboard metrics)
 */
export const SkeletonStats: React.FC<SkeletonStatsProps> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${count} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4">
          <Skeleton height="h-3" width="w-20" className="mb-2" />
          <Skeleton height="h-8" width="w-16" className="mb-1" />
          <Skeleton height="h-3" width="w-24" />
        </div>
      ))}
    </div>
  )
}

type SkeletonChartProps = {
  className?: string
  height?: string
}

/**
 * Chart placeholder skeleton
 */
export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  className = '',
  height = 'h-64',
}) => {
  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton height="h-5" width="w-32" />
        <Skeleton height="h-8" width="w-24" variant="rounded" />
      </div>
      <Skeleton height={height} width="w-full" variant="rounded" />
    </div>
  )
}

/**
 * Page-level skeleton that mimics the app layout
 */
export const SkeletonPage: React.FC<{ title?: boolean; stats?: boolean; content?: 'list' | 'table' | 'cards' }> = ({
  title = true,
  stats = false,
  content = 'list',
}) => {
  return (
    <div className="space-y-6">
      {title && (
        <div className="flex items-center justify-between">
          <Skeleton height="h-8" width="w-48" />
          <Skeleton height="h-10" width="w-32" variant="rounded" />
        </div>
      )}
      {stats && <SkeletonStats count={3} />}
      {content === 'list' && <SkeletonList count={5} hasAvatar />}
      {content === 'table' && <SkeletonTable rows={8} columns={5} />}
      {content === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} hasImage lines={2} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Skeleton
