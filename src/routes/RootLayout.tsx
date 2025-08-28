import React, { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Header } from '../components/Header'
import { Sidebar, type SidebarConfig } from '../components/Sidebar'
import { useCourses, useDueAssignments, useProfile } from '../hooks/useCanvasQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/ui/Toaster'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { toAssignmentInputsFromRest, toAssignmentGroupInputsFromRest } from '../utils/gradeCalc'
import { AppProvider, type AppContextValue } from '../context/AppContext'

// Context definitions moved to src/context/AppContext.tsx

export function RootLayout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { add: addToast } = useToast()

  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://gatech.instructure.com')
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [prefetchEnabled, setPrefetchEnabledState] = useState(true)
  const [cachedCourses, setCachedCourses] = useState<any[] | null>(null)
  const [cachedDue, setCachedDue] = useState<any[] | null>(null)
  const [activeCourseId, setActiveCourseIdState] = useState<string | number | null>(null)
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>({ hiddenCourseIds: [], customNames: {}, order: [] })

  // Queries
  const profileQ = useProfile({ enabled: hasToken === true })
  const coursesQ = useCourses({ enrollment_state: 'active' }, { enabled: hasToken === true })
  const dueQ = useDueAssignments({ days: 7 }, { enabled: hasToken === true })

  // Load settings + init
  useEffect(() => {
    (async () => {
      const cfg = await window.settings.get()
      if (cfg.ok && cfg.data?.baseUrl) setBaseUrl(cfg.data.baseUrl)
      if (cfg.ok && cfg.data?.sidebar) setSidebarCfg(cfg.data.sidebar)
      if (cfg.ok && typeof cfg.data?.prefetchEnabled === 'boolean') setPrefetchEnabledState(!!cfg.data.prefetchEnabled)
      if (cfg.ok && Array.isArray(cfg.data?.cachedCourses)) {
        setCachedCourses(cfg.data.cachedCourses || [])
        queryClient.setQueryData(['courses', { enrollment_state: 'active' }], cfg.data.cachedCourses || [])
      }
      if (cfg.ok && Array.isArray(cfg.data?.cachedDue)) {
        setCachedDue(cfg.data.cachedDue || [])
        queryClient.setQueryData(['due-assignments', { days: 7 }], cfg.data.cachedDue || [])
      }

      setLoading(true)
      const res = await window.canvas.init({ baseUrl: cfg.data?.baseUrl || baseUrl })
      if (!res.ok) {
        setHasToken(false)
        setLoading(false)
        return
      }
      setHasToken(true)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['due-assignments'] })
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toast errors
  useEffect(() => { if (profileQ.error) addToast({ title: 'Failed to load profile', description: String(profileQ.error.message), variant: 'destructive' }) }, [profileQ.error, addToast])
  useEffect(() => { if (coursesQ.error) addToast({ title: 'Failed to load courses', description: String(coursesQ.error.message), variant: 'destructive' }) }, [coursesQ.error, addToast])
  useEffect(() => { if (dueQ.error) addToast({ title: 'Failed to load assignments', description: String(dueQ.error.message), variant: 'destructive' }) }, [dueQ.error, addToast])

  // Local memory snapshots for initial paint
  useEffect(() => { if (Array.isArray(coursesQ.data) && coursesQ.data.length) setCachedCourses(coursesQ.data) }, [coursesQ.data])
  useEffect(() => { if (Array.isArray(dueQ.data)) setCachedDue(dueQ.data) }, [dueQ.data])

  const hideCourse = async (courseId: string | number) => {
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    hidden.add(courseId)
    const next = { ...sidebarCfg, hiddenCourseIds: Array.from(hidden) }
    setSidebarCfg(next)
    await window.settings.set({ sidebar: next })
  }
  const onSidebarConfigChange = async (next: SidebarConfig) => {
    setSidebarCfg(next)
    await window.settings.set({ sidebar: next })
  }

  const prefetchCourseData = (courseId: string | number) => {
    const id = String(courseId)
    enqueuePrefetch(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['course-assignments', id, 200],
        queryFn: async () => {
          const res = await window.canvas.listCourseAssignments(id, 200)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      })
    })
    enqueuePrefetch(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['course-modules', id],
        queryFn: async () => {
          const res = await window.canvas.listCourseModulesGql(id, 20, 50)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load modules')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      })
    })
    requestIdle(() => {
      enqueuePrefetch(async () => {
        await queryClient.prefetchQuery({
          queryKey: ['course-gradebook', id],
          queryFn: async () => {
            const [groupsRes, assignmentsRes] = await Promise.all([
              window.canvas.listAssignmentGroups(id, false),
              window.canvas.listAssignmentsWithSubmission(id, 100),
            ])
            if (!groupsRes?.ok) throw new Error(groupsRes?.error || 'Failed to load assignment groups')
            if (!assignmentsRes?.ok) throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
            const groups = toAssignmentGroupInputsFromRest(groupsRes.data || [])
            const raw = (assignmentsRes.data || []) as any[]
            const assignments = toAssignmentInputsFromRest(raw)
            return { groups, assignments, raw }
          },
          staleTime: 1000 * 60 * 5,
        })
      })
      enqueuePrefetch(async () => {
        await queryClient.prefetchQuery({
          queryKey: ['course-tabs', id, true],
          queryFn: async () => {
            const res = await window.canvas.listCourseTabs?.(id, true)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load course tabs')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
      })
    })
  }

  // Derive current route and active course from pathname
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const currentView: 'dashboard' | 'course' | 'allCourses' | 'settings' = pathname.startsWith('/course/')
    ? 'course'
    : pathname.startsWith('/all-courses')
    ? 'allCourses'
    : pathname.startsWith('/settings')
    ? 'settings'
    : 'dashboard'
  const derivedCourseId = React.useMemo(() => {
    if (!pathname.startsWith('/course/')) return null
    const parts = pathname.split('/')
    return parts[2] ? decodeURIComponent(parts[2]) : null
  }, [pathname])

  const setActiveCourseId = (id: string | number | null) => setActiveCourseIdState(id)

  const context: AppContextValue = {
    baseUrl,
    courses: (coursesQ.data || cachedCourses || []),
    due: (dueQ.data || cachedDue || []),
    profile: profileQ.data,
    loading: loading || profileQ.isLoading || (coursesQ.isLoading && !(cachedCourses && cachedCourses.length)) || (dueQ.isLoading && !(cachedDue && cachedDue.length)),
    sidebar: sidebarCfg,
    setSidebar: onSidebarConfigChange,
    prefetchEnabled,
    setPrefetchEnabled: async (v: boolean) => { setPrefetchEnabledState(v); await window.settings.set({ prefetchEnabled: v }) },
    onOpenCourse: (id) => { setActiveCourseId(id); navigate({ to: '/course/$courseId', params: { courseId: String(id) } }) },
    onOpenAssignment: (courseId, restId, title) => { setActiveCourseId(courseId); navigate({ to: '/course/$courseId', params: { courseId: String(courseId) }, search: { tab: 'assignments', type: 'assignment', contentId: String(restId), title } }) },
    onOpenAnnouncement: (courseId, topicId, title) => { setActiveCourseId(courseId); navigate({ to: '/course/$courseId', params: { courseId: String(courseId) }, search: { tab: 'announcements', type: 'announcement', contentId: String(topicId), title } }) },
  }

  const visibleCourses = useMemo(() => {
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    const list = (context.courses as any[]).filter((c) => !hidden.has(c.id))
    const order = sidebarCfg.order || []
    const orderMap = new Map(order.map((id, i) => [String(id), i]))
    list.sort((a: any, b: any) => (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0))
    return list
  }, [context.courses, sidebarCfg.hiddenCourseIds, sidebarCfg.order])

  const init = async () => {
    setLoading(true)
    const res = await window.canvas.init({ token: token.trim() || undefined, baseUrl })
    if (res.ok) {
      setHasToken(true)
      await window.settings.set({ baseUrl })
      queryClient.invalidateQueries()
      addToast({ title: 'Connected to Canvas', variant: 'success' })
      setToken('')
      if (res.insecure) addToast({ title: 'Token stored insecurely (dev)', description: 'Keychain integration unavailable; using file storage under userData.' })
      navigate({ to: '/dashboard' })
    } else {
      setHasToken(false)
      addToast({ title: 'Failed to save token', description: String(res.error || 'Unknown error'), variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <AppProvider value={context}>
      <div className="h-screen flex flex-col">
        <Header profile={profileQ.data} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            courses={visibleCourses}
            activeCourseId={(currentView === 'course' ? (derivedCourseId ?? activeCourseId) : null)}
            sidebar={sidebarCfg}
            current={currentView}
            onSelectDashboard={() => { setActiveCourseId(null); navigate({ to: '/dashboard' }) }}
            onSelectCourse={(id) => context.onOpenCourse(id)}
            onOpenAllCourses={() => navigate({ to: '/all-courses' })}
            onHideCourse={hideCourse}
            onPrefetchCourse={(id) => { if (prefetchEnabled) prefetchCourseData(id) }}
            prefetchEnabled={prefetchEnabled}
            onTogglePrefetch={async (enabled) => { context.setPrefetchEnabled(enabled) }}
            onReorder={async (nextOrder) => { const next: SidebarConfig = { ...sidebarCfg, order: nextOrder }; setSidebarCfg(next); await window.settings.set({ sidebar: next }) }}
          />
          <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-tl-lg">
            <div className={`flex-1 p-6 ${currentView === 'course' ? 'pt-24' : ''}`}>
              <div className="max-w-6xl w-full mx-auto space-y-4">
                {hasToken === false && (
                  <div className="rounded-md ring-1 ring-gray-200 dark:ring-neutral-800 p-4">
                    <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Connect to Canvas</h2>
                    <div className="grid gap-3 max-w-xl">
                      <label className="text-sm">
                        <div className="mb-1">Base URL</div>
                        <input className="w-full rounded border px-2 py-1 bg-white/90 dark:bg-neutral-900" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} onBlur={async () => { await window.settings.set({ baseUrl }) }} placeholder="https://..." />
                      </label>
                      <label className="text-sm">
                        <div className="mb-1">Token</div>
                        <input className="w-full rounded border px-2 py-1 bg-white/90 dark:bg-neutral-900" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token (stored securely)" />
                      </label>
                      <div className="pt-1">
                        <button className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-50" onClick={init} disabled={loading || !token.trim()}>{loading ? 'Saving…' : 'Save Token / Init'}</button>
                      </div>
                    </div>
                  </div>
                )}
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppProvider>
  )
}
