import React from 'react'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'brand'
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  const styles = tone === 'brand'
    ? 'bg-brand/10 text-brand'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return <span className={`inline-block px-1.5 py-0.5 rounded ${styles} ${className}`} {...props} />
}


