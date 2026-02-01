import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/Toaster'
import {
  type AppFlagsValue,
  type AppSettingsValue,
  type AppActionsValue,
  type AppDataValue,
  type AppDataActionsValue,
} from '../../context/AppContext'
import { useCourses, useDueAssignments, useProfile } from '../../hooks/useCanvasQueries'
import { useWindowControlsOverlayInsets } from '../../hooks/useWindowControlsOverlayInsets'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import { useRenderTrace } from '../../hooks/useRenderTrace'
import type { SidebarConfig } from '../../components/Sidebar'
import { useRootLayoutNavigation } from './useRootLayoutNavigation'
import { useRootLayoutTheme } from './useRootLayoutTheme'
import { useRootLayoutBootstrap } from './useRootLayoutBootstrap'
import { useRootLayoutUserSettings } from './useRootLayoutUserSettings'

export function useRootLayoutState() {
  useWindowControlsOverlayInsets()

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { add: addToast } = useToast()

  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://gatech.instructure.com')
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [prefetchEnabled, setPrefetchEnabledState] = useState(true)
  const [pdfGestureZoomEnabled, setPdfGestureZoomEnabledState] = useState(true)
  const [embeddingsEnabled, setEmbeddingsEnabledState] = useState(true)
  const [aiEnabled, setAiEnabledState] = useState(false)
  const [verbose, setVerboseState] = useState(false)
  const [cachedCourses, setCachedCourses] = useState<any[] | null>(null)
  const [cachedDue, setCachedDue] = useState<any[] | null>(null)
  const [activeCourseId, setActiveCourseIdState] = useState<string | number | null>(null)
  const [sidebarCfg, setSidebarCfg] = useState<SidebarConfig>({
    hiddenCourseIds: [],
    customNames: {},
    order: [],
  })
  const [courseImages, setCourseImagesState] = useState<Record<string, string>>({})
  const [searchOpen, setSearchOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { themeSettings, setThemeSettings } = useRootLayoutTheme()

  const { pinnedItems, setPinnedItems } = useDashboardSettings()

  // Embed windows ("Open in New Window") should not trigger global app fetches.
  const embedBoot = useMemo(() => {
    if (typeof window === 'undefined') return false
    const h = String(window.location.hash || '')
    return h.startsWith('#/content') && h.includes('embed=1')
  }, [])

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Listen for native menu actions (Settings...)
  useEffect(() => {
    if (!window.electron?.onMenuAction) return

    const cleanup = window.electron.onMenuAction((action) => {
      if (action === 'settings') {
        setSettingsOpen(true)
      }
    })
    return cleanup
  }, [navigate])

  // Queries
  const profileQ = useProfile({ enabled: hasToken === true && !embedBoot })
  const coursesQ = useCourses(
    { enrollment_state: 'active' },
    { enabled: hasToken === true && !embedBoot },
  )
  const dueQ = useDueAssignments(
    { days: 365, onlyPublished: true, includeCourseName: true },
    { enabled: hasToken === true && !embedBoot },
  )

  const userKey = useMemo(() => {
    const uid = (profileQ.data as any)?.id
    return hasToken && uid ? `${baseUrl}|${uid}` : null
  }, [hasToken, baseUrl, profileQ.data])

  useRenderTrace('RootLayout', {
    hasToken,
    loading,
    theme: themeSettings.theme,
    backgroundType: themeSettings.background.type,
    searchOpen,
    inboxOpen,
    settingsOpen,
    profileLoading: profileQ.isLoading,
    coursesLoading: coursesQ.isLoading,
    dueLoading: dueQ.isLoading,
    coursesCount: coursesQ.data?.length ?? 0,
    dueCount: dueQ.data?.length ?? 0,
    sidebarHidden: sidebarCfg.hiddenCourseIds?.length ?? 0,
    sidebarOrder: sidebarCfg.order?.length ?? 0,
  })


  useRootLayoutBootstrap({
    baseUrl,
    verbose,
    embedBoot,
    queryClient,
    setBaseUrl,
    setThemeSettings,
    setSidebarCfg,
    setCourseImagesState,
    setPrefetchEnabledState,
    setPdfGestureZoomEnabledState,
    setEmbeddingsEnabledState,
    setAiEnabledState,
    setVerboseState,
    setCachedCourses,
    setCachedDue,
    setHasToken,
    setLoading,
  })

  useRootLayoutUserSettings({
    userKey,
    setSidebarCfg,
    setPrefetchEnabledState,
    setPdfGestureZoomEnabledState,
  })

  // Toast errors
  useEffect(() => {
    if (profileQ.error)
      addToast({
        title: 'Failed to load profile',
        description: String(profileQ.error.message),
        variant: 'destructive',
      })
  }, [profileQ.error, addToast])
  useEffect(() => {
    if (coursesQ.error)
      addToast({
        title: 'Failed to load courses',
        description: String(coursesQ.error.message),
        variant: 'destructive',
      })
  }, [coursesQ.error, addToast])
  useEffect(() => {
    if (dueQ.error)
      addToast({
        title: 'Failed to load assignments',
        description: String(dueQ.error.message),
        variant: 'destructive',
      })
  }, [dueQ.error, addToast])

  // Local memory snapshots for initial paint + persistence
  useEffect(() => {
    if (Array.isArray(coursesQ.data) && coursesQ.data.length) {
      setCachedCourses(coursesQ.data)
      window.settings.set({ cachedCourses: coursesQ.data }).catch(() => {})
    }
  }, [coursesQ.data])

  useEffect(() => {
    if (Array.isArray(dueQ.data)) {
      setCachedDue(dueQ.data)
      window.settings.set({ cachedDue: dueQ.data }).catch(() => {})
    }
  }, [dueQ.data])

  const saveUserSidebar = useCallback(
    async (next: SidebarConfig) => {
      try {
        const cfg = await window.settings.get?.()
        const map = (cfg?.ok ? (cfg.data as any)?.userSidebars : undefined) || {}
        if (userKey) map[userKey] = next
        await window.settings.set?.(userKey ? { userSidebars: map } : { sidebar: next })
      } catch {}
    },
    [userKey],
  )

  const saveUserSettings = useCallback(
    async (partial: Record<string, any>) => {
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
    },
    [userKey],
  )

  const setPrefetchEnabledPersisted = useCallback(
    async (v: boolean) => {
      setPrefetchEnabledState(v)
      await saveUserSettings({ prefetchEnabled: v })
    },
    [saveUserSettings],
  )

  const setVerbosePersisted = useCallback(
    async (v: boolean) => {
      setVerboseState(v)
      try {
        await window.settings.set?.({ verbose: v })
      } catch {}
      try {
        await window.canvas.init({ baseUrl, verbose: v })
      } catch {}
    },
    [baseUrl],
  )

  const setPdfGestureZoomEnabledPersisted = useCallback(
    async (v: boolean) => {
      setPdfGestureZoomEnabledState(v)
      await saveUserSettings({ pdfGestureZoomEnabled: v })
    },
    [saveUserSettings],
  )

  const setEmbeddingsEnabledPersisted = useCallback(async (v: boolean) => {
    setEmbeddingsEnabledState(v)

    if (!v) {
      setAiEnabledState(false)
      try {
        await window.settings.set?.({ embeddingsEnabled: false, aiEnabled: false })
      } catch {}
      await saveUserSettings({ embeddingsEnabled: false, aiEnabled: false })
      return
    }

    try {
      await window.settings.set?.({ embeddingsEnabled: true })
    } catch {}
    await saveUserSettings({ embeddingsEnabled: true })
  }, [saveUserSettings])

  const setAiEnabledPersisted = useCallback(async (v: boolean) => {
    setAiEnabledState(v)
    try {
      await window.settings.set?.({ aiEnabled: v })
    } catch {}
    await saveUserSettings({ aiEnabled: v })
  }, [saveUserSettings])

  const onOpenSettings = useCallback(() => setSettingsOpen(true), [])

  const setCourseImages = useCallback(async (map: Record<string, string>) => {
    setCourseImagesState(map)
    try {
      const cfg = await window.settings.get?.()
      const data = (cfg?.ok ? (cfg.data as any) : {}) as any
      const url = data?.baseUrl || baseUrl
      const next = { ...(data.courseImages || {}), [url]: map }
      await window.settings.set?.({ courseImages: next })
    } catch {}
  }, [baseUrl])

  const onOpenCourse = useCallback(
    (id: string | number) => {
      setActiveCourseIdState(id)
      navigate({ to: '/course/$courseId', params: { courseId: String(id) } })
    },
    [navigate],
  )

  const onOpenAssignment = useCallback(
    (courseId: string | number, restId: string | number, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'assignments', type: 'assignment', contentId: String(restId), title },
      })
    },
    [navigate],
  )

  const onOpenAnnouncement = useCallback(
    (courseId: string | number, topicId: string | number, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'announcements', type: 'announcement', contentId: String(topicId), title },
      })
    },
    [navigate],
  )

  const onOpenDiscussion = useCallback(
    (courseId: string | number, topicId: string | number, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'discussions', type: 'discussion', contentId: String(topicId), title },
      })
    },
    [navigate],
  )

  const onOpenPage = useCallback(
    (courseId: string | number, pageUrlOrSlug: string, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'home', type: 'page', contentId: String(pageUrlOrSlug), title },
      })
    },
    [navigate],
  )

  const onOpenFile = useCallback(
    (courseId: string | number, fileId: string | number, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'files', type: 'file', contentId: String(fileId), title },
      })
    },
    [navigate],
  )

  const onOpenModules = useCallback(
    (courseId: string | number) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'modules' },
      })
    },
    [navigate],
  )

  const onSignOut = useCallback(async () => {
    try {
      await window.canvas.clearToken?.(baseUrl)
    } catch {}
    try {
      await window.settings.set?.({ cachedCourses: [], cachedDue: [], queryCache: undefined })
    } catch {}
    try {
      queryClient.clear()
    } catch {}
    setCachedCourses([])
    setCachedDue([])
    setHasToken(false)
    setPdfGestureZoomEnabledState(true)
    navigate({ to: '/dashboard' })
  }, [baseUrl, queryClient, navigate])

  type PinnedItemType = {
    id: string
    type: 'course' | 'assignment' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
    title: string
    subtitle?: string
    url?: string
    courseId?: string | number
    contentId?: string | number
  }

  const pinnedItemsRef = useRef(pinnedItems)
  pinnedItemsRef.current = pinnedItems

  const pinItem = useCallback(
    (item: PinnedItemType) => {
      const current = pinnedItemsRef.current
      if (current.some((i) => i.id === item.id)) return
      setPinnedItems([...current, item])
    },
    [setPinnedItems],
  )

  const unpinItem = useCallback(
    (id: string) => {
      setPinnedItems(pinnedItemsRef.current.filter((i) => i.id !== id))
    },
    [setPinnedItems],
  )

  // Memoize derived data
  const courses = useMemo(
    () => (embedBoot ? [] : coursesQ.data || cachedCourses || []),
    [embedBoot, coursesQ.data, cachedCourses],
  )

  const due = useMemo(() => {
    if (embedBoot) return []
    const list = dueQ.data || cachedDue || []
    const now = Date.now()
    const horizon = now + 7 * 24 * 60 * 60 * 1000
    return (Array.isArray(list) ? list : []).filter((it: any) => {
      const raw = it?.dueAt
      if (!raw) return true
      const t = Date.parse(String(raw))
      if (!Number.isFinite(t)) return true
      return t <= horizon
    })
  }, [embedBoot, dueQ.data, cachedDue])

  const profile = useMemo(() => (embedBoot ? null : profileQ.data), [embedBoot, profileQ.data])

  const isLoading = useMemo(
    () =>
      embedBoot
        ? loading
        : loading ||
          profileQ.isLoading ||
          (coursesQ.isLoading && !(cachedCourses && cachedCourses.length)) ||
          (dueQ.isLoading && !(cachedDue && cachedDue.length)),
    [
      embedBoot,
      loading,
      profileQ.isLoading,
      coursesQ.isLoading,
      cachedCourses,
      dueQ.isLoading,
      cachedDue,
    ],
  )

  const flagsContext: AppFlagsValue = useMemo(
    () => ({
      aiEnabled,
      embeddingsEnabled,
      prefetchEnabled,
      pdfGestureZoomEnabled,
      verbose,
    }),
    [aiEnabled, embeddingsEnabled, prefetchEnabled, pdfGestureZoomEnabled, verbose],
  )

  const settingsContext: AppSettingsValue = useMemo(
    () => ({
      setPrefetchEnabled: setPrefetchEnabledPersisted,
      setPdfGestureZoomEnabled: setPdfGestureZoomEnabledPersisted,
      setEmbeddingsEnabled: setEmbeddingsEnabledPersisted,
      setAiEnabled: setAiEnabledPersisted,
      setVerbose: setVerbosePersisted,
    }),
    [
      setPrefetchEnabledPersisted,
      setPdfGestureZoomEnabledPersisted,
      setEmbeddingsEnabledPersisted,
      setAiEnabledPersisted,
      setVerbosePersisted,
    ],
  )

  const actionsContext: AppActionsValue = useMemo(
    () => ({
      onOpenCourse,
      onOpenAssignment,
      onOpenAnnouncement,
      onOpenDiscussion,
      onOpenPage,
      onOpenFile,
      onOpenModules,
      onSignOut,
      onOpenSettings,
      pinItem,
      unpinItem,
    }),
    [
      onOpenCourse,
      onOpenAssignment,
      onOpenAnnouncement,
      onOpenDiscussion,
      onOpenPage,
      onOpenFile,
      onOpenModules,
      onSignOut,
      onOpenSettings,
      pinItem,
      unpinItem,
    ],
  )

  const dataContext: AppDataValue = useMemo(
    () => ({
      baseUrl,
      courses,
      due,
      profile,
      loading: isLoading,
      sidebar: sidebarCfg,
      courseImages,
      pinnedItems,
    }),
    [baseUrl, courses, due, profile, isLoading, sidebarCfg, courseImages, pinnedItems],
  )

  const visibleCourses = useMemo(() => {
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    const list = (courses as any[]).filter((c: any) => !hidden.has(c.id))
    const order = sidebarCfg.order || []
    const orderMap = new Map(order.map((id, i) => [String(id), i]))
    list.sort(
      (a: any, b: any) => (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0),
    )
    return list
  }, [courses, sidebarCfg.hiddenCourseIds, sidebarCfg.order])

  const hideCourse = async (courseId: string | number) => {
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    hidden.add(String(courseId))
    const next = { ...sidebarCfg, hiddenCourseIds: Array.from(hidden) }
    setSidebarCfg(next)
    await saveUserSidebar(next)
  }

  const onSidebarConfigChange = useCallback(
    async (next: SidebarConfig) => {
      setSidebarCfg(next)
      await saveUserSidebar(next)
    },
    [saveUserSidebar],
  )

  const dataActionsContext: AppDataActionsValue = useMemo(
    () => ({
      setSidebar: onSidebarConfigChange,
      setCourseImages: setCourseImages,
    }),
    [onSidebarConfigChange, setCourseImages],
  )

  const {
    currentView,
    derivedCourseId,
    isEmbeddedContent,
    handlePrefetchNav,
    prefetchCourseData,
  } = useRootLayoutNavigation({
    coursesData: coursesQ.data,
    sidebarCfg,
    activeCourseId,
    prefetchEnabled,
    hasToken,
    queryClient,
  })

  // Embedding cleanup when a course is unpinned
  const prevHiddenRef = useRef<Set<string | number>>(new Set())
  useEffect(() => {
    const prevHidden = prevHiddenRef.current
    const currHidden = new Set(sidebarCfg.hiddenCourseIds || [])

    for (const courseId of currHidden) {
      if (!prevHidden.has(courseId)) {
        window.embedding
          ?.pruneCourse?.(String(courseId))
          .then(() => {})
          .catch(() => {})
      }
    }
    prevHiddenRef.current = currHidden
  }, [sidebarCfg.hiddenCourseIds])

  const init = async () => {
    setLoading(true)
    const res = await window.canvas.init({ token: token.trim() || undefined, baseUrl, verbose })
    if (res.ok) {
      setHasToken(true)
      await window.settings.set({ baseUrl })
      queryClient.invalidateQueries()
      addToast({ title: 'Connected to Canvas', variant: 'success' })
      setToken('')
      if (res.insecure)
        addToast({
          title: 'Token stored insecurely (dev)',
          description: 'Keychain integration unavailable; using file storage under userData.',
        })
      navigate({ to: '/dashboard' })
    } else {
      setHasToken(false)
      addToast({
        title: 'Failed to save token',
        description: String(res.error || 'Unknown error'),
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const openTokenHelp = () => {
    try {
      if (baseUrl)
        window.system?.openExternal?.(`${baseUrl.replace(/\/?$/, '')}/profile/settings`)
    } catch {}
  }

  const aiCourses = embedBoot ? [] : coursesQ.data || cachedCourses || []
  const aiDueAssignments = embedBoot ? [] : dueQ.data || cachedDue || []

  return {
    hasToken,
    signIn: {
      baseUrl,
      token,
      showToken,
      loading,
      onBaseUrlChange: setBaseUrl,
      onBaseUrlBlur: () => {
        window.settings.set({ baseUrl }).catch(() => {})
      },
      onTokenChange: setToken,
      onToggleShow: () => setShowToken((v) => !v),
      onOpenTokenHelp: openTokenHelp,
      onConnect: init,
    },
    appShell: {
      embeddingsEnabled,
      aiEnabled,
      aiDueAssignments,
      aiCourses,
      flagsContext,
      settingsContext,
      actionsContext,
      dataContext,
      dataActionsContext,
      isEmbeddedContent,
      themeSettings,
      profile,
      searchOpen,
      settingsOpen,
      inboxOpen,
      onCloseSearch: () => setSearchOpen(false),
      onCloseSettings: () => setSettingsOpen(false),
      onCloseInbox: () => setInboxOpen(false),
      onOpenSearch: () => setSearchOpen(true),
      onOpenInbox: () => setInboxOpen(true),
      visibleCourses,
      currentView,
      derivedCourseId,
      activeCourseId,
      sidebarCfg,
      onSelectDashboard: () => setActiveCourseIdState(null),
      onSelectAnnouncements: () => setActiveCourseIdState(null),
      onSelectAssignments: () => setActiveCourseIdState(null),
      onSelectGrades: () => setActiveCourseIdState(null),
      onSelectDiscussions: () => setActiveCourseIdState(null),
      onSelectCourse: (id: string | number) => onOpenCourse(id),
      onOpenAllCourses: () => setActiveCourseIdState(null),
      onHideCourse: hideCourse,
      onPrefetchCourse: (id: string | number) => {
        if (prefetchEnabled)
          prefetchCourseData(id, {
            isActive: String(id) === String(derivedCourseId ?? activeCourseId ?? ''),
          })
      },
      onPrefetchNav: (tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions') => {
        if (prefetchEnabled) handlePrefetchNav(tab)
      },
      onReorder: async (nextOrder: Array<string | number>) => {
        const next: SidebarConfig = { ...sidebarCfg, order: nextOrder }
        setSidebarCfg(next)
        await saveUserSidebar(next)
      },
    },
  }
}
