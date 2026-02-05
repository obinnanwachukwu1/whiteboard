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
  type AppPreferencesValue,
  type AIAvailability,
  type NotificationSettings,
  type GpaSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_GPA_SETTINGS,
  DEFAULT_GPA_MAPPING,
} from '../../context/AppContext'
import { useCourses, useDueAssignments, useProfile } from '../../hooks/useCanvasQueries'
import { useWindowControlsOverlayInsets } from '../../hooks/useWindowControlsOverlayInsets'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import type { SidebarConfig } from '../../components/Sidebar'
import { useRootLayoutNavigation } from './useRootLayoutNavigation'
import { useRootLayoutTheme } from './useRootLayoutTheme'
import { useRootLayoutBootstrap } from './useRootLayoutBootstrap'
import { useRootLayoutUserSettings } from './useRootLayoutUserSettings'
import { setEncryptionEnabledFlag } from '../../utils/secureStorage'

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
  const [reduceEffectsEnabled, setReduceEffectsEnabledState] = useState(false)
  const [externalEmbedsEnabled, setExternalEmbedsEnabledState] = useState(false)
  const [externalMediaEnabled, setExternalMediaEnabledState] = useState(false)
  const [pdfGestureZoomEnabled, setPdfGestureZoomEnabledState] = useState(true)
  const [embeddingsEnabled, setEmbeddingsEnabledState] = useState(true)
  const [aiEnabled, setAiEnabledState] = useState(false)
  const [aiAvailability, setAiAvailability] = useState<AIAvailability | null>(null)
  const [privateModeEnabled, setPrivateModeEnabledState] = useState(false)
  const [privateModeAcknowledged, setPrivateModeAcknowledgedState] = useState(false)
  const [encryptionEnabled, setEncryptionEnabledState] = useState(false)
  const [verbose, setVerboseState] = useState(false)
  const [cachedCourses, setCachedCourses] = useState<any[] | null>(null)
  const [cachedDue, setCachedDue] = useState<any[] | null>(null)
  const [activeCourseId, setActiveCourseIdState] = useState<string | number | null>(null)
  const [userSettingsHydrated, setUserSettingsHydrated] = useState(false)
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
  const [notificationSettings, setNotificationSettingsState] = useState<NotificationSettings>(() => ({
    ...DEFAULT_NOTIFICATION_SETTINGS,
  }))
  const [gpaSettings, setGpaSettingsState] = useState<GpaSettings>(() => ({
    priorTotals: { ...DEFAULT_GPA_SETTINGS.priorTotals },
    mapping: DEFAULT_GPA_MAPPING.map((row) => ({ ...row })),
  }))

  const { pinnedItems, setPinnedItems } = useDashboardSettings()

  // Embed windows ("Open in New Window") should not trigger global app fetches.
  const embedBoot = useMemo(() => {
    if (typeof window === 'undefined') return false
    const h = String(window.location.hash || '')
    return h.startsWith('#/content') && h.includes('embed=1')
  }, [])

  const onOpenSearch = useCallback(() => {
    if (privateModeEnabled) return
    setSearchOpen(true)
  }, [privateModeEnabled])
  const onToggleSearch = useCallback(() => {
    if (privateModeEnabled) return
    setSearchOpen((prev) => !prev)
  }, [privateModeEnabled])

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (privateModeEnabled) return
        e.preventDefault()
        onToggleSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onToggleSearch, privateModeEnabled])

  useEffect(() => {
    if (privateModeEnabled && searchOpen) setSearchOpen(false)
  }, [privateModeEnabled, searchOpen])

  useEffect(() => {
    try {
      if (privateModeEnabled) localStorage.setItem('wb-private-mode', '1')
      else localStorage.removeItem('wb-private-mode')
    } catch {}
  }, [privateModeEnabled])

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

  useEffect(() => {
    setUserSettingsHydrated(false)
  }, [userKey])

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
    setReduceEffectsEnabledState,
    setExternalEmbedsEnabledState,
    setExternalMediaEnabledState,
    setPdfGestureZoomEnabledState,
    setEmbeddingsEnabledState,
    setAiEnabledState,
    setPrivateModeEnabledState,
    setPrivateModeAcknowledgedState,
    setEncryptionEnabledState,
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
    setReduceEffectsEnabledState,
    setExternalEmbedsEnabledState,
    setExternalMediaEnabledState,
    setPdfGestureZoomEnabledState,
    setPrivateModeEnabledState,
    setPrivateModeAcknowledgedState,
    onHydrated: () => setUserSettingsHydrated(true),
  })

  useEffect(() => {
    let mounted = true
    const isMac = window.platform?.isMac ?? false
    if (!isMac) {
      setAiAvailability({ status: 'unsupported', detail: 'non-mac' })
      return () => {
        mounted = false
      }
    }
    if (!window.ai?.getAvailability) {
      setAiAvailability({ status: 'unsupported', detail: 'missing_api' })
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      try {
        const res = await window.ai.getAvailability({ force: true })
        if (!mounted) return
        if (res.ok && res.data) {
          setAiAvailability(res.data)
        } else {
          setAiAvailability({ status: 'error', detail: String(res.error || 'unknown') })
        }
      } catch (e: any) {
        if (!mounted) return
        setAiAvailability({ status: 'error', detail: String(e?.message || e) })
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const notif = data.userSettings?.notifications || {}
        if (!mounted) return
        setNotificationSettingsState({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...notif,
        })
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const per = userKey ? data.userSettings?.[userKey] || {} : {}
        const gpa = (per?.gpa || data.gpa || {}) as any
        if (!mounted) return

        const priorTotals = gpa.priorTotals
          ? {
              credits: String(gpa.priorTotals.credits ?? ''),
              gpa: String(gpa.priorTotals.gpa ?? ''),
            }
          : { ...DEFAULT_GPA_SETTINGS.priorTotals }

        const mapping = Array.isArray(gpa.mapping) && gpa.mapping.length
          ? gpa.mapping
              .map((row: any) => ({ min: Number(row.min ?? 0), gpa: Number(row.gpa ?? 0) }))
              .filter((row: any) => Number.isFinite(row.min) && Number.isFinite(row.gpa))
              .sort((a: any, b: any) => b.min - a.min)
          : DEFAULT_GPA_MAPPING.map((row) => ({ ...row }))

        setGpaSettingsState({ priorTotals, mapping })
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [userKey])

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
    if (privateModeEnabled) return
    if (Array.isArray(coursesQ.data) && coursesQ.data.length) {
      setCachedCourses(coursesQ.data)
      window.settings.set({ cachedCourses: coursesQ.data }).catch(() => {})
    }
  }, [coursesQ.data, privateModeEnabled])

  useEffect(() => {
    if (privateModeEnabled) return
    if (Array.isArray(dueQ.data)) {
      setCachedDue(dueQ.data)
      window.settings.set({ cachedDue: dueQ.data }).catch(() => {})
    }
  }, [dueQ.data, privateModeEnabled])

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

  const setNotificationSettings = useCallback(
    async (partial: Partial<NotificationSettings>) => {
      setNotificationSettingsState((prev) => ({ ...prev, ...partial }))
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const currentAll = data.userSettings || {}
        const currentNotif = currentAll.notifications || {}
        const next = { ...DEFAULT_NOTIFICATION_SETTINGS, ...currentNotif, ...partial }
        await window.settings.set?.({
          userSettings: {
            ...currentAll,
            notifications: next,
          },
        })
      } catch {}
    },
    [],
  )

  const setGpaSettings = useCallback(
    async (partial: Partial<GpaSettings>) => {
      setGpaSettingsState((prev) => ({
        priorTotals: partial.priorTotals ?? prev.priorTotals,
        mapping: partial.mapping ?? prev.mapping,
      }))
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const map = (data.userSettings || {}) as Record<string, any>
        if (userKey) {
          const cur = map[userKey] || {}
          const nextGpa = { ...(cur.gpa || {}), ...partial }
          map[userKey] = { ...cur, gpa: nextGpa }
          await window.settings.set?.({ userSettings: map })
        } else {
          const nextGpa = { ...(data.gpa || {}), ...partial }
          await window.settings.set?.({ gpa: nextGpa } as any)
        }
      } catch {}
    },
    [userKey],
  )

  const clearLocalCaches = useCallback(async () => {
    try {
      await window.embedding?.clear?.()
    } catch {}

    try {
      await window.system?.clearTempCache?.()
    } catch {}

    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) keys.push(k)
      }
      for (const k of keys) {
        if (
          k === 'kanbanStatusByAssignment' ||
          k === 'whiteboard:read-announcements' ||
          k === 'whiteboard:dashboard-settings' ||
          k === 'whiteboard_tab_usage' ||
          k === 'wb-theme-cache-v1' ||
          k === 'app-theme' ||
          k.startsWith('whiteboard-draft-')
        ) {
          localStorage.removeItem(k)
        }
      }
    } catch {}

    try {
      await window.settings.set?.({
        queryCache: undefined,
        cachedCourses: undefined,
        cachedDue: undefined,
        courseImages: undefined,
      })
    } catch {}

    try {
      queryClient.clear()
    } catch {}

    setCachedCourses([])
    setCachedDue([])
    setCourseImagesState({})
  }, [queryClient, setCachedCourses, setCachedDue, setCourseImagesState])

  const clearedForPrivateModeRef = useRef(false)
  useEffect(() => {
    if (!userSettingsHydrated) return
    if (privateModeEnabled) {
      if (clearedForPrivateModeRef.current) return
      clearedForPrivateModeRef.current = true
      void clearLocalCaches()
      return
    }
    clearedForPrivateModeRef.current = false
  }, [privateModeEnabled, clearLocalCaches, userSettingsHydrated])

  const setPrefetchEnabledPersisted = useCallback(
    async (v: boolean) => {
      setPrefetchEnabledState(v)
      await saveUserSettings({ prefetchEnabled: v })
    },
    [saveUserSettings],
  )

  const setReduceEffectsEnabledPersisted = useCallback(
    async (v: boolean) => {
      setReduceEffectsEnabledState(v)
      await saveUserSettings({ reduceEffectsEnabled: v })
    },
    [saveUserSettings],
  )

  const setExternalEmbedsEnabledPersisted = useCallback(
    async (v: boolean) => {
      setExternalEmbedsEnabledState(v)
      await saveUserSettings({ externalEmbedsEnabled: v })
    },
    [saveUserSettings],
  )

  const setExternalMediaEnabledPersisted = useCallback(
    async (v: boolean) => {
      setExternalMediaEnabledState(v)
      await saveUserSettings({ externalMediaEnabled: v })
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

  const setEmbeddingsEnabledPersisted = useCallback(
    async (v: boolean) => {
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
    },
    [saveUserSettings],
  )

  const setAiEnabledPersisted = useCallback(
    async (v: boolean) => {
      setAiEnabledState(v)
      try {
        await window.settings.set?.({ aiEnabled: v })
      } catch {}
      await saveUserSettings({ aiEnabled: v })
    },
    [saveUserSettings],
  )

  const setEncryptionEnabledPersisted = useCallback(
    async (v: boolean) => {
      setEncryptionEnabledState(v)
      setEncryptionEnabledFlag(v)
      try {
        await window.settings.set?.({ encryptionEnabled: v })
      } catch {}
      await clearLocalCaches()
    },
    [clearLocalCaches],
  )

  const setPrivateModeEnabledPersisted = useCallback(
    async (v: boolean) => {
      setPrivateModeEnabledState(v)

      if (v) {
        await setEncryptionEnabledPersisted(true)
        const restore = {
          prefetchEnabled,
          embeddingsEnabled,
          aiEnabled,
        }
        setPrivateModeAcknowledgedState(true)
        setPrefetchEnabledState(false)
        setEmbeddingsEnabledState(false)
        setAiEnabledState(false)
        try {
          await window.settings.set?.({
            prefetchEnabled: false,
            embeddingsEnabled: false,
            aiEnabled: false,
            privateModeEnabled: true,
            privateModeAcknowledged: true,
          })
        } catch {}
        await saveUserSettings({
          privateModeRestore: restore,
          prefetchEnabled: false,
          embeddingsEnabled: false,
          aiEnabled: false,
          privateModeEnabled: true,
          privateModeAcknowledged: true,
        })
        return
      }

      let restore: { prefetchEnabled?: boolean; embeddingsEnabled?: boolean; aiEnabled?: boolean } | null =
        null
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) as any
        const per = userKey ? data?.userSettings?.[userKey] : null
        restore = (per?.privateModeRestore || data?.privateModeRestore) ?? null
      } catch {}

      if (restore && typeof restore === 'object') {
        const nextPrefetch =
          typeof restore.prefetchEnabled === 'boolean' ? restore.prefetchEnabled : prefetchEnabled
        const nextEmbeddings =
          typeof restore.embeddingsEnabled === 'boolean'
            ? restore.embeddingsEnabled
            : embeddingsEnabled
        const nextAi =
          typeof restore.aiEnabled === 'boolean' ? restore.aiEnabled : aiEnabled

        await setPrefetchEnabledPersisted(nextPrefetch)
        await setEmbeddingsEnabledPersisted(nextEmbeddings)
        if (nextEmbeddings) {
          await setAiEnabledPersisted(nextAi)
        }
      }

      try {
        await window.settings.set?.({ privateModeEnabled: false })
      } catch {}
      await saveUserSettings({ privateModeEnabled: false })
    },
    [
      saveUserSettings,
      prefetchEnabled,
      embeddingsEnabled,
      aiEnabled,
      userKey,
      setPrefetchEnabledPersisted,
      setEmbeddingsEnabledPersisted,
      setAiEnabledPersisted,
      setEncryptionEnabledPersisted,
    ],
  )

  const onOpenSettings = useCallback(() => setSettingsOpen(true), [])

  const setCourseImages = useCallback(
    async (map: Record<string, string>) => {
      setCourseImagesState(map)
      if (privateModeEnabled) return
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) as any
        const url = data?.baseUrl || baseUrl
        const next = { ...(data.courseImages || {}), [url]: map }
        await window.settings.set?.({ courseImages: next })
      } catch {}
    },
    [baseUrl, privateModeEnabled],
  )

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

  const onOpenQuiz = useCallback(
    (courseId: string | number, quizId: string | number, title?: string) => {
      setActiveCourseIdState(courseId)
      navigate({
        to: '/course/$courseId',
        params: { courseId: String(courseId) },
        search: { tab: 'quizzes', type: 'quiz', contentId: String(quizId), title },
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
    type: 'course' | 'assignment' | 'quiz' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
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

  useEffect(() => {
    const root = document.documentElement
    if (reduceEffectsEnabled) root.dataset.reduceEffects = '1'
    else delete root.dataset.reduceEffects
  }, [reduceEffectsEnabled])

  const aiAvailable = aiAvailability?.status === 'available'

  const flagsContext: AppFlagsValue = useMemo(
    () => ({
      aiEnabled,
      aiAvailable,
      aiAvailability,
      embeddingsEnabled,
      privateModeEnabled,
      privateModeAcknowledged,
      encryptionEnabled,
      prefetchEnabled,
      reduceEffectsEnabled,
      externalEmbedsEnabled,
      externalMediaEnabled,
      pdfGestureZoomEnabled,
      verbose,
    }),
    [
      aiEnabled,
      aiAvailable,
      aiAvailability,
      embeddingsEnabled,
      privateModeEnabled,
      privateModeAcknowledged,
      encryptionEnabled,
      prefetchEnabled,
      reduceEffectsEnabled,
      externalEmbedsEnabled,
      externalMediaEnabled,
      pdfGestureZoomEnabled,
      verbose,
    ],
  )

  const settingsContext: AppSettingsValue = useMemo(
    () => ({
      setPrefetchEnabled: setPrefetchEnabledPersisted,
      setReduceEffectsEnabled: setReduceEffectsEnabledPersisted,
      setExternalEmbedsEnabled: setExternalEmbedsEnabledPersisted,
      setExternalMediaEnabled: setExternalMediaEnabledPersisted,
      setPdfGestureZoomEnabled: setPdfGestureZoomEnabledPersisted,
      setEmbeddingsEnabled: setEmbeddingsEnabledPersisted,
      setAiEnabled: setAiEnabledPersisted,
      setPrivateModeEnabled: setPrivateModeEnabledPersisted,
      setEncryptionEnabled: setEncryptionEnabledPersisted,
      setVerbose: setVerbosePersisted,
    }),
    [
      setPrefetchEnabledPersisted,
      setReduceEffectsEnabledPersisted,
      setExternalEmbedsEnabledPersisted,
      setExternalMediaEnabledPersisted,
      setPdfGestureZoomEnabledPersisted,
      setEmbeddingsEnabledPersisted,
      setAiEnabledPersisted,
      setPrivateModeEnabledPersisted,
      setEncryptionEnabledPersisted,
      setVerbosePersisted,
    ],
  )

  const preferencesContext: AppPreferencesValue = useMemo(
    () => ({
      themeSettings,
      notificationSettings,
      setNotificationSettings,
      gpaSettings,
      setGpaSettings,
    }),
    [themeSettings, notificationSettings, setNotificationSettings, gpaSettings, setGpaSettings],
  )

  const actionsContext: AppActionsValue = useMemo(
    () => ({
      onOpenCourse,
      onOpenAssignment,
      onOpenQuiz,
      onOpenAnnouncement,
      onOpenDiscussion,
      onOpenPage,
      onOpenFile,
      onOpenModules,
      onOpenSearch,
      onSignOut,
      onOpenSettings,
      pinItem,
      unpinItem,
    }),
    [
      onOpenCourse,
      onOpenAssignment,
      onOpenQuiz,
      onOpenAnnouncement,
      onOpenDiscussion,
      onOpenPage,
      onOpenFile,
      onOpenModules,
      onOpenSearch,
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

  const { currentView, derivedCourseId, isEmbeddedContent, handlePrefetchNav, prefetchCourseData } =
    useRootLayoutNavigation({
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
      if (baseUrl) window.system?.openExternal?.(`${baseUrl.replace(/\/?$/, '')}/profile/settings`)
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
      preferencesContext,
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
      onOpenSearch,
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
      onPrefetchNav: (
        tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
      ) => {
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
