import { Dashboard } from '../components/Dashboard'
import { useAppActions, useAppData } from '../context/AppContext'

export default function DashboardPage() {
  const data = useAppData()
  const actions = useAppActions()
  return (
    <Dashboard
      due={data.due}
      loading={data.loading}
      courses={data.courses}
      sidebar={data.sidebar}
      onOpenCourse={(id) => actions.onOpenCourse(id)}
      onOpenAssignment={(courseId, assignmentRestId, title) => actions.onOpenAssignment(courseId, assignmentRestId, title)}
      onOpenAnnouncement={(courseId, topicId, title) => actions.onOpenAnnouncement(courseId, topicId, title)}
    />
  )
}
