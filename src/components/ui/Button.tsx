import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const base =
      'inline-flex items-center font-medium rounded-control transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
    const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2 text-sm'
    const look =
      variant === 'ghost'
        ? 'bg-transparent text-slate-700 hover:[background-color:var(--app-accent-hover)] dark:text-neutral-200'
        : 'bg-[color:var(--app-accent)] text-white hover:bg-[color:var(--app-accent-hover)]'
    return <button ref={ref} className={`${base} ${sizes} ${look} ${className}`} {...props} />
  },
)
Button.displayName = 'Button'
