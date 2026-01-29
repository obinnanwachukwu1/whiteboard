import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDashboardData, type DueItem, type FeedbackItem } from '../hooks/useDashboardData'
import { useCourseImages } from '../hooks/useCourseImages'
import { usePriorityAssignments } from '../hooks/usePriorityAssignments'
import { useActivityFeed, type ActivityFeedItem } from '../hooks/useActivityFeed'
import { useDashboardSettings } from '../hooks/useDashboardSettings'
import { extractAssignmentIdFromUrl, extractCourseIdFromUrl } from '../utils/urlHelpers'

import { enqueuePrefetch } from '../utils/prefetchQueue'
import { useQueryClient } from '@tanstack/react-query'

// Components
import { PriorityList } from './dashboard/PriorityList'
import { ActivityPanel } from './dashboard/ActivityPanel'
import { RecentFeedback } from './dashboard/RecentFeedback'
import { PinnedPages } from './dashboard/PinnedPages'

type Props = {
  due: DueItem[]
  loading: boolean
  recentFeedback?: FeedbackItem[]
  courses?: Array<{ id: string | number; name: string; course_code?: string }>
  sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
  onOpenCourse?: (courseId: string | number) => void
  onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void
  onOpenAnnouncement?: (courseId: string | number, topicId: string, title: string) => void
}

export const Dashboard: React.FC<Props> = ({
  onOpenCourse,
  onOpenAssignment,
  onOpenAnnouncement,
  due,
  loading,
  courses,
  sidebar,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { courseImageUrl } = useCourseImages()
  const { 
    timeHorizon, 
    setTimeHorizon,
    showGrades,
    setShowGrades,
    pinnedItems,
    setPinnedItems
  } = useDashboardSettings()
  
  const handleUnpin = React.useCallback((id: string) => {
    setPinnedItems(pinnedItems.filter(i => i.id !== id))
  }, [pinnedItems, setPinnedItems])
  // Use aggregated dashboard data (includes Recent Feedback derived from gradebook)
  const { recentFeedback } = useDashboardData({
    courses: courses || [],
    sidebar,
    due,
    loading
  })
  
  // Priority assignments data - pass timeHorizon explicitly to ensure reactivity
  const priorityData = usePriorityAssignments({ horizonDays: timeHorizon })
  
  // Activity feed data
  const activityData = useActivityFeed()

  // Auto-prefetch top assignments details
  React.useEffect(() => {
    if (!priorityData.assignments.length) return
    const top = priorityData.assignments.slice(0, 5)
    for (const a of top) {
      if (a.htmlUrl) {
        // Just prefetch assignment detail if we can guess the ID
        // Often assignments list provides enough, but for robust instant open:
        const extracted = extractAssignmentIdFromUrl(a.htmlUrl) || String(a.id)
        enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['assignment-rest', String(a.courseId), extracted],
            queryFn: async () => {
              const res = await window.canvas.getAssignmentRest?.(a.courseId, extracted)
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data
            },
            staleTime: 1000 * 60 * 5,
          })
        })
      }
    }
  }, [priorityData.assignments, queryClient])

  // Auto-prefetch top announcements
  React.useEffect(() => {
    if (!activityData.items.length) return
    const anns = activityData.items.filter(i => i.type === 'announcement').slice(0, 5)
    for (const a of anns) {
      if (a.topicId) {
        // Extract course ID
        const cid = extractCourseIdFromUrl(a.htmlUrl || '')
        if (cid) {
          enqueuePrefetch(async () => {
            await queryClient.prefetchQuery({
              queryKey: ['announcement', cid, a.topicId],
              queryFn: async () => {
                const res = await window.canvas.getAnnouncement?.(cid, a.topicId!)
                if (!res?.ok) throw new Error(res?.error || 'Failed')
                return res.data
              },
              staleTime: 1000 * 60 * 5,
            })
          })
        }
      }
    }
  }, [activityData.items, queryClient])
  
  // Handle assignment click (shared for priority and feedback)
  const handleAssignmentClick = React.useCallback((assignment: { id: string | number, courseId: string | number, htmlUrl?: string, name: string }) => {
    const assignmentId = String(assignment.id)
    const courseId = assignment.courseId
    
    // Try to extract REST ID from URL if the id is a URL
    let restId = assignmentId
    if (assignment.htmlUrl) {
      const extracted = extractAssignmentIdFromUrl(assignment.htmlUrl)
      if (extracted) restId = extracted
    }
    
    if (onOpenAssignment) {
      onOpenAssignment(courseId, restId, assignment.name)
    } else if (onOpenCourse) {
      onOpenCourse(courseId)
    }
  }, [onOpenAssignment, onOpenCourse])
  
  // Handle activity item click
  const handleActivityClick = React.useCallback((item: ActivityFeedItem) => {
    if (item.type === 'announcement' && item.topicId) {
      // Extract course ID from URL if needed
      let courseId = ''
      if (item.htmlUrl) {
        courseId = extractCourseIdFromUrl(item.htmlUrl) || ''
      }
      
      if (courseId && onOpenAnnouncement) {
        onOpenAnnouncement(courseId, item.topicId, item.title)
      } else if (item.htmlUrl) {
        // Fallback: navigate to announcements page
        navigate({ to: '/announcements' })
      }
    } else if (item.type === 'event') {
      // For events, could open a calendar view or the course
      // For now, just open the course if we have an ID
      if (item.htmlUrl) {
        const courseId = extractCourseIdFromUrl(item.htmlUrl)
        if (courseId && onOpenCourse) {
          onOpenCourse(courseId)
        }
      }
    }
  }, [onOpenAnnouncement, onOpenCourse, navigate])
  
  return (
    <div className="space-y-5">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Dashboard
      </h1>
      
      {/* Top Row: Priority & Activity (60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Left Column: Priority */}
        <PriorityList
          assignments={priorityData.assignments}
          alsoDue={priorityData.alsoDue}
          alsoDueCount={priorityData.alsoDueCount}
          isLoading={priorityData.isLoading}
          timeHorizon={timeHorizon}
          onTimeHorizonChange={setTimeHorizon}
          onClickAssignment={handleAssignmentClick}
          courseImageUrl={(courseId) => courseImageUrl(courseId)}
        />
        
        {/* Right Column: Activity */}
        <ActivityPanel
          items={activityData.items}
          isLoading={activityData.isLoading}
          isEmpty={activityData.isEmpty}
          onMarkRead={activityData.markAnnouncementRead}
          onClickItem={handleActivityClick}
        />
      </div>

      {/* Bottom Row: Recent Feedback & Quick Notes (60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <RecentFeedback
          items={recentFeedback}
          isLoading={false} // Data is derived from already loaded queries, so it's instant once Dashboard mounts
          showGrades={showGrades}
          onToggleGrades={setShowGrades}
          onClickItem={handleAssignmentClick}
        />
        
        <PinnedPages
          items={pinnedItems}
          onUnpin={handleUnpin}
        />
      </div>
    </div>
  )
}
