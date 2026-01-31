import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'

export function useCourseImages() {
  const app = useAppContext()
  const queryClient = useQueryClient()
  
  // Use context state directly (instant access)
  const imgStore = app.courseImages || {}

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
      await app.setCourseImages(next)
    }
  }, [imgStore, app])

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
        // Try to cache locally
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
        // Fallback
        await persistImages([[id, url]])
        return url
      }
    } catch {}
    return undefined
  }, [imgStore, queryClient, persistImages])

  const courseImageUrl = React.useCallback((courseId: string | number | undefined | null): string | undefined => {
    if (courseId == null) return undefined
    const stored = getStoredImage(courseId)
    if (stored) return stored
    const info = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }, [getStoredImage, queryClient])

  return { courseImageUrl, persistImages, prefetchCourseImage }
}
