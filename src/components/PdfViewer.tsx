import React, { useEffect, useRef, useState } from 'react'
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
}

export const PdfViewer: React.FC<Props> = ({ fileId, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  // Track scale and page count only; rendering is done eagerly
  const loadingTaskRef = useRef<any | null>(null)
  const fileBytesQ = useFileBytes(fileId)
  const fileMetaQ = useFileMeta(fileId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        let pdfDoc: PDFDocumentProxy | null = null
        if (fileBytesQ.data && (fileBytesQ.data as ArrayBuffer).byteLength > 0) {
          const bytes = new Uint8Array(fileBytesQ.data)
          // Basic sanity check for PDF header
          if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
            throw new Error('Invalid PDF bytes (missing %PDF header)')
          }
          const task = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 } as any)
          loadingTaskRef.current = task
          pdfDoc = await task.promise
        } else if ((fileMetaQ.data as any)?.url) {
          const url = (fileMetaQ.data as any).url as string
          // Fetch bytes ourselves to avoid pdfjs URL handling quirks in Electron
          const resp = await fetch(url, { method: 'GET', credentials: 'omit' })
          if (!resp.ok) throw new Error(`Failed to fetch PDF via URL: ${resp.status}`)
          const buf = await resp.arrayBuffer()
          if (!buf || buf.byteLength === 0) throw new Error('Empty PDF data from URL')
          const bytes = new Uint8Array(buf)
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
  }, [fileId, fileBytesQ.data, fileMetaQ.data])

  // Cleanup PDF document on unmount
  useEffect(() => {
    return () => {
      if (pdf) {
        try { (pdf as any).destroy?.() } catch {}
      }
    }
  }, [pdf])

  const PageView: React.FC<{ pageNum: number }> = ({ pageNum }) => {
    const pageRef = React.useRef<HTMLDivElement | null>(null)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const [visible, setVisible] = React.useState(false)

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
          const canvas = canvasRef.current || document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          canvas.height = viewport.height
          canvas.width = viewport.width
          canvas.style.width = '100%'
          canvas.style.maxWidth = '800px'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          canvas.style.border = '1px solid #e2e8f0'
          canvas.style.borderRadius = '4px'
          canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
          await (page as any).render({ canvasContext: ctx, viewport }).promise
          if (!canvasRef.current) {
            canvasRef.current = canvas
            if (pageRef.current) pageRef.current.appendChild(canvas)
          }
        } catch (e) {
          if (!cancelled) setError(String(e))
        }
      })()
      return () => { cancelled = true }
    }, [pdf, visible, pageNum, scale])

    return (
      <div ref={pageRef} className="flex flex-col items-center mb-4">
        <div className="text-xs text-slate-500 mb-1">Page {pageNum}</div>
      </div>
    )
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Zoom Out
          </button>
          <span className="text-sm font-mono">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Zoom In
          </button>
        </div>
      </div>

      {/* PDF Content - Fixed Height Container with Scroll */}
      <div ref={containerRef} className="h-96 overflow-auto bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg" style={{ height: '600px' }}>
        <div className="p-6 flex flex-col items-center">
          {Array.from({ length: numPages }, (_, i) => (
            <PageView key={i} pageNum={i + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
