import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { RootLayout } from './routes/RootLayout'
import DashboardPage from './routes/DashboardPage'
import AllCoursesPage from './routes/AllCoursesPage'
import CoursePage from './routes/CoursePage'

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

function RedirectDashboard() { const navigate = useNavigate(); React.useEffect(() => { navigate({ to: '/dashboard', replace: true }) }, [navigate]); return null }

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: RedirectDashboard }),
  dashboardRoute,
  allCoursesRoute,
  courseRoute,
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
