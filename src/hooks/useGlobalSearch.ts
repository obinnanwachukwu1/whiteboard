/**
 * Global Search Hook
 *
 * Provides search functionality and proactively fetches data for visible courses.
 * Also triggers embedding indexing for semantic/deep search.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { searchManager, type SearchResult } from '../utils/searchIndex'
import { useCourses } from './useCanvasQueries'
import { useAppData, useAppFlags } from '../context/AppContext'
import { extractAssignmentIdFromUrl } from '../utils/urlHelpers'

const scheduleIdle = (cb: () => void, timeoutMs = 2000): number => {
  if (typeof window === 'undefined') {
    return setTimeout(cb, timeoutMs) as unknown as number
  }
  const ric = (window as any).requestIdleCallback as
    | ((fn: () => void, opts?: { timeout: number }) => number)
    | undefined
  if (typeof ric === 'function') {
    return ric(cb, { timeout: timeoutMs })
  }
  return window.setTimeout(cb, timeoutMs)
}

const cancelIdle = (id: number | null) => {
  if (id == null) return
  if (typeof window === 'undefined') {
    clearTimeout(id)
    return
  }
  const cancel = (window as any).cancelIdleCallback as ((handle: number) => void) | undefined
  if (typeof cancel === 'function') cancel(id)
  else clearTimeout(id)
}

const SEARCH_CACHE_VERSION = 1
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 6
const SEARCH_CACHE_MAX_ITEMS = 20000

type SearchIndexCache = {
  version: number
  builtAt: number
  baseUrl: string
  courseIds: string[]
  items: SearchResult[]
}

const normalizeCourseIds = (ids: string[]) => [...ids].sort()

const sameStringArray = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/**
 * Trigger embedding indexing in the background.
 * This converts the fetched content to embeddings for semantic search.
 */
async function triggerEmbeddingIndex(data: {
  courses: any[]
  courseAssignments: Map<string, any[]>
  courseAnnouncements: Map<string, any[]>
  courseFiles: Map<string, any[]>
  courseModules: Map<string, any[]>
}): Promise<void> {
  // Check if embedding API is available
  if (!window.embedding) {
    console.log('[Search] Embedding API not available')
    return
  }

  try {
    // Prepare indexable items from the search data
    const items: Array<{
      id: string
      type: 'announcement' | 'assignment' | 'page' | 'module' | 'file'
      courseId: string
      courseName: string
      title: string
      content: string
      url?: string
    }> = []

    const getCourseName = (courseId: string): string => {
      const course = data.courses.find((c) => String(c.id) === courseId)
      return course?.name || course?.course_code || 'Unknown Course'
    }

    // Process announcements
    for (const [courseId, announcements] of data.courseAnnouncements) {
      const courseName = getCourseName(courseId)
      for (const ann of announcements || []) {
        items.push({
          id: `announcement:${courseId}:${ann.id}`,
          type: 'announcement',
          courseId,
          courseName,
          title: ann.title || 'Untitled Announcement',
          content: ann.message || '',
          url: ann.html_url,
        })
      }
    }

    // Process assignments
    for (const [courseId, assignments] of data.courseAssignments) {
      const courseName = getCourseName(courseId)
      for (const assignment of assignments || []) {
        const url: string | undefined = assignment.htmlUrl || assignment.html_url
        const id = assignment._id != null ? String(assignment._id) : extractAssignmentIdFromUrl(url)

        if (!id) continue

        // Enhance content for better snippets
        let content = assignment.description || ''

        const parts = []
        if (assignment.due_at || assignment.dueAt) {
          const date = new Date(assignment.due_at || assignment.dueAt).toLocaleDateString()
          parts.push(`Due: ${date}`)
        }
        if (assignment.points_possible || assignment.pointsPossible) {
          parts.push(`Points: ${assignment.points_possible || assignment.pointsPossible}`)
        }
        if (parts.length > 0) {
          content = (content ? content + '\n\n' : '') + parts.join(' · ')
        }

        items.push({
          id: `assignment:${courseId}:${id}`,
          type: 'assignment',
          courseId,
          courseName,
          title: assignment.name || 'Untitled Assignment',
          content,
          url,
        })
      }
    }

    // Process course files
    for (const [courseId, files] of data.courseFiles) {
      const courseName = getCourseName(courseId)
      for (const file of files || []) {
        const fileId = String(file.id)
        const name = file.display_name || file.filename || file.name || 'File'
        const parts: string[] = []
        if (file.updated_at)
          parts.push(`Updated: ${new Date(file.updated_at).toLocaleDateString()}`)
        if (file.size) parts.push(`Size: ${Math.round(Number(file.size) / 1024)} KB`)
        if (file.content_type) parts.push(`Type: ${file.content_type}`)
        const content = parts.join(' · ')
        items.push({
          id: `file:${courseId}:${fileId}`,
          type: 'file',
          courseId,
          courseName,
          title: name,
          content,
          url: file.url || file.html_url,
        })
      }
    }

    // Process modules and their items
    for (const [courseId, modules] of data.courseModules) {
      const courseName = getCourseName(courseId)

      // Build assignment lookup for module items that reference assignments
      const courseAssignments = data.courseAssignments.get(courseId) || []
      const assignmentById = new Map<string, any>()
      for (const a of courseAssignments) {
        const aid = String(a._id || a.id)
        assignmentById.set(aid, a)
      }

      // Gather referenced page slugs so we can fetch bodies
      const pageSlugs = new Set<string>()
      for (const module of modules || []) {
        const moduleItems = module.moduleItemsConnection?.nodes || module.items || []
        for (const item of moduleItems) {
          const pageUrl = item.pageUrl
          if (
            pageUrl &&
            (item.__typename === 'PageModuleItem' || String(item.__typename || '').includes('Page'))
          ) {
            pageSlugs.add(String(pageUrl))
          }
        }
      }

      // Fetch page bodies in small batches (Canvas pages are HTML)
      const pageBodyBySlug = new Map<string, string>()
      const slugs = Array.from(pageSlugs)
      const pageBatchSize = 5
      for (let i = 0; i < slugs.length; i += pageBatchSize) {
        const batch = slugs.slice(i, i + pageBatchSize)
        await Promise.all(
          batch.map(async (slug) => {
            try {
              const res = await window.canvas.getCoursePage?.(courseId, slug)
              if (res?.ok && res.data) {
                pageBodyBySlug.set(slug, res.data.body || '')
              }
            } catch {
              // ignore
            }
          }),
        )
      }

      for (const module of modules || []) {
        const moduleName = module.name || 'Untitled Module'
        const moduleItems = module.moduleItemsConnection?.nodes || module.items || []

        for (const item of moduleItems) {
          if (!item.title) continue

          const typename = String(item.__typename || '')
          const pageUrl = item.pageUrl ? String(item.pageUrl) : ''
          const contentId = item.contentId != null ? String(item.contentId) : ''

          // If this module item links to a Canvas Page, index the page body as `page`
          if (pageUrl && (typename === 'PageModuleItem' || typename.includes('Page'))) {
            const body = pageBodyBySlug.get(pageUrl) || ''
            const content = body || `Page: ${item.title}\nModule: ${moduleName}`
            items.push({
              id: `page:${courseId}:${pageUrl}`,
              type: 'page',
              courseId,
              courseName,
              title: item.title,
              content,
              url: item.htmlUrl,
            })
            continue
          }

          // If this module item links to an Assignment, index the assignment (prefer assignment description)
          if (
            contentId &&
            (typename === 'AssignmentModuleItem' || typename.includes('Assignment'))
          ) {
            const assignment = assignmentById.get(contentId)
            if (assignment) {
              let content = assignment.description || ''
              const parts: string[] = []
              if (assignment.due_at || assignment.dueAt) {
                const date = new Date(assignment.due_at || assignment.dueAt).toLocaleDateString()
                parts.push(`Due: ${date}`)
              }
              if (assignment.points_possible || assignment.pointsPossible) {
                parts.push(`Points: ${assignment.points_possible || assignment.pointsPossible}`)
              }
              if (parts.length > 0) content = (content ? content + '\n\n' : '') + parts.join(' · ')

              items.push({
                id: `assignment:${courseId}:${contentId}`,
                type: 'assignment',
                courseId,
                courseName,
                title: assignment.name || item.title,
                content,
                url: assignment.htmlUrl || item.htmlUrl,
              })
              continue
            }
          }

          // Fallback: index as a generic module item (we often only have title + link)
          const itemId = item._id || String(item.id)
          let content = `Module: ${moduleName}`
          if (typename) content += ` · Type: ${typename}`
          if (item.htmlUrl) content += ` · Link: ${item.htmlUrl}`
          if (contentId) content += ` · ContentId: ${contentId}`

          items.push({
            id: `module:${courseId}:${itemId}`,
            type: 'module',
            courseId,
            courseName,
            title: item.title,
            content,
            url: item.htmlUrl,
          })
        }
      }
    }

    if (items.length === 0) {
      console.log('[Search] No items to index for embeddings')
      return
    }

    console.log(`[Search] Indexing ${items.length} items for embeddings...`)
    const result = await window.embedding.index(items)

    if (result.ok && result.data) {
      console.log(
        `[Search] Embedding index complete: ${result.data.indexed} indexed, ${result.data.skipped} skipped`,
      )
    } else if (result.error) {
      console.warn('[Search] Embedding indexing failed:', result.error)
    }
  } catch (e) {
    console.warn('[Search] Embedding indexing error:', e)
  }
}

/**
 * Queue small files for Tier 1 auto-indexing.
 * Only indexes files that meet the auto-index criteria (small PDFs, text files, etc.)
 */
async function triggerFileAutoIndex(data: {
  courses: any[]
  courseFiles: Map<string, any[]>
}): Promise<void> {
  if (!window.embedding?.indexFile) {
    return
  }

  const getCourseName = (courseId: string): string => {
    const course = data.courses.find((c) => String(c.id) === courseId)
    return course?.name || course?.course_code || 'Unknown Course'
  }

  // Collect files eligible for auto-indexing
  const filesToIndex: Array<{
    fileId: string
    courseId: string
    courseName: string
    fileName: string
    fileSize: number
    updatedAt?: string
    url?: string
  }> = []

  for (const [courseId, files] of data.courseFiles) {
    const courseName = getCourseName(courseId)

    for (const file of files || []) {
      const fileName = file.display_name || file.filename || file.name || ''
      const fileSize = Number(file.size || 0)
      const ext = fileName.split('.').pop()?.toLowerCase() || ''

      // Tier 1: Auto-index small files
      // - Text files (any size)
      // - PDF <=500KB (~10 pages)
      // - DOCX <=50KB
      let shouldAutoIndex = false

      if (['txt', 'md', 'markdown', 'text'].includes(ext)) {
        shouldAutoIndex = true
      } else if (ext === 'pdf' && fileSize <= 500 * 1024) {
        shouldAutoIndex = true
      } else if (ext === 'docx' && fileSize <= 50 * 1024) {
        shouldAutoIndex = true
      }

      if (shouldAutoIndex) {
        filesToIndex.push({
          fileId: String(file.id),
          courseId,
          courseName,
          fileName,
          fileSize,
          updatedAt: file.updated_at,
          url: file.url || file.html_url,
        })
      }
    }
  }

  if (filesToIndex.length === 0) {
    return
  }

  console.log(`[Search] Auto-indexing ${filesToIndex.length} small files...`)

  // Process files one at a time to avoid overwhelming the system
  // This runs in the background, so we don't await
  ;(async () => {
    let indexed = 0
    let failed = 0

    for (const file of filesToIndex) {
      try {
        const result = await window.embedding?.indexFile?.(
          file.fileId,
          file.courseId,
          file.courseName,
          file.fileName,
          file.fileSize,
          file.updatedAt,
          file.url,
          { maxPages: 20 },
        )

        if (result?.ok && result.data) {
          if (result.data.chunks > 0) {
            indexed++
          }
        } else if (result?.error) {
          console.warn(`[Search] Failed to index ${file.fileName}:`, result.error)
          failed++
        }

        // Small delay between files to avoid blocking
        await new Promise((r) => setTimeout(r, 300))
      } catch (e) {
        console.warn(`[Search] Error indexing ${file.fileName}:`, e)
        failed++
      }
    }

    if (indexed > 0 || failed > 0) {
      console.log(`[Search] File auto-indexing complete: ${indexed} indexed, ${failed} failed`)
    }
  })()
}

export function useGlobalSearch(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const queryClient = useQueryClient()
  const { data: courses } = useCourses()
  const flags = useAppFlags()
  const data = useAppData()
  const userKey = useMemo(() => {
    const uid = (data.profile as any)?.id
    return uid && data.baseUrl ? `${data.baseUrl}|${uid}` : null
  }, [data.baseUrl, data.profile])
  const searchEnabled = enabled && !flags.privateModeEnabled
  const embeddingEnabled = searchEnabled && flags.embeddingsEnabled
  const debug = import.meta.env.DEV
  const [isReady, setIsReady] = useState(searchManager.isReady)
  const [isBuilding, setIsBuilding] = useState(searchManager.isBuilding)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isPendingSearch, setIsPendingSearch] = useState(false)
  const wasReadyRef = useRef(searchManager.isReady)
  const cacheLoadedRef = useRef(false)
  const refreshNeededRef = useRef(false)
  const cacheMetaRef = useRef<{ builtAt: number; courseIds: string[] } | null>(null)
  const cacheHydratingRef = useRef(false)
  const lastCourseKeyRef = useRef<string>('')
  const emptyEmbeddingRebuildRef = useRef(false)
  const pauseRef = useRef<boolean | null>(null)

  // Embedding status tracking
  const [embeddingStatus, setEmbeddingStatus] = useState<{
    ready: boolean
    modelDownloaded: boolean
    itemCount: number
    memoryUsedMB: number
    memoryLimitMB: number
  }>({ ready: false, modelDownloaded: false, itemCount: 0, memoryUsedMB: 0, memoryLimitMB: 300 })

  useEffect(() => {
    if (!flags.privateModeEnabled) return
    searchManager.clear()
    setIsReady(false)
    setIsBuilding(false)
    setQuery('')
    setResults([])
    cacheLoadedRef.current = false
    refreshNeededRef.current = false
    cacheMetaRef.current = null
    cacheHydratingRef.current = false
    emptyEmbeddingRebuildRef.current = false
    pauseRef.current = null
  }, [flags.privateModeEnabled])

  useEffect(() => {
    cacheLoadedRef.current = false
    refreshNeededRef.current = false
    cacheMetaRef.current = null
    cacheHydratingRef.current = false
    emptyEmbeddingRebuildRef.current = false
    pauseRef.current = null
    searchManager.clear()
    setIsReady(false)
    setIsBuilding(false)
    setQuery('')
    setResults([])
  }, [userKey])

  // Get visible (pinned) courses - exclude hidden ones
  const visibleCourses = useMemo(() => {
    if (!courses?.length) return []
    const hiddenIds = new Set(data?.sidebar?.hiddenCourseIds?.map(String) || [])
    return courses.filter((c) => !hiddenIds.has(String(c.id)))
  }, [courses, data?.sidebar?.hiddenCourseIds])
  const visibleCourseIds = useMemo(
    () => normalizeCourseIds(visibleCourses.map((c) => String(c.id))),
    [visibleCourses],
  )
  const visibleCourseKey = useMemo(() => visibleCourseIds.join('|'), [visibleCourseIds])

  const shouldRefreshCache = useCallback(
    (meta: { builtAt: number; courseIds: string[] } | null, currentIds: string[]) => {
      if (!meta) return true
      if (currentIds.length === 0) return false
      if (meta.courseIds.length > 0 && !sameStringArray(meta.courseIds, currentIds)) return true
      return Date.now() - meta.builtAt > SEARCH_CACHE_TTL_MS
    },
    [],
  )

  // Listen for ready state
  useEffect(() => {
    searchManager.onReady(() => {
      setIsReady(true)
      setIsBuilding(false)
    })
  }, [])

  useEffect(() => {
    if (!searchEnabled || cacheLoadedRef.current || !userKey) return
    cacheLoadedRef.current = true
    let cancelled = false

    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const dataCfg = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const per = dataCfg?.userSettings?.[userKey] || {}
        const cache = per?.searchIndexCache as SearchIndexCache | undefined

        if (!cache || cache.version !== SEARCH_CACHE_VERSION) return
        if (!Array.isArray(cache.items) || cache.items.length === 0) return
        if (cache.baseUrl && cache.baseUrl !== data.baseUrl) return

        cacheHydratingRef.current = true
        setIsBuilding(true)
        const count = await searchManager.buildFromItems(cache.items)
        if (cancelled) return

        setIsReady(true)
        cacheMetaRef.current = {
          builtAt: Number(cache.builtAt || Date.now()),
          courseIds: normalizeCourseIds((cache.courseIds || []).map(String)),
        }

        if (visibleCourseIds.length > 0 && shouldRefreshCache(cacheMetaRef.current, visibleCourseIds)) {
          refreshNeededRef.current = true
        }

        if (debug) {
          console.debug('[Search] Hydrated index from cache', {
            items: count,
            refresh: refreshNeededRef.current,
          })
        }
      } catch (error) {
        if (debug) console.debug('[Search] Cache hydrate failed', error)
      } finally {
        cacheHydratingRef.current = false
        if (!cancelled) setIsBuilding(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchEnabled, userKey, data.baseUrl, visibleCourseIds, shouldRefreshCache, debug])

  useEffect(() => {
    const meta = cacheMetaRef.current
    if (!meta || !visibleCourseIds.length) return
    if (shouldRefreshCache(meta, visibleCourseIds)) {
      refreshNeededRef.current = true
    }
  }, [visibleCourseIds, shouldRefreshCache])

  useEffect(() => {
    if (!visibleCourseKey) return
    if (lastCourseKeyRef.current && lastCourseKeyRef.current !== visibleCourseKey) {
      refreshNeededRef.current = true
    }
    lastCourseKeyRef.current = visibleCourseKey
  }, [visibleCourseKey])

  // Poll embedding status periodically (only when enabled)
  useEffect(() => {
    if (!window.embedding || !embeddingEnabled) return

    const fetchStatus = async () => {
      try {
        const result = await window.embedding.getStatus()
        if (result.ok && result.data) {
          setEmbeddingStatus({
            ready: result.data.ready,
            modelDownloaded: result.data.modelDownloaded,
            itemCount: result.data.itemCount,
            memoryUsedMB: result.data.memoryUsedMB,
            memoryLimitMB: result.data.memoryLimitMB,
          })

          if (
            searchEnabled &&
            visibleCourseIds.length > 0 &&
            result.data.itemCount === 0 &&
            searchManager.isReady &&
            !searchManager.isBuilding &&
            !emptyEmbeddingRebuildRef.current
          ) {
            emptyEmbeddingRebuildRef.current = true
            refreshNeededRef.current = true
            setIsReady(false)
            if (debug) {
              console.debug('[Search] Embedding index empty; scheduling rebuild')
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Initial fetch
    fetchStatus()

    // Poll every 5 seconds to check for status changes
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [embeddingEnabled, searchEnabled, visibleCourseIds, debug])

  useEffect(() => {
    if (!embeddingEnabled) {
      emptyEmbeddingRebuildRef.current = false
    }
  }, [embeddingEnabled])

  useEffect(() => {
    if (!window.embedding?.setPaused) return

    const setPaused = (next: boolean) => {
      if (pauseRef.current === next) return
      pauseRef.current = next
      window.embedding?.setPaused?.(next).catch(() => {})
    }

    if (!embeddingEnabled) {
      setPaused(true)
      return
    }

    const IDLE_DELAY_MS = 3500
    let idleTimer: number | null = null

    const scheduleIdle = () => {
      if (idleTimer) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setPaused(false)
        }
      }, IDLE_DELAY_MS)
    }

    const markActive = () => {
      setPaused(true)
      scheduleIdle()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimer) window.clearTimeout(idleTimer)
        idleTimer = null
        setPaused(false)
      } else {
        markActive()
      }
    }

    markActive()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('mousemove', markActive, { passive: true })
    window.addEventListener('mousedown', markActive, { passive: true })
    window.addEventListener('keydown', markActive)
    window.addEventListener('wheel', markActive, { passive: true })
    window.addEventListener('pointerdown', markActive, { passive: true })
    window.addEventListener('pointermove', markActive, { passive: true })
    window.addEventListener('touchstart', markActive, { passive: true })
    window.addEventListener('touchmove', markActive, { passive: true })
    document.addEventListener('scroll', markActive, { passive: true, capture: true })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('mousemove', markActive)
      window.removeEventListener('mousedown', markActive)
      window.removeEventListener('keydown', markActive)
      window.removeEventListener('wheel', markActive)
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('pointermove', markActive)
      window.removeEventListener('touchstart', markActive)
      window.removeEventListener('touchmove', markActive)
      document.removeEventListener('scroll', markActive, true)
      if (idleTimer) window.clearTimeout(idleTimer)
      setPaused(false)
    }
  }, [embeddingEnabled])

  const persistSearchCache = useCallback(
    async (items: SearchResult[], courseIds: string[]) => {
      if (!userKey || flags.privateModeEnabled) return
      if (!items.length) return
      if (items.length > SEARCH_CACHE_MAX_ITEMS) {
        if (debug) {
          console.debug('[Search] Cache skipped (too many items)', { items: items.length })
        }
        return
      }

      try {
        const cfg = await window.settings.get?.()
        const dataCfg = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const map = { ...(dataCfg.userSettings || {}) }
        const current = map[userKey] || {}
        const nextCache: SearchIndexCache = {
          version: SEARCH_CACHE_VERSION,
          builtAt: Date.now(),
          baseUrl: data.baseUrl,
          courseIds: normalizeCourseIds(courseIds),
          items,
        }
        map[userKey] = { ...current, searchIndexCache: nextCache }
        await window.settings.set?.({ userSettings: map })
        cacheMetaRef.current = {
          builtAt: nextCache.builtAt,
          courseIds: nextCache.courseIds,
        }
      } catch (error) {
        if (debug) console.debug('[Search] Cache persist failed', error)
      }
    },
    [userKey, flags.privateModeEnabled, data.baseUrl, debug],
  )

  // Proactively fetch and build index for visible courses (only when enabled)
  useEffect(() => {
    if (!searchEnabled || !visibleCourses?.length || searchManager.isBuilding) return
    if (searchManager.isReady && !refreshNeededRef.current) return
    if (cacheHydratingRef.current) return

    let cancelled = false
    let idleId: number | null = null

    const timer = setTimeout(async () => {
      if (cancelled) return
      setIsBuilding(true)

      const courseAssignments = new Map<string, any[]>()
      const courseAnnouncements = new Map<string, any[]>()
      const courseFiles = new Map<string, any[]>()
      const courseModules = new Map<string, any[]>()

      // Fetch data for each visible course in parallel (batched)
      const batchSize = 3 // Fetch 3 courses at a time to avoid overwhelming the API

      for (let i = 0; i < visibleCourses.length; i += batchSize) {
        const batch = visibleCourses.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (course) => {
            const courseId = String(course.id)

            try {
              // Fetch assignments
              let assignments = queryClient.getQueryData(['course-assignments', courseId, 200]) as
                | any[]
                | undefined
              if (!assignments) {
                const res = await window.canvas.listAssignmentsWithSubmission(courseId, 200)
                if (res?.ok && res.data) {
                  assignments = res.data
                  queryClient.setQueryData(['course-assignments', courseId, 200], assignments)
                }
              }
              if (assignments) courseAssignments.set(courseId, assignments)

              // Fetch modules (includes module items)
              let modules = queryClient.getQueryData(['course-modules', courseId, 'v2']) as
                | any[]
                | undefined
              if (!modules) {
                const res = await window.canvas.listCourseModulesGql(courseId, 20, 50)
                if (res?.ok && res.data) {
                  modules = res.data
                  queryClient.setQueryData(['course-modules', courseId, 'v2'], modules)
                }
              }
              if (modules) courseModules.set(courseId, modules)

              // Fetch announcements
              let announcements = queryClient.getQueryData([
                'course-announcements',
                courseId,
                50,
              ]) as any[] | undefined
              if (!announcements) {
                const res = await window.canvas.listCourseAnnouncements?.(courseId, 50)
                if (res?.ok && res.data) {
                  announcements = res.data
                  queryClient.setQueryData(['course-announcements', courseId, 50], announcements)
                }
              }
              if (announcements) courseAnnouncements.set(courseId, announcements)

              // Fetch files
              let files = queryClient.getQueryData([
                'course-files',
                courseId,
                100,
                'updated_at',
                'desc',
              ]) as any[] | undefined
              if (!files) {
                const res = await window.canvas.listCourseFiles?.(
                  courseId,
                  100,
                  'updated_at',
                  'desc',
                )
                if (res?.ok && res.data) {
                  files = res.data
                  queryClient.setQueryData(
                    ['course-files', courseId, 100, 'updated_at', 'desc'],
                    files,
                  )
                }
              }
              if (files) courseFiles.set(courseId, files)
            } catch (e) {
              // Silently skip failed courses
              console.warn(`Failed to fetch data for course ${courseId}:`, e)
            }
          }),
        )
      }

      let itemCount = 0
      let builtItems: SearchResult[] = []
      try {
        const buildStart = debug ? performance.now() : 0
        const buildResult = await searchManager.buildIndex({
          courses: visibleCourses,
          courseAssignments,
          courseAnnouncements,
          courseFiles,
          courseModules,
        })
        itemCount = buildResult.count
        builtItems = buildResult.items

        if (debug) {
          const duration = Math.round(performance.now() - buildStart)
          console.debug(`[Search] Index build complete`, {
            courses: visibleCourses.length,
            items: itemCount,
            ms: duration,
          })
        }

        if (cancelled) return
        setIsReady(true)
        refreshNeededRef.current = false
        void persistSearchCache(builtItems, visibleCourseIds)
      } catch (error) {
        console.warn('[Search] Index build failed', error)
      } finally {
        if (!cancelled) setIsBuilding(false)
      }

      // Trigger embedding indexing in background (non-blocking)
      if (!cancelled && itemCount > 0 && embeddingEnabled) {
        idleId = scheduleIdle(() => {
          if (cancelled) return
          triggerEmbeddingIndex({
            courses: visibleCourses,
            courseAssignments,
            courseAnnouncements,
            courseFiles,
            courseModules,
          })

          // Also trigger Tier 1 auto-indexing for small files
          triggerFileAutoIndex({
            courses: visibleCourses,
            courseFiles,
          })
        }, 2500)
      }
    }, 1500) // 1.5 second delay after courses load

    return () => {
      cancelled = true
      clearTimeout(timer)
      cancelIdle(idleId)
    }
  }, [
    searchEnabled,
    visibleCourses,
    queryClient,
    embeddingEnabled,
    debug,
    persistSearchCache,
    visibleCourseIds,
  ])

  // Perform search
  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const start = debug ? performance.now() : 0
    let searchResults: SearchResult[] = []
    try {
      searchResults = await searchManager.search(q, 20)
      setResults(searchResults)
    } catch (e) {
      console.error('Search failed:', e)
      setResults([])
    } finally {
      setIsSearching(false)
      if (debug) {
        const duration = Math.round(performance.now() - start)
        console.debug(`[Search] Query complete`, {
          query: q,
          results: searchResults.length,
          ms: duration,
        })
      }
    }
  }, [debug])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsPendingSearch(false)
      return
    }

    setIsPendingSearch(true)
    const timer = setTimeout(() => {
      setIsPendingSearch(false)
      search(query)
    }, 150) // 150ms debounce

    return () => clearTimeout(timer)
  }, [query, search])

  // Retry search when index becomes ready (if user typed while building)
  useEffect(() => {
    if (isReady && !wasReadyRef.current && query.trim()) {
      // Index just became ready and we have a pending query - retry it
      search(query)
    }
    wasReadyRef.current = isReady
  }, [isReady, query, search])

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

      await Promise.all(
        batch.map(async (course) => {
          const courseId = String(course.id)

          try {
            // Force fetch (ignore cache)
            const [assignRes, modRes, annRes, fileRes] = await Promise.all([
              window.canvas.listAssignmentsWithSubmission(courseId, 200),
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
              queryClient.setQueryData(['course-modules', courseId, 'v2'], modRes.data)
            }
            if (annRes?.ok && annRes.data) {
              courseAnnouncements.set(courseId, annRes.data)
              queryClient.setQueryData(['course-announcements', courseId, 50], annRes.data)
            }
            if (fileRes?.ok && fileRes.data) {
              courseFiles.set(courseId, fileRes.data)
              queryClient.setQueryData(
                ['course-files', courseId, 100, 'updated_at', 'desc'],
                fileRes.data,
              )
            }
          } catch (e) {
            console.warn(`Failed to fetch data for course ${courseId}:`, e)
          }
        }),
      )
    }

    const buildResult = await searchManager.buildIndex({
      courses: visibleCourses,
      courseAssignments,
      courseAnnouncements,
      courseFiles,
      courseModules,
    })

    setIsReady(true)
    setIsBuilding(false)
    refreshNeededRef.current = false
    void persistSearchCache(buildResult.items, visibleCourseIds)

    // Trigger embedding indexing in background (non-blocking)
    if (embeddingEnabled) {
      triggerEmbeddingIndex({
        courses: visibleCourses,
        courseAssignments,
        courseAnnouncements,
        courseFiles,
        courseModules,
      })
    }
  }, [visibleCourses, queryClient, embeddingEnabled, persistSearchCache, visibleCourseIds])

  return useMemo(
    () => ({
      query,
      setQuery,
      results,
      isReady,
      isBuilding,
      isSearching,
      isPendingSearch,
      search,
      clearSearch,
      rebuildIndex,
      indexSize: searchManager.indexSize,
      embeddingStatus,
    }),
    [
      query,
      results,
      isReady,
      isBuilding,
      isSearching,
      isPendingSearch,
      search,
      clearSearch,
      rebuildIndex,
      embeddingStatus,
    ],
  )
}
