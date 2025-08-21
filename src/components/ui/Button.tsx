import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center font-medium rounded-control transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2 text-sm'
  const variants = variant === 'primary'
    ? 'bg-brand text-brand-foreground hover:bg-indigo-600'
    : 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800'
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...props} />
}

