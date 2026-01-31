import React from 'react'
import { isImagePreloaded, preloadImage } from '../utils/imagePreload'

type Options = {
  enabled?: boolean
  /**
   * If true, once the gate becomes ready it will stay ready.
   * We still preload new URLs in the background.
   */
  once?: boolean
}

export function useImagePreloadGate(urls: Array<string | undefined | null>, opts: Options = {}) {
  const enabled = opts.enabled ?? true
  const once = opts.once ?? true
  const everReadyRef = React.useRef(false)

  const uniq = React.useMemo(() => {
    const set = new Set<string>()
    for (const u of urls) {
      if (typeof u === 'string' && u) set.add(u)
    }
    return Array.from(set).sort()
  }, [urls])

  const key = uniq.join('|')

  const isReadyNow = React.useMemo(() => {
    if (!enabled) return true
    if (once && everReadyRef.current) return true
    return uniq.every((u) => isImagePreloaded(u))
  }, [enabled, once, uniq])

  const [ready, setReady] = React.useState(isReadyNow)

  React.useEffect(() => {
    if (!enabled) {
      everReadyRef.current = true
      setReady(true)
      return
    }

    // If we already crossed the gate once, keep the UI stable.
    if (once && everReadyRef.current) {
      // still warm any new URLs
      uniq.forEach((u) => {
        preloadImage(u).catch(() => {})
      })
      setReady(true)
      return
    }

    const immediate = uniq.every((u) => isImagePreloaded(u))
    if (immediate) {
      everReadyRef.current = true
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)
    Promise.allSettled(uniq.map((u) => preloadImage(u)))
      .then(() => {
        if (cancelled) return
        everReadyRef.current = true
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        everReadyRef.current = true
        setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [key, enabled, once])

  return ready
}
