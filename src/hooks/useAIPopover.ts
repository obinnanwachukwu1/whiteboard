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
  const [isHovered, setIsHovered] = useState(false)
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const streamCleanupRef = useRef<(() => void) | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(true)
    if (!showPopover) {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
  }, [showPopover])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showPopover) {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
  }, [showPopover])

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 100)
  }, [])

  // Trigger Logic
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isHovered && enabled) {
      // If we are hovering...
      if (showPopover) return // Already showing, do nothing

      // Wait for delay
      timer = setTimeout(() => {
        if (isHovered) {
          setShowPopover(true)
          
          // Start generation if not already done/doing
          if (!text && !loading) {
            setLoading(true)
            const result = onGenerate((newText) => {
              setText(newText)
            })

            if (result === false) {
              setLoading(false)
            } else if (typeof result === 'function') {
              streamCleanupRef.current = result
            }
          }
        }
      }, delay)
    } else {
      // Not hovered or disabled
      setShowPopover(false)
      
      // Cleanup stream
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }
      
      setLoading(false)
      setText(null)
    }
    
    return () => clearTimeout(timer)
  }, [isHovered, enabled, showPopover, text, loading, delay, onGenerate])

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
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setIsHovered(true)
      },
      onMouseLeave: handleMouseLeave
    },
    isHovered
  }
}
