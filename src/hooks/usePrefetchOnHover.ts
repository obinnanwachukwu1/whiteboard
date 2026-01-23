import { useRef, useCallback, useEffect } from 'react'
import { useQueryClient, type FetchQueryOptions } from '@tanstack/react-query'

type PrefetchOptions = FetchQueryOptions & {
  delay?: number // ms to wait before triggering prefetch (default 150)
  enabled?: boolean // whether to enable prefetching (default true)
}

/**
 * Returns event handlers to attach to an element (onMouseEnter, onMouseLeave)
 * that trigger a delayed prefetch. If the user leaves before the delay,
 * the prefetch is cancelled (not started).
 */
export function usePrefetchOnHover(options: PrefetchOptions) {
  const queryClient = useQueryClient()
  const timerRef = useRef<any>(null)
  const { delay = 150, enabled = true, ...queryOptions } = options

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onMouseEnter = useCallback(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    
    // Check if already in cache to avoid setting up a timer unnecessarily?
    // queryClient.getQueryState(queryOptions.queryKey) could tell us.
    // But prefetchQuery handles idempotency well (it won't fetch if fresh).
    
    timerRef.current = setTimeout(() => {
      queryClient.prefetchQuery(queryOptions).catch(() => {
        // ignore errors
      })
    }, delay)
  }, [queryClient, delay, enabled, queryOptions])

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // We do NOT cancel the query here if it has already started.
    // Cancellation at the network layer isn't supported by our IPC,
    // and cancelling the promise just leaves 'fetching' state hanging in some cases.
    // The delay is our primary filter.
  }, [])

  return { onMouseEnter, onMouseLeave }
}
