import React, { useMemo, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { ArrowLeft, Maximize2, Minimize2, MoreHorizontal, ExternalLink, SquareArrowOutUpRight, Sparkles, FileText, Info, Download } from 'lucide-react'
import { HtmlContent } from './HtmlContent'
import { FileViewer } from './FileViewer'
import { useAssignmentRest, useCoursePage, useAnnouncement, useMySubmission, useFileMeta } from '../hooks/useCanvasQueries'
import { FullscreenContainer } from './FullscreenContainer'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { useAIPanel } from '../context/AIPanelContext'
import { useAppContext } from '../context/AppContext'
import { Skeleton, SkeletonText } from './Skeleton'
import { Dropdown } from './ui/Dropdown'
import { openExternal } from '../utils/openExternal'
import { canvasContentUrl } from '../utils/canvasContentUrl'
import { AssignmentSubmitPanel } from './assignment/AssignmentSubmitPanel'

type ContentType = 'page' | 'assignment' | 'file' | 'announcement'

type Props = {
  courseId: string | number
  courseName?: string
  contentType: ContentType
  contentId: string
  title: string
  onBack: () => void
  onNavigate?: (href: string) => void
  isEmbedded?: boolean
  canGoBack?: boolean
}

export const CanvasContentView: React.FC<Props> = ({
  courseId,
  courseName,
  contentType,
  contentId,
  title,
  onBack,
  onNavigate,
  isEmbedded,
  canGoBack,
}) => {
  const isWin =
    (typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)) ||
    (typeof navigator !== 'undefined' && typeof (navigator as any).platform === 'string' && /^win/i.test((navigator as any).platform))

  const app = useAppContext()
  const aiPanel = useAIPanel()
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  
  const pageQ = useCoursePage(contentType === 'page' ? courseId : undefined, contentType === 'page' ? contentId : undefined, { enabled: contentType === 'page' })
  const assignQ = useAssignmentRest(contentType === 'assignment' ? courseId : undefined, contentType === 'assignment' ? contentId : undefined, { enabled: contentType === 'assignment' })
  const submissionQ = useMySubmission(
    contentType === 'assignment' ? courseId : undefined,
    contentType === 'assignment' ? contentId : undefined,
    ['submission_comments'],
    { enabled: contentType === 'assignment' },
  )
  const annQ = useAnnouncement(contentType === 'announcement' ? courseId : undefined, contentType === 'announcement' ? contentId : undefined, { enabled: contentType === 'announcement' })
  const fileQ = useFileMeta(contentType === 'file' ? contentId : undefined, { enabled: contentType === 'file' })
  
  const loading = pageQ.isLoading || assignQ.isLoading || annQ.isLoading || fileQ.isLoading
  const error = pageQ.error?.message || assignQ.error?.message || annQ.error?.message || fileQ.error?.message || null

  const resolvedTitle = useMemo(() => {
    if (contentType === 'page' && pageQ.data?.title) return pageQ.data.title
    if (contentType === 'assignment' && assignQ.data?.name) return assignQ.data.name
    if (contentType === 'announcement' && annQ.data?.title) return annQ.data.title
    if (contentType === 'file' && fileQ.data) {
      return fileQ.data.display_name || fileQ.data.filename || title
    }
    return title
  }, [contentType, pageQ.data, assignQ.data, annQ.data, fileQ.data, title])

  const latestSubmissionComment = useMemo(() => {
    const list = submissionQ.data?.submission_comments
    if (!Array.isArray(list) || !list.length) return null
    const sorted = list.slice().sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at
    })
    return sorted[0] || null
  }, [submissionQ.data])

  const hasSubmissionInfo = useMemo(() => {
    const s = submissionQ.data
    if (!s) return false
    if (s.excused) return true
    if (s.submitted_at) return true
    if (s.graded_at) return true
    if (s.score != null) return true
    if (s.grade != null && String(s.grade).trim() !== '') return true
    if (Array.isArray(s.submission_comments) && s.submission_comments.length > 0) return true
    if (s.workflow_state && s.workflow_state !== 'unsubmitted') return true
    return false
  }, [submissionQ.data])

  // Context Menu State
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [fileDownloadTarget, setFileDownloadTarget] = useState<{ id: string; name: string } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    // Check for file link under cursor first
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    const href = anchor?.href || anchor?.getAttribute('href')
    
    // Check if it looks like a file link (typical Canvas patterns)
    const isFileLink = href && (/\/files\/\d+/.test(href) || href.includes('/download'))

    if (isFileLink && href) {
        e.preventDefault()
        // Try to extract ID
        const match = href.match(/\/files\/(\d+)/)
        if (match && match[1]) {
            const name = anchor?.innerText || 'File'
            setFileDownloadTarget({ id: match[1], name })
            setMenuPos({ x: e.clientX, y: e.clientY })
            return
        }
    }

    // Only show context menu if AI is enabled and we have content
    if (!app.aiEnabled) return
    if (loading || error) return
    
    // Only for text content types for now (not files)
    if (contentType === 'file') return

    e.preventDefault()
    setFileDownloadTarget(null)
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
    aiPanel.open(`Summarize this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const handleExplain = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(`Explain the key concepts in this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const handleTasks = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(`Create a checklist of tasks from this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`, 'ask-ai', true)
  }

  const menuItems: ContextMenuItem[] = fileDownloadTarget ? [
    {
      label: 'Download File',
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        if (fileDownloadTarget.id) {
          window.system.downloadFile(fileDownloadTarget.id, fileDownloadTarget.name)
        }
      }
    }
  ] : [
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

  const openInCanvasUrl = useMemo(() => {
    const baseUrl = app.baseUrl
    if (!baseUrl) return null
    if (contentType === 'file') {
      return canvasContentUrl({ baseUrl, courseId, type: 'file', contentId })
    }
    if (contentType === 'assignment') {
      return canvasContentUrl({ baseUrl, courseId, type: 'assignment', contentId })
    }
    if (contentType === 'announcement') {
      return canvasContentUrl({ baseUrl, courseId, type: 'announcement', contentId })
    }
    if (contentType === 'page') {
      return canvasContentUrl({ baseUrl, courseId, type: 'page', contentId })
    }
    return null
  }, [app.baseUrl, courseId, contentId, contentType])

  const openInNewWindow = async () => {
    try {
      await window.system?.openContentWindow?.({
        courseId: String(courseId),
        courseName: courseName || undefined,
        type: contentType,
        contentId: String(contentId),
        title: resolvedTitle,
      })
    } catch {}
  }

  const openInCanvas = async () => {
    try {
      await openExternal(openInCanvasUrl)
    } catch {}
  }

  const header = (ctx: { isFullscreen: boolean; toggle: () => Promise<void> }) => {
    if (isEmbedded || ctx.isFullscreen) {
      // Single-row titlebar for embedded windows or focus mode
      return (
        <>
          <div
            className={`h-14 ${canGoBack ? '' : 'border-b border-gray-200 dark:border-neutral-700'} bg-white/95 dark:bg-neutral-900/95 app-drag titlebar-left-inset titlebar-right-inset px-5 grid grid-cols-[1fr_auto_1fr] items-center`}
          >
            <div className="flex items-center justify-start">
              {!isEmbedded && ctx.isFullscreen && isWin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ctx.toggle}
                  className="w-8 h-8 p-0 justify-center rounded-full app-no-drag"
                  title="Exit Focus Mode"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider truncate text-center">
              {resolvedTitle}
            </div>

            <div className="flex items-center justify-end">
              {!isEmbedded && ctx.isFullscreen && !isWin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ctx.toggle}
                  className="w-8 h-8 p-0 justify-center rounded-full app-no-drag"
                  title="Exit Focus Mode"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {/* Secondary Toolbar for Navigation */}
          {canGoBack && (
            <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <Button variant="ghost" size="sm" onClick={onBack} className="w-8 h-8 p-0 justify-center rounded-full app-no-drag" title="Back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )
    }

    // Standard single-row layout for main app
    return (
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90">
        <Button variant="ghost" size="sm" onClick={onBack} title="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-sm font-medium truncate flex-1">{resolvedTitle}</div>

        <Button
          variant="ghost"
          size="sm"
          onClick={ctx.toggle}
          title={ctx.isFullscreen ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {ctx.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        <Button
          ref={moreBtnRef}
          variant="ghost"
          size="sm"
          onClick={() => setMoreOpen((v) => !v)}
          title="More"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>

        <Dropdown open={moreOpen} onOpenChange={setMoreOpen} anchorRef={moreBtnRef as any}>
          <button
            type="button"
            className="w-full px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
            onClick={async () => { setMoreOpen(false); await openInCanvas() }}
            disabled={!openInCanvasUrl}
          >
            <ExternalLink className="w-4 h-4" />
            Open in Canvas
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
            onClick={async () => { setMoreOpen(false); await openInNewWindow() }}
          >
            <SquareArrowOutUpRight className="w-4 h-4" />
            Open in New Window
          </button>
        </Dropdown>
      </div>
    )
  }

  return (
    <FullscreenContainer className="flex flex-col h-full relative">
      {({ isFullscreen, toggle }) => (
        <div className="flex flex-col h-full relative">
          {header({ isFullscreen, toggle })}

          {contentType === 'file' ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <FileViewer
                fileId={contentId}
                className="h-full w-full"
                isFullscreen={isFullscreen}
                courseId={courseId}
                courseName={courseName}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden" onContextMenu={handleContextMenu}>
              <div className="flex-1 overflow-y-auto p-6 h-full">
                <div className="max-w-4xl mx-auto pb-12">
                  {loading && (
                    <div className="space-y-4">
                      <Skeleton height="h-6" width="w-2/3" />
                      <SkeletonText lines={10} />
                    </div>
                  )}
                  {error && (
                    <div className="text-red-600 text-sm mb-4">{error}</div>
                  )}
                  {!loading && !error && contentType === 'page' && pageQ.data?.body && (
                    <HtmlContent html={pageQ.data.body} className="rich-html" onNavigate={onNavigate} />
                  )}
                  {!loading && !error && contentType === 'assignment' && hasSubmissionInfo && (
                    <div className="mb-5 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-neutral-400">Your submission</div>
                          <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                            {(() => {
                              if (submissionQ.error) return <span className="text-slate-600 dark:text-neutral-300">Submission details unavailable</span>
                              const score = submissionQ.data?.score
                              const gradedAt = submissionQ.data?.graded_at
                              const excused = submissionQ.data?.excused
                              const submittedAt = submissionQ.data?.submitted_at
                              const pts = assignQ.data?.points_possible
                              if (excused) return <span className="font-semibold">Excused</span>
                              if (score == null && !gradedAt && submittedAt) return <span className="text-slate-600 dark:text-neutral-300">Submitted — awaiting grade</span>
                              if (score == null) return <span className="text-slate-600 dark:text-neutral-300">Graded</span>
                              return (
                                <span className="font-semibold tabular-nums">
                                  {score}
                                  {typeof pts === 'number' || pts != null ? (
                                    <span className="text-slate-400 dark:text-neutral-500 font-normal">/{pts}</span>
                                  ) : null}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                        {submissionQ.data?.graded_at && (
                          <div className="text-xs text-slate-500 dark:text-neutral-400">
                            Graded {new Date(submissionQ.data.graded_at).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {latestSubmissionComment?.comment && !submissionQ.error && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-800">
                          <div className="text-xs text-slate-500 dark:text-neutral-400">
                            Feedback{latestSubmissionComment.author_name ? ` from ${latestSubmissionComment.author_name}` : ''}
                            {latestSubmissionComment.created_at ? ` · ${new Date(latestSubmissionComment.created_at).toLocaleString()}` : ''}
                          </div>
                          <div className="mt-1 text-sm text-slate-800 dark:text-neutral-200 whitespace-pre-wrap">
                            {latestSubmissionComment.comment}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!loading && !error && contentType === 'assignment' && assignQ.data && (
                    <AssignmentSubmitPanel
                      courseId={courseId}
                      assignmentRestId={contentId}
                      assignment={assignQ.data}
                    />
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
          )}

          <ContextMenu
            items={menuItems}
            position={menuPos}
            onClose={() => { setMenuPos(null); setFileDownloadTarget(null) }}
          />
        </div>
      )}
    </FullscreenContainer>
  )
}
