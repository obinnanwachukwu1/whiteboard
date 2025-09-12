import { useAppContext } from '../context/AppContext'
import { AllCoursesManager } from '../components/AllCoursesManager'

export default function AllCoursesPage() {
  const ctx = useAppContext()
  return (
    <AllCoursesManager
      courses={ctx.courses}
      sidebar={ctx.sidebar}
      onChange={ctx.setSidebar}
    />
  )
}
