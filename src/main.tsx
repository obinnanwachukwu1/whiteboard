import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastProvider } from './components/ui/Toaster'
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
    },
  },
})

function useQueryPersistence(client: QueryClient) {
  // Hydrate once on boot
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get()
        const snap = (cfg.ok ? (cfg.data as any)?.queryCache : undefined)
        if (snap && mounted) {
          try { hydrate(client, snap as any) } catch (e) { console.warn('Failed to hydrate cache', e) }
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [client])

  // Debounced, filtered persistence to reduce disk writes and navigation lag
  React.useEffect(() => {
    let t: any = null
    const allowKeys = new Set(['profile', 'courses', 'due-assignments'])
    const flush = () => {
      try {
        const snap = dehydrate(client, {
          shouldDehydrateQuery: (q) => {
            const key0 = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : ''
            return q.state.status === 'success' && allowKeys.has(key0)
          },
        })
        const schedule = (cb: () => void) => {
          const ric: any = (window as any).requestIdleCallback
          if (typeof ric === 'function') ric(cb)
          else setTimeout(cb, 500)
        }
        schedule(() => { window.settings.set({ queryCache: snap as any }).catch(() => {}) })
      } catch {}
    }
    const onChange = () => {
      if (t) clearTimeout(t)
      t = setTimeout(flush, 1500)
    }
    const unsub = client.getQueryCache().subscribe(onChange)
    return () => { if (t) clearTimeout(t); unsub() }
  }, [client])
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      console.info('[whiteboard] Renderer boot location', window.location.href)
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

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ErrorBoundary>
            <Bootstrap>
              <RouterProvider router={router} />
            </Bootstrap>
          </ErrorBoundary>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </ToastProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

main()

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
