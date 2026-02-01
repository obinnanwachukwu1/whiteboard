import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Award, BookOpen, Wand2 } from 'lucide-react'
import { courseHueFor } from '../utils/colorHelpers'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type AssignmentInfo = {
  id: string | number
  name: string
  courseId: string | number
  courseName?: string
  dueAt: string | Date
  pointsPossible?: number
  submissionTypes?: string[]
  htmlUrl?: string
  courseImageUrl?: string
}

type Props = {
  assignment: AssignmentInfo | null
  position: { x: number; y: number } | null
  isOpen: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  aiSummary?: string | null
  aiLoading?: boolean
}

export const AssignmentPopover: React.FC<Props> = ({
  assignment,
  position,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  aiSummary,
  aiLoading
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [isVisible, setIsVisible] = useState(false)
  const [renderedAi, setRenderedAi] = useState<string>('')

  // Render AI markdown when available
  useEffect(() => {
    if (!aiSummary) {
      setRenderedAi('')
      return
    }
    const renderMarkdown = async () => {
      try {
        const rawHtml = await marked.parse(aiSummary, { async: true })
        const cleanHtml = DOMPurify.sanitize(rawHtml)
        setRenderedAi(cleanHtml)
      } catch (e) {
        console.error('Markdown rendering error:', e)
      }
    }
    renderMarkdown()
  }, [aiSummary])

  // Handle visibility transition
  useEffect(() => {
    if (isOpen) setIsVisible(true)
    else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Positioning logic
  useEffect(() => {
    if (!position || !isVisible) return

    const updatePosition = () => {
      const { x, y } = position
      const width = 320
      const margin = 16

      // Default: position to the right and below cursor
      let left = x + margin
      let top = y + margin
      let origin = 'top left'

      // Check right boundary
      if (left + width > window.innerWidth - margin) {
        left = x - width - margin
        origin = 'top right'
      }

      // Check bottom boundary
      const estimatedHeight = 200
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = y - estimatedHeight - margin
        origin = origin.replace('top', 'bottom')
      }

      // Ensure not off screen
      left = Math.max(margin, left)
      top = Math.max(margin, top)

      setStyle({
        position: 'fixed',
        top,
        left,
        transformOrigin: origin,
        zIndex: 9999,
        width: `${width}px`,
      })
    }

    updatePosition()

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [position, isVisible])

  if (!isVisible && !isOpen) return null
  if (!assignment) return null

  const dueDate = new Date(assignment.dueAt)
  const now = new Date()
  const isOverdue = dueDate < now
  const isToday = dueDate.toDateString() === now.toDateString()
  const isTomorrow = dueDate.toDateString() === new Date(now.getTime() + 86400000).toDateString()

  // Course color fallback
  const hue = courseHueFor(assignment.courseId, assignment.courseName || String(assignment.courseId))
  const bannerGradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 30) % 360}, 80%, 45%))`

  // Format due date
  const formatDueDate = () => {
    const timeStr = dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    if (isToday) return `Today at ${timeStr}`
    if (isTomorrow) return `Tomorrow at ${timeStr}`
    return dueDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Format submission types
  const formatSubmissionTypes = () => {
    if (!assignment.submissionTypes?.length) return null
    const typeMap: Record<string, string> = {
      'online_upload': 'File Upload',
      'online_text_entry': 'Text Entry',
      'online_url': 'URL',
      'online_quiz': 'Quiz',
      'discussion_topic': 'Discussion',
      'external_tool': 'External Tool',
      'media_recording': 'Media Recording',
      'on_paper': 'On Paper',
      'none': 'No Submission'
    }
    return assignment.submissionTypes
      .map(t => typeMap[t] || t.replace(/_/g, ' '))
      .join(', ')
  }

  const submissionTypesStr = formatSubmissionTypes()

  return createPortal(
    <div
      className={`
        bg-white dark:bg-neutral-900
        rounded-xl shadow-2xl overflow-hidden
        border border-slate-200 dark:border-neutral-800
        transition-[opacity,transform] duration-150 ease-out pointer-events-auto
        ${isOpen ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'}
      `}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Course Banner (top ~30%) */}
      <div
        className="h-[72px] px-4 flex items-end pb-2.5 relative"
        style={{ background: assignment.courseImageUrl ? undefined : bannerGradient }}
      >
        {/* Course image as background if available */}
        {assignment.courseImageUrl && (
          <>
            <img
              src={assignment.courseImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        )}
        <span className="relative text-white text-xs font-medium truncate drop-shadow-sm">
          {assignment.courseName || `Course ${assignment.courseId}`}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Assignment Name */}
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
          {assignment.name}
        </h3>

        {/* Details */}
        <div className="space-y-1.5">
          {/* Due Date */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-slate-400 dark:text-neutral-500'}`} />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-600 dark:text-neutral-300'}>
              {isOverdue && 'Overdue · '}{formatDueDate()}
            </span>
          </div>

          {/* Points */}
          {assignment.pointsPossible != null && assignment.pointsPossible > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Award className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              <span className="text-slate-600 dark:text-neutral-300">
                {assignment.pointsPossible} points
              </span>
            </div>
          )}

          {/* Submission Type */}
          {submissionTypesStr && (
            <div className="flex items-center gap-2 text-xs">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
              <span className="text-slate-600 dark:text-neutral-300">
                {submissionTypesStr}
              </span>
            </div>
          )}
        </div>

        {/* AI Summary Section (optional) */}
        {(aiLoading || aiSummary) && (
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-[11px] mb-1.5">
              <Wand2 className="w-3 h-3" />
              <span>AI Insight</span>
            </div>
            {aiLoading && !aiSummary ? (
              <div className="flex flex-col gap-1.5 animate-pulse">
                <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-1/2"></div>
              </div>
            ) : (
              <div
                className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed
                  [&_p]:mb-1 [&_p:last-child]:mb-0
                  [&_ul]:list-disc [&_ul]:pl-3 [&_ul]:mb-1
                  [&_li]:mb-0.5
                "
                dangerouslySetInnerHTML={{ __html: renderedAi }}
              />
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Hook to manage assignment popover state
export function useAssignmentPopover() {
  const [hoverAssignment, setHoverAssignment] = useState<AssignmentInfo | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isOverPopover = useRef(false)

  const handleMouseEnter = useCallback((assignment: AssignmentInfo, event: React.MouseEvent) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }

    // Small delay before showing to prevent accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverAssignment(assignment)
      setPosition({ x: event.clientX, y: event.clientY })
      setIsOpen(true)
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Delay closing to allow moving to popover
    leaveTimeoutRef.current = setTimeout(() => {
      if (!isOverPopover.current) {
        setIsOpen(false)
      }
    }, 150)
  }, [])

  const handlePopoverMouseEnter = useCallback(() => {
    isOverPopover.current = true
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
  }, [])

  const handlePopoverMouseLeave = useCallback(() => {
    isOverPopover.current = false
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  return {
    hoverAssignment,
    position,
    isOpen,
    handleMouseEnter,
    handleMouseLeave,
    popoverProps: {
      assignment: hoverAssignment,
      position,
      isOpen,
      onMouseEnter: handlePopoverMouseEnter,
      onMouseLeave: handlePopoverMouseLeave,
    }
  }
}
