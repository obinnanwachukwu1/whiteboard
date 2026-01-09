import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDashboardData, type DueItem } from '../hooks/useDashboardData'

// Components
import { StatCards } from './dashboard/StatCards'
import { AssignmentList } from './dashboard/AssignmentList'
import { AnnouncementList } from './dashboard/AnnouncementList'
import { CourseCard } from './dashboard/CourseCard'

type Props = {
  due: DueItem[]
  loading: boolean
  courses?: Array<{ id: string | number; name: string; course_code?: string }>
  sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
  onOpenCourse?: (courseId: string | number) => void
  onOpenAssignment?: (courseId: string | number, assignmentRestId: string, title: string) => void
  onOpenAnnouncement?: (courseId: string | number, topicId: string, title: string) => void
}

export const Dashboard: React.FC<Props> = ({ due, loading, courses = [], sidebar, onOpenCourse, onOpenAssignment, onOpenAnnouncement }) => {
  const navigate = useNavigate()
  
  const {
    orderedVisibleCourses,
    topAnnouncements,
    annsLoading,
    dueLoading,
    hasDue,
    avgGrade,
    labelFor,
    gradeForCourse,
    courseImageUrl
  } = useDashboardData({ courses, sidebar, due, loading })

  // Calculate "Next Due" item locally for the StatCard (or could move to hook if used elsewhere)
  const nextDue = React.useMemo(() => {
    if (!hasDue) return null
    const sorted = due.slice().sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    const first = sorted[0]
    if (!first) return null
    try {
      return { title: first.name, when: new Date(first.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }
    } catch {
      return null
    }
  }, [due, hasDue])

  return (
    <div className="space-y-5">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
      
      {/* Quick glance stats */}
      <StatCards
        dueCount={due.length}
        dueLoading={dueLoading}
        hasDue={hasDue}
        nextDue={nextDue}
        courseCount={orderedVisibleCourses.length}
        avgGrade={avgGrade}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AssignmentList
          due={due}
          loading={dueLoading}
          onOpenAssignment={onOpenAssignment}
          onOpenCourse={onOpenCourse}
          courseImageUrl={courseImageUrl}
          navigate={navigate}
        />

        <AnnouncementList
          announcements={topAnnouncements}
          loading={annsLoading}
          onOpenAnnouncement={onOpenAnnouncement}
          onOpenCourse={onOpenCourse}
          courseImageUrl={courseImageUrl}
          navigate={navigate}
        />
      </div>

      {orderedVisibleCourses.length > 0 && (
        <div>
          <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Your Courses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderedVisibleCourses.map((c) => (
              <CourseCard
                key={String(c.id)}
                course={c}
                label={labelFor(c)}
                grade={gradeForCourse(c.id)}
                imgUrl={courseImageUrl(c.id)}
                onClick={() => onOpenCourse?.(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
