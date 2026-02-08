import React from 'react'
import { createPortal } from 'react-dom'

type Props = {
  className?: string
  children: (ctx: { isFullscreen: boolean; enter: () => Promise<void>; exit: () => Promise<void>; toggle: () => Promise<void>; containerRef: React.RefObject<HTMLDivElement> }) => React.ReactNode
}

const LAYOUT_ANIMATION_NAMES = new Set(['ai-panel-expand', 'ai-panel-collapse'])

export const FullscreenContainer: React.FC<Props> = ({ className = '', children }) => {
  // "Fullscreen" here is an in-app focus mode, not OS / native fullscreen.
  // Render via a portal so focus mode can cover the entire window (header/sidebar
  // included) and isn't constrained by parent overflow/stacking contexts.
  //
  // To avoid remounting heavy viewers (native PDF view, etc.), we always render
  // the children in the portal and simply resize/reposition the portal wrapper.
  const placeholderRef = React.useRef<HTMLDivElement | null>(null)
  const portalRef = React.useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [bounds, setBounds] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const measure = React.useCallback(() => {
    const el = placeholderRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBounds((prev) => {
      const next = { top: r.top, left: r.left, width: r.width, height: r.height }
      const changed =
        !prev ||
        Math.abs(prev.top - next.top) > 0.5 ||
        Math.abs(prev.left - next.left) > 0.5 ||
        Math.abs(prev.width - next.width) > 0.5 ||
        Math.abs(prev.height - next.height) > 0.5
      return changed ? next : prev
    })
  }, [])

  React.useLayoutEffect(() => {
    measure()
  }, [measure])

  React.useLayoutEffect(() => {
    const el = placeholderRef.current
    if (!el) return

    let raf = 0
    const onChange = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    const ro = new ResizeObserver(onChange)
    ro.observe(el)

    // Some layout changes move the placeholder without resizing it (e.g. AI side panel
    // animating width while the content stays at max-width + centered). ResizeObserver
    // won't fire in that case, so we track those animations explicitly.
    let animRaf = 0
    let animUntil = 0
    const tickAnim = () => {
      animRaf = 0
      measure()
      if (performance.now() < animUntil) {
        animRaf = requestAnimationFrame(tickAnim)
      }
    }
    const startAnimSync = (ms: number) => {
      const dur = Number.isFinite(ms) ? Math.max(0, ms) : 0
      animUntil = Math.max(animUntil, performance.now() + dur)
      if (!animRaf) animRaf = requestAnimationFrame(tickAnim)
    }
    const onAnim = (e: Event) => {
      const evt = e as AnimationEvent
      if (!evt?.animationName) return
      if (!LAYOUT_ANIMATION_NAMES.has(evt.animationName)) return
      startAnimSync(420)
    }

    window.addEventListener('resize', onChange)
    // Capture phase so we catch scroll in nested containers too.
    window.addEventListener('scroll', onChange, true)
    document.addEventListener('animationstart', onAnim, true)
    document.addEventListener('animationend', onAnim, true)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (animRaf) cancelAnimationFrame(animRaf)
      ro.disconnect()
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
      document.removeEventListener('animationstart', onAnim, true)
      document.removeEventListener('animationend', onAnim, true)
    }
  }, [measure])

  React.useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const toggle = async () => {
    setIsFullscreen((v) => !v)
  }

  const portalStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }
    : bounds
      ? {
          position: 'fixed',
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          zIndex: 15, // Must be above glass layer (z-5) and main content (z-10)
        }
      : {
          position: 'fixed',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          zIndex: 15,
          pointerEvents: 'none',
        }

  return (
    <>
      <div ref={placeholderRef} className={`relative w-full h-full ${className}`} aria-hidden="true" />
      {typeof document === 'undefined'
        ? null
        : createPortal(
            <div
              ref={portalRef}
              className={
                isFullscreen
                  ? `bg-[var(--app-accent-root)] ${className}`
                  : className
              }
              style={portalStyle}
            >
              {children({
                isFullscreen,
                enter: async () => setIsFullscreen(true),
                exit: async () => setIsFullscreen(false),
                toggle,
                containerRef: portalRef,
              })}
            </div>,
            document.body
          )}
    </>
  )
}
