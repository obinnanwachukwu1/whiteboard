import { useQuery, UseQueryOptions } from '@tanstack/react-query'
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
