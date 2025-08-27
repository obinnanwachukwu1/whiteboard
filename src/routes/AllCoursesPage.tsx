import React from 'react'
import { useAppContext } from './RootLayout'
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
