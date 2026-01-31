import { useAppData, useAppDataActions } from '../context/AppContext'
import { AllCoursesManager } from '../components/AllCoursesManager'

export default function AllCoursesPage() {
  const data = useAppData()
  const dataActions = useAppDataActions()
  return (
    <AllCoursesManager
      courses={data.courses}
      sidebar={data.sidebar}
      onChange={dataActions.setSidebar}
    />
  )
}
