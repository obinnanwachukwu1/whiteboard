import React, { useEffect, useRef, useState } from 'react'
import { renderAsync as renderDocx } from 'docx-preview'
import './docx-preview.css'
import ViewerFrame from './ViewerFrame'
import DocxToolbar from './DocxToolbar'

type Props = {
  url: string
  className?: string
  isFullscreen?: boolean
  onDownload?: () => void
}

const DocxRenderer: React.FC<Props> = ({ url, className = '', isFullscreen, onDownload }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed to fetch file')
        const blob = await resp.blob()
        if (cancelled || !containerRef.current) return
        
        containerRef.current.innerHTML = ''
        await renderDocx(blob, containerRef.current, undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
        })

        // Detect pages
        const pages = containerRef.current.querySelectorAll<HTMLElement>('.docx')
        setTotalPages(pages.length)
        setCurrentPage(1)
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      }
    })()
    return () => { cancelled = true }
  }, [url])

  // Apply zoom (Chromium supports CSS zoom and it affects layout/scroll correctly)
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const target = (root.querySelector('.docx-wrapper') as HTMLElement | null) ?? root
    ;(target.style as any).zoom = `${Math.round(zoom * 100)}%`
  }, [zoom])

  // Track current page based on scroll
  useEffect(() => {
    const scroller = scrollRef.current
    const root = containerRef.current
    if (!scroller || !root) return

    const onScroll = () => {
      const pages = Array.from(root.querySelectorAll<HTMLElement>('.docx'))
      if (!pages.length) return
      const sr = scroller.getBoundingClientRect()
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < pages.length; i++) {
        const pr = pages[i].getBoundingClientRect()
        const dist = Math.abs(pr.top - sr.top)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      setCurrentPage(best + 1)
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => scroller.removeEventListener('scroll', onScroll as any)
  }, [totalPages])

  const goToPage = (page: number) => {
    const root = containerRef.current
    if (!root) return
    const pages = Array.from(root.querySelectorAll<HTMLElement>('.docx'))
    const el = pages[page - 1]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <ViewerFrame
      className={className}
      padding="default"
      contentRef={scrollRef}
      toolbar={
        <DocxToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          zoom={zoom}
          onPrevPage={() => goToPage(Math.max(1, currentPage - 1))}
          onNextPage={() => goToPage(Math.min(totalPages || 1, currentPage + 1))}
          onGoToPage={goToPage}
          onZoomChange={setZoom}
          onDownload={onDownload}
          disableDownload={!onDownload}
        />
      }
    >
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: isFullscreen ? '100%' : undefined }}
      />
      {error && <div className="text-red-600 text-sm mt-4">{error}</div>}
    </ViewerFrame>
  )
}

export default DocxRenderer
