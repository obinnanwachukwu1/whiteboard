import React from 'react'
import { cleanCourseName } from '../../utils/courseName'
import type { DashboardAssignment } from '../../hooks/usePriorityAssignments'
import { useAI } from '../../hooks/useAI'
import { useAppFlags } from '../../context/AppContext'
import { CourseAvatar } from '../CourseAvatar'
import { SummaryPopover } from './SummaryPopover'
import { useAIPopover } from '../../hooks/useAIPopover'
import { useAssignmentRest } from '../../hooks/useCanvasQueries'
import { extractAssignmentIdFromUrl, extractQuizIdFromUrl } from '../../utils/urlHelpers'
import { formatRelativeDue, hoursUntilDue } from '../../utils/priorityScore'
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
  if (/peer\s*review/.test(text) || /discussion\s*board/.test(text))
    deliverables.push('a peer-review draft')

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
  nowMs: number
  courseImageUrl?: string
  onClick?: () => void
}

type TriggerProps = ReturnType<typeof useAIPopover>['triggerProps']

type RowProps = Props & {
  triggerProps: TriggerProps
  isPastDue: boolean
  relativeTime: string
}

const PriorityRow = React.memo(
  ({ assignment, courseImageUrl, onClick, triggerProps, isPastDue, relativeTime }: RowProps) => {
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
            <span
              className={`whitespace-nowrap flex-shrink-0 ${isPastDue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}
            >
              {relativeTime}
            </span>
          </span>
        }
      />
    )
  },
)

PriorityRow.displayName = 'PriorityRow'

/**
 * Single priority assignment row for the dashboard.
 * Shows: course avatar, title, course label, relative time, weight indicator
 */
export const PriorityItem: React.FC<Props> = ({ assignment, nowMs, courseImageUrl, onClick }) => {
  const { streamExplainPriority } = useAI()
  const { aiEnabled, aiAvailable } = useAppFlags()
  const showAI = aiEnabled && aiAvailable

  const liveHoursUntilDue = React.useMemo(
    () => hoursUntilDue(assignment.dueAt, nowMs),
    [assignment.dueAt, nowMs],
  )
  const liveRelativeTime = React.useMemo(
    () => formatRelativeDue(liveHoursUntilDue),
    [liveHoursUntilDue],
  )
  const isPastDue = liveHoursUntilDue !== null && liveHoursUntilDue < 0

  const courseId = assignment.courseId
  const quizId = assignment.htmlUrl ? extractQuizIdFromUrl(assignment.htmlUrl) : null
  const restId = assignment.htmlUrl
    ? extractAssignmentIdFromUrl(assignment.htmlUrl) || assignment.id
    : assignment.id
  const canFetchAssignment = Boolean(restId) && !quizId

  const { data: assignmentRest } = useAssignmentRest(courseId, restId, [], {
    enabled: showAI && !!courseId && canFetchAssignment,
    staleTime: 1000 * 60 * 10,
  })

  const descriptionText = assignmentRest?.description
    ? sanitizeCoachText(stripHtml(assignmentRest.description)).slice(0, 800)
    : undefined

  const hints = buildCoachHints(descriptionText)

  const coachRelativeDue = (() => {
    const h = liveHoursUntilDue
    if (h == null) return liveRelativeTime
    const absH = Math.abs(h)
    if (h < 0) {
      if (absH < 24) return `${Math.max(1, Math.round(absH))} hours overdue`
      return `${Math.max(1, Math.round(absH / 24))} days overdue`
    }
    if (h < 12) return `in ${Math.max(0, Math.round(h))} hours`
    return `in ${Math.max(1, Math.round(h / 24))} days`
  })()

  const hours = liveHoursUntilDue ?? null

  const { triggerProps, popoverProps } = useAIPopover({
    enabled: showAI,
    onGenerate: (update) => {
      return streamExplainPriority(
        {
          assignmentName: assignment.name,
          courseName: cleanCourseName(assignment.courseLabel),
          relativeDue: coachRelativeDue,
          hoursUntilDue: liveHoursUntilDue ?? null,
          urgencyMultiplier: assignment.urgencyMultiplier ?? null,
          weightText: assignment.weightDisplay.text,
          weightPercent: assignment.effectiveWeight ?? null,
          pointsPossible:
            assignment.pointsPossible && assignment.pointsPossible > 0
              ? assignment.pointsPossible
              : null,
          rank: null,
          assignmentDescription: descriptionText,
          draftWhy: [
            isPastDue
              ? `Past due (~${Math.abs(Math.round(hours ?? 0))}h)`
              : `Due ${liveRelativeTime}`,
            assignment.weightDisplay.text ||
              (assignment.pointsPossible ? `${assignment.pointsPossible} pts` : ''),
            hints.deliverablesText ? `Deliverables: ${hints.deliverablesText}` : '',
          ]
            .filter(Boolean)
            .join('; '),
          draftNext: (() => {
            let next = hints.next || 'Start now; outline and submit'
            if (!hints.next && hours !== null) {
              if (hours <= 6) next = 'Block 30m now; submit'
              else if (hours <= 24) next = 'Do a 45m push today'
              else if (hours <= 72) next = 'Schedule 45m today; start draft'
              else next = 'Book 30m today to start'
            }
            if (isPastDue) {
              next = 'Submit ASAP; recover partial credit'
            }
            return next
          })(),
        },
        update,
      )
    },
  })

  return (
    <>
      <PriorityRow
        assignment={assignment}
        nowMs={nowMs}
        courseImageUrl={courseImageUrl}
        onClick={onClick}
        triggerProps={triggerProps}
        isPastDue={isPastDue}
        relativeTime={liveRelativeTime}
      />
      <SummaryPopover {...popoverProps} title="AI Coach" />
    </>
  )
}
