import React from 'react'

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

type TabsProps = React.PropsWithChildren<{
  value: string
  onValueChange: (value: string) => void
  className?: string
}>

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
}

export function TabsList({ className = '', ...rest }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-px rounded-full overflow-hidden ring-1 ring-gray-200/80 dark:ring-neutral-800/80 ${className}`}
      {...rest}
    />
  )
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}

export function TabsTrigger({ value, className = '', onClick, children, ...rest }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('TabsTrigger must be used within Tabs')
  }
  const active = ctx.value === value

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented && !rest.disabled) {
      ctx.onValueChange(value)
    }
  }

  return (
    <button
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      type={rest.type ?? 'button'}
      className={`group relative px-3 py-1.5 text-sm inline-flex items-center gap-2 ${
        active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-neutral-200'
      } ${className}`}
      onClick={handleClick}
      {...rest}
    >
      <span
        aria-hidden
        className={`absolute inset-0 opacity-0 ${active ? 'opacity-100' : 'group-hover:opacity-100'}`}
        style={{ backgroundColor: 'var(--app-accent-hover)' }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

type TabsPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
  keepMounted?: boolean
}

export function TabsPanel({ value, keepMounted = false, className = '', children, ...rest }: TabsPanelProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('TabsPanel must be used within Tabs')
  }
  const active = ctx.value === value
  if (!active && !keepMounted) return null

  return (
    <div role="tabpanel" hidden={!active} className={className} {...rest}>
      {children}
    </div>
  )
}
