import React, { useMemo, useRef, useState } from 'react'
import { Button } from './ui/Button'
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  ExternalLink,
  SquareArrowOutUpRight,
  Sparkles,
  FileText,
  Info,
  Download,
  Pin,
} from 'lucide-react'
import { HtmlContent } from './HtmlContent'
import { FileViewer } from './FileViewer'
import {
  useAssignmentRest,
  useCoursePage,
  useCourseQuiz,
  useAnnouncement,
  useMySubmission,
  useFileMeta,
  useCourseDiscussions,
} from '../hooks/useCanvasQueries'
import { FullscreenContainer } from './FullscreenContainer'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { useAIPanelActions } from '../context/AIPanelContext'
import { useAppActions, useAppData, useAppFlags } from '../context/AppContext'
import { Skeleton, SkeletonText } from './Skeleton'
import { Dropdown, DropdownItem } from './ui/Dropdown'
import { openExternal } from '../utils/openExternal'
import { canvasContentUrl } from '../utils/canvasContentUrl'
import { AssignmentSubmitPanel } from './assignment/AssignmentSubmitPanel'
import { stripHtmlToText } from '../utils/stripHtmlToText'
import { formatDateTime } from '../utils/dateFormat'
import { useAIContextOffer } from '../hooks/useAIContextOffer'

type ContentType = 'page' | 'assignment' | 'file' | 'announcement' | 'quiz'

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
    (typeof navigator !== 'undefined' &&
      typeof (navigator as any).platform === 'string' &&
      /^win/i.test((navigator as any).platform))

  const data = useAppData()
  const flags = useAppFlags()
  const actions = useAppActions()
  const aiPanel = useAIPanelActions()
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const isAssignment = contentType === 'assignment'
  const pageQ = useCoursePage(
    contentType === 'page' ? courseId : undefined,
    contentType === 'page' ? contentId : undefined,
    { enabled: contentType === 'page' },
  )
  const quizQ = useCourseQuiz(
    contentType === 'quiz' ? courseId : undefined,
    contentType === 'quiz' ? contentId : undefined,
    { enabled: contentType === 'quiz' },
  )
  const assignQ = useAssignmentRest(
    isAssignment ? courseId : undefined,
    isAssignment ? contentId : undefined,
    isAssignment ? ['submission'] : [],
    { enabled: isAssignment },
  )
  const submissionQ = useMySubmission(
    isAssignment ? courseId : undefined,
    isAssignment ? contentId : undefined,
    ['submission_comments'],
    { enabled: isAssignment },
  )
  const isDiscussionAssignment =
    isAssignment && !!assignQ.data?.submission_types?.includes('discussion_topic')
  const discussionsQ = useCourseDiscussions(
    isDiscussionAssignment ? courseId : undefined,
    { perPage: 50, maxPages: 2 },
    { enabled: isDiscussionAssignment },
  )
  const annQ = useAnnouncement(
    contentType === 'announcement' ? courseId : undefined,
    contentType === 'announcement' ? contentId : undefined,
    { enabled: contentType === 'announcement' },
  )
  const fileQ = useFileMeta(contentType === 'file' ? contentId : undefined, {
    enabled: contentType === 'file',
  })

  const loading =
    pageQ.isLoading || quizQ.isLoading || assignQ.isLoading || annQ.isLoading || fileQ.isLoading
  const error =
    pageQ.error?.message ||
    quizQ.error?.message ||
    assignQ.error?.message ||
    annQ.error?.message ||
    fileQ.error?.message ||
    null
  const submissionError = submissionQ.error?.message || null
  const discussionTopic = useMemo(() => {
    if (!isDiscussionAssignment || !discussionsQ.data) return null
    const id = String(contentId)
    return discussionsQ.data.find((t) => String(t.assignment_id) === id) || null
  }, [isDiscussionAssignment, discussionsQ.data, contentId])

  const formatBytes = (bytes?: number | null) => {
    const b = typeof bytes === 'number' && isFinite(bytes) ? bytes : 0
    const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
    let idx = 0
    let val = b
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024
      idx++
    }
    if (idx === 0) return `${val} ${units[idx]}`
    return `${val.toFixed(1)} ${units[idx]}`
  }

  const resolvedTitle = useMemo(() => {
    if (contentType === 'page' && pageQ.data?.title) return pageQ.data.title
    if (contentType === 'quiz' && quizQ.data?.title) return quizQ.data.title
    if (contentType === 'assignment' && assignQ.data?.name) return assignQ.data.name
    if (contentType === 'announcement' && annQ.data?.title) return annQ.data.title
    if (contentType === 'file' && fileQ.data) {
      return fileQ.data.display_name || fileQ.data.filename || title
    }
    return title
  }, [contentType, pageQ.data, quizQ.data, assignQ.data, annQ.data, fileQ.data, title])

  const contextOffer = useMemo(() => {
    if (contentType === 'page') {
      const body = pageQ.data?.body || ''
      const contentText = stripHtmlToText(body).slice(0, 4000)
      if (!contentText.trim()) return null
      return {
        id: `page:${String(courseId)}:${String(contentId)}`,
        slot: 'view' as const,
        kind: 'page' as const,
        courseId,
        courseName,
        title: resolvedTitle,
        pageUrl: String(contentId),
        contentText,
      }
    }

    if (contentType === 'assignment') {
      const description = assignQ.data?.description || ''
      const clean = stripHtmlToText(description)
      const due = assignQ.data?.due_at
      const points = assignQ.data?.points_possible
      const parts = [
        `Title: ${resolvedTitle}`,
        due ? `Due: ${formatDateTime(due)}` : '',
        typeof points === 'number' ? `Points: ${points}` : '',
        clean ? `Description:\n${clean}` : '',
      ]
        .filter(Boolean)
        .join('\n')
      if (!parts.trim()) return null
      return {
        id: `assignment:${String(courseId)}:${String(contentId)}`,
        slot: 'view' as const,
        kind: 'assignment' as const,
        courseId,
        courseName,
        title: resolvedTitle,
        contentText: parts.slice(0, 4000),
      }
    }

    if (contentType === 'announcement') {
      const message = annQ.data?.message || ''
      const clean = stripHtmlToText(message)
      const posted = annQ.data?.posted_at
      const parts = [
        `Title: ${resolvedTitle}`,
        posted ? `Posted: ${formatDateTime(posted)}` : '',
        clean ? `Message:\n${clean}` : '',
      ]
        .filter(Boolean)
        .join('\n')
      if (!parts.trim()) return null
      return {
        id: `announcement:${String(courseId)}:${String(contentId)}`,
        slot: 'view' as const,
        kind: 'announcement' as const,
        courseId,
        courseName,
        title: resolvedTitle,
        contentText: parts.slice(0, 4000),
      }
    }

    if (contentType === 'file') {
      const name =
        (fileQ.data as any)?.display_name ||
        (fileQ.data as any)?.filename ||
        (fileQ.data as any)?.name ||
        resolvedTitle
      const contentTypeLabel = (fileQ.data as any)?.content_type as string | undefined
      const size = formatBytes((fileQ.data as any)?.size)
      const updated = (fileQ.data as any)?.updated_at as string | undefined
      const parts = [
        `Title: ${name || resolvedTitle}`,
        contentTypeLabel ? `Type: ${contentTypeLabel}` : '',
        size ? `Size: ${size}` : '',
        updated ? `Updated: ${formatDateTime(updated)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
      if (!parts.trim()) return null
      return {
        id: `file:${String(courseId)}:${String(contentId)}`,
        slot: 'view' as const,
        kind: 'file' as const,
        courseId,
        courseName,
        title: name || resolvedTitle,
        contentText: parts.slice(0, 4000),
      }
    }

    return null
  }, [
    contentType,
    pageQ.data?.body,
    assignQ.data?.description,
    assignQ.data?.due_at,
    assignQ.data?.points_possible,
    annQ.data?.message,
    annQ.data?.posted_at,
    fileQ.data,
    courseId,
    courseName,
    contentId,
    resolvedTitle,
  ])

  useAIContextOffer(
    `content-detail:${String(courseId)}:${String(contentType)}:${String(contentId)}`,
    contextOffer,
  )

  // Context Menu State
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [fileDownloadTarget, setFileDownloadTarget] = useState<{ id: string; name: string } | null>(
    null,
  )

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
    if (!flags.aiEnabled) return
    if (loading || error) return

    // Only for text content types for now (not files)
    if (contentType === 'file') return

    e.preventDefault()
    setFileDownloadTarget(null)
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const getContentText = () => {
    if (contentType === 'page') return pageQ.data?.body || ''
    if (contentType === 'quiz') return quizQ.data?.description || quizQ.data?.instructions || ''
    if (contentType === 'assignment') return assignQ.data?.description || ''
    if (contentType === 'announcement') return annQ.data?.message || ''
    return ''
  }

  const handleSummarize = () => {
    const text = getContentText()
    // Strip HTML roughly for prompt efficiency
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000) // Limit length
    aiPanel.open(
      `Summarize this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`,
      'ask-ai',
      true,
    )
  }

  const handleExplain = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(
      `Explain the key concepts in this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`,
      'ask-ai',
      true,
    )
  }

  const handleTasks = () => {
    const text = getContentText()
    const cleanText = text.replace(/<[^>]*>/g, ' ').slice(0, 4000)
    aiPanel.open(
      `Create a checklist of tasks from this ${contentType}: "${resolvedTitle}"\n\n${cleanText}`,
      'ask-ai',
      true,
    )
  }

  const menuItems: ContextMenuItem[] = fileDownloadTarget
    ? [
        {
          label: 'Download File',
          icon: <Download className="w-4 h-4" />,
          onClick: () => {
            if (fileDownloadTarget.id) {
              window.system.downloadFile(fileDownloadTarget.id, fileDownloadTarget.name)
            }
          },
        },
      ]
    : [
        {
          label: 'Summarize',
          icon: <Sparkles className="w-4 h-4" />,
          onClick: handleSummarize,
        },
        {
          label: 'Explain',
          icon: <Info className="w-4 h-4" />,
          onClick: handleExplain,
        },
        ...(contentType === 'assignment'
          ? [
              {
                label: 'Create Task List',
                icon: <FileText className="w-4 h-4" />,
                onClick: handleTasks,
              },
            ]
          : []),
      ]

  const openInCanvasUrl = useMemo(() => {
    const baseUrl = data.baseUrl
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
    if (contentType === 'quiz') {
      return canvasContentUrl({ baseUrl, courseId, type: 'quiz', contentId })
    }
    return null
  }, [data.baseUrl, courseId, contentId, contentType])

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

  const pinId = `${contentType}:${contentId}`
  const isPinned = useMemo(() => {
    return data.pinnedItems?.some((i) => i.id === pinId)
  }, [data.pinnedItems, pinId])

  const togglePin = async () => {
    setMoreOpen(false)
    if (isPinned) {
      actions.unpinItem(pinId)
    } else {
      actions.pinItem({
        id: pinId,
        type: contentType,
        title: resolvedTitle,
        courseId,
        contentId,
      })
    }
  }

  const header = (ctx: { isFullscreen: boolean; toggle: () => Promise<void> }) => {
    if (isEmbedded || ctx.isFullscreen) {
      // Single-row titlebar for embedded windows or focus mode
      return (
        <>
          <div
            className={`h-14 ${canGoBack ? '' : 'border-b border-gray-200 dark:border-neutral-700'} bg-white dark:bg-neutral-900 app-drag titlebar-left-inset titlebar-right-inset px-5 grid grid-cols-[1fr_auto_1fr] items-center`}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="w-8 h-8 p-0 justify-center rounded-full app-no-drag"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )
    }

    // Standard single-row layout for main app
    return (
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
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
          <DropdownItem onClick={togglePin} icon={<Pin className="w-4 h-4" />}>
            {isPinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
          </DropdownItem>
          <DropdownItem
            onClick={async () => {
              setMoreOpen(false)
              await openInCanvas()
            }}
            disabled={!openInCanvasUrl}
            icon={<ExternalLink className="w-4 h-4" />}
          >
            Open in Canvas
          </DropdownItem>
          <DropdownItem
            onClick={async () => {
              setMoreOpen(false)
              await openInNewWindow()
            }}
            icon={<SquareArrowOutUpRight className="w-4 h-4" />}
          >
            Open in New Window
          </DropdownItem>
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
                  {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
                  {!loading && !error && contentType === 'page' && pageQ.data?.body && (
                    <HtmlContent
                      html={pageQ.data.body}
                      className="rich-html"
                      onNavigate={onNavigate}
                    />
                  )}
                  {!loading && !error && contentType === 'quiz' && (
                    <>
                      <div className="mb-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-5 text-center">
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                          Complete in Canvas
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
                          Quizzes must be completed in Canvas. Open the quiz there to take it in
                          Canvas.
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await openInCanvas()
                          }}
                          disabled={!openInCanvasUrl}
                          className="gap-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open in Canvas
                        </Button>
                      </div>
                      {(quizQ.data?.description || quizQ.data?.instructions) && (
                        <HtmlContent
                          html={quizQ.data.description || quizQ.data.instructions || ''}
                          className="rich-html"
                          onNavigate={onNavigate}
                        />
                      )}
                    </>
                  )}
                  {!loading && !error && contentType === 'assignment' && assignQ.data && (
                    <AssignmentSubmitPanel
                      courseId={courseId}
                      assignmentRestId={contentId}
                      assignment={assignQ.data}
                      submission={submissionQ.data || assignQ.data.submission || null}
                      discussion={
                        isDiscussionAssignment && discussionTopic
                          ? {
                              title: discussionTopic.title,
                              onOpen: () =>
                                actions.onOpenDiscussion(
                                  courseId,
                                  discussionTopic.id,
                                  discussionTopic.title,
                                ),
                            }
                          : undefined
                      }
                    />
                  )}
                  {!loading && !error && contentType === 'assignment' && submissionError && (
                    <div className="mb-4 text-xs text-amber-600 dark:text-amber-400">
                      Submission details could not be loaded. The assignment content is still
                      available.
                    </div>
                  )}
                  {!loading &&
                    !error &&
                    contentType === 'assignment' &&
                    assignQ.data?.description && (
                      <HtmlContent
                        html={assignQ.data.description}
                        className="rich-html"
                        onNavigate={onNavigate}
                      />
                    )}
                  {!loading && !error && contentType === 'announcement' && annQ.data?.message && (
                    <HtmlContent
                      html={annQ.data.message}
                      className="rich-html"
                      onNavigate={onNavigate}
                    />
                  )}
                  {!loading &&
                    !error &&
                    ((contentType === 'page' && !pageQ.data?.body) ||
                      (contentType === 'assignment' && !assignQ.data?.description)) && (
                      <div className="text-slate-500 dark:text-neutral-400 text-sm">
                        No content available
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          <ContextMenu
            items={menuItems}
            position={menuPos}
            onClose={() => {
              setMenuPos(null)
              setFileDownloadTarget(null)
            }}
          />
        </div>
      )}
    </FullscreenContainer>
  )
}
