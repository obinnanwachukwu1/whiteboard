import { useQuery, UseQueryOptions, useInfiniteQuery } from '@tanstack/react-query'
import type {
  CanvasProfile,
  CanvasCourse,
  CanvasAssignment,
  CanvasModule,
  UpcomingEvent,
  TodoItem,
  DueItem,
  CanvasTab,
} from '../types/canvas'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
}

export function useProfile(options?: Partial<UseQueryOptions<CanvasProfile, Error, CanvasProfile>>) {
  return useQuery<CanvasProfile, Error, CanvasProfile>({
    queryKey: ['profile'],
    queryFn: async () => ensureOk(await window.canvas.getProfile()),
    ...options,
  })
}

export function useCourses(params: { enrollment_state?: string } = {}, options?: Partial<UseQueryOptions<CanvasCourse[], Error, CanvasCourse[]>>) {
  return useQuery<CanvasCourse[], Error, CanvasCourse[]>({
    queryKey: ['courses', params],
    queryFn: async () => ensureOk(await window.canvas.listCourses(params)),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useDueAssignments(params: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean } = {}, options?: Partial<UseQueryOptions<DueItem[], Error, DueItem[]>>) {
  return useQuery<DueItem[], Error, DueItem[]>({
    queryKey: ['due-assignments', params],
    queryFn: async () => ensureOk(await window.canvas.listDueAssignments(params)),
    staleTime: 1000 * 30, // 30s — keeps dashboard fresh
    ...options,
  })
}

export function useCourseAssignments(courseId: string | number | undefined, first = 200, options?: Partial<UseQueryOptions<CanvasAssignment[], Error, CanvasAssignment[]>>) {
  return useQuery<CanvasAssignment[], Error, CanvasAssignment[]>({
    queryKey: ['course-assignments', courseId != null ? String(courseId) : courseId, first],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseAssignments(String(courseId), first))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5, // keep warm for faster tab switches
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseModules(courseId: string | number | undefined, options?: Partial<UseQueryOptions<CanvasModule[], Error, CanvasModule[]>>) {
  return useQuery<CanvasModule[], Error, CanvasModule[]>({
    queryKey: ['course-modules', courseId != null ? String(courseId) : courseId],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseModulesGql(String(courseId), 20, 50))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    ...options,
  })
}

export function useUpcoming(options?: Partial<UseQueryOptions<UpcomingEvent[], Error, UpcomingEvent[]>>) {
  return useQuery<UpcomingEvent[], Error, UpcomingEvent[]>({
    queryKey: ['upcoming'],
    queryFn: async () => ensureOk(await window.canvas.listUpcoming?.({ onlyActiveCourses: true })),
    staleTime: 1000 * 30,
    ...options,
  })
}

export function useTodo(options?: Partial<UseQueryOptions<TodoItem[], Error, TodoItem[]>>) {
  return useQuery<TodoItem[], Error, TodoItem[]>({
    queryKey: ['todo'],
    queryFn: async () => ensureOk(await window.canvas.listTodo?.()),
    staleTime: 1000 * 30,
    ...options,
  })
}

// Single-call cross-course announcements via activity_stream
export function useActivityAnnouncements(n = 20, options?: Partial<UseQueryOptions<any[], Error, any[]>>) {
  return useQuery<any[], Error, any[]>({
    queryKey: ['activity-announcements', { n }],
    queryFn: async () => {
      const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 100 })
      const list = ensureOk(res as any) || []
      const anns = (Array.isArray(list) ? list : []).filter((x: any) => (x?.type === 'Announcement'))
      anns.sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      return anns.slice(0, Math.max(1, n))
    },
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useCoursePage(courseId: string | number | undefined, slugOrUrl: string | undefined, options?: Partial<UseQueryOptions<{ body?: string }, Error, { body?: string }>>) {
  return useQuery<{ body?: string }, Error, { body?: string }>({
    queryKey: ['course-page', courseId, slugOrUrl],
    queryFn: async () => {
      if (courseId == null || !slugOrUrl) return null
      return ensureOk(await window.canvas.getCoursePage?.(courseId, slugOrUrl))
    },
    enabled: courseId != null && !!slugOrUrl && (options?.enabled ?? true),
    ...options,
  })
}

export function useAssignmentRest(courseId: string | number | undefined, assignmentRestId: string | number | undefined, options?: Partial<UseQueryOptions<{ description?: string }, Error, { description?: string }>>) {
  return useQuery<{ description?: string }, Error, { description?: string }>({
    queryKey: ['assignment-rest', courseId, assignmentRestId],
    queryFn: async () => {
      if (courseId == null || assignmentRestId == null) return null
      return ensureOk(await window.canvas.getAssignmentRest?.(courseId, assignmentRestId))
    },
    enabled: courseId != null && assignmentRestId != null && (options?.enabled ?? true),
    ...options,
  })
}

export function useFileMeta(fileId: string | number | undefined, options?: Partial<UseQueryOptions<any, Error, any>>) {
  return useQuery<any, Error, any>({
    queryKey: ['file-meta', fileId],
    queryFn: async () => {
      if (fileId == null) return null
      return ensureOk(await window.canvas.getFile?.(fileId))
    },
    enabled: fileId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useFileBytes(fileId: string | number | undefined, options?: Partial<UseQueryOptions<ArrayBuffer, Error, ArrayBuffer>>) {
  return useQuery<ArrayBuffer, Error, ArrayBuffer>({
    queryKey: ['file-bytes', fileId],
    queryFn: async () => {
      if (fileId == null) throw new Error('fileId is required')
      return ensureOk(await window.canvas.getFileBytes?.(fileId))
    },
    enabled: fileId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 60, // 1h caching for file bytes
    ...options,
  })
}

export function useCourseTabs(courseId: string | number | undefined, includeExternal = true, options?: Partial<UseQueryOptions<CanvasTab[], Error, CanvasTab[]>>) {
  return useQuery<CanvasTab[], Error, CanvasTab[]>({
    queryKey: ['course-tabs', courseId, includeExternal],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseTabs?.(courseId, includeExternal))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseAnnouncements(courseId: string | number | undefined, perPage = 50, options?: Partial<UseQueryOptions<any[], Error, any[]>>) {
  return useQuery<any[], Error, any[]>({
    queryKey: ['course-announcements', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseAnnouncements?.(courseId, perPage))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useAnnouncement(courseId: string | number | undefined, topicId: string | number | undefined, options?: Partial<UseQueryOptions<any, Error, any>>) {
  return useQuery<any, Error, any>({
    queryKey: ['announcement', courseId, topicId],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(await window.canvas.getAnnouncement?.(courseId, topicId))
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    ...options,
  })
}

export function useCourseInfo(courseId: string | number | undefined, options?: Partial<UseQueryOptions<any, Error, any>>) {
  return useQuery<any, Error, any>({
    queryKey: ['course-info', courseId],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseInfo?.(courseId))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseFrontPage(courseId: string | number | undefined, options?: Partial<UseQueryOptions<any, Error, any>>) {
  return useQuery<any, Error, any>({
    queryKey: ['course-front-page', courseId],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseFrontPage?.(courseId))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseAnnouncementsInfinite(courseId: string | number | undefined, perPage = 10) {
  return useInfiniteQuery<any[], Error, any[], any, number>({
    queryKey: ['course-announcements-infinite', courseId, perPage],
    queryFn: async ({ pageParam = 1 }) => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseAnnouncementsPage?.(courseId, pageParam, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load announcements')
      return res.data || []
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      // If we received less than perPage items, assume no more pages
      if (!Array.isArray(lastPage) || lastPage.length < perPage) return undefined
      return (lastPageParam || 1) + 1
    },
    enabled: courseId != null,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCourseFiles(courseId: string | number | undefined, perPage = 100, sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at', order: 'asc' | 'desc' = 'desc', options?: Partial<UseQueryOptions<any[], Error, any[]>>) {
  return useQuery<any[], Error, any[]>({
    queryKey: ['course-files', courseId, perPage, sort, order],
    queryFn: async () => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseFiles?.(courseId, perPage, sort, order)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load files')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}
export function useCourseFolders(courseId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<any[], Error, any[]>>) {
  return useQuery<any[], Error, any[]>({
    queryKey: ['course-folders', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseFolders?.(courseId, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load folders')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useFolderFiles(folderId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<any[], Error, any[]>>) {
  return useQuery<any[], Error, any[]>({
    queryKey: ['folder-files', folderId, perPage],
    queryFn: async () => {
      if (folderId == null) return []
      const res = await window.canvas.listFolderFiles?.(folderId, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load folder files')
      return res.data || []
    },
    enabled: folderId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}
