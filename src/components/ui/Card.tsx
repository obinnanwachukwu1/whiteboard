import React from 'react'

type CardProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement> & {
  className?: string
  variant?: 'default' | 'glass'
}>

export function Card({ className = '', variant = 'glass', children, ...rest }: CardProps) {
  const baseClasses = variant === 'glass'
    ? 'bg-white/70 dark:bg-neutral-900/70 rounded-card shadow-card p-5 ring-1 ring-gray-200/80 dark:ring-neutral-700/80 overflow-hidden'
    : 'bg-white rounded-card shadow-card p-5 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10 overflow-hidden'

  return (
    <div
      {...rest}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </div>
  )
}
