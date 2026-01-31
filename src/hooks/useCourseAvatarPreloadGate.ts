import React from 'react'
import { useCourseImages } from './useCourseImages'
import { preloadImage } from '../utils/imagePreload'

type Options = {
  enabled?: boolean
  once?: boolean
}

export function useCourseAvatarPreloadGate(courseIds: Array<string | number | undefined | null>, opts: Options = {}) {
  const enabled = opts.enabled ?? true
  const once = opts.once ?? true
  const { prefetchCourseImage } = useCourseImages()

  const uniqIds = React.useMemo(() => {
    const set = new Set<string>()
    for (const id of courseIds) {
      if (id == null) continue
      const s = String(id)
      if (s) set.add(s)
    }
    return Array.from(set).sort()
  }, [courseIds])

  const key = uniqIds.join('|')
  const everReadyRef = React.useRef(false)
  const [ready, setReady] = React.useState(() => (!enabled ? true : uniqIds.length === 0))

  React.useEffect(() => {
    if (!enabled) {
      everReadyRef.current = true
      setReady(true)
      return
    }
    if (uniqIds.length === 0) {
      everReadyRef.current = true
      setReady(true)
      return
    }
    if (once && everReadyRef.current) {
      // Warm any newly requested IDs in the background.
      uniqIds.forEach((id) => { prefetchCourseImage(id).catch(() => {}) })
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    ;(async () => {
      const res = await Promise.allSettled(uniqIds.map((id) => prefetchCourseImage(id)))
      const urls = res
        .map((r) => (r.status === 'fulfilled' ? r.value : undefined))
        .filter((u): u is string => typeof u === 'string' && u.length > 0)

      await Promise.allSettled(urls.map((u) => preloadImage(u)))

      if (cancelled) return
      everReadyRef.current = true
      setReady(true)
    })().catch(() => {
      if (cancelled) return
      everReadyRef.current = true
      setReady(true)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, once])

  return ready
}
