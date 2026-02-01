import React, { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Wand2 } from 'lucide-react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type Props = {
  position: { x: number; y: number } | null
  isOpen: boolean
  isLoading: boolean
  text: string | null
  title?: string
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const PopoverHeader = React.memo(({ title }: { title?: string }) => {
  return (
    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
      <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20">
        <Wand2 className="w-3.5 h-3.5" />
      </div>
      {title || 'AI Summary'}
    </div>
  )
})

PopoverHeader.displayName = 'PopoverHeader'

export const SummaryPopover: React.FC<Props> = ({ 
  position, 
  isOpen, 
  isLoading, 
  text,
  title,
  onMouseEnter,
  onMouseLeave
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [isVisible, setIsVisible] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  
  // Buffer logic for streaming text
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedTextLength = useRef<number>(0)

  // Handle markdown rendering with newline buffering
  useEffect(() => {
    if (!text) {
      setRenderedHtml('')
      lastRenderedTextLength.current = 0
      return
    }

    const renderMarkdown = async (markdownToRender: string) => {
      try {
        const rawHtml = await marked.parse(markdownToRender, { async: true })
        const cleanHtml = DOMPurify.sanitize(rawHtml)
        setRenderedHtml(cleanHtml)
      } catch (e) {
        console.error('Markdown rendering error:', e)
      }
    }

    // Clear any pending flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }

    // Find the last newline
    const lastNewlineIndex = text.lastIndexOf('\n')
    
    // If we have a newline we haven't rendered past yet...
    if (lastNewlineIndex !== -1 && lastNewlineIndex > lastRenderedTextLength.current) {
      // Render up to the newline
      const safeText = text.substring(0, lastNewlineIndex + 1)
      renderMarkdown(safeText)
      lastRenderedTextLength.current = safeText.length
    }

    // Always set a debounce flush to render the "rest" (incomplete line)
    // if the stream pauses or ends.
    flushTimeoutRef.current = setTimeout(() => {
      renderMarkdown(text)
      lastRenderedTextLength.current = text.length
    }, 150) // 150ms debounce for natural typing feel at end of sentences

    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
    }
  }, [text])
  
  // Handle visibility transition
  useEffect(() => {
    if (isOpen) setIsVisible(true)
    else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Positioning logic
  useLayoutEffect(() => {
    if (!position || !isVisible) return
    
    const updatePosition = () => {
      const { x, y } = position
      const width = 320
      const margin = 6
      const height = popoverRef.current?.getBoundingClientRect().height ?? 200
      
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
      if (top + height > window.innerHeight) {
        // Position above the cursor
        top = y - height - margin
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
  }, [position, isVisible, renderedHtml, isLoading])

  if (!isVisible && !isOpen) return null

    return createPortal(
    <div 
      className={`
        bg-white dark:bg-neutral-900 
        rounded-xl shadow-2xl 
        border border-slate-200 dark:border-neutral-800 
        p-4 overflow-hidden
        transition-[opacity,transform] duration-150 ease-out pointer-events-auto
        ${isOpen ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'}
      `}
      style={style}
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PopoverHeader title={title} />
      
      <div className="min-h-[60px] text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
        {isLoading && !text ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-1/2"></div>
            <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-full"></div>
          </div>
        ) : (
          <div
            className="
              break-words [overflow-wrap:anywhere]
              [&_p]:mb-2 [&_p:last-child]:mb-0
              [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2
              [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2
              [&_li]:mb-1
              [&_p]:break-words [&_li]:break-words [&_code]:break-words
              [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-200
              [&_em]:italic
              [&_a]:text-indigo-500 [&_a]:underline
            "
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
