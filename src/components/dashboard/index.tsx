import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDashboardData, type DueItem, type FeedbackItem } from '../../hooks/useDashboardData'
import { useCourseImages } from '../../hooks/useCourseImages'
import { usePriorityAssignments } from '../../hooks/usePriorityAssignments'
import { useActivityFeed, type ActivityFeedItem, formatActivityTime } from '../../hooks/useActivityFeed'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import { useAccountNotifications } from '../../hooks/useCanvasQueries'
import { extractAssignmentIdFromUrl, extractCourseIdFromUrl, extractQuizIdFromUrl } from '../../utils/urlHelpers'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateTime } from '../../utils/dateFormat'
import { PriorityList } from '../dashboard/PriorityList'
import { ActivityPanel } from '../dashboard/ActivityPanel'
import { RecentFeedback } from '../dashboard/RecentFeedback'
import { PinnedPages } from '../dashboard/PinnedPages'
import { SystemNotices } from '../dashboard/SystemNotices'
import { useDashboardPrefetch } from './useDashboardPrefetch'
import { useAIContextOffer } from '../../hooks/useAIContextOffer'
import { useAppData } from '../../context/AppContext'

type Props = {
  due: DueItem[]
  loading: boolean
  recentFeedback?: FeedbackItem[]
  courses?: Array<{ id: string | number; name: string; course_code?: string; account_id?: string | number }>
  sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
  onOpenCourse?: (courseId: string | number) => void
  onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void
  onOpenQuiz?: (courseId: string | number, quizId: string, title: string) => void
  onOpenAnnouncement?: (courseId: string | number, topicId: string, title: string) => void
}

export const Dashboard: React.FC<Props> = ({
  onOpenCourse,
  onOpenAssignment,
  onOpenQuiz,
  onOpenAnnouncement,
  due,
  loading,
  courses,
  sidebar,
}) => {
  const appData = useAppData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { courseImageUrl } = useCourseImages()
  const {
    timeHorizon,
    setTimeHorizon,
    showGrades,
    setShowGrades,
    pinnedItems,
    setPinnedItems,
    markSystemNoticeRead,
    readSystemNotices,
  } = useDashboardSettings()

  const accountId = React.useMemo(() => {
    const list = Array.isArray(courses) ? courses : []
    const counts = new Map<string, number>()
    for (const course of list) {
      const raw = (course as any)?.account_id
      if (raw == null) continue
      const key = String(raw)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    if (!counts.size) return null
    let best: string | null = null
    let bestCount = 0
    counts.forEach((count, key) => {
      if (count > bestCount) {
        best = key
        bestCount = count
      }
    })
    return best
  }, [courses])

  const accountKey = React.useMemo(() => {
    if (!accountId) return null
    const base = appData.baseUrl || ''
    const uid = (appData.profile as any)?.id
    return uid ? `${base}|${uid}|${accountId}` : `${base}|${accountId}`
  }, [accountId, appData.baseUrl, appData.profile])

  const accountNoticesQ = useAccountNotifications(
    accountId,
    { includePast: false },
    { enabled: !!accountId && !loading },
  )

  const activeNotices = React.useMemo(() => {
    const now = Date.now()
    const list = accountNoticesQ.data || []
    return list.filter((notice) => {
      const start = notice.start_at ? Date.parse(String(notice.start_at)) : NaN
      const end = notice.end_at ? Date.parse(String(notice.end_at)) : NaN
      if (Number.isFinite(start) && now < start) return false
      if (Number.isFinite(end) && now > end) return false
      return true
    })
  }, [accountNoticesQ.data])

  const unreadNotices = React.useMemo(() => {
    if (!accountKey) return activeNotices
    const read = new Set((readSystemNotices?.[accountKey] || []).map(String))
    return activeNotices.filter((notice) => !read.has(String(notice.id)))
  }, [accountKey, activeNotices, readSystemNotices])

  const sortedNotices = React.useMemo(() => {
    return [...unreadNotices].sort((a, b) => {
      const aTime = a.start_at ? Date.parse(String(a.start_at)) : 0
      const bTime = b.start_at ? Date.parse(String(b.start_at)) : 0
      return bTime - aTime
    })
  }, [unreadNotices])

  const handleMarkNoticeRead = React.useCallback((id: string | number) => {
    if (!accountKey) return
    markSystemNoticeRead(accountKey, String(id))
  }, [accountKey, markSystemNoticeRead])

  const handleUnpin = React.useCallback((id: string) => {
    setPinnedItems(pinnedItems.filter((i) => i.id !== id))
  }, [pinnedItems, setPinnedItems])

  const { recentFeedback } = useDashboardData({
    courses: courses || [],
    sidebar,
    due,
    loading,
  })

  const priorityData = usePriorityAssignments({ horizonDays: timeHorizon })
  const activityData = useActivityFeed()

  useDashboardPrefetch({
    assignments: priorityData.assignments,
    activityItems: activityData.items,
    queryClient,
  })

  const handleAssignmentClick = React.useCallback((assignment: { id: string | number; courseId: string | number; htmlUrl?: string; name: string }) => {
    const assignmentId = String(assignment.id)
    const courseId = assignment.courseId

    let restId = assignmentId
    if (assignment.htmlUrl) {
      const quizId = extractQuizIdFromUrl(assignment.htmlUrl)
      if (quizId && onOpenQuiz) {
        onOpenQuiz(courseId, quizId, assignment.name)
        return
      }
      const extracted = extractAssignmentIdFromUrl(assignment.htmlUrl)
      if (extracted) restId = extracted
    }

    if (onOpenAssignment) {
      onOpenAssignment(courseId, restId, assignment.name)
    } else if (onOpenCourse) {
      onOpenCourse(courseId)
    }
  }, [onOpenAssignment, onOpenCourse, onOpenQuiz])

  const handleActivityClick = React.useCallback((item: ActivityFeedItem) => {
    if (item.type === 'announcement' && item.topicId) {
      let courseId = ''
      if (item.htmlUrl) {
        courseId = extractCourseIdFromUrl(item.htmlUrl) || ''
      }

      if (courseId && onOpenAnnouncement) {
        onOpenAnnouncement(courseId, item.topicId, item.title)
      } else if (item.htmlUrl) {
        navigate({ to: '/announcements' })
      }
    } else if (item.type === 'event') {
      if (item.htmlUrl) {
        const courseId = extractCourseIdFromUrl(item.htmlUrl)
        if (courseId && onOpenCourse) {
          onOpenCourse(courseId)
        }
      }
    }
  }, [onOpenAnnouncement, onOpenCourse, navigate])

  const dashboardContext = React.useMemo(() => {
    const parts: string[] = []

    if (priorityData.assignments.length) {
      const lines = priorityData.assignments.slice(0, 5).map((a) => {
        const dueLabel = a.relativeTime || (a.dueAt ? formatDateTime(a.dueAt) : '')
        const points =
          typeof a.pointsPossible === 'number' ? `${a.pointsPossible} pts` : ''
        const dueText = dueLabel ? `Due: ${dueLabel}` : ''
        const meta = [dueText, points].filter(Boolean).join(', ')
        return `- ${a.name} — ${a.courseLabel}${meta ? ` (${meta})` : ''}`
      })
      parts.push(['Priority Assignments:', ...lines].join('\n'))
    }

    if (activityData.items.length) {
      const lines = activityData.items.slice(0, 5).map((item) => {
        const timeLabel = formatActivityTime(item.timestamp)
        const typeLabel = item.type === 'announcement' ? 'Announcement' : 'Event'
        const meta = [item.courseName, timeLabel].filter(Boolean).join(' · ')
        return `- ${typeLabel}: ${item.title}${meta ? ` (${meta})` : ''}`
      })
      parts.push(['Activity Feed:', ...lines].join('\n'))
    }

    if (recentFeedback && recentFeedback.length) {
      const lines = recentFeedback.slice(0, 5).map((item) => {
        const score =
          typeof item.score === 'number'
            ? `${item.score}${typeof item.pointsPossible === 'number' ? `/${item.pointsPossible}` : ''}`
            : 'Unscored'
        const gradedAt = item.gradedAt ? formatDateTime(item.gradedAt) : ''
        const meta = [score, gradedAt && gradedAt !== '—' ? gradedAt : ''].filter(Boolean).join(' · ')
        return `- ${item.name} — ${item.courseName}${meta ? ` (${meta})` : ''}`
      })
      parts.push(['Recent Feedback:', ...lines].join('\n'))
    }

    return parts.join('\n\n')
  }, [activityData.items, priorityData.assignments, recentFeedback])

  const dashboardOffer = React.useMemo(() => {
    if (!dashboardContext) return null
    return {
      id: 'dashboard',
      slot: 'view' as const,
      kind: 'dashboard' as const,
      title: 'Dashboard',
      contentText: dashboardContext.slice(0, 4000),
    }
  }, [dashboardContext])

  useAIContextOffer('dashboard', dashboardOffer)

  return (
    <div className="space-y-5">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Dashboard
      </h1>

      <SystemNotices
        items={sortedNotices}
        onMarkRead={handleMarkNoticeRead}
        canMarkRead={!!accountKey}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <PriorityList
          assignments={priorityData.assignments}
          alsoDue={priorityData.alsoDue}
          alsoDueCount={priorityData.alsoDueCount}
          isLoading={priorityData.isLoading}
          timeHorizon={timeHorizon}
          onTimeHorizonChange={setTimeHorizon}
          onClickAssignment={handleAssignmentClick}
          courseImageUrl={courseImageUrl}
        />
        <ActivityPanel
          items={activityData.items}
          isLoading={activityData.isLoading}
          isEmpty={activityData.isEmpty}
          onMarkRead={activityData.markAnnouncementRead}
          onClickItem={handleActivityClick}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <RecentFeedback
          items={recentFeedback}
          isLoading={false}
          showGrades={showGrades}
          onToggleGrades={setShowGrades}
          onClickItem={handleAssignmentClick}
          courseImageUrl={courseImageUrl}
        />
        <PinnedPages
          items={pinnedItems}
          onUnpin={handleUnpin}
        />
      </div>
    </div>
  )
}
