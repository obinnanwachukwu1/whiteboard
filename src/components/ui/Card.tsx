import React from 'react'

type CardProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement> & { className?: string }>

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-card shadow-card p-5 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10 overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}
