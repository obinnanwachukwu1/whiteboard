import React, { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Hand, Type } from 'lucide-react'

type PdfCommand = {
  type: string
  [key: string]: any
}

type Props = {
  currentPage: number
  totalPages: number
  scale: number
  scaleMode: string | null
  selectionMode: 'text' | 'hand'
  onCommand: (command: PdfCommand) => void
}

// Predefined zoom levels for the dropdown
const ZOOM_PRESETS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Page Fit', value: 'page-fit' },
  { label: 'Page Width', value: 'page-width' },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
  { label: '300%', value: 3.0 },
]

/**
 * Floating toolbar for PDF viewer controls
 * Styled to match the original react-pdf-viewer toolbar design
 */
export const PdfToolbar: React.FC<Props> = ({
  currentPage,
  totalPages,
  scale,
  scaleMode,
  selectionMode,
  onCommand,
}) => {
  const [pageInput, setPageInput] = useState<string>(String(currentPage))
  const [showZoomDropdown, setShowZoomDropdown] = useState(false)
  
  // Update page input when currentPage changes externally
  React.useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])
  
  const handlePrevPage = useCallback(() => {
    onCommand({ type: 'PREV_PAGE' })
  }, [onCommand])
  
  const handleNextPage = useCallback(() => {
    onCommand({ type: 'NEXT_PAGE' })
  }, [onCommand])
  
  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
  }, [])
  
  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(pageInput, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onCommand({ type: 'GO_TO_PAGE', page })
    } else {
      // Reset to current page if invalid
      setPageInput(String(currentPage))
    }
  }, [pageInput, totalPages, currentPage, onCommand])
  
  const handleZoomIn = useCallback(() => {
    onCommand({ type: 'ZOOM_IN' })
  }, [onCommand])
  
  const handleZoomOut = useCallback(() => {
    onCommand({ type: 'ZOOM_OUT' })
  }, [onCommand])
  
  const handleZoomSelect = useCallback((value: string | number) => {
    setShowZoomDropdown(false)
    if (typeof value === 'string') {
      onCommand({ type: 'SET_SCALE_MODE', mode: value })
    } else {
      onCommand({ type: 'SET_SCALE', scale: value })
    }
  }, [onCommand])
  
  const handleSelectionModeToggle = useCallback((mode: 'text' | 'hand') => {
    onCommand({ type: 'SET_SELECTION_MODE', mode })
  }, [onCommand])
  
  const handleDownload = useCallback(() => {
    // Note: Download is handled by opening the file URL externally
    // This could be enhanced to trigger actual download if needed
    console.log('[PdfToolbar] Download requested')
  }, [])
  
  // Format current zoom display
  const getZoomDisplay = (): string => {
    if (scaleMode === 'page-width') return 'Width'
    if (scaleMode === 'page-fit') return 'Fit'
    if (scaleMode === 'auto') return 'Auto'
    return `${Math.round(scale * 100)}%`
  }
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 px-4 py-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-xl rounded-full border border-gray-200 dark:border-neutral-700">
        {/* Page Navigation */}
        <div className="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-neutral-700">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous page"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-sm">
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              className="w-10 px-1 py-0.5 text-center bg-transparent border border-gray-300 dark:border-neutral-600 rounded text-sm"
              aria-label="Current page"
            />
            <span className="text-gray-400 dark:text-neutral-500">/</span>
            <span className="text-gray-600 dark:text-neutral-400">{totalPages}</span>
          </form>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next page"
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 relative">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Zoom out"
            type="button"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowZoomDropdown(!showZoomDropdown)}
              className="px-2 py-0.5 text-sm min-w-[60px] rounded hover:bg-black/5 dark:hover:bg-white/10"
              type="button"
            >
              {getZoomDisplay()}
            </button>
            
            {showZoomDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowZoomDropdown(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-700 z-20 min-w-[120px]">
                  {ZOOM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleZoomSelect(preset.value)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Zoom in"
            type="button"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        {/* Selection Mode */}
        <div className="flex items-center gap-1 pl-3 border-l border-gray-200 dark:border-neutral-700">
          <button
            onClick={() => handleSelectionModeToggle('hand')}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              selectionMode === 'hand' ? 'bg-black/10 dark:bg-white/20' : ''
            }`}
            title="Hand tool (drag to pan)"
            type="button"
          >
            <Hand className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleSelectionModeToggle('text')}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              selectionMode === 'text' ? 'bg-black/10 dark:bg-white/20' : ''
            }`}
            title="Text selection"
            type="button"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
        
        {/* Download */}
        <div className="flex items-center gap-1 pl-3 border-l border-gray-200 dark:border-neutral-700">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Download"
            type="button"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
