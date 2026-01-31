import React from 'react'

type Props = {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SettingsSection({ title, icon, children, className = '' }: Props) {
  return (
    <section className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card overflow-hidden">
        {children}
      </div>
    </section>
  )
}
