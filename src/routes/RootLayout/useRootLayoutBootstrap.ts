import { useEffect } from 'react'
import { normalizeThemeSettings, type ThemeSettings } from '../../utils/theme'
import { isSameThemeSettings } from './theme'

type Params = {
  baseUrl: string
  verbose: boolean
  embedBoot: boolean
  queryClient: { invalidateQueries: (opts?: any) => void; setQueryData: (key: any, data: any) => void }
  setBaseUrl: (next: string) => void
  setThemeSettings: (updater: (prev: ThemeSettings) => ThemeSettings) => void
  setSidebarCfg: (next: any) => void
  setCourseImagesState: (next: Record<string, string>) => void
  setPrefetchEnabledState: (next: boolean) => void
  setPdfGestureZoomEnabledState: (next: boolean) => void
  setEmbeddingsEnabledState: (next: boolean) => void
  setAiEnabledState: (next: boolean) => void
  setVerboseState: (next: boolean) => void
  setCachedCourses: (next: any[]) => void
  setCachedDue: (next: any[]) => void
  setHasToken: (next: boolean) => void
  setLoading: (next: boolean) => void
}

export function useRootLayoutBootstrap({
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
}: Params) {
  useEffect(() => {
    ;(async () => {
      const cfg = await window.settings.get()
      const data = (cfg.ok ? (cfg.data as any) : {}) as any
      if (data?.baseUrl) setBaseUrl(data.baseUrl)

      try {
        const fileTheme = data?.themeConfig ? normalizeThemeSettings(data.themeConfig) : null
        if (fileTheme) {
          setThemeSettings((prev) => (isSameThemeSettings(prev, fileTheme) ? prev : fileTheme))
        }
      } catch {}
      if (data?.sidebar) setSidebarCfg(data.sidebar)
      if (data?.lastUserId) {
        const url = data.baseUrl || baseUrl
        const key = `${url}|${data.lastUserId}`
        if (data?.userSidebars?.[key]) setSidebarCfg(data.userSidebars[key])
      }
      if (data?.courseImages) {
        const url = data.baseUrl || baseUrl
        setCourseImagesState(data.courseImages[url] || {})
      }
      if (typeof data?.prefetchEnabled === 'boolean')
        setPrefetchEnabledState(!!data.prefetchEnabled)
      if (typeof data?.pdfGestureZoomEnabled === 'boolean')
        setPdfGestureZoomEnabledState(!!data.pdfGestureZoomEnabled)
      if (typeof data?.embeddingsEnabled === 'boolean')
        setEmbeddingsEnabledState(!!data.embeddingsEnabled)
      if (typeof data?.aiEnabled === 'boolean') setAiEnabledState(!!data.aiEnabled)
      if (typeof data?.verbose === 'boolean') setVerboseState(!!data.verbose)
      if (Array.isArray(data?.cachedCourses)) {
        setCachedCourses(data.cachedCourses || [])
        queryClient.setQueryData(
          ['courses', { enrollment_state: 'active' }],
          data.cachedCourses || [],
        )
      }
      if (Array.isArray(data?.cachedDue)) {
        setCachedDue(data.cachedDue || [])
        queryClient.setQueryData(['due-assignments'], data.cachedDue || [])
      }

      setLoading(true)
      const res = await window.canvas.init({
        baseUrl: data?.baseUrl || baseUrl,
        verbose: !!(data?.verbose ?? verbose),
      })
      if (!res.ok) {
        setHasToken(false)
        setLoading(false)
        return
      }
      setHasToken(true)
      if (!embedBoot) {
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        queryClient.invalidateQueries({ queryKey: ['due-assignments'] })
      }
      setLoading(false)
    })()
  }, [])
}
