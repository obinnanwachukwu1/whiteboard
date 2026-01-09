import { useEffect, useRef } from 'react'

export type GestureZoomOptions = {
  enabled?: boolean
  minScale?: number
  maxScale?: number
  getScale: () => number
  onZoom: (nextScale: number) => void
  onZoomEnd?: (finalScale: number) => void
  onPan?: (dx: number, dy: number) => void
}

export function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Hook for handling pinch-to-zoom gestures in Electron apps.
 * 
 * Supports:
 * - macOS trackpad pinch (detected via wheel event with ctrlKey from Chromium)
 * - Touch screen pinch (via touch events)
 * - Ctrl/Cmd + scroll wheel
 */
export function useGestureZoom<T extends HTMLElement>(
  ref: React.RefObject<T>,
  options: GestureZoomOptions
) {
  const { enabled = true, minScale = 0.25, maxScale = 5 } = options
  
  // Store callbacks in refs to avoid stale closures
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const getScale = () => optionsRef.current.getScale()
    const onZoom = (scale: number) => optionsRef.current.onZoom(scale)
    const onZoomEnd = (scale: number) => optionsRef.current.onZoomEnd?.(scale)
    const onPan = (dx: number, dy: number) => optionsRef.current.onPan?.(dx, dy)

    // Throttle state for wheel events
    let lastWheelTime = 0
    let pendingScale: number | null = null
    let rafId: number | null = null
    let gestureEndTimer: number | null = null
    
    const THROTTLE_MS = 32 // ~30fps for state updates

    const flushPendingScale = () => {
      if (pendingScale !== null) {
        onZoom(pendingScale)
        pendingScale = null
      }
      rafId = null
    }

    const scheduleZoom = (scale: number) => {
      pendingScale = scale
      
      // Clear gesture end timer
      if (gestureEndTimer) {
        clearTimeout(gestureEndTimer)
      }
      
      // Use RAF for smooth updates
      if (!rafId) {
        rafId = requestAnimationFrame(flushPendingScale)
      }
      
      // Schedule gesture end
      gestureEndTimer = window.setTimeout(() => {
        flushPendingScale()
        onZoomEnd(getScale())
        gestureEndTimer = null
      }, 150)
    }

    // ===== WHEEL EVENT =====
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        return // Let normal scrolling happen
      }
      
      e.preventDefault()
      e.stopPropagation()
      
      // Throttle updates
      const now = Date.now()
      if (now - lastWheelTime < THROTTLE_MS && pendingScale !== null) {
        // Just update pending scale, don't trigger yet
        const currentScale = pendingScale
        const sensitivity = 100
        const zoomFactor = Math.exp(-e.deltaY / sensitivity)
        pendingScale = clampScale(currentScale * zoomFactor, minScale, maxScale)
        return
      }
      lastWheelTime = now
      
      const currentScale = pendingScale ?? getScale()
      const sensitivity = 100
      const zoomFactor = Math.exp(-e.deltaY / sensitivity)
      const newScale = clampScale(currentScale * zoomFactor, minScale, maxScale)
      
      if (Math.abs(newScale - currentScale) > 0.001) {
        scheduleZoom(newScale)
      }
    }

    // ===== TOUCH EVENTS =====
    let initialTouchDistance = 0
    let initialScale = 1
    let lastMidpoint = { x: 0, y: 0 }

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      return Math.hypot(dx, dy)
    }

    const getMidpoint = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    })

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const [t1, t2] = [e.touches[0], e.touches[1]]
        initialTouchDistance = getDistance(t1, t2)
        initialScale = getScale()
        lastMidpoint = getMidpoint(t1, t2)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        
        const [t1, t2] = [e.touches[0], e.touches[1]]
        const currentDistance = getDistance(t1, t2)
        const currentMidpoint = getMidpoint(t1, t2)
        
        if (initialTouchDistance > 0) {
          const scale = currentDistance / initialTouchDistance
          const newScale = clampScale(initialScale * scale, minScale, maxScale)
          scheduleZoom(newScale)
        }
        
        const dx = currentMidpoint.x - lastMidpoint.x
        const dy = currentMidpoint.y - lastMidpoint.y
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          onPan(dx, dy)
        }
        
        lastMidpoint = currentMidpoint
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialTouchDistance = 0
        initialScale = getScale()
        flushPendingScale()
        onZoomEnd(getScale())
      } else if (e.touches.length === 2) {
        const [t1, t2] = [e.touches[0], e.touches[1]]
        initialTouchDistance = getDistance(t1, t2)
        initialScale = getScale()
        lastMidpoint = getMidpoint(t1, t2)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      
      if (rafId) cancelAnimationFrame(rafId)
      if (gestureEndTimer) clearTimeout(gestureEndTimer)
    }
  }, [ref, enabled, minScale, maxScale])
}
