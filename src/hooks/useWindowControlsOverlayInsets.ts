import { useEffect } from 'react'

type WindowControlsOverlayLike = {
  visible?: boolean
  getTitlebarAreaRect?: () => DOMRect
  addEventListener?: (type: 'geometrychange', listener: () => void) => void
  removeEventListener?: (type: 'geometrychange', listener: () => void) => void
}

/**
 * Windows-only: when using Electron's `titleBarOverlay`, the native caption buttons
 * live inside the header area. This hook computes the right inset so UI elements
 * (search/profile) don't render underneath the caption buttons.
 */
export function useWindowControlsOverlayInsets(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const root = document.documentElement
    const wco = (navigator as unknown as { windowControlsOverlay?: WindowControlsOverlayLike }).windowControlsOverlay
    if (!wco || typeof wco.getTitlebarAreaRect !== 'function') return

    let raf: number | null = null

    const apply = () => {
      try {
        if (wco.visible === false) {
          root.style.removeProperty('--titlebar-left-inset')
          root.style.removeProperty('--titlebar-right-inset')
          root.style.removeProperty('--titlebar-height')
          return
        }

        // Call as a method to preserve the internal receiver (avoids "Illegal invocation").
        const rect = wco.getTitlebarAreaRect!()
        const viewportWidth = root.clientWidth || window.innerWidth
        const leftInset = Math.max(0, rect.x)
        const rightInset = Math.max(0, viewportWidth - (rect.x + rect.width))

        root.style.setProperty('--titlebar-left-inset', `${Math.round(leftInset)}px`)
        root.style.setProperty('--titlebar-right-inset', `${Math.round(rightInset)}px`)
        root.style.setProperty('--titlebar-height', `${Math.round(rect.height)}px`)
      } catch {
        // If the API is present but throws in a given environment, fall back to CSS defaults.
      }
    }

    apply()

    const onGeom = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => apply())
    }
    // Some implementations require a bound receiver for DOM-style methods.
    wco.addEventListener?.call(wco, 'geometrychange', onGeom)
    window.addEventListener('resize', onGeom)

    return () => {
      wco.removeEventListener?.call(wco, 'geometrychange', onGeom)
      window.removeEventListener('resize', onGeom)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled])
}
