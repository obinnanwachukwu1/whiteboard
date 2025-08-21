import { useEffect, useState } from 'react'
import { Card } from './components/ui/Card'
import { Button } from './components/ui/Button'
import { TextField } from './components/ui/TextField'
import { Header } from './components/Header'
import { Sidebar, type SidebarConfig } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { CourseView } from './components/CourseView'
import { useCourses, useDueAssignments, useProfile } from './hooks/useCanvasQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from './components/ui/Toaster'
import { AllCoursesManager } from './components/AllCoursesManager'
import { toAssignmentInputsFromRest, toAssignmentGroupInputsFromRest } from './utils/gradeCalc'

function App() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://gatech.instructure.com')
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'dashboard' | 'course' | 'allCourses'>('dashboard')
  const [prefetchEnabled, setPrefetchEnabled] = useState(true)
  // React Query data
  const profileQ = useProfile({ enabled: hasToken === true })
  const coursesQ = useCourses({ enrollment_state: 'active' }, { enabled: hasToken === true })
  const dueQ = useDueAssignments({ days: 7 }, { enabled: hasToken === true })
  const { add: addToast } = useToast()
  const [activeCourseId, setActiveCourseId] = useState<string | number | null>(null)
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>({ hiddenCourseIds: [], customNames: {}, order: [] })


  // Initial load: settings, attempt init with saved token, fetch profile/courses/due
  useEffect(() => {
    (async () => {
      const cfg = await window.settings.get()
      if (cfg.ok && cfg.data?.baseUrl) setBaseUrl(cfg.data.baseUrl)
      if (cfg.ok && cfg.data?.sidebar) setSidebarCfg(cfg.data.sidebar)
      if (cfg.ok && typeof cfg.data?.prefetchEnabled === 'boolean') setPrefetchEnabled(!!cfg.data.prefetchEnabled)

      setLoading(true)
      const res = await window.canvas.init({ baseUrl: cfg.data?.baseUrl || baseUrl })
      if (!res.ok) {
        setHasToken(false)
        setLoading(false)
        return
      }
      setHasToken(true)
      // Warm queries after successful background init
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['due-assignments'] })
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Surface top-level query errors as toasts
  useEffect(() => {
    if (profileQ.error) addToast({ title: 'Failed to load profile', description: String(profileQ.error.message), variant: 'destructive' })
  }, [profileQ.error, addToast])
  useEffect(() => {
    if (coursesQ.error) addToast({ title: 'Failed to load courses', description: String(coursesQ.error.message), variant: 'destructive' })
  }, [coursesQ.error, addToast])
  useEffect(() => {
    if (dueQ.error) addToast({ title: 'Failed to load assignments', description: String(dueQ.error.message), variant: 'destructive' })
  }, [dueQ.error, addToast])

  const init = async () => {
    setLoading(true)
    const res = await window.canvas.init({ token: token.trim() || undefined, baseUrl })
    if (res.ok) {
      setHasToken(true)
      await window.settings.set({ baseUrl })
      // Force refresh of cached data after token/baseUrl change
      queryClient.invalidateQueries()
      addToast({ title: 'Connected to Canvas', variant: 'success' })
      setToken('')
      if (res.insecure) {
        addToast({
          title: 'Token stored insecurely (dev)',
          description: 'Keychain integration unavailable; using file storage under userData.',
        })
      }
      setView('dashboard')
    } else {
      setHasToken(false)
      addToast({ title: 'Failed to save token', description: String(res.error || 'Unknown error'), variant: 'destructive' })
    }
    setLoading(false)
  }

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

  const prefetchCourseData = async (courseId: string | number) => {
    const id = String(courseId)
    // Prefetch assignments and modules using the same query keys as hooks
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['course-assignments', id, 200],
        queryFn: async () => {
          const res = await window.canvas.listCourseAssignments(id, 200)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: ['course-modules', id],
        queryFn: async () => {
          const res = await window.canvas.listCourseModulesGql(id, 20, 50)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load modules')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      }),
      // Gradebook (groups + assignments with submissions)
      queryClient.prefetchQuery({
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
      }),
      // Course tabs/links
      queryClient.prefetchQuery({
        queryKey: ['course-tabs', id, true],
        queryFn: async () => {
          const res = await window.canvas.listCourseTabs?.(id, true)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course tabs')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      }),
      // Announcements (non-blocking; UI loads paged per 10)
    ])
    // Prefetch course info and, if wiki, the front page
    try {
      await queryClient.prefetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => {
          const res = await window.canvas.getCourseInfo?.(id)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
          return res.data || null
        },
        staleTime: 1000 * 60 * 5,
      })
      const info = queryClient.getQueryData<any>(['course-info', id]) as any
      const defaultView = (info?.default_view || '').toLowerCase()
      if (defaultView === 'wiki') {
        await queryClient.prefetchQuery({
          queryKey: ['course-front-page', id],
          queryFn: async () => {
            const res = await window.canvas.getCourseFrontPage?.(id)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load front page')
            return res.data || null
          },
          staleTime: 1000 * 60 * 5,
        })
      }
      // Conditionally prefetch files if Files tab is visible
      const tabsRes = await window.canvas.listCourseTabs?.(id, true)
      if (tabsRes?.ok) {
        const tabs = tabsRes.data || []
        const hasFiles = !!(tabs as any[]).find((t: any) => {
          const idOrType = String(t?.id || t?.type || '').toLowerCase()
          const label = String(t?.label || '').toLowerCase()
          return (!t?.hidden) && (idOrType.includes('files') || label.includes('files'))
        })
        if (hasFiles) {
          await queryClient.prefetchQuery({
            queryKey: ['course-folders', id, 100],
            queryFn: async () => {
              const res = await window.canvas.listCourseFolders?.(id, 100)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load folders')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        }
      }
    } catch {}
  }

  // Background prefetch for all visible courses once courses load
  useEffect(() => {
    const cs = coursesQ.data || []
    if (!hasToken || cs.length === 0 || !prefetchEnabled) return
    const visible = cs.filter((c) => !(sidebarCfg.hiddenCourseIds || []).includes(c.id))
    // Batch prefetch to avoid flooding Canvas API
    const batchSize = 3
    const limit = 8
    const targets = visible.slice(0, limit)
    ;(async () => {
      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize)
        await Promise.all(batch.map((c) => prefetchCourseData(c.id)))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, prefetchEnabled, coursesQ.data, sidebarCfg.hiddenCourseIds])

  return (
  <div className="h-screen flex flex-col">
      <Header profile={profileQ.data} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          courses={coursesQ.data || []}
          activeCourseId={view === 'course' ? activeCourseId : null}
          sidebar={sidebarCfg}
          current={view}
          onSelectDashboard={() => { setView('dashboard'); setActiveCourseId(null) }}
          onSelectCourse={async (id) => {
            // Ensure data is ready before navigating to course view
            await prefetchCourseData(id)
            setActiveCourseId(id)
            setView('course')
          }}
          onOpenAllCourses={() => setView('allCourses')}
          onHideCourse={hideCourse}
          onPrefetchCourse={(id) => { if (prefetchEnabled) prefetchCourseData(id) }}
          prefetchEnabled={prefetchEnabled}
          onTogglePrefetch={async (enabled) => { setPrefetchEnabled(enabled); await window.settings.set({ prefetchEnabled: enabled }) }}
          onReorder={async (nextOrder) => {
            const next: SidebarConfig = { ...sidebarCfg, order: nextOrder }
            setSidebarCfg(next)
            await window.settings.set({ sidebar: next })
          }}
        />
    <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-tl-lg">
          <div className={`flex-1 p-6 ${view === 'course' ? 'pt-20' : ''}`}>
            <div className="max-w-6xl w-full mx-auto space-y-4">
            {hasToken === false && (
        <Card>
                <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Connect to Canvas</h2>
                <div className="grid gap-3 max-w-xl">
                  <TextField
                    label="Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    onBlur={async () => { await window.settings.set({ baseUrl }) }}
                    placeholder="https://..."
                  />
                  <TextField
                    label="Token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste token (stored securely)"
                  />
                  <div className="pt-1">
                    <Button onClick={init} disabled={loading || !token.trim()}>
                      {loading ? 'Saving…' : 'Save Token / Init'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div>
              {view === 'dashboard' && (
                <Dashboard due={dueQ.data || []} loading={loading || profileQ.isLoading || coursesQ.isLoading || dueQ.isLoading} />
              )}
              {view === 'course' && activeCourseId != null && (
                <>
                  <h1 className="mt-0 mb-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {(coursesQ.data || []).find((c) => c.id === activeCourseId)?.name || 'Course'}
                  </h1>
                  <CourseView
                    courseId={activeCourseId}
                    courseName={(coursesQ.data || []).find((c) => c.id === activeCourseId)?.name}
                  />
                </>
              )}
              {view === 'allCourses' && (
                <AllCoursesManager
                  courses={coursesQ.data || []}
                  sidebar={sidebarCfg}
                  onChange={onSidebarConfigChange}
                />
              )}
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
