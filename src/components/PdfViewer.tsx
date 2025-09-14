import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback, useImperativeHandle } from 'react'
import { ZoomIn, ZoomOut, Focus, ChevronLeft, ChevronRight } from 'lucide-react'
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

export const PdfViewer = React.forwardRef<PdfViewerHandle, Props>(({ fileId, className = '', fullscreen = false, onPageChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [fitWidth, setFitWidth] = useState(false)
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null)
  // Multi-page continuous scroll refs
  const pageElsRef = useRef<Map<number, HTMLDivElement | null>>(new Map())
  type PageRenderRefs = {
    wrapperRef: React.MutableRefObject<HTMLDivElement | null>
    canvasARef: React.MutableRefObject<HTMLCanvasElement | null>
    canvasBRef: React.MutableRefObject<HTMLCanvasElement | null>
    frontIndexRef: React.MutableRefObject<0 | 1>
    lastScaleRef: React.MutableRefObject<number>
    renderTaskARef: React.MutableRefObject<any | null>
    renderTaskBRef: React.MutableRefObject<any | null>
    tokenRef: React.MutableRefObject<number>
  }
  const pageRenderMap = useRef<Map<number, PageRenderRefs>>(new Map())
  // Lightweight store to publish current page without rerendering PdfViewer
  const pageStoreRef = useRef<{ get: () => number; set: (n: number) => void; subscribe: (fn: () => void) => () => void } | null>(null)
  if (!pageStoreRef.current) {
    let v = 1
    const subs = new Set<() => void>()
    pageStoreRef.current = {
      get: () => v,
      set: (n: number) => { if (n !== v) { v = n; subs.forEach((f) => f()) } },
      subscribe: (fn: () => void) => { subs.add(fn); return () => subs.delete(fn) },
    }
  }
  const anchorRef = useRef<{ page: number; rel: number } | null>(null)
  // Suppress transient page publishes during anchored reposition (zoom/resize)
  const suppressPagePublishRef = useRef(0)
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

  // Pre-compute page heights to stabilize container sizing
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
    if (Math.abs(scale - clamped) > 0.005) setScaleAnchored(clamped)
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

  // Single page renderer with double-buffer swap (no scroll page switching)
  // Page component: visible-range render with double buffer and per-page cancellation
  type PageViewProps = { pageNum: number; scale: number }
  const PageViewInner: React.FC<PageViewProps> = ({ pageNum, scale }) => {
    const pageRef = React.useRef<HTMLDivElement | null>(null)
    const wrapperRef = React.useRef<HTMLDivElement | null>(null)
    const canvasARef = React.useRef<HTMLCanvasElement | null>(null)
    const canvasBRef = React.useRef<HTMLCanvasElement | null>(null)
    const frontIndexRef = React.useRef<0 | 1>(0)
    const lastScaleRef = React.useRef<number>(scale)
    const renderTaskARef = React.useRef<any | null>(null)
    const renderTaskBRef = React.useRef<any | null>(null)
    const tokenRef = React.useRef(0)
    const [visible, setVisible] = useState(false)

    // Register page DOM
    useEffect(() => {
      const el = pageRef.current
      if (!el) return
      pageElsRef.current.set(pageNum, el)
      pageRenderMap.current.set(pageNum, { wrapperRef, canvasARef, canvasBRef, frontIndexRef, lastScaleRef, renderTaskARef, renderTaskBRef, tokenRef })
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) setVisible(e.isIntersecting)
      }, { root: containerRef.current, rootMargin: '1200px 0px', threshold: 0.01 })
      io.observe(el)
      return () => { io.disconnect(); pageElsRef.current.delete(pageNum); pageRenderMap.current.delete(pageNum) }
    }, [])

    useEffect(() => {
      let cancelled = false
      if (!pdf || !visible) return
      ;(async () => {
        try {
          const myToken = ++tokenRef.current
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale })
          if (pageRef.current) pageRef.current.style.minHeight = `${Math.round(viewport.height)}px`
          if (wrapperRef.current) {
            wrapperRef.current.style.width = `${viewport.width}px`
            wrapperRef.current.style.height = `${viewport.height}px`
          }
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
            c.style.pointerEvents = 'none'
            if (wrapperRef.current) { wrapperRef.current.style.position = 'relative'; wrapperRef.current.appendChild(c) }
            return c
          }
          const front = frontIndexRef.current === 0 ? ensureCanvas(canvasARef) : ensureCanvas(canvasBRef)
          const back = frontIndexRef.current === 0 ? ensureCanvas(canvasBRef) : ensureCanvas(canvasARef)
          // cancel back render if running
          if (back === canvasARef.current && renderTaskARef.current?.cancel) { try { renderTaskARef.current.cancel() } catch {} }
          if (back === canvasBRef.current && renderTaskBRef.current?.cancel) { try { renderTaskBRef.current.cancel() } catch {} }
          const dpr = window.devicePixelRatio || 1
          back.width = Math.floor(viewport.width * dpr)
          back.height = Math.floor(viewport.height * dpr)
          back.style.width = `${viewport.width}px`
          back.style.height = `${viewport.height}px`
          back.style.zIndex = '2'
          ;(back.getContext('2d') as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0)
          const renderTask = (page as any).render({ canvasContext: back.getContext('2d'), viewport })
          if (back === canvasARef.current) renderTaskARef.current = renderTask
          if (back === canvasBRef.current) renderTaskBRef.current = renderTask
          front.style.opacity = '1'; front.style.zIndex = '1'
          try { await renderTask.promise } catch (e) { const msg = String(e||''); if (!/Rendering cancelled/i.test(msg)) throw e }
          if (cancelled || myToken !== tokenRef.current) return
          // animate only on scale change
          const ratio = (lastScaleRef.current && lastScaleRef.current > 0) ? (lastScaleRef.current / scale) : 1
          const animate = Math.abs(ratio - 1) > 0.01
          if (animate) {
            back.style.willChange = 'transform'
            back.style.transition = 'transform 120ms ease-out'
            back.style.transform = `translateX(-50%) scale(${ratio})`
            requestAnimationFrame(() => { back.style.transform = 'translateX(-50%) scale(1)' })
            await new Promise<void>((resolve) => {
              const onEnd = (e: TransitionEvent) => { if (e.propertyName === 'transform') { back.removeEventListener('transitionend', onEnd); resolve() } }
              back.addEventListener('transitionend', onEnd)
            })
          } else { back.style.transform = 'translateX(-50%) scale(1)' }
          frontIndexRef.current = frontIndexRef.current === 0 ? 1 : 0
          lastScaleRef.current = scale
        } catch (e) { if (!cancelled) setError(String(e)) }
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

  const PageView = React.memo(PageViewInner, (prev, next) => prev.pageNum === next.pageNum && prev.scale === next.scale)

  // Imperatively render a specific page into its own refs (used on page jumps)
  const ensurePageRendered = React.useCallback(async (p: number, animate = false) => {
    try {
      if (!pdf) return
      const refs = pageRenderMap.current.get(p)
      const host = pageElsRef.current.get(p)
      if (!refs || !host) return
      const { wrapperRef, canvasARef, canvasBRef, frontIndexRef, lastScaleRef, renderTaskARef, renderTaskBRef, tokenRef } = refs
      const myToken = ++tokenRef.current
      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale })
      if (wrapperRef.current) {
        wrapperRef.current.style.width = `${viewport.width}px`
        wrapperRef.current.style.height = `${viewport.height}px`
      }
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
        c.style.pointerEvents = 'none'
        if (wrapperRef.current) { wrapperRef.current.style.position = 'relative'; wrapperRef.current.appendChild(c) }
        return c
      }
      const front = frontIndexRef.current === 0 ? ensureCanvas(canvasARef) : ensureCanvas(canvasBRef)
      const back = frontIndexRef.current === 0 ? ensureCanvas(canvasBRef) : ensureCanvas(canvasARef)
      if (back === canvasARef.current && renderTaskARef.current?.cancel) { try { renderTaskARef.current.cancel() } catch {} }
      if (back === canvasBRef.current && renderTaskBRef.current?.cancel) { try { renderTaskBRef.current.cancel() } catch {} }
      const dpr = window.devicePixelRatio || 1
      back.width = Math.floor(viewport.width * dpr)
      back.height = Math.floor(viewport.height * dpr)
      back.style.width = `${viewport.width}px`
      back.style.height = `${viewport.height}px`
      back.style.zIndex = '2'
      ;(back.getContext('2d') as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0)
      const renderTask = (page as any).render({ canvasContext: back.getContext('2d'), viewport })
      if (back === canvasARef.current) renderTaskARef.current = renderTask
      if (back === canvasBRef.current) renderTaskBRef.current = renderTask
      front.style.opacity = '1'; front.style.zIndex = '1'
      try { await renderTask.promise } catch (e) { const msg = String(e||''); if (!/Rendering cancelled/i.test(msg)) throw e }
      if (myToken !== tokenRef.current) return
      // animate only when requested (e.g., zoom); page jumps are non-animated
      if (animate) {
        const ratio = (lastScaleRef.current && lastScaleRef.current > 0) ? (lastScaleRef.current / scale) : 1
        if (Math.abs(ratio - 1) > 0.01) {
          back.style.willChange = 'transform'
          back.style.transition = 'transform 120ms ease-out'
          back.style.transform = `translateX(-50%) scale(${ratio})`
          requestAnimationFrame(() => { back.style.transform = 'translateX(-50%) scale(1)' })
          await new Promise<void>((resolve) => {
            const onEnd = (e: TransitionEvent) => { if (e.propertyName === 'transform') { back.removeEventListener('transitionend', onEnd); resolve() } }
            back.addEventListener('transitionend', onEnd)
          })
        }
      } else {
        back.style.transform = 'translateX(-50%) scale(1)'
      }
      frontIndexRef.current = frontIndexRef.current === 0 ? 1 : 0
      lastScaleRef.current = scale
    } catch {}
  }, [pdf, scale])

  // (continuous scroll) rendering is handled by each PageView when visible

  // Anchor the center during zoom by capturing relative position within current page
  const captureAnchor = () => {
    const c = containerRef.current
    if (!c) return null
    const centerY = c.scrollTop + c.clientHeight / 2
    let best = pageStoreRef.current!.get()
    let bestDist = Infinity
    for (let i = 1; i <= numPages; i++) {
      const el = pageElsRef.current.get(i)
      if (!el) continue
      const pageTop = el.offsetTop
      const ph = pageHeights[i - 1] ?? el.getBoundingClientRect().height
      const mid = pageTop + ph / 2
      const d = Math.abs(centerY - mid)
      if (d < bestDist) { best = i; bestDist = d }
    }
    const el = pageElsRef.current.get(best)
    if (!el) return null
    const pageTop = el.offsetTop
    const ph = pageHeights[best - 1] ?? el.getBoundingClientRect().height
    const rel = ph > 0 ? (centerY - pageTop) / ph : 0.5
    return { page: best, rel }
  }

  const setScaleAnchored = (next: number) => {
    setFitWidth(false)
    const a = captureAnchor()
    if (a) anchorRef.current = a
    setScale(next)
  }

  const zoomIn = () => setScaleAnchored(Math.min(scale + 0.2, 3))
  const zoomOut = () => setScaleAnchored(Math.max(scale - 0.2, 0.5))
  const toggleFit = () => setFitWidth((v) => !v)
  const resetZoom = () => setScaleAnchored(1)

  // Recompute fit after toggling on
  useEffect(() => { if (fitWidth) recomputeFitWidth() }, [fitWidth, recomputeFitWidth])

  // After scale changes, restore anchored position (continuous scroll)
  useEffect(() => {
    if (!anchorRef.current) return
    const info = anchorRef.current
    const c = containerRef.current
    const el = pageElsRef.current.get(info.page)
    if (!c || !el) { anchorRef.current = null; return }
    const adjust = () => {
      const ph = pageHeights[info.page - 1] ?? el.getBoundingClientRect().height
      const target = el.offsetTop + (ph * info.rel) - c.clientHeight / 2
      // Suppress transient page publish during this repositioning
      suppressPagePublishRef.current++
      c.scrollTop = Math.max(0, target)
      anchorRef.current = null
      // After scroll settles, publish the final page value and release suppression
      const finalize = () => {
        const centerY = c.scrollTop + c.clientHeight / 2
        let best = pageStoreRef.current!.get()
        let bestDist = Infinity
        for (let i = 1; i <= numPages; i++) {
          const el2 = pageElsRef.current.get(i)
          if (!el2) continue
          const pageTop2 = el2.offsetTop
          const ph2 = pageHeights[i - 1] ?? el2.getBoundingClientRect().height
          const mid2 = pageTop2 + ph2 / 2
          const d2 = Math.abs(centerY - mid2)
          if (d2 < bestDist) { best = i; bestDist = d2 }
        }
        pageStoreRef.current!.set(best)
        suppressPagePublishRef.current = Math.max(0, suppressPagePublishRef.current - 1)
      }
      requestAnimationFrame(() => requestAnimationFrame(finalize))
    }
    requestAnimationFrame(() => requestAnimationFrame(adjust))
  }, [scale, pageHeights])

  // Track current page based on scroll center; publish to store only
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    let raf = 0
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (suppressPagePublishRef.current > 0) return
        const centerY = c.scrollTop + c.clientHeight / 2
        let best = pageStoreRef.current!.get()
        let bestDist = Infinity
        for (let i = 1; i <= numPages; i++) {
          const el = pageElsRef.current.get(i)
          if (!el) continue
          const pageTop = el.offsetTop
          const ph = pageHeights[i - 1] ?? el.getBoundingClientRect().height
          const mid = pageTop + ph / 2
          const d = Math.abs(centerY - mid)
          if (d < bestDist) { best = i; bestDist = d }
        }
        pageStoreRef.current!.set(best)
      })
    }
    c.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => { c.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [numPages, pageHeights])

  // Expose page getters/subscription via ref, no re-renders
  useImperativeHandle(ref, () => ({
    getCurrentPage: () => pageStoreRef.current!.get(),
    subscribePage: (fn: () => void) => pageStoreRef.current!.subscribe(fn),
  }), [])

  // Optional callback when page changes (no re-render)
  useEffect(() => {
    if (!onPageChange) return
    const unsub = pageStoreRef.current!.subscribe(() => {
      try { onPageChange(pageStoreRef.current!.get()) } catch {}
    })
    // fire once immediately with current value
    try { onPageChange(pageStoreRef.current!.get()) } catch {}
    return unsub
  }, [onPageChange])

  const clampPage = (p: number) => Math.max(1, Math.min(numPages || 1, p))
  const scrollToPage = async (p: number) => {
    // Ensure target is rendered to avoid flash
    await ensurePageRendered(p, false)
    const c = containerRef.current
    const el = pageElsRef.current.get(p)
    if (!c || !el) { pageStoreRef.current!.set(p); return }
    c.scrollTop = el.offsetTop
    pageStoreRef.current!.set(p)
  }

  const goPrev = useCallback(() => { const cur = pageStoreRef.current!.get(); const p = clampPage(cur - 1); scrollToPage(p) }, [numPages])
  const goNext = useCallback(() => { const cur = pageStoreRef.current!.get(); const p = clampPage(cur + 1); scrollToPage(p) }, [numPages])

  // Keyboard shortcuts: prev/next, zoom in/out/reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoomIn(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); resetZoom(); return }
      // Page navigation
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, resetZoom, goPrev, goNext])

  // Re-render visible pages on scale change; invisible pages render when they become visible
  useEffect(() => {
    // trigger rerender in PageView via scale dependency
  }, [scale])

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

  // Controls rendered as independent subscriber so page changes don't rerender PdfViewer
  const PageControls: React.FC = React.memo(() => {
    const page = useSyncExternalStore(pageStoreRef.current!.subscribe, pageStoreRef.current!.get, pageStoreRef.current!.get)
    const [editing, setEditing] = React.useState(false)
    const [localVal, setLocalVal] = React.useState<string>(String(page))
    // When page changes due to scroll/zoom, update input if not editing
    useEffect(() => { if (!editing) setLocalVal(String(page)) }, [page, editing])
    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goPrev} title="Previous page" disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              className="w-14 px-2 py-1 text-sm rounded-control bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 text-center"
              value={localVal}
              onFocus={() => setEditing(true)}
              onChange={(e) => setLocalVal(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={async (e) => { setEditing(false); const n = clampPage(parseInt((e.target as HTMLInputElement).value || '1', 10) || 1); await scrollToPage(n) }}
              onKeyDown={async (e) => { if (e.key === 'Enter') { setEditing(false); const n = clampPage(parseInt((e.target as HTMLInputElement).value || '1', 10) || 1); await scrollToPage(n) } }}
              aria-label="Current page"
            />
            <span className="text-sm">/ {numPages || 1}</span>
            <Button variant="ghost" size="sm" onClick={goNext} title="Next page" disabled={page >= numPages}>
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
    )
  })

  return (
    <div className={`flex flex-col ${className}`}>
      <PageControls />

      {/* PDF Content - Continuous scroll of pages */}
      <div
        ref={containerRef}
        className="overflow-auto bg-slate-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg h-full"
        style={{ height: '100%', minHeight: fullscreen ? '100%' : undefined }}
      >
        <div className="p-6 flex flex-col items-center">
          {Array.from({ length: numPages }, (_, i) => (
            <PageView key={i} pageNum={i + 1} scale={scale} />
          ))}
        </div>
      </div>
    </div>
  )
})

PdfViewer.displayName = 'PdfViewer'
