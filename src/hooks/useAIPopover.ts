import { useState, useRef, useEffect, useCallback } from 'react'

type UseAIPopoverOptions = {
  enabled: boolean
  delay?: number
  /**
   * Function to start generating the content.
   * It receives an `update` callback to update the text.
   * Return a cleanup function if streaming.
   * Return `false` if generation cannot start (e.g. empty content).
   */
  onGenerate: (update: (text: string) => void) => (() => void) | void | Promise<void> | boolean
}

export const useAIPopover = ({ enabled, delay = 600, onGenerate }: UseAIPopoverOptions) => {
  const [showPopover, setShowPopover] = useState(false)
  const isHoveredRef = useRef(false)
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const streamCleanupRef = useRef<(() => void) | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Store onGenerate in a ref so it doesn't reset the hover timer on every render
  const onGenerateRef = useRef(onGenerate)
  onGenerateRef.current = onGenerate

  const startGeneration = useCallback(() => {
    // Start generation if not already done/doing
    if (!text && !loading) {
      setLoading(true)
      const result = onGenerateRef.current((newText) => {
        setText(newText)
      })

      if (result === false) {
        setLoading(false)
      } else if (typeof result === 'function') {
        streamCleanupRef.current = result
      }
    }
  }, [text, loading])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    isHoveredRef.current = true
    
    // Only capture position if we are not already showing
    if (!showPopover) {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }

    if (enabled) {
      hoverTimeoutRef.current = setTimeout(() => {
        if (isHoveredRef.current) {
          setShowPopover(true)
          startGeneration()
        }
      }, delay)
    }
  }, [showPopover, enabled, delay, startGeneration])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showPopover) {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
  }, [showPopover])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    // Give a small grace period before closing (for moving to popover)
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveredRef.current = false
      setShowPopover(false)
      
      // Cleanup stream
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }
      setLoading(false)
      setText(null)
    }, 100)
  }, [])

  // Force close if disabled
  useEffect(() => {
    if (!enabled && showPopover) {
      setShowPopover(false)
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }
      setLoading(false)
      setText(null)
    }
  }, [enabled, showPopover])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current()
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  return {
    triggerProps: {
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
    popoverProps: {
      position: cursorPos,
      isOpen: showPopover,
      isLoading: loading && !text,
      text,
      onMouseEnter: () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = null
        }
        isHoveredRef.current = true
      },
      onMouseLeave: handleMouseLeave
    },
    isHovered: isHoveredRef.current
  }
}
