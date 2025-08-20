import React from 'react'

type CardProps = React.PropsWithChildren<{ className?: string }>

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`bg-white rounded-card shadow-card p-5 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700 ${className}`}>
      {children}
    </div>
  )
}


