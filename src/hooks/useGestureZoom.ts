import React from 'react'

type GestureSource = 'wheel' | 'pinch'

export type GestureZoomOptions = {
  enabled?: boolean
  minScale?: number
  maxScale?: number
  getScale: () => number
  onZoom: (nextScale: number, source: GestureSource, point?: { clientX?: number; clientY?: number }) => void
  onPan?: (dx: number, dy: number) => void
  onGestureStart?: (source: GestureSource) => void
  onGestureEnd?: (source: GestureSource) => void
}

const PIXELS_PER_LINE = 32
const PIXELS_PER_PAGE = 320

export function clampScale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function wheelDeltaToScaleFactor(deltaY: number, deltaMode: number = 0): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1
  const pixels =
    deltaMode === 1
      ? deltaY * PIXELS_PER_LINE
      : deltaMode === 2
      ? deltaY * PIXELS_PER_PAGE
      : deltaY
  const clamped = Math.max(-1000, Math.min(1000, pixels))
  if (Math.abs(clamped) < 0.5) return 1
  return Math.exp(-clamped / 420)
}

export function useGestureZoom<T extends HTMLElement>(ref: React.RefObject<T>, options: GestureZoomOptions) {
  const { enabled = true, minScale = 0.5, maxScale = 3 } = options
  const getScaleRef = React.useRef(options.getScale)
  const onZoomRef = React.useRef(options.onZoom)
  const onPanRef = React.useRef(options.onPan)
  const boundsRef = React.useRef({ minScale, maxScale })

  React.useEffect(() => {
    getScaleRef.current = options.getScale
  }, [options.getScale])

  React.useEffect(() => {
    onZoomRef.current = options.onZoom
  }, [options.onZoom])

  React.useEffect(() => {
    onPanRef.current = options.onPan
  }, [options.onPan])

  React.useEffect(() => {
    boundsRef.current = { minScale, maxScale }
  }, [minScale, maxScale])

  React.useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const pointerState = new Map<number, { x: number; y: number }>()
    let pinchStartDistance: number | null = null
    let pinchStartScale: number | null = null
    let pinchRaf = 0
    let pinchStartMidpoint: { x: number; y: number } | null = null
    let wheelAccum = 0
    let wheelMode = 0
    let wheelRaf = 0
    let wheelActive = false
    let wheelIdleTimeout: number | null = null
    let pinchActive = false
    let wheelPoint: { clientX: number; clientY: number } | null = null

    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window
    const prevTouchAction = supportsPointer ? el.style.touchAction : undefined

    if (supportsPointer) {
      el.style.touchAction = 'none'
    }

    const startGesture = (source: GestureSource) => {
      if (source === 'wheel') {
        if (!wheelActive) {
          wheelActive = true
          options.onGestureStart?.(source)
        }
      } else if (source === 'pinch') {
        if (!pinchActive) {
          pinchActive = true
          options.onGestureStart?.(source)
        }
      }
    }

    const endGesture = (source: GestureSource) => {
      if (source === 'wheel') {
        if (wheelActive) {
          wheelActive = false
          options.onGestureEnd?.(source)
        }
      } else if (source === 'pinch') {
        if (pinchActive) {
          pinchActive = false
          options.onGestureEnd?.(source)
        }
      }
    }

    const scheduleWheelGestureEnd = () => {
      if (wheelIdleTimeout) window.clearTimeout(wheelIdleTimeout)
      wheelIdleTimeout = window.setTimeout(() => {
        wheelIdleTimeout = null
        endGesture('wheel')
      }, 160)
    }

    const applyWheel = () => {
      wheelRaf = 0
      if (wheelAccum === 0) return
      const { minScale: min, maxScale: max } = boundsRef.current
      const current = getScaleRef.current()
      const factor = wheelDeltaToScaleFactor(wheelAccum, wheelMode)
      wheelAccum = 0
      wheelMode = 0
      if (!Number.isFinite(current)) return
      const next = clampScale(current * factor, min, max)
      if (Math.abs(next - current) < 0.0001) return
      onZoomRef.current(next, 'wheel', wheelPoint || undefined)
      wheelPoint = null
    }

    const scheduleWheel = () => {
      if (!wheelRaf) wheelRaf = window.requestAnimationFrame(applyWheel)
    }

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      if (!Number.isFinite(event.deltaY)) return
      if (wheelRaf === 0) {
        wheelAccum = 0
        wheelMode = event.deltaMode
      }
      startGesture('wheel')
      wheelAccum += event.deltaY
      wheelPoint = { clientX: event.clientX, clientY: event.clientY }
      scheduleWheel()
      scheduleWheelGestureEnd()
    }

    const resetPinch = () => {
      pinchStartDistance = null
      pinchStartScale = null
      pinchStartMidpoint = null
    }

    const applyPinch = () => {
      pinchRaf = 0
      if (pointerState.size < 2 || pinchStartDistance === null || pinchStartDistance <= 0 || pinchStartScale === null) return
      const pointers = Array.from(pointerState.values())
      if (pointers.length < 2) return
      const dist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y)
      if (!Number.isFinite(dist) || dist <= 0) return
      const ratio = dist / pinchStartDistance
      if (!Number.isFinite(ratio) || ratio <= 0) return
      const { minScale: min, maxScale: max } = boundsRef.current
      const next = clampScale(pinchStartScale * ratio, min, max)
      const cx = (pointers[0].x + pointers[1].x) / 2
      const cy = (pointers[0].y + pointers[1].y) / 2
      const dx = pinchStartMidpoint ? cx - pinchStartMidpoint.x : 0
      const dy = pinchStartMidpoint ? cy - pinchStartMidpoint.y : 0
      if (Math.abs(next - pinchStartScale) >= 0.0001) {
        onZoomRef.current(next, 'pinch', { clientX: cx, clientY: cy })
      }
      if (onPanRef.current && pinchStartMidpoint) {
        onPanRef.current(dx, dy)
      }
      pinchStartScale = next
      pinchStartDistance = dist
      pinchStartMidpoint = { x: cx, y: cy }
    }

    const schedulePinch = () => {
      if (!pinchRaf) pinchRaf = window.requestAnimationFrame(applyPinch)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      try { el.setPointerCapture(event.pointerId) } catch {}
      pointerState.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointerState.size === 2) {
        const pointers = Array.from(pointerState.values())
        pinchStartDistance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y)
        pinchStartScale = getScaleRef.current()
        pinchStartMidpoint = { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 }
        startGesture('pinch')
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerState.has(event.pointerId) || event.pointerType !== 'touch') return
      pointerState.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointerState.size >= 2) {
        event.preventDefault()
        schedulePinch()
      }
    }

    const releasePointer = (event: PointerEvent) => {
      if (pointerState.has(event.pointerId)) pointerState.delete(event.pointerId)
      if (event.pointerType === 'touch') {
        try { el.releasePointerCapture(event.pointerId) } catch {}
      }
      if (pointerState.size < 2) resetPinch()
      if (pointerState.size < 2) endGesture('pinch')
    }

    el.addEventListener('wheel', onWheel, { passive: false })

    if (supportsPointer) {
      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('pointerup', releasePointer)
      el.addEventListener('pointercancel', releasePointer)
      el.addEventListener('pointerout', releasePointer)
      el.addEventListener('pointerleave', releasePointer)
    }

    return () => {
      el.removeEventListener('wheel', onWheel)
      if (supportsPointer) {
        el.removeEventListener('pointerdown', onPointerDown)
        el.removeEventListener('pointermove', onPointerMove)
        el.removeEventListener('pointerup', releasePointer)
        el.removeEventListener('pointercancel', releasePointer)
        el.removeEventListener('pointerout', releasePointer)
        el.removeEventListener('pointerleave', releasePointer)
        if (prevTouchAction !== undefined) el.style.touchAction = prevTouchAction
      }
      if (wheelIdleTimeout) window.clearTimeout(wheelIdleTimeout)
      if (wheelRaf) window.cancelAnimationFrame(wheelRaf)
      if (pinchRaf) window.cancelAnimationFrame(pinchRaf)
      pointerState.clear()
      resetPinch()
      endGesture('wheel')
      endGesture('pinch')
    }
  }, [ref, enabled])
}
