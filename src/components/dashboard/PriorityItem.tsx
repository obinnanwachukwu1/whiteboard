import React from 'react'
import { cleanCourseName } from '../../utils/courseName'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import { useAI } from '../../hooks/useAI'
import { useAppContext } from '../../context/AppContext'
import { CourseAvatar } from '../CourseAvatar'
import { SummaryPopover } from './SummaryPopover'
import { useAIPopover } from '../../hooks/useAIPopover'
import { useAssignmentRest } from '../../hooks/useCanvasQueries'
import { extractAssignmentIdFromUrl } from '../../utils/urlHelpers'
import { ListItemRow } from '../ui/ListItemRow'

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const sanitizeCoachText = (text: string) => {
  // Remove common noisy tokens (filenames, pseudo-tags) and compress whitespace.
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b\S+\.(pdf|docx|doc|tex|zip|pptx|xlsx|csv|png|jpg|jpeg)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const buildCoachHints = (description: string | undefined) => {
  const text = (description || '').toLowerCase()

  const deliverables: string[] = []
  if (/(two|2)\s+.*memos?/.test(text) || /two\s+professional\s+memos?/.test(text)) {
    deliverables.push('two memos')
  } else if (/memo/.test(text)) {
    deliverables.push('a memo')
  }
  if (/reflection/.test(text)) deliverables.push('a reflection')
  if (/peer\s*review/.test(text) || /discussion\s*board/.test(text)) deliverables.push('a peer-review draft')

  let next: string | null = null
  if (/audienc/.test(text) && /memo/.test(text)) {
    next = 'Pick 2 audiences + a scenario; write memo headings'
  } else if (/format:\s*to:/.test(text) || (/to:\s*from:/.test(text) && /subject:/.test(text))) {
    next = 'Draft the memo header (To/From/Date/Subject)'
  } else if (/outline/.test(text) && /memo/.test(text)) {
    next = 'Outline both memos: problem, context, call to action'
  } else if (/draft/.test(text) && /memo/.test(text)) {
    next = 'Write a rough first memo, then adapt it for audience #2'
  }

  return {
    deliverablesText: deliverables.length ? deliverables.join(' + ') : null,
    next,
  }
}

type Props = {
  assignment: DashboardAssignment
  courseImageUrl?: string
  onClick?: () => void
}

/**
 * Single priority assignment row for the dashboard.
 * Shows: course avatar, title, course label, relative time, weight indicator
 */
export const PriorityItem: React.FC<Props> = ({ assignment, courseImageUrl, onClick }) => {
  const { streamExplainPriority } = useAI()
  const { aiEnabled } = useAppContext()
  const showAI = aiEnabled
  
  const isPastDue = assignment.hoursUntilDue !== null && assignment.hoursUntilDue < 0

  const courseId = assignment.courseId
  const restId = assignment.htmlUrl ? extractAssignmentIdFromUrl(assignment.htmlUrl) || assignment.id : assignment.id

  const { data: assignmentRest } = useAssignmentRest(
    courseId,
    restId,
    {
      enabled: showAI && !!courseId && !!restId,
      staleTime: 1000 * 60 * 10,
    }
  )

  const descriptionText = assignmentRest?.description
    ? sanitizeCoachText(stripHtml(assignmentRest.description)).slice(0, 800)
    : undefined

  const hints = buildCoachHints(descriptionText)

  const coachRelativeDue = (() => {
    const h = assignment.hoursUntilDue
    if (h == null) return assignment.relativeTime
    const absH = Math.abs(h)
    if (h < 0) {
      if (absH < 24) return `${Math.max(1, Math.round(absH))} hours overdue`
      return `${Math.max(1, Math.round(absH / 24))} days overdue`
    }
    if (h < 12) return `in ${Math.max(0, Math.round(h))} hours`
    return `in ${Math.max(1, Math.round(h / 24))} days`
  })()

  const hours = assignment.hoursUntilDue ?? null

  const draftWhyParts = [
    isPastDue ? `Past due (~${Math.abs(Math.round(hours ?? 0))}h)` : `Due ${assignment.relativeTime}`,
    assignment.weightDisplay.text || (assignment.pointsPossible ? `${assignment.pointsPossible} pts` : ''),
    hints.deliverablesText ? `Deliverables: ${hints.deliverablesText}` : '',
  ].filter(Boolean)

  let draftNext = hints.next || 'Start now; outline and submit'
  if (!hints.next && hours !== null) {
    if (hours <= 6) draftNext = 'Block 30m now; submit'
    else if (hours <= 24) draftNext = 'Do a 45m push today'
    else if (hours <= 72) draftNext = 'Schedule 45m today; start draft'
    else draftNext = 'Book 30m today to start'
  }
  if (isPastDue) {
    draftNext = 'Submit ASAP; recover partial credit'
  }

  const { triggerProps, popoverProps } = useAIPopover({
    enabled: showAI,
    onGenerate: (update) => {
      return streamExplainPriority({
        assignmentName: assignment.name,
        courseName: cleanCourseName(assignment.courseLabel),
        relativeDue: coachRelativeDue,
        hoursUntilDue: assignment.hoursUntilDue ?? null,
        urgencyMultiplier: assignment.urgencyMultiplier ?? null,
        weightText: assignment.weightDisplay.text,
        weightPercent: assignment.effectiveWeight ?? null,
        pointsPossible: assignment.pointsPossible && assignment.pointsPossible > 0 ? assignment.pointsPossible : null,
        rank: null,
        assignmentDescription: descriptionText,
        draftWhy: draftWhyParts.join('; '),
        draftNext,
      }, update)
    }
  })

  return (
    <ListItemRow
      interactiveProps={triggerProps}
      onClick={onClick}
      icon={
        <CourseAvatar
          courseId={assignment.courseId}
          courseName={assignment.courseName}
          src={courseImageUrl}
          className="w-full h-full rounded-full"
        />
      }
      title={assignment.name}
      subtitle={
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">
            {cleanCourseName(assignment.courseLabel)}
            {assignment.weightDisplay.text && (
              <>
                <span className="text-slate-300 dark:text-neutral-600 mx-1.5">·</span>
                <span
                  className={
                    assignment.weightDisplay.emphasis === 'high'
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : assignment.weightDisplay.emphasis === 'medium'
                      ? 'text-slate-600 dark:text-neutral-300'
                      : 'text-slate-400 dark:text-neutral-500'
                  }
                >
                  {assignment.weightDisplay.text}
                </span>
              </>
            )}
          </span>
          <span className={`whitespace-nowrap flex-shrink-0 ${isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
            {assignment.relativeTime}
          </span>
        </span>
      }
      after={
        <SummaryPopover
          {...popoverProps}
          title="AI Coach"
        />
      }
    />
  )
}
