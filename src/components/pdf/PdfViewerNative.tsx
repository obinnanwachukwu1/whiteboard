import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFileBytes, useFileMeta } from '../../hooks/useCanvasQueries'

type Props = {
  fileId: string | number
  className?: string
  fullscreen?: boolean
  onPageChange?: (page: number) => void
}

type ViewerState = {
  currentPage: number
  totalPages: number
  scale: number
  scaleMode: string | null
  selectionMode: 'text' | 'hand'
  isReady: boolean
  isLoading: boolean
  error: string | null
}

type PdfEvent = {
  type: string
  [key: string]: any
}

export const PdfViewerNative: React.FC<Props> = ({ fileId, className = '', fullscreen = false, onPageChange }) => {
  const fileUrlQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)

  const remoteUrl = (fileMetaQ.data as any)?.url as string | undefined
  const localUrl = fileUrlQ.data as string | undefined
  const url = localUrl || remoteUrl || null

  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewIdRef = useRef<string | null>(null)
  const [viewIdState, setViewIdState] = useState<string | null>(null)
  const lastLoadedUrlRef = useRef<string | null>(null)
  const lastUrlSeenRef = useRef<string | null>(null)

  const [viewerState, setViewerState] = useState<ViewerState>({
    currentPage: 1,
    totalPages: 0,
    scale: 1,
    scaleMode: 'page-width',
    selectionMode: 'text',
    isReady: false,
    isLoading: true,
    error: null,
  })

  const attemptLoadUrl = useCallback(
    async (targetUrl: string | null) => {
      const viewId = viewIdRef.current
      if (!viewId || !targetUrl) return
      if (lastLoadedUrlRef.current === targetUrl) return
      await window.viewer.command(viewId, { type: 'LOAD_PDF', url: targetUrl })
      lastLoadedUrlRef.current = targetUrl
    },
    []
  )

  // Create native view
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await window.viewer.create({ kind: 'pdf' })
      if (cancelled) return
      if (!res?.ok || !res.data?.id) {
        setViewerState((prev) => ({
          ...prev,
          isLoading: false,
          error: res?.error || 'Failed to create PDF view',
        }))
        return
      }
      viewIdRef.current = res.data.id
      setViewIdState(res.data.id)

      try {
        ;(window as any).__debugPdfViewId = res.data.id
      } catch {}

      // Send current theme immediately
      const isDark = document.documentElement.classList.contains('dark')
      await window.viewer.command(res.data.id, { type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })

      // Send computed app font stack so the viewer matches the app exactly.
      try {
        const fontFamily = window.getComputedStyle(document.body).fontFamily
        await window.viewer.command(res.data.id, { type: 'SET_APP_STYLE', fontFamily })
      } catch {}

      // Ensure the view becomes visible even if no resize/scroll occurs.
      const el = hostRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        await window.viewer.setBounds(res.data.id, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
      }
    })()

    return () => {
      cancelled = true
      const id = viewIdRef.current
      viewIdRef.current = null
      if (id) {
        window.viewer.destroy(id).catch(() => {})
      }
    }
  }, [])

  // Keep native view bounds synced to host element
  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    let raf = 0
    const update = () => {
      const viewId = viewIdRef.current
      if (!viewId) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        void window.viewer.setBounds(viewId, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
      })
    }

    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    // Capture phase so we catch scroll on any parent container.
    window.addEventListener('scroll', update, true)
    update()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  // When the view becomes available, force a bounds sync.
  useEffect(() => {
    if (!viewIdState) return
    const el = hostRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    void window.viewer.setBounds(viewIdState, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    })
  }, [viewIdState])

  // Handle events from native view
  useEffect(() => {
    const off = window.viewer.onEvent((data) => {
      const viewId = viewIdRef.current
      if (!viewId || data?.id !== viewId) return

      const evt = data.event as PdfEvent
      if (!evt || !evt.type) return

      switch (evt.type) {
        case 'READY':
          setViewerState((prev) => ({ ...prev, isReady: true }))
          // Ensure theme is applied even if earlier command raced viewer init.
          try {
            const isDark = document.documentElement.classList.contains('dark')
            void window.viewer.command(viewId, { type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
          } catch {}
          // Also ensure font is applied.
          try {
            const fontFamily = window.getComputedStyle(document.body).fontFamily
            void window.viewer.command(viewId, { type: 'SET_APP_STYLE', fontFamily })
          } catch {}
          void attemptLoadUrl(url)
          break

        case 'DOC_LOADED':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            totalPages: evt.pageCount || 0,
            scale: evt.scale || 1,
            scaleMode: evt.scaleMode || 'page-width',
            error: null,
          }))
          break

        case 'PAGE_CHANGED':
          setViewerState((prev) => ({ ...prev, currentPage: evt.page }))
          onPageChange?.(evt.page)
          break

        case 'SCALE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            scale: evt.scale,
            scaleMode: evt.presetValue || null,
          }))
          break

        case 'SELECTION_MODE_CHANGED':
          setViewerState((prev) => ({ ...prev, selectionMode: evt.mode }))
          break

        case 'ERROR':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            error: evt.message || 'Unknown error',
          }))
          break

        case 'LOADING_STARTED':
          setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
          break

        case 'COPY':
          if (evt.text) {
            const copyViaSystem = async () => {
              try {
                const sys = (window as any).system
                if (sys?.copyText) {
                  const res = await sys.copyText(evt.text)
                  if (res?.ok) return
                }
              } catch {}
              try {
                await navigator.clipboard.writeText(evt.text)
              } catch {}
            }
            void copyViaSystem()
          }
          break

        case 'DOWNLOAD_REQUESTED':
          ;(async () => {
            try {
              const filename =
                (fileMetaQ.data as any)?.filename ||
                (fileMetaQ.data as any)?.display_name ||
                'document.pdf'
              await window.system.downloadFile(fileId, filename)
            } catch {}
          })()
          break
      }
    })

    return () => {
      off?.()
    }
  }, [attemptLoadUrl, onPageChange, url])

  // Load PDF when URL changes (and viewer is ready)
  useEffect(() => {
    if (!url) return
    if (lastUrlSeenRef.current === url) return
    lastUrlSeenRef.current = url
    lastLoadedUrlRef.current = null

    if (viewerState.isReady) {
      setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
      void attemptLoadUrl(url)
    }
  }, [viewerState.isReady, url, attemptLoadUrl])

  // Watch for theme changes and update view
  useEffect(() => {
    if (!viewerState.isReady) return
    const observer = new MutationObserver(() => {
      const viewId = viewIdRef.current
      if (!viewId) return
      const isDark = document.documentElement.classList.contains('dark')
      void window.viewer.command(viewId, { type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [viewerState.isReady])

  // Defensive: continuously sync bounds (catches layout changes beyond resize/scroll events).
  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    let raf = 0
    let last: { x: number; y: number; w: number; h: number } | null = null

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const viewId = viewIdRef.current
      if (!viewId) return

      const rect = el.getBoundingClientRect()
      const next = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      const changed =
        !last ||
        Math.abs(last.x - next.x) > 0.5 ||
        Math.abs(last.y - next.y) > 0.5 ||
        Math.abs(last.w - next.w) > 0.5 ||
        Math.abs(last.h - next.h) > 0.5

      if (changed) {
        last = next
        void window.viewer.setBounds(viewId, {
          x: next.x,
          y: next.y,
          width: next.w,
          height: next.h,
        })
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Error state from file loading
  if (fileUrlQ.error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {String((fileUrlQ.error as any)?.message || 'Failed to load PDF')}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
      <div
        ref={hostRef}
        className="flex-1 min-h-0 overflow-hidden bg-gray-100 dark:bg-neutral-800"
        style={{ minHeight: fullscreen ? '100%' : undefined }}
      />
    </div>
  )
}

export default PdfViewerNative
