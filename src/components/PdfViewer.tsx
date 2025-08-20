import React, { useEffect, useRef, useState } from 'react'
import 'pdfjs-dist/webpack.mjs'
import { getDocument, PDFDocumentProxy } from 'pdfjs-dist'
import { useFileBytes } from '../hooks/useCanvasQueries'

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        if (!fileBytesQ.data) return
        const bytes = new Uint8Array(fileBytesQ.data)
        const task = getDocument({ data: bytes, useSystemFonts: true, disableFontFace: false, verbosity: 0 })
        loadingTaskRef.current = task
        const pdfDoc = await task.promise
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
      if (loadingTaskRef.current) {
        try { loadingTaskRef.current.destroy() } catch {}
      }
    }
  }, [fileId, fileBytesQ.data])

  useEffect(() => {
    if (pdf && numPages > 0) {
      // Small delay to ensure component is fully mounted, then render all pages
      setTimeout(() => renderAllPages(), 100)
    }
  }, [pdf, numPages, scale])

  

  const renderAllPages = async () => {
    if (!pdf) {
      console.log('No PDF document available')
      return
    }
    
    if (!containerRef.current) {
      console.log('Container ref not available, retrying...')
      setTimeout(() => renderAllPages(), 100)
      return
    }

    try {
      console.log(`Rendering all ${numPages} pages`)
      
      // Clear previous content
      containerRef.current.innerHTML = ''
      
      // Create a container for all pages
      const allPagesContainer = document.createElement('div')
      allPagesContainer.style.display = 'flex'
      allPagesContainer.style.flexDirection = 'column'
      allPagesContainer.style.gap = '20px'
      allPagesContainer.style.alignItems = 'center'
      
      // Render all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale })
        
        // Create page container
        const pageContainer = document.createElement('div')
        pageContainer.style.display = 'flex'
        pageContainer.style.flexDirection = 'column'
        pageContainer.style.alignItems = 'center'
        pageContainer.style.marginBottom = '10px'
        
        // Add page number label
        const pageLabel = document.createElement('div')
        pageLabel.textContent = `Page ${pageNum}`
        pageLabel.style.fontSize = '12px'
        pageLabel.style.color = '#64748b'
        pageLabel.style.marginBottom = '5px'
        pageLabel.style.fontFamily = 'system-ui, sans-serif'
        
        // Create canvas for this page
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context) {
          console.warn(`Could not get canvas context for page ${pageNum}`)
          continue
        }
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        canvas.style.width = '100%'
        canvas.style.maxWidth = '800px'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        canvas.style.border = '1px solid #e2e8f0'
        canvas.style.borderRadius = '4px'
        canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
        
        // Render the page
        await (page as any).render({
          canvasContext: context,
          viewport: viewport,
        }).promise
        
        // Add to page container
        pageContainer.appendChild(pageLabel)
        pageContainer.appendChild(canvas)
        allPagesContainer.appendChild(pageContainer)
        
        console.log(`Page ${pageNum} rendered successfully`)
      }
      
      // Add all pages to the main container
      if (containerRef.current) {
        containerRef.current.appendChild(allPagesContainer)
        console.log(`All ${numPages} pages rendered successfully`)
      }
      
    } catch (e) {
      console.error('Error rendering pages:', e)
      setError(`Error rendering pages: ${e}`)
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  if (fileBytesQ.isLoading) {
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
      <div 
        className="h-96 overflow-auto bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
        style={{ height: '600px' }}
      >
        <div 
          ref={containerRef}
          className="p-6"
        />
      </div>
    </div>
  )
}
