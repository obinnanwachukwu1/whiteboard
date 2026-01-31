import { createHashHistory, createRootRoute, createRoute, createRouter, useNavigate, useRouterState } from '@tanstack/react-router'
import React from 'react'
import { RootLayout } from './routes/RootLayout'

// Lazy load route components for code splitting
const DashboardPage = React.lazy(() => import('./routes/DashboardPage'))
const AllCoursesPage = React.lazy(() => import('./routes/AllCoursesPage'))
const CoursePage = React.lazy(() => import('./routes/CoursePage'))
const ContentPage = React.lazy(() => import('./routes/ContentPage'))
const AnnouncementsPage = React.lazy(() => import('./routes/AnnouncementsPage'))
const AssignmentsPage = React.lazy(() => import('./routes/AssignmentsPage'))
const GradesPage = React.lazy(() => import('./routes/GradesPage'))
const DiscussionsPage = React.lazy(() => import('./routes/DiscussionsPage'))

function RouteFallback() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = React.useMemo(() => {
    if (pathname.startsWith('/course/')) return 'Course'
    if (pathname.startsWith('/content')) return 'Content'
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard'
      case '/announcements':
        return 'Announcements'
      case '/assignments':
        return 'Assignments'
      case '/grades':
        return 'Grades'
      case '/discussions':
        return 'Discussions'
      case '/all-courses':
        return 'All Courses'
      default:
        return 'Loading'
    }
  }, [pathname])

  return (
    <div className="space-y-3">
      <h1 className="mt-0 mb-0 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
    </div>
  )
}

// Wrapper for lazy-loaded components with Suspense
function withSuspense(Component: React.LazyExoticComponent<React.ComponentType<any>>): React.FC {
  return function SuspenseWrapper() {
    return (
      <React.Suspense fallback={<RouteFallback />}>
        <Component />
      </React.Suspense>
    )
  }
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: withSuspense(DashboardPage),
})

const allCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/all-courses',
  component: withSuspense(AllCoursesPage),
})

const courseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/course/$courseId',
  component: withSuspense(CoursePage),
})

const contentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/content',
  component: withSuspense(ContentPage),
})

const announcementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/announcements',
  component: withSuspense(AnnouncementsPage),
})

const assignmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/assignments',
  component: withSuspense(AssignmentsPage),
})

const gradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grades',
  component: withSuspense(GradesPage),
})

const discussionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/discussions',
  component: withSuspense(DiscussionsPage),
})

function RedirectDashboard() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  React.useEffect(() => {
    if (pathname !== '/dashboard') {
      navigate({ to: '/dashboard', replace: true })
    }
  }, [navigate, pathname])

  return null
}

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: RedirectDashboard }),
  dashboardRoute,
  allCoursesRoute,
  courseRoute,
  contentRoute,
  announcementsRoute,
  assignmentsRoute,
  gradesRoute,
  discussionsRoute,
])

const history = createHashHistory()

export const router = createRouter({
  routeTree,
  history,
  defaultPreload: 'intent',
  defaultStaleTime: 1000 * 60,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
