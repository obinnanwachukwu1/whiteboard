import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useFileBytes, useFileMeta } from '../../hooks/useCanvasQueries'
import { PdfToolbar } from './PdfToolbar'

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

type PdfCommand = {
  type: string
  [key: string]: any
}

type PdfEvent = {
  type: string
  [key: string]: any
}

/**
 * PDF Viewer using embedded pdf.js via webview
 * 
 * This component embeds the pdf.js reference viewer in an Electron webview
 * and communicates with it via message passing. This approach:
 * - Lets pdf.js handle all zoom/pan gestures natively (no flicker)
 * - Provides cursor-anchored zoom out of the box
 * - Avoids React re-render overhead during zoom
 */
export const PdfViewer: React.FC<Props> = ({ fileId, className = '', fullscreen = false, onPageChange }) => {
  const fileUrlQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)
  
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const lastLoadedUrlRef = useRef<string | null>(null)
  const lastUrlSeenRef = useRef<string | null>(null)
  const [preloadPath, setPreloadPath] = useState<string | null>(null)
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
  
  const remoteUrl = (fileMetaQ.data as any)?.url as string | undefined
  const localUrl = fileUrlQ.data as string | undefined
  const isUrlLoading = Boolean(fileUrlQ.isLoading || fileUrlQ.isFetching)
  const url = localUrl || remoteUrl || null
  
  // Get the preload path from main process
  useEffect(() => {
    window.system?.getPdfPreloadPath?.().then((result: { ok: boolean; data?: string; error?: string }) => {
      if (result.ok && result.data) {
        console.log('[PdfViewer] Got preload path:', result.data)
        setPreloadPath(result.data)
      } else {
        console.error('[PdfViewer] Failed to get preload path:', result.error)
      }
    })
  }, [])
  
  // Send command to webview
  const sendCommand = useCallback((command: PdfCommand) => {
    const wv = webviewRef.current
    if (!wv) return
    
    try {
      wv.send('pdf-command', command)
    } catch (err) {
      console.error('[PdfViewer] Failed to send command:', err)
    }
  }, [])

  const attemptLoadUrl = useCallback((targetUrl: string | null) => {
    if (!targetUrl) return
    if (lastLoadedUrlRef.current === targetUrl) return
    sendCommand({ type: 'LOAD_PDF', url: targetUrl })
    lastLoadedUrlRef.current = targetUrl
  }, [sendCommand])
  
  // Handle events from webview
  const handleViewerEvent = useCallback((event: Electron.IpcMessageEvent) => {
    if (event.channel !== 'pdf-event') return
    
    const data = event.args[0] as PdfEvent
    if (!data || !data.type) return
    
    switch (data.type) {
      case 'READY':
        setViewerState(prev => ({ ...prev, isReady: true }))
        // If we have a URL ready, load it
        attemptLoadUrl(url)
        break
        
      case 'DOC_LOADED':
        setViewerState(prev => ({
          ...prev,
          isLoading: false,
          totalPages: data.pageCount || 0,
          scale: data.scale || 1,
          scaleMode: data.scaleMode || 'page-width',
          error: null,
        }))
        break
        
      case 'PAGE_CHANGED':
        setViewerState(prev => ({ ...prev, currentPage: data.page }))
        onPageChange?.(data.page)
        break
        
      case 'SCALE_CHANGED':
        setViewerState(prev => ({
          ...prev,
          scale: data.scale,
          scaleMode: data.presetValue || null,
        }))
        break
        
      case 'SELECTION_MODE_CHANGED':
        setViewerState(prev => ({ ...prev, selectionMode: data.mode }))
        break

      case 'DOWNLOAD':
        // Trigger file download by opening the file URL externally
        window.open(viewerState.url, '_blank')
        break

      case 'ERROR':
        setViewerState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Unknown error',
        }))
        break
        
      case 'LOADING_STARTED':
        setViewerState(prev => ({ ...prev, isLoading: true, error: null }))
        break
    }
  }, [url, sendCommand, onPageChange])
  
  // Set up webview event listeners
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    
    wv.addEventListener('ipc-message', handleViewerEvent)
    const handleDomReady = () => {
      console.log('[PdfViewer] webview dom-ready')
      // Send current theme to webview
      const isDark = document.documentElement.classList.contains('dark')
      sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
      attemptLoadUrl(url)
    }
    wv.addEventListener('dom-ready', handleDomReady)
    
    const handleDidFailLoad = (event: Electron.DidFailLoadEvent) => {
      console.error('[PdfViewer] webview did-fail-load:', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        validatedURL: event.validatedURL,
        isMainFrame: event.isMainFrame,
      })
      if (event.isMainFrame) {
        setViewerState(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to load viewer: ${event.errorDescription}`,
        }))
      }
    }
    wv.addEventListener('did-fail-load', handleDidFailLoad)
    
    const handleConsoleMessage = (event: Electron.ConsoleMessageEvent) => {
      console.log('[PdfViewer webview]', event.message)
    }
    wv.addEventListener('console-message', handleConsoleMessage)
    
    return () => {
      wv.removeEventListener('ipc-message', handleViewerEvent)
      wv.removeEventListener('dom-ready', handleDomReady)
      wv.removeEventListener('did-fail-load', handleDidFailLoad)
      wv.removeEventListener('console-message', handleConsoleMessage)
    }
  }, [handleViewerEvent, attemptLoadUrl, url, preloadPath])
  
  // Load PDF when URL changes (and viewer is ready)
  useEffect(() => {
    if (!url) return
    if (lastUrlSeenRef.current === url) return
    lastUrlSeenRef.current = url
    lastLoadedUrlRef.current = null

    if (viewerState.isReady) {
      setViewerState(prev => ({ ...prev, isLoading: true, error: null }))
      attemptLoadUrl(url)
    }
  }, [viewerState.isReady, url, attemptLoadUrl])
  
  // Watch for theme changes and update webview
  useEffect(() => {
    if (!viewerState.isReady) return
    
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      sendCommand({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [viewerState.isReady, sendCommand])
  
  // Toolbar command handler
  const handleToolbarCommand = useCallback((command: PdfCommand) => {
    sendCommand(command)
  }, [sendCommand])
  
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
  
  // Loading state while fetching URL or preload path
  if (isUrlLoading || !preloadPath) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
      </div>
    )
  }
  
  return (
    <div className={`relative flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
      {/* PDF Webview */}
      <div
        className="flex-1 min-h-0 overflow-hidden bg-gray-100 dark:bg-neutral-800"
        style={{
          minHeight: fullscreen ? '100%' : undefined,
        }}
      >
        <webview
          ref={webviewRef}
          src="pdf-viewer://pdfViewer.html"
          preload={preloadPath ?? undefined}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          /* Security: webview runs with context isolation and no node integration by default */
        />
        
        {/* Loading overlay */}
        {viewerState.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-neutral-800/80">
            <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
          </div>
        )}
        
        {/* Error overlay */}
        {viewerState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-neutral-800/80">
            <div className="text-red-600 dark:text-red-400 text-sm text-center p-4">
              {viewerState.error}
            </div>
          </div>
        )}
      </div>
      
      {/* Floating Toolbar */}
      <PdfToolbar
        currentPage={viewerState.currentPage}
        totalPages={viewerState.totalPages}
        scale={viewerState.scale}
        scaleMode={viewerState.scaleMode}
        selectionMode={viewerState.selectionMode}
        onCommand={handleToolbarCommand}
      />
    </div>
  )
}
