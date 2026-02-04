import React from 'react'
import { useAppData, useAppDataActions, useAppFlags } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { isSafeMediaSrc, tryParseUrl } from '../utils/urlPolicy'

export function useCourseImages() {
  const appData = useAppData()
  const { externalMediaEnabled, privateModeEnabled } = useAppFlags()
  const appDataActions = useAppDataActions()
  const queryClient = useQueryClient()
  const [courseImageHosts, setCourseImageHosts] = React.useState<string[]>(['inscloudgate.net'])

  const baseHost = React.useMemo(() => {
    try {
      return new URL(appData.baseUrl).hostname
    } catch {
      return ''
    }
  }, [appData.baseUrl])

  React.useEffect(() => {
    let active = true
    const normalizeHosts = (list: string[]) =>
      list.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) as any
        const fromCfg = Array.isArray(data?.courseImageAllowlist)
          ? data.courseImageAllowlist
          : []
        const next = normalizeHosts(['inscloudgate.net', baseHost, ...fromCfg])
        if (active && next.length) setCourseImageHosts(next)
      } catch {}
    })()
    return () => {
      active = false
    }
  }, [baseHost])
  
  // Use context state directly (instant access)
  const imgStore = appData.courseImages || {}

  const getStoredImage = React.useCallback((courseId: string | number) => {
    return imgStore[String(courseId)]
  }, [imgStore])

  const persistImages = React.useCallback(async (entries: Array<[string | number, string]>) => {
    if (!entries.length) return
    const next = { ...imgStore }
    let changed = false
    for (const [id, url] of entries) {
      if (url && next[String(id)] !== url) { next[String(id)] = url; changed = true }
    }
    if (changed) {
      await appDataActions.setCourseImages(next)
    }
  }, [imgStore, appDataActions])

  const prefetchCourseImage = React.useCallback(async (courseId: string | number): Promise<string | undefined> => {
    try {
      const id = String(courseId)
      // Check if we already have it
      if (imgStore[id]) return imgStore[id]

      // Fetch info
      const data = await queryClient.fetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => {
          const res = await window.canvas.getCourseInfo?.(id)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
          return res.data || null
        },
        staleTime: 1000 * 60 * 60 * 24 * 7,
        gcTime: 1000 * 60 * 60 * 24 * 14,
      })

      const url = (data as any)?.image_download_url || (data as any)?.image_url
      if (url) {
        const parsed = tryParseUrl(url)
        if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
          return undefined
        }

        if (!privateModeEnabled) {
          // Try to cache locally regardless of external media setting.
          // We only render the cached canvas-file URL when external media is disabled.
          try {
            const canvas = window.canvas as any
            const res = await canvas.cacheCourseImage?.(id, url)
            if (res?.ok && res.data) {
              await persistImages([[id, res.data]])
              return res.data
            }
          } catch (err) {
            console.warn('Failed to cache course image', err)
          }
        }

        // Fallback: only persist and return remote URL if external media is allowed.
        if (isSafeMediaSrc(url, appData.baseUrl, true) && (externalMediaEnabled || privateModeEnabled)) {
          await persistImages([[id, url]])
          return url
        }
      }
    } catch {}
    return undefined
  }, [imgStore, queryClient, persistImages, appData.baseUrl, externalMediaEnabled, privateModeEnabled])

  const isCourseImageHostAllowed = React.useCallback((host: string) => {
    const h = String(host || '').toLowerCase()
    return courseImageHosts.some((entry) => h === entry || h.endsWith(`.${entry}`))
  }, [courseImageHosts])

  const isAllowedCourseImageSrc = React.useCallback((rawUrl: string | undefined | null) => {
    if (!rawUrl) return false
    const u = tryParseUrl(rawUrl)
    if (!u) return false

    // Always allow opaque/local course image sources.
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'canvas-file:') {
      return true
    }

    // Allow known course image hosts even when external media is off.
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      if (isCourseImageHostAllowed(u.hostname)) return true
      if (!privateModeEnabled) {
        return isSafeMediaSrc(rawUrl, appData.baseUrl, externalMediaEnabled)
      }
    }

    return false
  }, [privateModeEnabled, appData.baseUrl, externalMediaEnabled, isCourseImageHostAllowed])

  const courseImageUrl = React.useCallback((courseId: string | number | undefined | null): string | undefined => {
    if (courseId == null) return undefined
    const stored = getStoredImage(courseId)
    if (stored && isAllowedCourseImageSrc(stored)) return stored
    const id = String(courseId)
    const info = queryClient.getQueryData<any>(['course-info', id]) as any
    let url = info?.image_download_url || info?.image_url
    if (!url) {
      const courseQueries = queryClient.getQueriesData({ queryKey: ['courses'] }) || []
      for (const [, data] of courseQueries) {
        if (!Array.isArray(data)) continue
        const course = (data as any[]).find((c) => String(c?.id) === id)
        if (course) {
          url = course?.image_download_url || course?.image_url
          break
        }
      }
    }
    if (typeof url !== 'string' || !url) return undefined
    return isAllowedCourseImageSrc(url) ? url : undefined
  }, [getStoredImage, queryClient, isAllowedCourseImageSrc])

  return { courseImageUrl, persistImages, prefetchCourseImage }
}
