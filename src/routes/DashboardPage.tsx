import React from 'react'
import { Dashboard } from '../components/Dashboard'
import { useAppContext } from '../context/AppContext'

export default function DashboardPage() {
  const ctx = useAppContext()
  return (
    <Dashboard
      due={ctx.due}
      loading={ctx.loading}
      courses={ctx.courses}
      sidebar={ctx.sidebar}
      onOpenCourse={(id) => ctx.onOpenCourse(id)}
      onOpenAssignment={(courseId, assignmentRestId, title) => ctx.onOpenAssignment(courseId, assignmentRestId, title)}
      onOpenAnnouncement={(courseId, topicId, title) => ctx.onOpenAnnouncement(courseId, topicId, title)}
    />
  )
}
