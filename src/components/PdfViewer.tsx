import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Focus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/Button'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import { useFileBytes, useFileMeta } from '../hooks/useCanvasQueries'
import { clampScale, useGestureZoom } from '../hooks/useGestureZoom'
import { useAppContext } from '../context/AppContext'

type PDFDocumentProxy = any

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

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const PADDING_X = 48

type Anchor = {
  pageNumber: number
  relY: number
  relX: number
  containerOffsetY: number
  containerOffsetX: number
}
type PageMetrics = { width: number; height: number; scale: number }
type PageRegistryEntry = {
  render: (targetScale: number) => Promise<number | null>
  cancel: () => void
  getElement: () => HTMLDivElement | null
}

type SetScaleOptions = {
  preserveFit?: boolean
  anchor?: Anchor | null
  point?: { clientX?: number; clientY?: number }
}

const hasPdfHeader = (bytes: Uint8Array) =>
  bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46

export const PdfViewer = React.forwardRef<PdfViewerHandle, Props>((props, ref) => {
  const { fileId, className = '', fullscreen = false, onPageChange } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const scaleRef = useRef(scale)
  const [fitWidth, setFitWidth] = useState(false)
  const basePageWidthRef = useRef<number | null>(null)
  const [pageHeights, setPageHeights] = useState<number[]>([])
  const [pageWidths, setPageWidths] = useState<number[]>([])
  const [defaultPageHeight, setDefaultPageHeight] = useState(900)
  const [defaultPageWidth, setDefaultPageWidth] = useState(700)
  const [currentPage, setCurrentPage] = useState(1)
  const currentPageRef = useRef(1)
  const pageSubscribersRef = useRef(new Set<() => void>())
  const pageRegistryRef = useRef(new Map<number, PageRegistryEntry>())
  const anchorRef = useRef<Anchor | null>(null)
  const zoomModeRef = useRef<'idle' | 'gesture'>('idle')
  const gestureAnchorRef = useRef<Anchor | null>(null)
  const hudTimeoutRef = useRef<number | null>(null)
  const [zoomHudVisible, setZoomHudVisible] = useState(false)
  const [zoomHudValue, setZoomHudValue] = useState(() => Math.round(scale * 100))
  const loadingTaskRef = useRef<any | null>(null)
  const [pageInputValue, setPageInputValue] = useState('1')
  const [pageInputEditing, setPageInputEditing] = useState(false)

  const fileBytesQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)
  const fileUrl = (fileMetaQ.data as any)?.url as string | undefined
  const hasBytes = !!fileBytesQ.data && (fileBytesQ.data as ArrayBuffer).byteLength > 0
  const isBytesLoading = !!(fileBytesQ.isLoading || fileBytesQ.isFetching)

  const { baseUrl, profile, pdfGestureZoomEnabled, saveUserSettings } = useAppContext()
  const userId = (profile as any)?.id
  const userKey = userId ? `${baseUrl}|${userId}` : null
  const zoomCacheRef = useRef<Record<string, number>>({})
  const hasLoadedZoomRef = useRef(false)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    setZoomHudValue(Math.round(scale * 100))
    setZoomHudVisible(true)
    if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current)
    const handle = window.setTimeout(() => {
      setZoomHudVisible(false)
      hudTimeoutRef.current = null
    }, 900)
    hudTimeoutRef.current = handle
    return () => {
      window.clearTimeout(handle)
      if (hudTimeoutRef.current === handle) hudTimeoutRef.current = null
    }
  }, [scale])

  useEffect(() => {
    return () => {
      if (hudTimeoutRef.current) window.clearTimeout(hudTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    currentPageRef.current = currentPage
    pageSubscribersRef.current.forEach((fn) => {
      try {
        fn()
      } catch {}
    })
    if (onPageChange) {
      try {
        onPageChange(currentPage)
      } catch {}
    }
  }, [currentPage, onPageChange])

  useImperativeHandle(
    ref,
    () => ({
      getCurrentPage: () => currentPageRef.current,
      subscribePage: (fn: () => void) => {
        pageSubscribersRef.current.add(fn)
        return () => pageSubscribersRef.current.delete(fn)
      },
    }),
    []
  )

  useEffect(() => {
    let cancelled = false
    setError(null)
    setPdf(null)
    setNumPages(0)
    setPageHeights([])
    setCurrentPage(1)
    pageRegistryRef.current.forEach((entry) => entry.cancel())
    pageRegistryRef.current.clear()
    basePageWidthRef.current = null

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
            try {
              window.system?.openExternal?.(fileUrl)
            } catch {}
            throw new Error('Invalid PDF structure from URL')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else {
          throw new Error('No PDF data available')
        }
        if (cancelled) {
          try {
            pdfDoc.destroy()
          } catch {}
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
        try {
          task.destroy()
        } catch {}
      }
      loadingTaskRef.current = null
    }
  }, [fileId, hasBytes, fileUrl, isBytesLoading, fileBytesQ.data])

  useEffect(() => {
    return () => {
      if (pdf) {
        try {
          pdf.destroy?.()
        } catch {}
      }
    }
  }, [pdf])

  useEffect(() => {
    zoomCacheRef.current = {}
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
        const storedMap =
          targetSettings && typeof targetSettings.pdfZoom === 'object' && targetSettings.pdfZoom ? targetSettings.pdfZoom : {}
        if (cancelled) return
        zoomCacheRef.current = { ...storedMap }
        const stored = storedMap[String(fileId)]
        if (typeof stored === 'number' && Number.isFinite(stored)) {
          setFitWidth(false)
          setScale(clampScale(stored, MIN_SCALE, MAX_SCALE))
        }
      } catch {
        // ignore persistence failures
      } finally {
        if (!cancelled) hasLoadedZoomRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileId, userKey])

  useEffect(() => {
    if (!hasLoadedZoomRef.current) return
    if (!Number.isFinite(scale)) return
    const id = String(fileId)
    if (zoomCacheRef.current[id] === scale) return
    const handle = window.setTimeout(() => {
      const next = { ...zoomCacheRef.current, [id]: scale }
      zoomCacheRef.current = next
      saveUserSettings({ pdfZoom: next }).catch(() => {})
    }, 350)
    return () => window.clearTimeout(handle)
  }, [scale, fileId, saveUserSettings])

  const registerPage = useCallback((pageNumber: number, entry: PageRegistryEntry) => {
    pageRegistryRef.current.set(pageNumber, entry)
    return () => {
      const current = pageRegistryRef.current.get(pageNumber)
      if (current === entry) pageRegistryRef.current.delete(pageNumber)
    }
  }, [])

  useEffect(() => {
    return () => {
      pageRegistryRef.current.forEach((entry) => entry.cancel())
      pageRegistryRef.current.clear()
    }
  }, [])

  const handlePageMetrics = useCallback(
    (pageNumber: number, metrics: PageMetrics) => {
      const height = Number.isFinite(metrics.height) ? metrics.height : defaultPageHeight
      const width = Number.isFinite(metrics.width) ? metrics.width : defaultPageWidth
      setPageHeights((prev) => {
        const next = prev.slice()
        next[pageNumber - 1] = Math.round(height)
        return next
      })
      setPageWidths((prev) => {
        const next = prev.slice()
        next[pageNumber - 1] = Math.round(width)
        return next
      })
      if (pageNumber === 1) {
        if (Number.isFinite(metrics.width) && Number.isFinite(metrics.scale) && metrics.scale > 0) {
          basePageWidthRef.current = metrics.width / metrics.scale
        }
        setDefaultPageHeight(Math.round(height))
        setDefaultPageWidth(Math.round(width))
      }
    },
    [defaultPageHeight, defaultPageWidth]
  )

  const captureAnchor = useCallback(
    (point?: { clientX?: number; clientY?: number }): Anchor | null => {
      const container = containerRef.current
      if (!container || pageRegistryRef.current.size === 0) return null
      const containerRect = container.getBoundingClientRect()
      let targetY = container.scrollTop + container.clientHeight / 2
      let targetX = container.scrollLeft + container.clientWidth / 2
      if (point) {
        if (typeof point.clientY === 'number' && point.clientY >= containerRect.top && point.clientY <= containerRect.bottom) {
          targetY = container.scrollTop + (point.clientY - containerRect.top)
        }
        if (typeof point.clientX === 'number' && point.clientX >= containerRect.left && point.clientX <= containerRect.right) {
          targetX = container.scrollLeft + (point.clientX - containerRect.left)
        }
      }
      let bestPage = currentPageRef.current
      let bestDist = Infinity
      pageRegistryRef.current.forEach((entry, pageNumber) => {
        const el = entry.getElement()
        if (!el) return
        const pageRect = el.getBoundingClientRect()
        const height = pageRect.height || pageHeights[pageNumber - 1] || defaultPageHeight
        if (!(height > 0)) return
        const topWithin = container.scrollTop + (pageRect.top - containerRect.top)
        const midY = topWithin + height / 2
        const dist = Math.abs(targetY - midY)
        if (dist < bestDist) {
          bestDist = dist
          bestPage = pageNumber
        }
      })
      const entry = pageRegistryRef.current.get(bestPage)
      const el = entry?.getElement()
      if (!el) return null
      const pageRect = el.getBoundingClientRect()
      const height = pageRect.height || pageHeights[bestPage - 1] || defaultPageHeight
      const width = pageRect.width || pageWidths[bestPage - 1] || defaultPageWidth
      if (!(height > 0) || !(width > 0)) return null
      const topWithin = container.scrollTop + (pageRect.top - containerRect.top)
      const leftWithin = container.scrollLeft + (pageRect.left - containerRect.left)
      const relY = (targetY - topWithin) / height
      const relX = (targetX - leftWithin) / width
      const offsetY = targetY - container.scrollTop
      const offsetX = targetX - container.scrollLeft
      return {
        pageNumber: bestPage,
        relY: Math.min(1, Math.max(0, relY)),
        relX: Math.min(1, Math.max(0, relX)),
        containerOffsetY: Math.min(Math.max(offsetY, 0), container.clientHeight || 0),
        containerOffsetX: Math.min(Math.max(offsetX, 0), container.clientWidth || 0),
      }
    },
    [pageHeights, pageWidths, defaultPageHeight, defaultPageWidth]
  )

  const restoreAnchor = useCallback(
    (anchor: Anchor, metrics?: { height?: number | null; width?: number | null }) => {
      const container = containerRef.current
      if (!container) return
      const entry = pageRegistryRef.current.get(anchor.pageNumber)
      const el = entry?.getElement()
      if (!el) return
      const containerRect = container.getBoundingClientRect()
      const pageRect = el.getBoundingClientRect()
      const height = metrics?.height ?? pageRect.height ?? pageHeights[anchor.pageNumber - 1] ?? defaultPageHeight
      const width = metrics?.width ?? pageRect.width ?? pageWidths[anchor.pageNumber - 1] ?? defaultPageWidth
      if (!(height > 0) || !(width > 0)) return
      const topWithin = container.scrollTop + (pageRect.top - containerRect.top)
      const leftWithin = container.scrollLeft + (pageRect.left - containerRect.left)
      const offsetY =
        Number.isFinite(anchor.containerOffsetY) && anchor.containerOffsetY >= 0
          ? Math.min(anchor.containerOffsetY, container.clientHeight || 0)
          : container.clientHeight / 2
      const offsetX =
        Number.isFinite(anchor.containerOffsetX) && anchor.containerOffsetX >= 0
          ? Math.min(anchor.containerOffsetX, container.clientWidth || 0)
          : container.clientWidth / 2
      const targetY = topWithin + height * anchor.relY - offsetY
      const targetX = leftWithin + width * anchor.relX - offsetX
      container.scrollTop = Math.max(0, Math.min(targetY, container.scrollHeight - container.clientHeight))
      container.scrollLeft = Math.max(0, Math.min(targetX, container.scrollWidth - container.clientWidth))
    },
    [pageHeights, pageWidths, defaultPageHeight, defaultPageWidth]
  )

  const updateCurrentPageFromScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || pageRegistryRef.current.size === 0) return
    const centerY = container.scrollTop + container.clientHeight / 2
    let best = currentPageRef.current
    let bestDist = Infinity
    pageRegistryRef.current.forEach((entry, pageNumber) => {
      const el = entry.getElement()
      if (!el) return
      const height = pageHeights[pageNumber - 1] ?? el.offsetHeight ?? defaultPageHeight
      if (height <= 0) return
      const mid = el.offsetTop + height / 2
      const dist = Math.abs(centerY - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = pageNumber
      }
    })
    setCurrentPage((prev) => (prev === best ? prev : best))
  }, [pageHeights, defaultPageHeight])

  const setScaleAnchored = useCallback(
    (nextScale: number, opts?: SetScaleOptions) => {
      const clamped = clampScale(nextScale, MIN_SCALE, MAX_SCALE)
      if (Math.abs(scaleRef.current - clamped) < 0.0001) return
      if (!opts?.preserveFit) setFitWidth(false)
      const pointArg =
        opts?.point && (typeof opts.point.clientX === 'number' || typeof opts.point.clientY === 'number')
          ? opts.point
          : undefined
      let anchorOverride = opts?.anchor ?? null
      if (!anchorOverride && zoomModeRef.current === 'gesture' && gestureAnchorRef.current) {
        anchorOverride = gestureAnchorRef.current
      }
      if (!anchorOverride) {
        anchorOverride = captureAnchor(pointArg) ?? null
      }
      if (!anchorOverride) {
        anchorOverride = captureAnchor()
      }
      if (zoomModeRef.current === 'gesture') {
        gestureAnchorRef.current = anchorOverride
      } else {
        gestureAnchorRef.current = null
      }
      if (anchorOverride) {
        anchorRef.current = anchorOverride
        const pageEntry = pageRegistryRef.current.get(anchorOverride.pageNumber)
        const el = pageEntry?.getElement() || null
        const rect = el?.getBoundingClientRect()
        const immediateHeight = rect?.height ?? pageHeights[anchorOverride.pageNumber - 1] ?? null
        const immediateWidth = rect?.width ?? pageWidths[anchorOverride.pageNumber - 1] ?? null
        restoreAnchor(anchorOverride, { height: immediateHeight, width: immediateWidth })
      } else {
        anchorRef.current = null
      }
      setScale(clamped)
    },
    [captureAnchor, pageHeights, pageWidths, restoreAnchor]
  )

  const zoomIn = useCallback(() => {
    zoomModeRef.current = 'idle'
    setScaleAnchored(scaleRef.current + 0.2)
  }, [setScaleAnchored])

  const zoomOut = useCallback(() => {
    zoomModeRef.current = 'idle'
    setScaleAnchored(scaleRef.current - 0.2)
  }, [setScaleAnchored])

  const resetZoom = useCallback(() => {
    zoomModeRef.current = 'idle'
    setScaleAnchored(1)
  }, [setScaleAnchored])

  const recomputeFitWidth = useCallback(() => {
    if (!fitWidth) return
    const container = containerRef.current
    const baseWidth = basePageWidthRef.current
    if (!container || !baseWidth || baseWidth <= 0) return
    const available = Math.max(0, container.clientWidth - PADDING_X)
    const next = clampScale(available / baseWidth, MIN_SCALE, MAX_SCALE)
    setScaleAnchored(next, { preserveFit: true })
  }, [fitWidth, setScaleAnchored])

  const toggleFit = useCallback(() => {
    setFitWidth((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!fitWidth) return
    recomputeFitWidth()
  }, [fitWidth, recomputeFitWidth])

  useEffect(() => {
    if (!fitWidth) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => recomputeFitWidth())
    observer.observe(container)
    const onWindow = () => recomputeFitWidth()
    window.addEventListener('resize', onWindow)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onWindow)
    }
  }, [fitWidth, recomputeFitWidth])

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const entry = pageRegistryRef.current.get(anchor.pageNumber)
    if (!entry) {
      anchorRef.current = null
      return
    }
    entry
      .render(scale)
      .catch(() => null)
      .then(() => {
        requestAnimationFrame(() => {
          const el = entry.getElement()
          const rect = el?.getBoundingClientRect()
          restoreAnchor(anchor, { height: rect?.height ?? null, width: rect?.width ?? null })
          anchorRef.current = null
          updateCurrentPageFromScroll()
        })
      })
  }, [scale, restoreAnchor, updateCurrentPageFromScroll])

  useEffect(() => {
    updateCurrentPageFromScroll()
  }, [pageHeights, numPages, updateCurrentPageFromScroll])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let raf = 0
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        updateCurrentPageFromScroll()
      })
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [updateCurrentPageFromScroll])

  const clampPage = useCallback((page: number) => Math.max(1, Math.min(numPages || 1, page)), [numPages])

  const scrollToPage = useCallback(
    async (target: number) => {
      const page = clampPage(target)
      const entry = pageRegistryRef.current.get(page)
      if (entry) {
        try {
          await entry.render(scaleRef.current)
        } catch {}
      }
      const container = containerRef.current
      const el = entry?.getElement()
      if (container && el) {
        container.scrollTop = el.offsetTop
      }
      setCurrentPage(page)
    },
    [clampPage]
  )

  const goPrev = useCallback(() => {
    scrollToPage(currentPageRef.current - 1)
  }, [scrollToPage])

  const goNext = useCallback(() => {
    scrollToPage(currentPageRef.current + 1)
  }, [scrollToPage])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return
      if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault()
        zoomIn()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault()
        zoomOut()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault()
        resetZoom()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, resetZoom, goPrev, goNext])

  useGestureZoom(containerRef, {
    enabled: pdfGestureZoomEnabled,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    getScale: () => scaleRef.current,
    onZoom: (next, _source, point) => setScaleAnchored(next, { point }),
    onPan: (dx, dy) => {
      const c = containerRef.current
      if (!c) return
      c.scrollLeft = Math.max(0, Math.min(c.scrollWidth - c.clientWidth, c.scrollLeft - dx))
      c.scrollTop = Math.max(0, Math.min(c.scrollHeight - c.clientHeight, c.scrollTop - dy))
    },
    onGestureStart: () => {
      zoomModeRef.current = 'gesture'
      gestureAnchorRef.current = null
    },
    onGestureEnd: () => {
      zoomModeRef.current = 'idle'
      gestureAnchorRef.current = null
      updateCurrentPageFromScroll()
    },
  })

  useEffect(() => {
    if (!pageInputEditing) setPageInputValue(String(currentPage))
  }, [currentPage, pageInputEditing])

  const handlePageInputCommit = useCallback(
    async (value: string) => {
      const parsed = Number.parseInt(value, 10)
      const page = clampPage(Number.isNaN(parsed) ? 1 : parsed)
      await scrollToPage(page)
      setPageInputValue(String(page))
    },
    [clampPage, scrollToPage]
  )

  if (error || fileBytesQ.error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-600 text-sm">{String(error || (fileBytesQ.error as any)?.message || 'Failed to load PDF')}</div>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goPrev} title="Previous page" disabled={currentPage <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              className="w-14 px-2 py-1 text-sm rounded-control bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 text-center"
              value={pageInputValue}
              onFocus={() => setPageInputEditing(true)}
              onChange={(e) => setPageInputValue(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={async (e) => {
                setPageInputEditing(false)
                await handlePageInputCommit((e.target as HTMLInputElement).value)
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  setPageInputEditing(false)
                  await handlePageInputCommit((e.target as HTMLInputElement).value)
                }
              }}
              aria-label="Current page"
            />
            <span className="text-sm">/ {numPages || 1}</span>
            <Button variant="ghost" size="sm" onClick={goNext} title="Next page" disabled={currentPage >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetZoom} title="Reset to 100%">
            <Focus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFit} title="Fit width">
            {fitWidth ? 'Fit: On' : 'Fit width'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div
          ref={containerRef}
          className="relative overflow-auto bg-slate-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg h-full"
          style={{ height: '100%', minHeight: fullscreen ? '100%' : undefined }}
        >
          {zoomHudVisible && (
            <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-full bg-slate-900/80 text-white text-xs font-semibold px-3 py-1 shadow-lg backdrop-blur">
              {zoomHudValue}%
            </div>
          )}
          <div className="p-6 flex flex-col gap-4 items-center">
            {Array.from({ length: numPages }, (_, index) => (
              <PageView
                key={`page-${index + 1}`}
                pageNumber={index + 1}
                pdf={pdf}
                scale={scale}
                defaultHeight={defaultPageHeight}
                registerPage={registerPage}
                onMetrics={handlePageMetrics}
                containerRef={containerRef}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

PdfViewer.displayName = 'PdfViewer'

type PageViewProps = {
  pageNumber: number
  pdf: PDFDocumentProxy | null
  scale: number
  defaultHeight: number
  registerPage: (pageNumber: number, entry: PageRegistryEntry) => () => void
  onMetrics: (pageNumber: number, metrics: PageMetrics) => void
  containerRef: React.RefObject<HTMLDivElement>
}

const PageView: React.FC<PageViewProps> = React.memo(
  ({ pageNumber, pdf, scale, defaultHeight, registerPage, onMetrics, containerRef }) => {
    const outerRef = useRef<HTMLDivElement | null>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const renderTaskRef = useRef<any | null>(null)
    const pageRef = useRef<any | null>(null)
    const renderTokenRef = useRef(0)
    const lastScaleRef = useRef<number | null>(null)
    const visibleRef = useRef(false)
    const placeholderRef = useRef(Math.round(defaultHeight))
    const [placeholderHeight, setPlaceholderHeight] = useState(Math.round(defaultHeight))

    useEffect(() => {
      placeholderRef.current = Math.round(defaultHeight)
      setPlaceholderHeight(Math.round(defaultHeight))
    }, [defaultHeight])

    useEffect(() => {
      return () => {
        if (renderTaskRef.current?.cancel) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
        }
      }
    }, [])

    useEffect(() => {
      pageRef.current = null
      lastScaleRef.current = null
    }, [pdf])

    const renderPage = useCallback(
      async (targetScale: number) => {
        if (!pdf) return null
        const canvas = canvasRef.current
        const surface = surfaceRef.current
        const outer = outerRef.current
        if (!canvas || !surface || !outer) return null
        if (lastScaleRef.current && Math.abs(lastScaleRef.current - targetScale) < 0.0001) {
          return Math.round(surface.clientHeight || placeholderRef.current)
        }
        const token = ++renderTokenRef.current
        if (!pageRef.current) {
          pageRef.current = await pdf.getPage(pageNumber)
        }
        const page = pageRef.current
        const viewport = page.getViewport({ scale: targetScale })
        const width = viewport.width
        const height = viewport.height
        outer.style.minHeight = `${Math.round(height)}px`
        surface.style.width = `${width}px`
        surface.style.height = `${height}px`
        const dpr = window.devicePixelRatio || 1
        const pixelWidth = Math.floor(width * dpr)
        const pixelHeight = Math.floor(height * dpr)
        if (canvas.width !== pixelWidth) canvas.width = pixelWidth
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        canvas.style.pointerEvents = 'none'
        const ctx = canvas.getContext('2d')
        if (!ctx) return Math.round(height)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        if (renderTaskRef.current?.cancel) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
        }
        const renderTask = page.render({ canvasContext: ctx as any, viewport })
        renderTaskRef.current = renderTask
        try {
          await renderTask.promise
        } catch (err) {
          const message = String(err || '')
          if (!/Rendering cancelled/i.test(message)) throw err
        }
        if (renderTokenRef.current !== token) return Math.round(height)
        lastScaleRef.current = targetScale
        placeholderRef.current = Math.round(height)
        setPlaceholderHeight(Math.round(height))
        onMetrics(pageNumber, { width, height, scale: targetScale })
        return Math.round(height)
      },
      [pdf, pageNumber, onMetrics]
    )

    useEffect(() => {
      const entry: PageRegistryEntry = {
        render: (targetScale) => renderPage(targetScale),
        cancel: () => {
          if (renderTaskRef.current?.cancel) {
            try {
              renderTaskRef.current.cancel()
            } catch {}
          }
        },
        getElement: () => outerRef.current,
      }
      return registerPage(pageNumber, entry)
    }, [registerPage, pageNumber, renderPage])

    useEffect(() => {
      const container = containerRef.current
      const outer = outerRef.current
      if (!container || !outer) return
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target !== outer) return
            if (entry.isIntersecting) {
              visibleRef.current = true
              renderPage(scale).catch(() => {})
            } else {
              visibleRef.current = false
            }
          })
        },
        { root: container, rootMargin: '600px 0px', threshold: 0 }
      )
      observer.observe(outer)
      return () => observer.disconnect()
    }, [containerRef, renderPage, scale])

    useEffect(() => {
      if (!pdf) return
      if (!visibleRef.current) return
      renderPage(scale).catch(() => {})
    }, [pdf, scale, renderPage])

    return (
      <div ref={outerRef} className="mb-4 w-full" style={{ minHeight: `${placeholderHeight}px` }}>
        <div
          ref={surfaceRef}
          className="relative inline-block bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow overflow-hidden mx-auto"
        >
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    )
  }
)

PageView.displayName = 'PageView'
