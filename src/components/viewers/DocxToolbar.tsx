import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'

type Props = {
  currentPage: number
  totalPages: number
  zoom: number
  onPrevPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  onZoomChange: (zoom: number) => void
  onDownload?: () => void
  disableDownload?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const DocxToolbar: React.FC<Props> = ({
  currentPage,
  totalPages,
  zoom,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomChange,
  onDownload,
  disableDownload,
}) => {
  const [pageInput, setPageInput] = useState(String(currentPage))
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const zoomDisplay = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const page = parseInt(pageInput, 10)
      if (!Number.isFinite(page) || page < 1 || page > totalPages) {
        setPageInput(String(currentPage))
        return
      }
      onGoToPage(page)
    },
    [pageInput, totalPages, currentPage, onGoToPage]
  )

  const zoomOut = useCallback(() => {
    onZoomChange(clamp(Math.round((zoom - 0.1) * 100) / 100, 0.5, 2))
  }, [zoom, onZoomChange])

  const zoomIn = useCallback(() => {
    onZoomChange(clamp(Math.round((zoom + 0.1) * 100) / 100, 0.5, 2))
  }, [zoom, onZoomChange])

  const pickZoom = useCallback(
    (z: number) => {
      setShowZoomDropdown(false)
      onZoomChange(clamp(z, 0.5, 2))
    },
    [onZoomChange]
  )

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/95 dark:bg-neutral-900/95 shadow-xl rounded-full border border-gray-200 dark:border-neutral-700">
      {/* Page */}
      <div className="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="flex items-center gap-1 text-sm">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handleSubmit}
            className="w-10 px-1 py-0.5 text-center bg-transparent border border-gray-300 dark:border-neutral-600 rounded text-sm"
            aria-label="Current page"
          />
          <span className="text-gray-400 dark:text-neutral-500">/</span>
          <span className="text-gray-600 dark:text-neutral-400 min-w-[1ch] text-center inline-block">
            {totalPages > 0 ? totalPages : '–'}
          </span>
        </form>

        <button
          type="button"
          onClick={onNextPage}
          disabled={totalPages > 0 ? currentPage >= totalPages : true}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 relative">
        <button
          type="button"
          onClick={zoomOut}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
            className="px-2 py-0.5 text-sm min-w-[64px] rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Zoom"
          >
            {zoomDisplay}
          </button>

          {showZoomDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowZoomDropdown(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-700 z-20 min-w-[120px]">
                {ZOOM_PRESETS.map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => pickZoom(z)}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={zoomIn}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Download */}
      <div className="flex items-center gap-1 pl-3 border-l border-gray-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onDownload}
          disabled={disableDownload}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default DocxToolbar
