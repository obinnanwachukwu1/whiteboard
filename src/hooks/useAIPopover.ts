import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const textRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const streamCleanupRef = useRef<(() => void) | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const CLOSE_GRACE_MS = 90
  const EXIT_ANIM_MS = 200

  // Store onGenerate in a ref so it doesn't reset the hover timer on every render
  const onGenerateRef = useRef(onGenerate)
  onGenerateRef.current = onGenerate

  const setTextState = useCallback((next: string | null) => {
    textRef.current = next
    setText(next)
  }, [])

  const setLoadingState = useCallback((next: boolean) => {
    loadingRef.current = next
    setLoading(next)
  }, [])

  const startGeneration = useCallback(() => {
    // Start generation if not already done/doing
    if (!textRef.current && !loadingRef.current) {
      setLoadingState(true)
      const result = onGenerateRef.current((newText) => {
        setTextState(newText)
      })

      if (result === false) {
        setLoadingState(false)
      } else if (typeof result === 'function') {
        streamCleanupRef.current = result
      }
    }
  }, [setLoadingState, setTextState])

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (closeCleanupTimeoutRef.current) {
        clearTimeout(closeCleanupTimeoutRef.current)
        closeCleanupTimeoutRef.current = null
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      isHoveredRef.current = true

      if (!showPopover) {
        cursorPosRef.current = { x: e.clientX, y: e.clientY }
      }

      if (enabled) {
        hoverTimeoutRef.current = setTimeout(() => {
          if (isHoveredRef.current) {
            if (!showPopover) {
              setCursorPos(cursorPosRef.current)
            }
            setShowPopover(true)
            startGeneration()
          }
        }, delay)
      }
    },
    [showPopover, enabled, delay, startGeneration],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!showPopover) {
        cursorPosRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    [showPopover],
  )

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (closeCleanupTimeoutRef.current) {
      clearTimeout(closeCleanupTimeoutRef.current)
      closeCleanupTimeoutRef.current = null
    }

    // Give a small grace period before closing (for moving to popover)
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveredRef.current = false
      setShowPopover(false)

      // Stop any in-flight stream immediately, but keep content around
      // during the exit animation so the popover closes smoothly.
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }

      closeCleanupTimeoutRef.current = setTimeout(() => {
        if (isHoveredRef.current) return
        setCursorPos(null)
        setLoadingState(false)
        setTextState(null)
      }, EXIT_ANIM_MS)
    }, CLOSE_GRACE_MS)
  }, [setLoadingState, setTextState])

  // Force close if disabled
  useEffect(() => {
    if (!enabled && showPopover) {
      setShowPopover(false)
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }

      if (closeCleanupTimeoutRef.current) {
        clearTimeout(closeCleanupTimeoutRef.current)
      }
      closeCleanupTimeoutRef.current = setTimeout(() => {
        setCursorPos(null)
        setLoadingState(false)
        setTextState(null)
      }, EXIT_ANIM_MS)
    }
  }, [enabled, showPopover, setLoadingState, setTextState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) streamCleanupRef.current()
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (closeCleanupTimeoutRef.current) clearTimeout(closeCleanupTimeoutRef.current)
    }
  }, [])

  return {
    triggerProps: useMemo(
      () => ({
        onMouseEnter: handleMouseEnter,
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
      }),
      [handleMouseEnter, handleMouseMove, handleMouseLeave],
    ),
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
        if (closeCleanupTimeoutRef.current) {
          clearTimeout(closeCleanupTimeoutRef.current)
          closeCleanupTimeoutRef.current = null
        }
        isHoveredRef.current = true
      },
      onMouseLeave: handleMouseLeave,
    },
    isHovered: isHoveredRef.current,
  }
}
