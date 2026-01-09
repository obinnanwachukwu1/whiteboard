import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { Button } from './ui/Button'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import { useFileBytes, useFileMeta } from '../hooks/useCanvasQueries'
import { useAppContext } from '../context/AppContext'
import { useGestureZoom, clampScale } from '../hooks/useGestureZoom'

type PDFDocumentProxy = any
type PDFPageProxy = any

try {
  ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker
} catch {}

export type PdfViewerHandle = {
  getCurrentPage: () => number
  subscribePage: (fn: () => void) => () => void
}

type Props = {
  fileId: string | number
  className?: string
  fullscreen?: boolean
  onPageChange?: (page: number) => void
}

const MIN_SCALE = 0.25
const MAX_SCALE = 5
const ZOOM_STEP = 0.25

const hasPdfHeader = (bytes: Uint8Array) =>
  bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46

export const PdfViewer = React.forwardRef<PdfViewerHandle, Props>((props, ref) => {
  const { fileId, className = '', fullscreen = false, onPageChange } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)
  const [currentPage, setCurrentPage] = useState(1)
  const currentPageRef = useRef(1)
  const pageSubscribersRef = useRef(new Set<() => void>())
  const loadingTaskRef = useRef<any | null>(null)
  const [pageInputValue, setPageInputValue] = useState('1')
  const [pageInputEditing, setPageInputEditing] = useState(false)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const fileBytesQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)
  const fileUrl = (fileMetaQ.data as any)?.url as string | undefined
  const hasBytes = !!fileBytesQ.data && (fileBytesQ.data as ArrayBuffer).byteLength > 0
  const isBytesLoading = !!(fileBytesQ.isLoading || fileBytesQ.isFetching)

  const { baseUrl, profile, saveUserSettings, pdfGestureZoomEnabled } = useAppContext()
  const userId = (profile as any)?.id
  const userKey = userId ? `${baseUrl}|${userId}` : null
  const hasLoadedZoomRef = useRef(false)

  // Keep ref in sync
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  // Update current page ref and notify subscribers
  useEffect(() => {
    currentPageRef.current = currentPage
    pageSubscribersRef.current.forEach((fn) => {
      try { fn() } catch {}
    })
    if (onPageChange) {
      try { onPageChange(currentPage) } catch {}
    }
  }, [currentPage, onPageChange])

  // Expose handle to parent
  useImperativeHandle(ref, () => ({
    getCurrentPage: () => currentPageRef.current,
    subscribePage: (fn: () => void) => {
      pageSubscribersRef.current.add(fn)
      return () => pageSubscribersRef.current.delete(fn)
    },
  }), [])

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    setError(null)
    setPdf(null)
    setNumPages(0)
    setCurrentPage(1)
    pageRefs.current.clear()

    const load = async () => {
      if (!hasBytes && isBytesLoading) return
      let pdfDoc: PDFDocumentProxy | null = null
      try {
        if (hasBytes) {
          const ab = fileBytesQ.data as ArrayBuffer
          const bytes = new Uint8Array(ab).slice()
          if (!hasPdfHeader(bytes)) {
            throw new Error('Invalid PDF bytes (missing %PDF header)')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else if (fileUrl) {
          const resp = await fetch(fileUrl, { method: 'GET', credentials: 'omit' })
          if (!resp.ok) throw new Error(`Failed to fetch PDF via URL: ${resp.status}`)
          const buf = await resp.arrayBuffer()
          if (!buf || buf.byteLength === 0) throw new Error('Empty PDF data from URL')
          const bytes = new Uint8Array(buf).slice()
          if (!hasPdfHeader(bytes)) {
            try { window.system?.openExternal?.(fileUrl) } catch {}
            throw new Error('Invalid PDF structure from URL')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else {
          throw new Error('No PDF data available')
        }
        if (cancelled) {
          try { pdfDoc.destroy() } catch {}
          return
        }
        setPdf(pdfDoc)
        setNumPages(pdfDoc?.numPages ?? 0)
        setCurrentPage(1)
      } catch (err) {
        if (!cancelled) setError(`Failed to load PDF: ${String(err)}`)
      } finally {
        loadingTaskRef.current = null
      }
    }

    load()

    return () => {
      cancelled = true
      const task = loadingTaskRef.current
      if (task && typeof task.destroy === 'function') {
        try { task.destroy() } catch {}
      }
      loadingTaskRef.current = null
    }
  }, [fileId, hasBytes, fileUrl, isBytesLoading, fileBytesQ.data])

  // Cleanup PDF on unmount
  useEffect(() => {
    return () => {
      if (pdf) {
        try { pdf.destroy?.() } catch {}
      }
    }
  }, [pdf])

  // Load persisted zoom
  useEffect(() => {
    hasLoadedZoomRef.current = false
    if (!window?.settings?.get) {
      hasLoadedZoomRef.current = true
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await window.settings.get()
        const data = res?.ok ? (res.data as any) : {}
        const targetSettings = userKey ? data?.userSettings?.[userKey] : data
        const storedMap = targetSettings?.pdfZoom && typeof targetSettings.pdfZoom === 'object' ? targetSettings.pdfZoom : {}
        if (cancelled) return
        const stored = storedMap[String(fileId)]
        if (typeof stored === 'number' && Number.isFinite(stored)) {
          setScale(clampScale(stored, MIN_SCALE, MAX_SCALE))
        }
      } catch {}
      finally { if (!cancelled) hasLoadedZoomRef.current = true }
    })()
    return () => { cancelled = true }
  }, [fileId, userKey])

  // Persist zoom changes
  useEffect(() => {
    if (!hasLoadedZoomRef.current) return
    if (!Number.isFinite(scale)) return
    const handle = window.setTimeout(() => {
      saveUserSettings({ pdfZoom: { [String(fileId)]: scale } }).catch(() => {})
    }, 400)
    return () => window.clearTimeout(handle)
  }, [scale, fileId, saveUserSettings])

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale(s => clampScale(s + ZOOM_STEP, MIN_SCALE, MAX_SCALE))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(s => clampScale(s - ZOOM_STEP, MIN_SCALE, MAX_SCALE))
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
  }, [])

  const fitToWidth = useCallback(() => {
    if (!pdf || !scrollContainerRef.current) return
    pdf.getPage(1).then((page: PDFPageProxy) => {
      const viewport = page.getViewport({ scale: 1 })
      const containerWidth = scrollContainerRef.current?.clientWidth ?? 800
      const newScale = (containerWidth - 48) / viewport.width
      setScale(clampScale(newScale, MIN_SCALE, MAX_SCALE))
    }).catch(() => {})
  }, [pdf])

  // Track current page from scroll position
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || numPages === 0) return

    const updateCurrentPage = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.top + containerRect.height / 2

      let closestPage = 1
      let closestDistance = Infinity

      pageRefs.current.forEach((el, pageNum) => {
        const rect = el.getBoundingClientRect()
        const pageCenter = rect.top + rect.height / 2
        const distance = Math.abs(pageCenter - containerCenter)
        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = pageNum
        }
      })

      setCurrentPage(closestPage)
    }

    container.addEventListener('scroll', updateCurrentPage, { passive: true })
    updateCurrentPage()

    return () => container.removeEventListener('scroll', updateCurrentPage)
  }, [numPages, scale])

  // Update page input when current page changes
  useEffect(() => {
    if (!pageInputEditing) setPageInputValue(String(currentPage))
  }, [currentPage, pageInputEditing])

  // Navigation
  const scrollToPage = useCallback((page: number) => {
    const target = Math.max(1, Math.min(numPages, page))
    const el = pageRefs.current.get(target)
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setCurrentPage(target)
  }, [numPages])

  const goPrev = useCallback(() => scrollToPage(currentPage - 1), [currentPage, scrollToPage])
  const goNext = useCallback(() => scrollToPage(currentPage + 1), [currentPage, scrollToPage])

  const handlePageInputCommit = useCallback((value: string) => {
    const parsed = parseInt(value, 10)
    const page = isNaN(parsed) ? 1 : Math.max(1, Math.min(numPages, parsed))
    scrollToPage(page)
    setPageInputValue(String(page))
  }, [numPages, scrollToPage])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return

      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        zoomIn()
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetZoom()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, resetZoom, goPrev, goNext])

  // Gesture zoom (pinch + Ctrl/Cmd wheel)
  useGestureZoom(scrollContainerRef, {
    enabled: pdfGestureZoomEnabled,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    getScale: () => scaleRef.current,
    onZoom: (nextScale) => {
      setScale(nextScale)
    },
    onPan: (dx, dy) => {
      const container = scrollContainerRef.current
      if (!container) return
      container.scrollLeft = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft - dx))
      container.scrollTop = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, container.scrollTop - dy))
    },
  })

  // Error state
  if (error || fileBytesQ.error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {String(error || (fileBytesQ.error as any)?.message || 'Failed to load PDF')}
        </div>
      </div>
    )
  }

  // Loading state
  if (!pdf) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={currentPage <= 1} title="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <input
              className="w-12 px-2 py-1 text-sm text-center rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pageInputValue}
              onFocus={() => setPageInputEditing(true)}
              onChange={(e) => setPageInputValue(e.target.value.replace(/\D/g, ''))}
              onBlur={(e) => {
                setPageInputEditing(false)
                handlePageInputCommit(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPageInputEditing(false)
                  handlePageInputCommit((e.target as HTMLInputElement).value)
                }
              }}
              aria-label="Current page"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">/ {numPages}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={goNext} disabled={currentPage >= numPages} title="Next page">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom out (Ctrl+-)">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="w-14 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom in (Ctrl++)">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-gray-300 dark:bg-neutral-600 mx-1" />
          <Button variant="ghost" size="sm" onClick={resetZoom} title="Reset zoom (Ctrl+0)">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={fitToWidth} title="Fit to width">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Pages Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-neutral-800"
        style={{ minHeight: fullscreen ? '100%' : undefined }}
      >
        <div className="flex flex-col items-center py-6 px-4 gap-4 min-w-fit">
          {Array.from({ length: numPages }, (_, i) => (
            <PageRenderer
              key={i + 1}
              pdf={pdf}
              pageNumber={i + 1}
              scale={scale}
              onRef={(el) => {
                if (el) pageRefs.current.set(i + 1, el)
                else pageRefs.current.delete(i + 1)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

PdfViewer.displayName = 'PdfViewer'

// Individual page renderer with debounced rendering
type PageRendererProps = {
  pdf: PDFDocumentProxy
  pageNumber: number
  scale: number
  onRef: (el: HTMLDivElement | null) => void
}

const PageRenderer: React.FC<PageRendererProps> = React.memo(({ pdf, pageNumber, scale, onRef }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const annotationLayerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const textLayerInstanceRef = useRef<any>(null)
  const lastRenderedScaleRef = useRef<number | null>(null)
  const renderDebounceRef = useRef<number | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    onRef(containerRef.current)
    return () => onRef(null)
  }, [onRef])

  // Debounced render effect
  useEffect(() => {
    // Clear any pending render
    if (renderDebounceRef.current) {
      clearTimeout(renderDebounceRef.current)
    }

    // If scale hasn't changed much, skip re-render
    if (lastRenderedScaleRef.current !== null && 
        Math.abs(lastRenderedScaleRef.current - scale) < 0.01) {
      return
    }

    // Debounce the render to avoid thrashing during rapid zoom
    renderDebounceRef.current = window.setTimeout(() => {
      renderPage()
    }, 50) // 50ms debounce

    return () => {
      if (renderDebounceRef.current) {
        clearTimeout(renderDebounceRef.current)
      }
    }
  }, [pdf, pageNumber, scale])

  const renderPage = async () => {
    const canvas = canvasRef.current
    const textLayer = textLayerRef.current
    const annotationLayer = annotationLayerRef.current
    if (!canvas || !textLayer || !annotationLayer) return

    try {
      // Cancel previous render
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
      }
      if (textLayerInstanceRef.current) {
        try { textLayerInstanceRef.current.cancel() } catch {}
      }

      const page: PDFPageProxy = await pdf.getPage(pageNumber)
      
      const viewport = page.getViewport({ scale })
      const width = viewport.width
      const height = viewport.height

      setDimensions({ width, height })

      // Setup canvas with device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Render canvas
      const renderTask = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = renderTask

      await renderTask.promise
      lastRenderedScaleRef.current = scale

      // Setup text layer
      textLayer.innerHTML = ''
      textLayer.style.width = `${width}px`
      textLayer.style.height = `${height}px`

      const TextLayerCtor = (pdfjsLib as any)?.TextLayer
      if (TextLayerCtor) {
        const textContent = await page.getTextContent()
        const textLayerInstance = new TextLayerCtor({
          textContentSource: textContent,
          container: textLayer,
          viewport,
        })
        textLayerInstanceRef.current = textLayerInstance
        await textLayerInstance.render()
      }

      // Setup annotation layer (links)
      annotationLayer.innerHTML = ''
      annotationLayer.style.width = `${width}px`
      annotationLayer.style.height = `${height}px`

      const annotations = await page.getAnnotations({ intent: 'display' })

      annotations.forEach((annotation: any) => {
        if (annotation.subtype !== 'Link') return
        if (!Array.isArray(annotation.rect) || annotation.rect.length !== 4) return

        const rect = (pdfjsLib as any)?.Util?.normalizeRect
          ? (pdfjsLib as any).Util.normalizeRect(annotation.rect)
          : annotation.rect

        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(rect)
        const left = Math.min(x1, x2)
        const top = Math.min(y1, y2)
        const linkWidth = Math.abs(x2 - x1)
        const linkHeight = Math.abs(y2 - y1)

        if (linkWidth <= 0 || linkHeight <= 0) return

        const anchor = document.createElement('a')
        anchor.style.position = 'absolute'
        anchor.style.left = `${left}px`
        anchor.style.top = `${top}px`
        anchor.style.width = `${linkWidth}px`
        anchor.style.height = `${linkHeight}px`

        const url = annotation.url ?? annotation.unsafeUrl
        if (typeof url === 'string' && url.length > 0) {
          anchor.href = url
          anchor.target = '_blank'
          anchor.rel = 'noopener noreferrer'
          anchor.title = annotation.title || url
        } else if (annotation.dest) {
          anchor.href = '#'
          anchor.title = annotation.title || 'Internal link'
        } else {
          return
        }

        annotationLayer.appendChild(anchor)
      })

    } catch (err) {
      const msg = String(err)
      if (!msg.includes('cancelled') && !msg.includes('Rendering cancelled')) {
        console.error('PDF render error:', err)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
      }
      if (textLayerInstanceRef.current) {
        try { textLayerInstanceRef.current.cancel() } catch {}
      }
      if (renderDebounceRef.current) {
        clearTimeout(renderDebounceRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative bg-white shadow-lg rounded"
      style={{
        width: dimensions?.width ?? 'auto',
        height: dimensions?.height ?? 600,
        minWidth: dimensions?.width ?? 400,
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="textLayer"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <div
        ref={annotationLayerRef}
        className="annotationLayer"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  )
})

PageRenderer.displayName = 'PageRenderer'
