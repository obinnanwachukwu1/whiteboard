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
      onOpenCourse={actions.onOpenCourse}
      onOpenAssignment={actions.onOpenAssignment}
      onOpenAnnouncement={actions.onOpenAnnouncement}
    />
  )
}
