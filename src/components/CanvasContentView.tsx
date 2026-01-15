import React, { useState } from 'react'
import { Button } from './ui/Button'
import { ArrowLeft, RefreshCw, Maximize2, Minimize2, Sparkles, FileText, Info } from 'lucide-react'
import { HtmlContent } from './HtmlContent'
import { FileViewer } from './FileViewer'
import { useAssignmentRest, useCoursePage, useAnnouncement } from '../hooks/useCanvasQueries'
import { FullscreenContainer } from './FullscreenContainer'
import { useQueryClient } from '@tanstack/react-query'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { useAIPanel } from '../context/AIPanelContext'
import { useAppContext } from '../context/AppContext'

type ContentType = 'page' | 'assignment' | 'file' | 'announcement'

type Props = {
  courseId: string | number
  courseName?: string
  contentType: ContentType
  contentId: string
  title: string
  onBack: () => void
  onNavigate?: (href: string) => void
}

export const CanvasContentView: React.FC<Props> = ({
  courseId,
  courseName,
  contentType,
  contentId,
  title,
  onBack,
  onNavigate,
}) => {
  const qc = useQueryClient()
  const app = useAppContext()
  const aiPanel = useAIPanel()
  
  const pageQ = useCoursePage(contentType === 'page' ? courseId : undefined, contentType === 'page' ? contentId : undefined, { enabled: contentType === 'page' })
  const assignQ = useAssignmentRest(contentType === 'assignment' ? courseId : undefined, contentType === 'assignment' ? contentId : undefined, { enabled: contentType === 'assignment' })
  const annQ = useAnnouncement(contentType === 'announcement' ? courseId : undefined, contentType === 'announcement' ? contentId : undefined, { enabled: contentType === 'announcement' })
  
  const loading = pageQ.isLoading || assignQ.isLoading || annQ.isLoading
  const error = pageQ.error?.message || assignQ.error?.message || annQ.error?.message || null

  // Context Menu State
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show context menu if AI is enabled and we have content
    if (!app.aiEnabled) return
    if (loading || error) return
    
    // Only for text content types for now (not files)
    if (contentType === 'file') return

    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const getContentText = () => {
    if (contentType === 'page') return pageQ.data?.body || ''
    if (contentType === 'assignment') return assignQ.data?.description || ''
    if (contentType === 'announcement') return annQ.data?.message || ''
    return ''
  }

  const handleSummarize = () => {
    const text = getContentText()
    // Strip HTML roughly for prompt efficiency
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000) // Limit length
    aiPanel.open(`Summarize this ${contentType}: "${title}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const handleExplain = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(`Explain the key concepts in this ${contentType}: "${title}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const handleTasks = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(`Create a checklist of tasks from this ${contentType}: "${title}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Summarize',
      icon: <Sparkles className="w-4 h-4" />,
      onClick: handleSummarize
    },
    {
      label: 'Explain',
      icon: <Info className="w-4 h-4" />,
      onClick: handleExplain
    },
    ...(contentType === 'assignment' ? [{
      label: 'Create Task List',
      icon: <FileText className="w-4 h-4" />,
      onClick: handleTasks
    }] : [])
  ]

  if (contentType === 'file') {
    return (
      <div className="flex flex-col min-h-0">
        {/* Constrain viewer to viewport height so inner content scrolls */}
        <div className="h-[80vh] min-h-0 overflow-hidden">
          <FullscreenContainer className="h-full">
          {({ isFullscreen, toggle }) => (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="text-sm font-medium truncate flex-1">{title}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Trigger refresh for file by invalidating related queries
                    qc.invalidateQueries({ queryKey: ['file-meta', contentId] })
                    qc.invalidateQueries({ queryKey: ['file-bytes', contentId] })
                  }}
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={toggle} title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <FileViewer 
                  fileId={contentId} 
                  className="h-full" 
                  isFullscreen={isFullscreen}
                  courseId={courseId}
                  courseName={courseName}
                />
              </div>
            </div>
          )}
          </FullscreenContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="text-sm font-medium truncate flex-1">{title}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (contentType === 'page') pageQ.refetch()
            if (contentType === 'assignment') assignQ.refetch()
            if (contentType === 'announcement') annQ.refetch()
          }}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <div 
        className="flex-1 overflow-hidden" 
        onContextMenu={handleContextMenu}
      >
        <div className="flex-1 overflow-y-auto p-6 h-full">
          <div className="max-w-4xl mx-auto pb-12">
              {loading && (
              <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading content...</div>
            )}
            {error && (
              <div className="text-red-600 text-sm mb-4">{error}</div>
            )}
            {!loading && !error && contentType === 'page' && pageQ.data?.body && (
              <HtmlContent html={pageQ.data.body} className="rich-html" onNavigate={onNavigate} />
            )}
            {!loading && !error && contentType === 'assignment' && assignQ.data?.description && (
              <HtmlContent html={assignQ.data.description} className="rich-html" onNavigate={onNavigate} />
            )}
            {!loading && !error && contentType === 'announcement' && annQ.data?.message && (
              <HtmlContent html={annQ.data.message} className="rich-html" onNavigate={onNavigate} />
            )}
            {!loading && !error && ((contentType === 'page' && !pageQ.data?.body) || (contentType === 'assignment' && !assignQ.data?.description)) && (
              <div className="text-slate-500 dark:text-neutral-400 text-sm">No content available</div>
            )}
          </div>
        </div>
      </div>

      <ContextMenu 
        items={menuItems} 
        position={menuPos} 
        onClose={() => setMenuPos(null)} 
      />
    </div>
  )
}
