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
import { enqueuePrefetch, requestIdle } from './utils/prefetchQueue'

function App() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://gatech.instructure.com')
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'dashboard' | 'course' | 'allCourses'>('dashboard')
  const [prefetchEnabled, setPrefetchEnabled] = useState(true)
  const [cachedCourses, setCachedCourses] = useState<any[] | null>(null)
  const [cachedDue, setCachedDue] = useState<any[] | null>(null)
  // React Query data
  const profileQ = useProfile({ enabled: hasToken === true })
  const coursesQ = useCourses({ enrollment_state: 'active' }, { enabled: hasToken === true })
  const dueQ = useDueAssignments({ days: 7 }, { enabled: hasToken === true })
  const { add: addToast } = useToast()
  const [activeCourseId, setActiveCourseId] = useState<string | number | null>(null)
  const [courseTab, setCourseTab] = useState<'home' | 'wiki' | 'syllabus' | 'announcements' | 'files' | 'modules' | 'links' | 'assignments' | 'grades' | null>(null)
  const [courseDetail, setCourseDetail] = useState<{ contentType: 'assignment' | 'announcement' | 'page' | 'file'; contentId: string; title: string } | null>(null)
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>({ hiddenCourseIds: [], customNames: {}, order: [] })


  // Initial load: settings, attempt init with saved token, fetch profile/courses/due
  useEffect(() => {
    (async () => {
      const cfg = await window.settings.get()
      if (cfg.ok && cfg.data?.baseUrl) setBaseUrl(cfg.data.baseUrl)
      if (cfg.ok && cfg.data?.sidebar) setSidebarCfg(cfg.data.sidebar)
      if (cfg.ok && typeof cfg.data?.prefetchEnabled === 'boolean') setPrefetchEnabled(!!cfg.data.prefetchEnabled)
      if (cfg.ok && Array.isArray(cfg.data?.cachedCourses)) {
        setCachedCourses(cfg.data.cachedCourses || [])
        // seed query cache so UI can use cached data immediately
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
  // Persist latest successful courses to settings for startup cache
  useEffect(() => {
    if (Array.isArray(coursesQ.data) && coursesQ.data.length) {
      setCachedCourses(coursesQ.data)
      window.settings.set({ cachedCourses: coursesQ.data }).catch(() => {})
    }
  }, [coursesQ.data])
  useEffect(() => {
    if (dueQ.error) addToast({ title: 'Failed to load assignments', description: String(dueQ.error.message), variant: 'destructive' })
  }, [dueQ.error, addToast])
  // Persist latest "Coming Up" to settings for startup cache
  useEffect(() => {
    if (Array.isArray(dueQ.data)) {
      setCachedDue(dueQ.data)
      window.settings.set({ cachedDue: dueQ.data }).catch(() => {})
    }
  }, [dueQ.data])

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

  const prefetchCourseData = (courseId: string | number) => {
    const id = String(courseId)
    // High-priority prefetch (do not block navigation)
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
    // Medium priority after paint
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
      // Course info / front page and folders after idle
      enqueuePrefetch(async () => {
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
      })
      enqueuePrefetch(async () => {
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
      })
    })
  }

  // Focused prefetch for landing experience: fetch course-info first,
  // then prefetch only the default tab's data to keep navigation snappy.
  const prefetchCourseLanding = async (courseId: string | number) => {
    const id = String(courseId)
    try {
      const infoPromise = queryClient.fetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => {
          const res = await window.canvas.getCourseInfo?.(id)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
          return res.data || null
        },
        staleTime: 1000 * 60 * 5,
      })
      // Pre-warm course tabs immediately (not idle) so Links/Files visibility resolves fast
      const tabsPromise = queryClient.fetchQuery({
        queryKey: ['course-tabs', id, true],
        queryFn: async () => {
          const res = await window.canvas.listCourseTabs?.(id, true)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course tabs')
          return res.data || []
        },
        staleTime: 1000 * 60 * 5,
      })

      const [info, tabs] = await Promise.all([infoPromise, tabsPromise])
      const defaultView = String((info as any)?.default_view || '').toLowerCase()
      // If user didn't deep-link and we're still viewing this course, adopt API default tab
      const map: Record<string, any> = { wiki: 'home', modules: 'modules', assignments: 'assignments', syllabus: 'syllabus', feed: 'announcements' }
      const preferred = (map[defaultView] as any) || 'announcements'
      if (!courseDetail) {
        // Only upgrade from null or fallback to the API default
        if (courseTab == null || (courseTab === 'announcements' && preferred !== 'announcements')) {
          setCourseTab(preferred)
        }
      }

      // Seed resolved tabs cache using available data to avoid fallback on revisit
      try {
        const hasSyllabus = typeof (info as any)?.syllabus_body === 'string' && String((info as any)?.syllabus_body).trim() !== ''
        const hasHome = defaultView === 'wiki'
        const hasFilesFromTabs = Array.isArray(tabs) && (tabs as any[]).some((t: any) => {
          const idOrType = String(t?.id || t?.type || '').toLowerCase()
          const label = String(t?.label || '').toLowerCase()
          return (!t?.hidden) && (idOrType.includes('files') || label.includes('files'))
        })
        const hasLinks = Array.isArray(tabs) && (tabs as any[]).length > 0
        const nextTabs: any[] = [
          ...(hasHome ? [{ key: 'home', label: 'Home', Icon: undefined }] as any[] : []),
          ...(hasSyllabus ? [{ key: 'syllabus', label: 'Syllabus', Icon: undefined }] as any[] : []),
          { key: 'announcements', label: 'Announcements', Icon: undefined },
          ...(hasFilesFromTabs ? [{ key: 'files', label: 'Files', Icon: undefined }] as any[] : []),
          { key: 'modules', label: 'Modules', Icon: undefined },
          ...(hasLinks ? [{ key: 'links', label: 'Links', Icon: undefined }] as any[] : []),
          { key: 'assignments', label: 'Assignments', Icon: undefined },
          { key: 'grades', label: 'Grades', Icon: undefined },
        ]
        queryClient.setQueryData(['course-resolved-tabs', id], nextTabs)
      } catch {}
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
      } else if (defaultView === 'modules') {
        await queryClient.prefetchQuery({
          queryKey: ['course-modules', id],
          queryFn: async () => {
            const res = await window.canvas.listCourseModulesGql(id, 20, 50)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load modules')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
      } else if (defaultView === 'assignments') {
        await queryClient.prefetchQuery({
          queryKey: ['course-assignments', id, 200],
          queryFn: async () => {
            const res = await window.canvas.listCourseAssignments(id, 200)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
      } else if (defaultView === 'feed') {
        // Announcements default; CourseAnnouncements uses infinite query which is heavier to pre-warm.
        // We skip prefetch here and let the tab load quickly on mount.
      }
      // tabsPromise already awaited above
    } catch {}
    // Continue warming in background (gradebook, etc.) if desired via prefetchCourseData
  }

  // Ensure fresh data on course switch by invalidating cached queries, then prefetch in background
  const refreshCourseData = (courseId: string | number) => {
    const id = String(courseId)
    // Invalidate only course-info so default view and syllabus refresh; per-tab queries load on demand
    queryClient.invalidateQueries({ queryKey: ['course-info', id] }).catch(() => {})
    // Warm landing content quickly without over-fetching
    prefetchCourseLanding(courseId)
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
          courses={coursesQ.data || cachedCourses || []}
          activeCourseId={view === 'course' ? activeCourseId : null}
          sidebar={sidebarCfg}
          current={view}
          onSelectDashboard={() => { setView('dashboard'); setActiveCourseId(null); setCourseDetail(null); setCourseTab(null) }}
          onSelectCourse={(id) => {
            // Navigate immediately; prefetch runs in background
            setActiveCourseId(id)
            setCourseDetail(null)
            const info = queryClient.getQueryData<any>(['course-info', String(id)]) as any
            const dv = String(info?.default_view || '').toLowerCase()
            const map: Record<string, any> = { wiki: 'home', modules: 'modules', assignments: 'assignments', syllabus: 'syllabus', feed: 'announcements' }
            setCourseTab((map[dv] as any) || 'announcements')
            setView('course')
            refreshCourseData(id)
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
                <Dashboard
                  due={(dueQ.data || cachedDue || [])}
                  loading={
                    loading ||
                    profileQ.isLoading ||
                    (coursesQ.isLoading && !(cachedCourses && cachedCourses.length)) ||
                    (dueQ.isLoading && !(cachedDue && cachedDue.length))
                  }
                  courses={(coursesQ.data || cachedCourses || [])}
                  sidebar={sidebarCfg}
                  onOpenCourse={(id) => { setActiveCourseId(id); setCourseDetail(null); const info = queryClient.getQueryData<any>(['course-info', String(id)]) as any; const dv = String(info?.default_view || '').toLowerCase(); const map: Record<string, any> = { wiki: 'home', modules: 'modules', assignments: 'assignments', syllabus: 'syllabus', feed: 'announcements' }; setCourseTab((map[dv] as any) || 'announcements'); setView('course'); refreshCourseData(id) }}
                  onOpenAssignment={(courseId, assignmentRestId, title) => {
                    setActiveCourseId(courseId)
                    setCourseDetail({ contentType: 'assignment', contentId: assignmentRestId, title })
                    setCourseTab('assignments')
                    setView('course')
                    refreshCourseData(courseId)
                  }}
                  onOpenAnnouncement={(courseId, topicId, title) => {
                    setActiveCourseId(courseId)
                    setCourseDetail({ contentType: 'announcement', contentId: topicId, title })
                    setCourseTab('announcements')
                    setView('course')
                    refreshCourseData(courseId)
                  }}
                />
              )}
              {view === 'course' && activeCourseId != null && (
                <>
                  <h1 className="mt-0 mb-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {(coursesQ.data || []).find((c) => c.id === activeCourseId)?.name || 'Course'}
                  </h1>
                  <CourseView
                    key={String(activeCourseId)}
                    courseId={activeCourseId}
                    courseName={(coursesQ.data || []).find((c) => c.id === activeCourseId)?.name}
                    activeTab={(courseTab as any) || 'announcements'}
                    onChangeTab={(t) => setCourseTab(t)}
                    content={courseDetail}
                    onOpenDetail={(d) => { setCourseDetail(d); const tabFor: any = d.contentType === 'assignment' ? 'assignments' : d.contentType === 'announcement' ? 'announcements' : d.contentType === 'page' ? 'home' : 'files'; setCourseTab(tabFor) }}
                    onClearDetail={() => setCourseDetail(null)}
                    baseUrl={baseUrl}
                    onNavigateCourse={(cid, init) => {
                      if (!cid) return
                      setActiveCourseId(cid)
                      if (init) {
                        if (init.type === 'assignment') { setCourseDetail({ contentType: 'assignment', contentId: init.id, title: init.title || 'Assignment' }); setCourseTab('assignments') }
                        if (init.type === 'announcement') { setCourseDetail({ contentType: 'announcement', contentId: init.id, title: init.title || 'Announcement' }); setCourseTab('announcements') }
                        if (init.type === 'page') { setCourseDetail({ contentType: 'page', contentId: init.id, title: init.title || 'Page' }); setCourseTab('home') }
                        if (init.type === 'file') { setCourseDetail({ contentType: 'file', contentId: init.id, title: init.title || 'File' }); setCourseTab('files') }
                      } else {
                        setCourseDetail(null)
                      }
                      setView('course')
                      refreshCourseData(cid)
                    }}
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
