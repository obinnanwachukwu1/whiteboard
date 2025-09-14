import React, { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Focus } from 'lucide-react'
import { Button } from './ui/Button'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// Load the worker as a URL for Vite/Electron
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
type PDFDocumentProxy = any

// Configure worker source (required in modern pdf.js)
try {
  ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker
} catch {}
import { useFileBytes, useFileMeta } from '../hooks/useCanvasQueries'

// Worker is configured by importing 'pdfjs-dist/webpack.mjs' above for bundlers

type Props = { 
  fileId: string | number
  className?: string
  fullscreen?: boolean
}

export const PdfViewer: React.FC<Props> = ({ fileId, className = '', fullscreen = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [fitWidth, setFitWidth] = useState(false)
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null)
  // Track scale and page count only; rendering is done eagerly
  const loadingTaskRef = useRef<any | null>(null)
  const fileBytesQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)
  const fileUrl = (fileMetaQ.data as any)?.url as string | undefined
  const hasBytes = !!fileBytesQ.data && (fileBytesQ.data as ArrayBuffer).byteLength > 0
  const isBytesLoading = !!(fileBytesQ.isLoading || fileBytesQ.isFetching)
  const [pageHeights, setPageHeights] = useState<number[]>([])
  const [defaultPageHeight, setDefaultPageHeight] = useState<number>(900)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        let pdfDoc: PDFDocumentProxy | null = null
        // Prefer bytes. If bytes are still loading, wait instead of falling back to URL
        if (!hasBytes && isBytesLoading) return
        if (hasBytes) {
          const ab = fileBytesQ.data as ArrayBuffer
          // Clone into a fresh Uint8Array to avoid "already detached"
          // errors when pdf.js transfers the buffer to its worker.
          const bytes = new Uint8Array(ab).slice()
          // Basic sanity check for PDF header
          if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
            throw new Error('Invalid PDF bytes (missing %PDF header)')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else if (fileUrl) {
          const url = fileUrl
          // Fetch bytes ourselves to avoid pdfjs URL handling quirks in Electron
          const resp = await fetch(url, { method: 'GET', credentials: 'omit' })
          if (!resp.ok) throw new Error(`Failed to fetch PDF via URL: ${resp.status}`)
          const buf = await resp.arrayBuffer()
          if (!buf || buf.byteLength === 0) throw new Error('Empty PDF data from URL')
          // Clone into a fresh Uint8Array to keep semantics consistent
          const bytes = new Uint8Array(buf).slice()
          if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
            // Likely redirected HTML or non-PDF; open externally as fallback
            try { window.system?.openExternal?.(url) } catch {}
            throw new Error('Invalid PDF structure from URL')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else {
          throw new Error('No PDF data available')
        }
        if (cancelled) {
          try { await pdfDoc.destroy() } catch {}
          return
        }
        setPdf(pdfDoc)
        setNumPages(pdfDoc.numPages)
      } catch (e) {
        if (!cancelled) setError(`Failed to load PDF: ${String(e)}`)
      } finally {
        loadingTaskRef.current = null
      }
    })()
    return () => {
      cancelled = true
      // Let the in-flight task resolve and we destroy the pdfDoc in the cancelled branch.
      loadingTaskRef.current = null
    }
  }, [fileId, hasBytes, fileUrl, isBytesLoading])

  // Cleanup PDF document on unmount
  useEffect(() => {
    return () => {
      if (pdf) {
        try { (pdf as any).destroy?.() } catch {}
      }
    }
  }, [pdf])

  // Pre-compute page heights to stabilize scroll container
  useEffect(() => {
    let cancelled = false
    setPageHeights([])
    if (!pdf) return
    ;(async () => {
      try {
        const first = await pdf.getPage(1)
        const v1 = first.getViewport({ scale })
        if (!cancelled) setDefaultPageHeight(Math.round(v1.height))
        // Compute all page heights in background (sequential to reduce pressure)
        const heights: number[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const p = i === 1 ? first : await pdf.getPage(i)
            const v = p.getViewport({ scale })
            heights.push(Math.round(v.height))
          } catch {
            heights.push(Math.round(v1.height))
          }
          if (cancelled) return
        }
        if (!cancelled) setPageHeights(heights)
      } catch {
        // ignore size precompute failures
      }
    })()
    return () => { cancelled = true }
  }, [pdf, scale])

  // Determine base page width at scale 1 for fit-width calculations
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (!pdf) { setBasePageWidth(null); return }
        const page = await pdf.getPage(1)
        const v = page.getViewport({ scale: 1 })
        if (!cancelled) setBasePageWidth(v.width)
      } catch {
        if (!cancelled) setBasePageWidth(null)
      }
    }
    run()
    return () => { cancelled = true }
  }, [pdf])

  const recomputeFitWidth = React.useCallback(() => {
    if (!fitWidth) return
    const el = containerRef.current
    if (!el || !basePageWidth) return
    const paddingX = 48 // inner container has p-6 (24px each side)
    const available = Math.max(0, el.clientWidth - paddingX)
    const next = available / basePageWidth
    const clamped = Math.max(0.5, Math.min(3, next))
    setScale((s) => (Math.abs(s - clamped) > 0.005 ? clamped : s))
  }, [fitWidth, basePageWidth])

  // Keep scale fitted to width on container resize when fit mode is on
  useEffect(() => {
    if (!fitWidth) return
    recomputeFitWidth()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => recomputeFitWidth())
    ro.observe(el)
    const onWin = () => recomputeFitWidth()
    window.addEventListener('resize', onWin)
    return () => { ro.disconnect(); window.removeEventListener('resize', onWin) }
  }, [fitWidth, recomputeFitWidth])

  const PageView: React.FC<{ pageNum: number }> = ({ pageNum }) => {
    const pageRef = React.useRef<HTMLDivElement | null>(null)
    const wrapperRef = React.useRef<HTMLDivElement | null>(null)
    const canvasARef = React.useRef<HTMLCanvasElement | null>(null)
    const canvasBRef = React.useRef<HTMLCanvasElement | null>(null)
    const frontIndexRef = React.useRef<0 | 1>(0)
    const [visible, setVisible] = React.useState(false)
    const lastScaleRef = React.useRef<number>(scale)

    useEffect(() => {
      const el = pageRef.current
      if (!el) return
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setVisible(true)
          else setVisible(false)
        }
      }, { root: containerRef.current, rootMargin: '200px 0px', threshold: 0.01 })
      io.observe(el)
      return () => io.disconnect()
    }, [])

    useEffect(() => {
      let cancelled = false
      if (!pdf || !visible) return
      ;(async () => {
        try {
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale })
          // Stabilize container height immediately to avoid collapse during rerender
          if (pageRef.current) pageRef.current.style.minHeight = `${Math.round(viewport.height)}px`
          if (wrapperRef.current) {
            wrapperRef.current.style.width = `${viewport.width}px`
            wrapperRef.current.style.height = `${viewport.height}px`
          }
          // Ensure two canvases are mounted (double buffer)
          const ensureCanvas = (ref: React.MutableRefObject<HTMLCanvasElement | null>) => {
            if (ref.current) return ref.current
            const c = document.createElement('canvas')
            ref.current = c
            c.style.position = 'absolute'
            c.style.left = '50%'
            c.style.top = '0'
            c.style.transform = 'translateX(-50%)'
            c.style.transformOrigin = 'top center'
            c.style.display = 'block'
            // Remove border/shadow from canvases; apply to wrapper to avoid compositor artifacts
            c.style.pointerEvents = 'none'
            if (wrapperRef.current) {
              wrapperRef.current.style.position = 'relative'
              wrapperRef.current.appendChild(c)
            }
            return c
          }

          const front = frontIndexRef.current === 0 ? ensureCanvas(canvasARef) : ensureCanvas(canvasBRef)
          const back = frontIndexRef.current === 0 ? ensureCanvas(canvasBRef) : ensureCanvas(canvasARef)

          // Decide if we animate this change
          const ratio = (lastScaleRef.current && lastScaleRef.current > 0) ? (lastScaleRef.current / scale) : 1
          const animate = Math.abs(ratio - 1) > 0.01
          const dpr = window.devicePixelRatio || 1

          // Prepare back buffer size and appearance (hidden)
          back.width = Math.floor(viewport.width * dpr)
          back.height = Math.floor(viewport.height * dpr)
          back.style.width = `${viewport.width}px`
          back.style.height = `${viewport.height}px`
          back.style.zIndex = '2' // overlay on top during swap
          ;(back.getContext('2d') as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0)

          // Start rendering new pixels to back buffer
          const renderTask = (page as any).render({ canvasContext: back.getContext('2d'), viewport })

          // Front remains visible below
          front.style.opacity = '1'
          front.style.zIndex = '1'

          // When render completes, animate back into view
          await renderTask.promise
          if (cancelled) return

          if (animate) {
            back.style.willChange = 'transform'
            back.style.transition = 'transform 150ms ease-out'
            back.style.transform = `translateX(-50%) scale(${ratio})`
            // Trigger animation into place
            requestAnimationFrame(() => {
              back.style.transform = 'translateX(-50%) scale(1)'
            })
            // Wait specifically for transform to finish (not opacity)
            await new Promise<void>((resolve) => {
              const onEnd = (e: TransitionEvent) => {
                if (e.propertyName === 'transform') { back.removeEventListener('transitionend', onEnd); resolve() }
              }
              back.addEventListener('transitionend', onEnd)
            })
          } else {
            back.style.transform = 'translateX(-50%) scale(1)'
          }

          // Swap buffers: back becomes front (keep previous canvas present underneath)
          frontIndexRef.current = frontIndexRef.current === 0 ? 1 : 0
          lastScaleRef.current = scale
        } catch (e) {
          if (!cancelled) setError(String(e))
        }
      })()
      return () => { cancelled = true }
    }, [pdf, visible, pageNum, scale])

    const minH = pageHeights[pageNum - 1] ?? defaultPageHeight
    return (
      <div ref={pageRef} className="flex flex-col items-center mb-4" style={{ minHeight: `${minH}px` }}>
        <div
          ref={wrapperRef}
          className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    )
  }

  const zoomIn = () => { setFitWidth(false); setScale(prev => Math.min(prev + 0.2, 3)) }
  const zoomOut = () => { setFitWidth(false); setScale(prev => Math.max(prev - 0.2, 0.5)) }
  const toggleFit = () => setFitWidth((v) => !v)
  const resetZoom = () => { setFitWidth(false); setScale(1) }

  // Recompute fit after toggling on
  useEffect(() => { if (fitWidth) recomputeFitWidth() }, [fitWidth, recomputeFitWidth])

  if (fileBytesQ.isLoading || fileMetaQ.isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
      </div>
    )
  }

  if (error || fileBytesQ.error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-600 text-sm">{String(error || (fileBytesQ.error as any)?.message)}</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
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

      {/* PDF Content - Container with Scroll */}
      <div
        ref={containerRef}
        className="overflow-auto bg-slate-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg h-full"
        style={{ height: '100%', minHeight: fullscreen ? '100%' : undefined }}
      >
        <div className="p-6 flex flex-col items-center">
          {Array.from({ length: numPages }, (_, i) => (
            <PageView key={i} pageNum={i + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
