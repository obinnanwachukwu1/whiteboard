import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFileBytes, useFileMeta } from '../../hooks/useCanvasQueries'
import { useAppActions, useAppFlags } from '../../context/AppContext'
import { useAIPanelActions } from '../../context/AIPanelContext'

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

export const PdfViewerIframe: React.FC<Props> = ({
  fileId,
  className = '',
  fullscreen = false,
  onPageChange,
}) => {
  const appActions = useAppActions()
  const aiPanel = useAIPanelActions()
  const { aiEnabled, aiAvailable, embeddingsEnabled, privateModeEnabled } = useAppFlags()
  const fileUrlQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)

  const remoteUrl = (fileMetaQ.data as any)?.url as string | undefined
  const localUrl = fileUrlQ.data as string | undefined
  const url = localUrl || remoteUrl || null

  const iframeRef = useRef<HTMLIFrameElement>(null)
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

  const parentOrigin = React.useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin || ''
  }, [])

  const iframeSrc = React.useMemo(() => {
    if (!parentOrigin) return 'pdf-viewer://pdfViewer.html'
    return `pdf-viewer://pdfViewer.html?parentOrigin=${encodeURIComponent(parentOrigin)}`
  }, [parentOrigin])

  const sendCommand = useCallback((command: { type: string; [key: string]: any }) => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    let targetOrigin = '*'
    try {
      const src = iframeRef.current?.src
      if (src) {
        targetOrigin = new URL(src).origin
      }
    } catch {}
    try {
      win.postMessage(command, targetOrigin)
    } catch {}
  }, [])

  const attemptLoadUrl = useCallback(
    (targetUrl: string | null) => {
      if (!targetUrl) return
      if (lastLoadedUrlRef.current === targetUrl) return
      sendCommand({ type: 'LOAD_PDF', url: targetUrl })
      lastLoadedUrlRef.current = targetUrl
    },
    [sendCommand],
  )

  // Handle events from the iframe viewer
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const src = iframeRef.current?.contentWindow
      if (!src || event.source !== src) return
      try {
        const expectedOrigin = iframeRef.current?.src
          ? new URL(iframeRef.current.src).origin
          : null
        if (expectedOrigin && event.origin !== expectedOrigin) return
      } catch {
        return
      }

      const data = event.data as PdfEvent
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return

      switch (data.type) {
        case 'READY': {
          setViewerState((prev) => ({ ...prev, isReady: true }))
          // Ensure viewer theme matches app
          try {
            const isDark = document.documentElement.classList.contains('dark')
            sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
          } catch {}
          // Ensure viewer typography matches app
          try {
            const fontFamily = window.getComputedStyle(document.body).fontFamily
            sendCommand({ type: 'SET_APP_STYLE', fontFamily })
          } catch {}

          attemptLoadUrl(url)
          break
        }

        case 'DOC_LOADED':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            totalPages: data.pageCount || 0,
            scale: data.scale || 1,
            scaleMode: data.scaleMode || 'page-width',
            error: null,
          }))
          break

        case 'PAGE_CHANGED':
          setViewerState((prev) => ({ ...prev, currentPage: data.page }))
          onPageChange?.(data.page)
          break

        case 'SCALE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            scale: data.scale || 1,
            scaleMode: data.presetValue || null,
          }))
          break

        case 'SELECTION_MODE_CHANGED':
          setViewerState((prev) => ({ ...prev, selectionMode: data.mode || 'text' }))
          break

        case 'LOADING_STARTED':
          setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
          break

        case 'ERROR':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            error: data.message || 'Unknown error',
          }))
          break

        case 'COPY':
          if (data.text) {
            ;(async () => {
              try {
                const sys = (window as any).system
                if (sys?.copyText) {
                  const res = await sys.copyText(String(data.text))
                  if (res?.ok) return
                }
              } catch {}
              try {
                await navigator.clipboard.writeText(String(data.text))
              } catch {}
            })()
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

        case 'SHORTCUT':
          if (data.action === 'search' && !privateModeEnabled) appActions.onOpenSearch()
          if (
            data.action === 'ai' &&
            aiEnabled &&
            aiAvailable &&
            embeddingsEnabled &&
            !privateModeEnabled
          ) {
            aiPanel.open()
          }
          break
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [
    attemptLoadUrl,
    fileId,
    fileMetaQ.data,
    onPageChange,
    sendCommand,
    url,
    appActions,
    aiPanel,
    aiEnabled,
    aiAvailable,
    embeddingsEnabled,
    privateModeEnabled,
  ])

  // Load PDF when URL changes (and viewer is ready)
  useEffect(() => {
    if (!url) return
    if (lastUrlSeenRef.current === url) return
    lastUrlSeenRef.current = url
    lastLoadedUrlRef.current = null

    if (viewerState.isReady) {
      setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
      attemptLoadUrl(url)
    }
  }, [viewerState.isReady, url, attemptLoadUrl])

  // Watch for theme changes and update iframe
  useEffect(() => {
    if (!viewerState.isReady) return
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [viewerState.isReady, sendCommand])

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
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="flex-1 min-h-0 w-full border-0 bg-gray-100 dark:bg-neutral-800"
        style={{ minHeight: fullscreen ? '100%' : undefined }}
        title="PDF Viewer"
        sandbox="allow-scripts allow-same-origin"
      />

      {viewerState.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/70 dark:bg-neutral-900/70">
          <div className="text-sm font-medium text-slate-500 dark:text-neutral-400">
            Rendering PDF...
          </div>
        </div>
      )}

      {viewerState.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/70 dark:bg-neutral-900/70">
          <div className="text-red-600 dark:text-red-400 text-sm text-center p-4">
            {viewerState.error}
          </div>
        </div>
      )}
    </div>
  )
}

export default PdfViewerIframe
