import './wdyr'

// Polyfill URL.parse for older Chromium versions (Electron 30 uses Chrome 124, URL.parse added in Chrome 126)
// This is needed by pdfjs-dist v5.x
if (typeof URL.parse !== 'function') {
  (URL as any).parse = function(url: string, base?: string): URL | null {
    try {
      return new URL(url, base)
    } catch {
      return null
    }
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toaster'

// Lazy load devtools only in development
const ReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
)
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { bootstrapTheme } from './utils/themeBootstrap'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Electron app: avoid noisy refetches
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      staleTime: 1000 * 60, // 1 minute default
      // Default GC is 5 minutes; in an Electron app this causes unnecessary
      // re-fetch/popping when navigating back and forth.
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
})

function useQueryPersistence(client: QueryClient) {
  // Debounced, filtered persistence to reduce disk writes and navigation lag
  React.useEffect(() => {
    let t: any = null
    const allowKeys = new Set([
      'profile',
      'courses',
      'due-assignments',
      'course-gradebook',
      'activity-announcements',
      'course-discussions',
      // Dashboard priority inputs
      'course-assignment-groups-with-assignments',
      // Dashboard computed ordering (for stable first paint)
      'dashboard-priority-order',
      'course-info',
      'upcoming',
      'todo',
      'course-tabs',
      'account-notifications',
      // Inbox (opt-in: stores message previews/threads on disk)
      'conversations',
      'conversation',
      'unread-count',
      'conversation-workflow-overrides',
      'unread-count-local-delta-map',
      // Dashboard: recent feedback comment lookups
      'submission-details',
    ])
    const isPersistableDiscussions = (queryKey: unknown) => {
      if (!Array.isArray(queryKey)) return false
      const params = queryKey[3] as Record<string, unknown> | undefined
      if (!params || typeof params !== 'object') return true
      const keys = Object.keys(params)
      if (keys.length === 0) return true
      if (params.searchTerm || params.filterBy || params.scope || params.orderBy) return false
      return params.maxPages === 2 && keys.every((k) => k === 'maxPages')
    }
    const isPrivateMode = () => {
      try {
        return localStorage.getItem('wb-private-mode') === '1'
      } catch {
        return false
      }
    }
    const flush = () => {
      if (isPrivateMode()) return
      try {
        const snap = dehydrate(client, {
          shouldDehydrateQuery: (q) => {
            const key0 = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : ''
            if (key0 === 'course-discussions') {
              return q.state.status === 'success' && isPersistableDiscussions(q.queryKey)
            }
            return q.state.status === 'success' && allowKeys.has(key0)
          },
        })
        const schedule = (cb: () => void) => {
          const ric: any = (window as any).requestIdleCallback
          if (typeof ric === 'function') ric(cb)
          else setTimeout(cb, 500)
        }
        schedule(() => {
          if (isPrivateMode()) return
          window.settings.set({ queryCache: snap as any }).catch(() => {})
        })
      } catch {}
    }
    const onChange = () => {
      if (t) clearTimeout(t)
      t = setTimeout(flush, 1500)
    }
    const unsub = client.getQueryCache().subscribe(onChange)

    // Best-effort flush on window close/background.
    const onBeforeUnload = () => {
      try { flush() } catch {}
    }
    const onVisibility = () => {
      try {
        if (document.visibilityState === 'hidden') flush()
      } catch {}
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (t) clearTimeout(t)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      unsub()
    }
  }, [client])
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      console.info('[whiteboard] Renderer boot location', window.location.href)
    }
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    let t: number | null = null
    const show = () => {
      root.classList.add('show-scrollbars')
      if (t) window.clearTimeout(t)
      t = window.setTimeout(() => {
        root.classList.remove('show-scrollbars')
        t = null
      }, 800)
    }
    document.addEventListener('scroll', show, { passive: true, capture: true })
    return () => {
      document.removeEventListener('scroll', show, true)
      if (t) window.clearTimeout(t)
      root.classList.remove('show-scrollbars')
    }
  }, [])

  useQueryPersistence(queryClient)
  return <>{children}</>
}

async function main() {
  if (typeof window !== 'undefined') {
    try {
      await bootstrapTheme()
    } catch (err) {
      console.warn('Failed to bootstrap theme', err)
    }
  }

  // Hydrate query cache before the first render so pages can show cached data
  // immediately (no initial skeleton/popping).
  try {
    const cfg = await window.settings.get()
    const snap = (cfg.ok ? (cfg.data as any)?.queryCache : undefined)
    if (snap) {
      try {
        hydrate(queryClient, snap as any)
      } catch (e) {
        console.warn('Failed to hydrate cache', e)
      }
    }
  } catch {}

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ErrorBoundary>
            <Bootstrap>
              <RouterProvider router={router} />
            </Bootstrap>
          </ErrorBoundary>
          {import.meta.env.DEV && (
            <React.Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
            </React.Suspense>
          )}
        </ToastProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

main()

// Use contextBridge
window.electron.onMainProcessMessage((message) => {
  console.log(message)
})
