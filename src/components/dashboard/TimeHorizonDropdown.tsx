import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { TIME_HORIZON_OPTIONS, type TimeHorizon } from '../../hooks/useDashboardSettings'

type Props = {
  value: TimeHorizon
  onChange: (value: TimeHorizon) => void
}

/**
 * Compact dropdown for selecting the time horizon filter.
 */
export const TimeHorizonDropdown: React.FC<Props> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  // Close on click outside
  useEffect(() => {
    if (!open) return
    
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  
  // Close on Escape
  useEffect(() => {
    if (!open) return
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])
  
  const currentLabel = TIME_HORIZON_OPTIONS.find((o) => o.value === value)?.label ?? `${value} days`
  
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md
                   text-slate-600 dark:text-neutral-400
                   hover:bg-slate-100 dark:hover:bg-neutral-800
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                   transition-colors"
      >
        {currentLabel}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[100px]
                        bg-white dark:bg-neutral-900 rounded-lg shadow-lg
                        ring-1 ring-black/10 dark:ring-white/10
                        py-1 animate-fade-in">
          {TIME_HORIZON_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors
                         ${
                           option.value === value
                             ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium'
                             : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                         }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
