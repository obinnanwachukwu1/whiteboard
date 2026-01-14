import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type DueItem } from '../hooks/useDashboardData'
import { useCourseImages } from '../hooks/useCourseImages'
import { usePriorityAssignments, type DashboardAssignment } from '../hooks/usePriorityAssignments'
import { useActivityFeed, type ActivityFeedItem } from '../hooks/useActivityFeed'
import { useDashboardSettings } from '../hooks/useDashboardSettings'
import { extractAssignmentIdFromUrl, extractCourseIdFromUrl } from '../utils/urlHelpers'

// Components
import { PriorityList } from './dashboard/PriorityList'
import { ActivityPanel } from './dashboard/ActivityPanel'

type Props = {
  due: DueItem[]
  loading: boolean
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
}) => {
  const navigate = useNavigate()
  const { courseImageUrl } = useCourseImages()
  const { timeHorizon, setTimeHorizon } = useDashboardSettings()
  
  // Priority assignments data - pass timeHorizon explicitly to ensure reactivity
  const priorityData = usePriorityAssignments({ horizonDays: timeHorizon })
  
  // Activity feed data
  const activityData = useActivityFeed()
  
  // Handle assignment click
  const handleAssignmentClick = React.useCallback((assignment: DashboardAssignment) => {
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
      
      {/* Two-column layout: 60% Priority / 40% Activity */}
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
    </div>
  )
}
