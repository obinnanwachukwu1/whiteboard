import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const base = 'inline-flex items-center font-medium rounded-control transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
    const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2 text-sm'
    
    let look = 'bg-transparent text-slate-700 hover:[background-color:var(--app-accent-hover)] dark:text-neutral-200'
    if (variant === 'outline') {
      look = 'bg-transparent border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
    } else if (variant === 'ghost') {
      look = 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 shadow-none'
    }
    
    return <button ref={ref} className={`${base} ${sizes} ${look} ${className}`} {...props} />
  }
)
Button.displayName = 'Button'
