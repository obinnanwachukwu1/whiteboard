import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAppActions, useAppFlags } from '../../context/AppContext'
import { useAIPanelActions } from '../../context/AIPanelContext'

type Props = {
  url: string
  className?: string
  isFullscreen?: boolean
  onDownload?: () => void
}

type ViewerState = {
  currentPage: number
  totalPages: number
  zoom: number
  isReady: boolean
  isLoading: boolean
  error: string | null
}

type DocxEvent = {
  type: string
  [key: string]: any
}

const DocxRenderer: React.FC<Props> = ({ url, className = '', isFullscreen, onDownload }) => {
  const appActions = useAppActions()
  const aiPanel = useAIPanelActions()
  const { aiEnabled, embeddingsEnabled, privateModeEnabled } = useAppFlags()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastLoadedUrlRef = useRef<string | null>(null)

  const [viewerState, setViewerState] = useState<ViewerState>({
    currentPage: 1,
    totalPages: 0,
    zoom: 1,
    isReady: false,
    isLoading: true,
    error: null,
  })

  const sendCommand = useCallback((command: { type: string; [key: string]: unknown }) => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.postMessage(command, '*')
    } catch {}
  }, [])

  // Handle events from the iframe viewer
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const src = iframeRef.current?.contentWindow
      if (!src || event.source !== src) return

      const data = event.data as DocxEvent
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
          if (url && lastLoadedUrlRef.current !== url) {
            sendCommand({ type: 'LOAD_DOCX', url })
            lastLoadedUrlRef.current = url
          }
          break
        }

        case 'LOADING_STARTED':
          setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
          break

        case 'DOC_LOADED':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            totalPages: Number(data.pageCount) || 0,
            currentPage: Number(data.page) || 1,
            zoom: typeof data.zoom === 'number' ? data.zoom : prev.zoom,
            error: null,
          }))
          break

        case 'PAGE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            currentPage: Number(data.page) || prev.currentPage,
            totalPages: Number(data.total) || prev.totalPages,
          }))
          break

        case 'ZOOM_CHANGED':
          setViewerState((prev) => ({ ...prev, zoom: typeof data.zoom === 'number' ? data.zoom : prev.zoom }))
          break

        case 'ERROR':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            error: String(data.message || 'Unknown error'),
          }))
          break

        case 'DOWNLOAD_REQUESTED':
          onDownload?.()
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

        case 'SHORTCUT':
          if ((data as any).action === 'search' && !privateModeEnabled) appActions.onOpenSearch()
          if (
            (data as any).action === 'ai' &&
            aiEnabled &&
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
    aiPanel,
    appActions,
    onDownload,
    sendCommand,
    url,
    aiEnabled,
    embeddingsEnabled,
    privateModeEnabled,
  ])

  // Load DOCX when URL changes and viewer is ready
  useEffect(() => {
    if (!viewerState.isReady || !url) return
    if (lastLoadedUrlRef.current === url) return

    setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
    sendCommand({ type: 'LOAD_DOCX', url })
    lastLoadedUrlRef.current = url
  }, [viewerState.isReady, url, sendCommand])

  // Watch for theme changes and update viewer
  useEffect(() => {
    if (!viewerState.isReady) return
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [viewerState.isReady, sendCommand])

  return (
    <div className={`relative flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
      <iframe
        ref={iframeRef}
        src="docx-viewer://docxViewer.html"
        className="flex-1 min-h-0 w-full border-0 bg-gray-100 dark:bg-neutral-800"
        style={{ minHeight: isFullscreen ? '100%' : undefined }}
        title="DOCX Viewer"
        sandbox="allow-scripts allow-same-origin"
      />

      {viewerState.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/70 dark:bg-neutral-900/70">
          <div className="text-sm font-medium text-slate-500 dark:text-neutral-400">
            Rendering DOCX...
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

export default DocxRenderer
