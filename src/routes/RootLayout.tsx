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
import { applyThemeAndAccent } from '../utils/theme'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'

// Context definitions moved to src/context/AppContext.tsx

export function RootLayout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { add: addToast } = useToast()

  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://gatech.instructure.com')
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [prefetchEnabled, setPrefetchEnabledState] = useState(true)
  const [cachedCourses, setCachedCourses] = useState<any[] | null>(null)
  const [cachedDue, setCachedDue] = useState<any[] | null>(null)
  const [activeCourseId, setActiveCourseIdState] = useState<string | number | null>(null)
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>({ hiddenCourseIds: [], customNames: {}, order: [] })

  // Queries
  const profileQ = useProfile({ enabled: hasToken === true })
  const coursesQ = useCourses({ enrollment_state: 'active' }, { enabled: hasToken === true })
  const dueQ = useDueAssignments({ days: 7 }, { enabled: hasToken === true })
  const userKey = React.useMemo(() => {
    const uid = (profileQ.data as any)?.id
    return hasToken && uid ? `${baseUrl}|${uid}` : null
  }, [hasToken, baseUrl, profileQ.data])

  // Load settings + init
  useEffect(() => {
    (async () => {
      const cfg = await window.settings.get()
      if (cfg.ok && cfg.data?.baseUrl) setBaseUrl(cfg.data.baseUrl)
      try {
        const theme = (cfg.ok && cfg.data?.theme) ? cfg.data.theme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        const accent = (cfg.ok ? (cfg.data as any)?.accent : undefined) || 'default'
        applyThemeAndAccent(theme as 'light' | 'dark', accent as any)
      } catch {}
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

  // After we know the user, load/migrate any per-user sidebar + settings
  useEffect(() => {
    ;(async () => {
      if (!userKey) return
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) as any
        // Sidebar: prefer per-user; migrate from global if needed
        const perSidebar = data?.userSidebars?.[userKey]
        if (perSidebar) {
          setSidebarCfg(perSidebar)
        } else if (data?.sidebar) {
          const map = { ...(data.userSidebars || {}), [userKey]: data.sidebar }
          await window.settings.set?.({ userSidebars: map })
          setSidebarCfg(data.sidebar)
        }

        // Settings (theme/accent/prefetchEnabled): prefer per-user; migrate globals
        const perSettings = data?.userSettings?.[userKey]
        if (perSettings) {
          if (typeof perSettings.prefetchEnabled === 'boolean') setPrefetchEnabledState(!!perSettings.prefetchEnabled)
          const theme = perSettings.theme || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
          const accent = perSettings.accent || (data?.accent || 'default')
          try { applyThemeAndAccent(theme as any, accent as any) } catch {}
        } else {
          const next: any = {}
          if (typeof data?.prefetchEnabled === 'boolean') { next.prefetchEnabled = !!data.prefetchEnabled; setPrefetchEnabledState(!!data.prefetchEnabled) }
          if (data?.theme) next.theme = data.theme
          if (data?.accent) next.accent = data.accent
          if (Object.keys(next).length) {
            const mapS = { ...(data.userSettings || {}) }
            mapS[userKey] = { ...(mapS[userKey] || {}), ...next }
            await window.settings.set?.({ userSettings: mapS })
            try { applyThemeAndAccent((next.theme || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')) as any, (next.accent || 'default') as any) } catch {}
          }
        }
      } catch {}
    })()
  }, [userKey])

  // Toast errors
  useEffect(() => { if (profileQ.error) addToast({ title: 'Failed to load profile', description: String(profileQ.error.message), variant: 'destructive' }) }, [profileQ.error, addToast])
  useEffect(() => { if (coursesQ.error) addToast({ title: 'Failed to load courses', description: String(coursesQ.error.message), variant: 'destructive' }) }, [coursesQ.error, addToast])
  useEffect(() => { if (dueQ.error) addToast({ title: 'Failed to load assignments', description: String(dueQ.error.message), variant: 'destructive' }) }, [dueQ.error, addToast])

  // Local memory snapshots for initial paint
  useEffect(() => { if (Array.isArray(coursesQ.data) && coursesQ.data.length) setCachedCourses(coursesQ.data) }, [coursesQ.data])
  useEffect(() => { if (Array.isArray(dueQ.data)) setCachedDue(dueQ.data) }, [dueQ.data])

  const saveUserSidebar = async (next: SidebarConfig) => {
    try {
      const cfg = await window.settings.get?.()
      const map = (cfg?.ok ? (cfg.data as any)?.userSidebars : undefined) || {}
      if (userKey) map[userKey] = next
      await window.settings.set?.(userKey ? { userSidebars: map } : { sidebar: next })
    } catch {}
  }

  const saveUserSettings = async (partial: Record<string, any>) => {
    try {
      const cfg = await window.settings.get?.()
      const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
      if (userKey) {
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, ...partial }
        await window.settings.set?.({ userSettings: map })
      } else {
        await window.settings.set?.(partial as any)
      }
    } catch {}
  }

  const hideCourse = async (courseId: string | number) => {
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    hidden.add(courseId)
    const next = { ...sidebarCfg, hiddenCourseIds: Array.from(hidden) }
    setSidebarCfg(next)
    await saveUserSidebar(next)
  }
  const onSidebarConfigChange = async (next: SidebarConfig) => {
    setSidebarCfg(next)
    await saveUserSidebar(next)
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

  const onSignOut = async () => {
    try { await window.canvas.clearToken?.(baseUrl) } catch {}
    try { await window.settings.set?.({ cachedCourses: [], cachedDue: [], queryCache: undefined }) } catch {}
    try { queryClient.clear() } catch {}
    setCachedCourses([])
    setCachedDue([])
    setHasToken(false)
    navigate({ to: '/dashboard' })
  }

  const context: AppContextValue = {
    baseUrl,
    courses: (coursesQ.data || cachedCourses || []),
    due: (dueQ.data || cachedDue || []),
    profile: profileQ.data,
    loading: loading || profileQ.isLoading || (coursesQ.isLoading && !(cachedCourses && cachedCourses.length)) || (dueQ.isLoading && !(cachedDue && cachedDue.length)),
    sidebar: sidebarCfg,
    setSidebar: onSidebarConfigChange,
    prefetchEnabled,
    setPrefetchEnabled: async (v: boolean) => { setPrefetchEnabledState(v); await saveUserSettings({ prefetchEnabled: v }) },
    onOpenCourse: (id) => { setActiveCourseId(id); navigate({ to: '/course/$courseId', params: { courseId: String(id) } }) },
    onOpenAssignment: (courseId, restId, title) => { setActiveCourseId(courseId); navigate({ to: '/course/$courseId', params: { courseId: String(courseId) }, search: { tab: 'assignments', type: 'assignment', contentId: String(restId), title } }) },
    onOpenAnnouncement: (courseId, topicId, title) => { setActiveCourseId(courseId); navigate({ to: '/course/$courseId', params: { courseId: String(courseId) }, search: { tab: 'announcements', type: 'announcement', contentId: String(topicId), title } }) },
    onSignOut,
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

  // Initial app loading screen while auth initializes
  if (hasToken === null) {
    return (
      <div className="h-screen w-screen relative flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
        {/* Transparent draggable bar on startup */}
        <div className="absolute inset-x-0 top-0 h-14 app-drag titlebar-left-inset z-50 bg-transparent" aria-hidden />
        <div className="text-slate-600 dark:text-slate-300 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  // Full-screen Sign In page when not authenticated
  if (hasToken === false) {
    const toggleShow = () => setShowToken((v) => !v)
    const openTokenHelp = () => { try { if (baseUrl) window.system?.openExternal?.(`${baseUrl.replace(/\/?$/, '')}/profile/settings`) } catch {} }
    return (
      <div className="h-screen w-screen relative overflow-hidden flex flex-col">
        {/* Transparent draggable bar (doesn't affect layout) */}
        <div className="absolute inset-x-0 top-0 h-14 app-drag titlebar-left-inset z-50 bg-transparent" aria-hidden />
        {/* Animated gradient ribbon overlay */}
        <div className="absolute inset-x-0 -top-1/3 h-1/2 -z-10 bg-gradient-to-r from-sky-400 via-violet-500 to-rose-400 opacity-40 blur-3xl animate-gradient" />
        {/* Ambient orbs */}
        <div className="absolute -z-10 -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-25 animate-float" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), transparent)' }} />
        <div className="absolute -z-10 -bottom-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-20 animate-float-delayed" style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.5), transparent)' }} />

        <div className="flex-1 w-full flex flex-col items-center justify-center p-6">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Brand + Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/40 dark:bg-neutral-900/40 backdrop-blur text-xs tracking-wide uppercase text-slate-700 dark:text-neutral-200">Welcome</div>
              <h1 className="mt-3 mb-3 text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-violet-500 to-rose-500 animate-gradient">Whiteboard</h1>
              <p className="text-slate-700 dark:text-neutral-300 text-base md:text-lg max-w-prose">Your fast, focused companion for Canvas. Stay on top of assignments, files, and announcements without the noise.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-700 dark:text-neutral-300">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40 backdrop-blur">⚡ Fast navigation</span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40 backdrop-blur">📂 Clean file browsing</span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40 backdrop-blur">🔔 Upcoming at a glance</span>
              </div>
            </div>

            {/* Right: Connect form (no gradient on box) */}
            <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-6 shadow-card bg-white/85 dark:bg-neutral-900/85 backdrop-blur">
              <h2 className="mt-0 mb-4 text-slate-900 dark:text-slate-100 text-lg font-semibold">Connect to Canvas</h2>
              <div className="grid gap-4">
                <label className="text-sm">
                  <div className="mb-1">Base URL</div>
                  <input className="w-full rounded-control border px-3 py-2 bg-white/90 dark:bg-neutral-900" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} onBlur={async () => { await window.settings.set({ baseUrl }) }} placeholder="https://your.school.instructure.com" />
                </label>
                <label className="text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span>Token</span>
                    <button type="button" className="text-xs text-slate-600 dark:text-neutral-300 hover:underline inline-flex items-center gap-1" onClick={openTokenHelp} title="Open Canvas token settings">
                      <ExternalLink className="w-3 h-3" /> How to get a token
                    </button>
                  </div>
                  <div className="relative">
                    <input className="w-full rounded-control border pl-3 pr-9 py-2 bg-white/90 dark:bg-neutral-900" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token (stored securely)" type={showToken ? 'text' : 'password'} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={toggleShow} aria-label={showToken ? 'Hide token' : 'Show token'}>
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
                <div className="text-xs text-slate-600 dark:text-neutral-300">We store your token securely with the system keychain when available.</div>
                <div className="pt-1 flex items-center justify-end">
                  <button className="px-4 py-2 rounded-control bg-slate-900 text-white disabled:opacity-50 hover:opacity-95" onClick={init} disabled={loading || !token.trim()}>{loading ? 'Connecting…' : 'Connect'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
            onReorder={async (nextOrder) => { const next: SidebarConfig = { ...sidebarCfg, order: nextOrder }; setSidebarCfg(next); await saveUserSidebar(next) }}
          />
          <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-tl-lg">
            <div className={`flex-1 p-6 ${currentView === 'course' ? 'pt-24' : ''}`}>
              <div className="max-w-6xl w-full mx-auto space-y-4">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppProvider>
  )
}
