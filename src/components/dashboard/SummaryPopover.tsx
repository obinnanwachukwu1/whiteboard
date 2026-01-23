import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Wand2 } from 'lucide-react'

type Props = {
  position: { x: number; y: number } | null
  isOpen: boolean
  isLoading: boolean
  text: string | null
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export const SummaryPopover: React.FC<Props> = ({ 
  position, 
  isOpen, 
  isLoading, 
  text,
  onMouseEnter,
  onMouseLeave
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [isVisible, setIsVisible] = useState(false)
  
  // Handle visibility transition
  useEffect(() => {
    if (isOpen) setIsVisible(true)
    else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Positioning logic
  useEffect(() => {
    if (!position || !isVisible) return
    
    const updatePosition = () => {
      const { x, y } = position
      const width = 320
      const margin = 16
      
      // Default: Bottom Right of cursor
      let left = x + margin
      let top = y + margin
      let origin = 'top left'
      
      // Check Right Boundary (flip to Left)
      if (left + width > window.innerWidth) {
        left = x - width - margin
        origin = 'top right'
      }
      
      // Check Bottom Boundary (shift up)
      // Assuming variable height, but let's check against a safe max
      // Or we can just let it flow up if it's too low
      const estimatedHeight = 200 
      if (top + estimatedHeight > window.innerHeight) {
        // Position above the cursor
        top = y - estimatedHeight - margin
        origin = origin.replace('top', 'bottom')
      }

      setStyle({
        position: 'fixed',
        top,
        left,
        transformOrigin: origin,
        zIndex: 9999, // High z-index
        width: `${width}px`,
      })
    }
    
    updatePosition()
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [position, isVisible])

  if (!isVisible && !isOpen) return null

  return createPortal(
    <div 
      className={`
        bg-white dark:bg-neutral-900 
        rounded-xl shadow-2xl 
        border border-slate-200 dark:border-neutral-800 
        p-4 
        transition-all duration-150 ease-out pointer-events-auto
        ${isOpen ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'}
      `}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
        <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20">
            <Wand2 className="w-3.5 h-3.5" />
        </div>
        AI Summary
      </div>
      
      <div className="min-h-[60px] text-sm text-slate-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
        {isLoading && !text ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-1/2"></div>
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-full"></div>
          </div>
        ) : (
          text
        )}
      </div>
    </div>,
    document.body
  )
}
