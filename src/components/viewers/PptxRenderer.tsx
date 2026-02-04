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
  currentSlide: number
  totalSlides: number
  scale: number
  scaleMode: string | null
  isSlideMode: boolean
  isReady: boolean
  isLoading: boolean
  error: string | null
}

type PptxEvent = {
  type: string
  [key: string]: unknown
}

const PptxRenderer: React.FC<Props> = ({ url, className = '', isFullscreen, onDownload }) => {
  const appActions = useAppActions()
  const aiPanel = useAIPanelActions()
  const { aiEnabled, embeddingsEnabled, privateModeEnabled } = useAppFlags()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentSlide: 1,
    totalSlides: 0,
    scale: 1,
    scaleMode: 'fit-width',
    isSlideMode: false,
    isReady: false,
    isLoading: true,
    error: null,
  })
  const lastLoadedUrlRef = useRef<string | null>(null)

  /**
   * Send a command to the iframe viewer
   */
  const sendCommand = useCallback((command: { type: string; [key: string]: unknown }) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage(command, '*')
  }, [])

  /**
   * Handle messages from the iframe
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      const src = iframeRef.current?.contentWindow
      if (!src || event.source !== src) return

      const data = event.data as PptxEvent
      if (!data || !data.type) return

      switch (data.type) {
        case 'READY': {
          setViewerState((prev) => ({ ...prev, isReady: true }))
          // Send theme when ready
          const isDark = document.documentElement.classList.contains('dark')
          sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
          // Send font family
          try {
            const fontFamily = window.getComputedStyle(document.body).fontFamily
            sendCommand({ type: 'SET_APP_STYLE', fontFamily })
          } catch {}
          // Load the PPTX file
          if (url && lastLoadedUrlRef.current !== url) {
            sendCommand({ type: 'LOAD_PPTX', url })
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
            totalSlides: (data.slideCount as number) || 0,
            scale: (data.scale as number) || 1,
            scaleMode: (data.scaleMode as string) || 'fit-width',
            error: null,
          }))
          break

        case 'SLIDE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            currentSlide: (data.slide as number) || 1,
            totalSlides: (data.total as number) || prev.totalSlides,
          }))
          break

        case 'SCALE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            scale: (data.scale as number) || 1,
            scaleMode: (data.scaleMode as string) || null,
          }))
          break

        case 'SLIDE_MODE_CHANGED':
          setViewerState((prev) => ({
            ...prev,
            isSlideMode: (data.slideMode as boolean) || false,
          }))
          break

        case 'ERROR':
          setViewerState((prev) => ({
            ...prev,
            isLoading: false,
            error: (data.message as string) || 'Unknown error',
          }))
          break

        case 'DOWNLOAD_REQUESTED':
          onDownload?.()
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

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [
    url,
    sendCommand,
    onDownload,
    appActions,
    aiPanel,
    aiEnabled,
    embeddingsEnabled,
    privateModeEnabled,
  ])

  /**
   * Load PPTX when URL changes and viewer is ready
   */
  useEffect(() => {
    if (!viewerState.isReady || !url) return
    if (lastLoadedUrlRef.current === url) return

    setViewerState((prev) => ({ ...prev, isLoading: true, error: null }))
    sendCommand({ type: 'LOAD_PPTX', url })
    lastLoadedUrlRef.current = url
  }, [viewerState.isReady, url, sendCommand])

  /**
   * Watch for theme changes and update viewer
   */
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
        src="/pptxviewer/pptxViewer.html"
        className="flex-1 min-h-0 w-full border-0 bg-gray-100 dark:bg-neutral-800"
        style={{ minHeight: isFullscreen ? '100%' : undefined }}
        title="PowerPoint Viewer"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

export default PptxRenderer
