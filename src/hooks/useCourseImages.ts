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

  const courseImageUrl = React.useCallback((courseId: string | number | undefined | null): string | undefined => {
    if (courseId == null) return undefined
    const stored = getStoredImage(courseId)
    if (stored) return stored
    const info = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const url = info?.image_download_url || info?.image_url
    return typeof url === 'string' && url ? url : undefined
  }, [getStoredImage, queryClient])

  return { courseImageUrl, persistImages }
}
