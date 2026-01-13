/**
 * Global Search Hook
 * 
 * Provides search functionality and proactively fetches data for visible courses.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { searchManager, type SearchResult } from '../utils/searchIndex'
import { useCourses } from './useCanvasQueries'
import { useAppContext } from '../context/AppContext'

export function useGlobalSearch() {
  const queryClient = useQueryClient()
  const { data: courses } = useCourses()
  const app = useAppContext()
  const [isReady, setIsReady] = useState(searchManager.isReady)
  const [isBuilding, setIsBuilding] = useState(searchManager.isBuilding)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Get visible (pinned) courses - exclude hidden ones
  const visibleCourses = useMemo(() => {
    if (!courses?.length) return []
    const hiddenIds = new Set(app?.sidebar?.hiddenCourseIds?.map(String) || [])
    return courses.filter(c => !hiddenIds.has(String(c.id)))
  }, [courses, app?.sidebar?.hiddenCourseIds])

  // Listen for ready state
  useEffect(() => {
    searchManager.onReady(() => {
      setIsReady(true)
      setIsBuilding(false)
    })
  }, [])

  // Proactively fetch and build index for visible courses
  useEffect(() => {
    if (!visibleCourses?.length || searchManager.isReady || searchManager.isBuilding) return

    const timer = setTimeout(async () => {
      setIsBuilding(true)
      
      const courseAssignments = new Map<string, any[]>()
      const courseAnnouncements = new Map<string, any[]>()
      const courseFiles = new Map<string, any[]>()
      const courseModules = new Map<string, any[]>()

      // Fetch data for each visible course in parallel (batched)
      const batchSize = 3 // Fetch 3 courses at a time to avoid overwhelming the API
      
      for (let i = 0; i < visibleCourses.length; i += batchSize) {
        const batch = visibleCourses.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (course) => {
          const courseId = String(course.id)
          
          try {
            // Fetch assignments
            let assignments = queryClient.getQueryData(['course-assignments', courseId, 200]) as any[] | undefined
            if (!assignments) {
              const res = await window.canvas.listCourseAssignments(courseId, 200)
              if (res?.ok && res.data) {
                assignments = res.data
                queryClient.setQueryData(['course-assignments', courseId, 200], assignments)
              }
            }
            if (assignments) courseAssignments.set(courseId, assignments)
            
            // Fetch modules (includes module items)
            let modules = queryClient.getQueryData(['course-modules', courseId]) as any[] | undefined
            if (!modules) {
              const res = await window.canvas.listCourseModulesGql(courseId, 20, 50)
              if (res?.ok && res.data) {
                modules = res.data
                queryClient.setQueryData(['course-modules', courseId], modules)
              }
            }
            if (modules) courseModules.set(courseId, modules)
            
            // Fetch announcements
            let announcements = queryClient.getQueryData(['course-announcements', courseId, 50]) as any[] | undefined
            if (!announcements) {
              const res = await window.canvas.listCourseAnnouncements?.(courseId, 50)
              if (res?.ok && res.data) {
                announcements = res.data
                queryClient.setQueryData(['course-announcements', courseId, 50], announcements)
              }
            }
            if (announcements) courseAnnouncements.set(courseId, announcements)
            
            // Fetch files
            let files = queryClient.getQueryData(['course-files', courseId, 100, 'updated_at', 'desc']) as any[] | undefined
            if (!files) {
              const res = await window.canvas.listCourseFiles?.(courseId, 100, 'updated_at', 'desc')
              if (res?.ok && res.data) {
                files = res.data
                queryClient.setQueryData(['course-files', courseId, 100, 'updated_at', 'desc'], files)
              }
            }
            if (files) courseFiles.set(courseId, files)
          } catch (e) {
            // Silently skip failed courses
            console.warn(`Failed to fetch data for course ${courseId}:`, e)
          }
        }))
      }

      await searchManager.buildIndex({
        courses: visibleCourses,
        courseAssignments,
        courseAnnouncements,
        courseFiles,
        courseModules,
      })
      
      setIsReady(true)
      setIsBuilding(false)
    }, 1500) // 1.5 second delay after courses load

    return () => clearTimeout(timer)
  }, [visibleCourses, queryClient])

  // Perform search
  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const searchResults = await searchManager.search(q, 20)
      setResults(searchResults)
    } catch (e) {
      console.error('Search failed:', e)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    
    const timer = setTimeout(() => {
      search(query)
    }, 150) // 150ms debounce
    
    return () => clearTimeout(timer)
  }, [query, search])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  // Rebuild index with fresh data (force refetch)
  const rebuildIndex = useCallback(async () => {
    if (!visibleCourses?.length) return
    
    searchManager.clear()
    setIsReady(false)
    setIsBuilding(true)
    
    const courseAssignments = new Map<string, any[]>()
    const courseAnnouncements = new Map<string, any[]>()
    const courseFiles = new Map<string, any[]>()
    const courseModules = new Map<string, any[]>()

    const batchSize = 3
    
    for (let i = 0; i < visibleCourses.length; i += batchSize) {
      const batch = visibleCourses.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (course) => {
        const courseId = String(course.id)
        
        try {
          // Force fetch (ignore cache)
          const [assignRes, modRes, annRes, fileRes] = await Promise.all([
            window.canvas.listCourseAssignments(courseId, 200),
            window.canvas.listCourseModulesGql(courseId, 20, 50),
            window.canvas.listCourseAnnouncements?.(courseId, 50),
            window.canvas.listCourseFiles?.(courseId, 100, 'updated_at', 'desc'),
          ])
          
          if (assignRes?.ok && assignRes.data) {
            courseAssignments.set(courseId, assignRes.data)
            queryClient.setQueryData(['course-assignments', courseId, 200], assignRes.data)
          }
          if (modRes?.ok && modRes.data) {
            courseModules.set(courseId, modRes.data)
            queryClient.setQueryData(['course-modules', courseId], modRes.data)
          }
          if (annRes?.ok && annRes.data) {
            courseAnnouncements.set(courseId, annRes.data)
            queryClient.setQueryData(['course-announcements', courseId, 50], annRes.data)
          }
          if (fileRes?.ok && fileRes.data) {
            courseFiles.set(courseId, fileRes.data)
            queryClient.setQueryData(['course-files', courseId, 100, 'updated_at', 'desc'], fileRes.data)
          }
        } catch (e) {
          console.warn(`Failed to fetch data for course ${courseId}:`, e)
        }
      }))
    }

    await searchManager.buildIndex({
      courses: visibleCourses,
      courseAssignments,
      courseAnnouncements,
      courseFiles,
      courseModules,
    })
    
    setIsReady(true)
    setIsBuilding(false)
  }, [visibleCourses, queryClient])

  return useMemo(() => ({
    query,
    setQuery,
    results,
    isReady,
    isBuilding,
    isSearching,
    search,
    clearSearch,
    rebuildIndex,
    indexSize: searchManager.indexSize,
  }), [query, results, isReady, isBuilding, isSearching, search, clearSearch, rebuildIndex])
}
