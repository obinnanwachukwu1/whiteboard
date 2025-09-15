import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { RootLayout } from './routes/RootLayout'
import DashboardPage from './routes/DashboardPage'
import AllCoursesPage from './routes/AllCoursesPage'
import CoursePage from './routes/CoursePage'
import SettingsPage from './routes/SettingsPage'
import AnnouncementsPage from './routes/AnnouncementsPage'
import AssignmentsPage from './routes/AssignmentsPage'
import GradesPage from './routes/GradesPage'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const allCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/all-courses',
  component: AllCoursesPage,
})

const courseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/course/$courseId',
  component: CoursePage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const announcementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/announcements',
  component: AnnouncementsPage,
})

const assignmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/assignments',
  component: AssignmentsPage,
})

const gradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grades',
  component: GradesPage,
})

function RedirectDashboard() { const navigate = useNavigate(); React.useEffect(() => { navigate({ to: '/dashboard', replace: true }) }, [navigate]); return null }

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: RedirectDashboard }),
  dashboardRoute,
  allCoursesRoute,
  courseRoute,
  settingsRoute,
  announcementsRoute,
  assignmentsRoute,
  gradesRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 1000 * 60,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
