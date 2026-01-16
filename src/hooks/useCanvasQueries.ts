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
  CanvasFolder,
  CanvasFile,
  ActivityAnnouncement,
  CourseDiscussion,
  CourseInfo,
  AnnouncementDetail,
  CourseFrontPage,
  CanvasUser,
  CanvasGroup,
  Conversation,
  ConversationScope,
  Recipient,
  DiscussionTopic,
  DiscussionView,
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
    staleTime: 1000 * 60 * 2, // 2 minutes — keeps dashboard fresh
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
export function useActivityAnnouncements(n = 20, options?: Partial<UseQueryOptions<ActivityAnnouncement[], Error, ActivityAnnouncement[]>>) {
  return useQuery<ActivityAnnouncement[], Error, ActivityAnnouncement[]>({
    queryKey: ['activity-announcements', { n }],
    queryFn: async () => {
      const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 100 })
      const list = ensureOk(res as any) as ActivityAnnouncement[] || []
      const anns = (Array.isArray(list) ? list : []).filter((x) => (x?.type === 'Announcement'))
      anns.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      return anns.slice(0, Math.max(1, n))
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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

export function useFileMeta(fileId: string | number | undefined, options?: Partial<UseQueryOptions<CanvasFile | null, Error, CanvasFile | null>>) {
  return useQuery<CanvasFile | null, Error, CanvasFile | null>({
    queryKey: ['file-meta', fileId],
    queryFn: async () => {
      if (fileId == null) return null
      return ensureOk(await window.canvas.getFile?.(fileId)) as CanvasFile
    },
    enabled: fileId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useFileBytes(fileId: string | number | undefined, options?: Partial<UseQueryOptions<string, Error, string>>) {
  return useQuery<string, Error, string>({
    queryKey: ['file-bytes', fileId],
    queryFn: async () => {
      if (fileId == null) throw new Error('fileId is required')
      const res = await window.canvas.getFileBytes?.(fileId)
      if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
      return res.data as unknown as string
    },
    enabled: fileId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 60, // 1h caching for file bytes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
    // Tabs rarely change; keep them warm and cached for a long time
    staleTime: 1000 * 60 * 60 * 24, // 24h
    gcTime: 1000 * 60 * 60 * 24, // keep in cache for 24h
    ...options,
  })
}

export function useCourseAnnouncements(courseId: string | number | undefined, perPage = 50, options?: Partial<UseQueryOptions<CourseDiscussion[], Error, CourseDiscussion[]>>) {
  return useQuery<CourseDiscussion[], Error, CourseDiscussion[]>({
    queryKey: ['course-announcements', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseAnnouncements?.(courseId, perPage)) as CourseDiscussion[]
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseAnnouncementsInfinite(courseId: string | number | undefined, perPage = 10) {
  return useInfiniteQuery<CourseDiscussion[], Error>({
    queryKey: ['course-announcements-infinite', courseId, perPage],
    queryFn: async ({ pageParam = 1 }) => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseAnnouncementsPage?.(courseId, pageParam as number, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load announcements')
      return (res.data || []) as CourseDiscussion[]
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (!Array.isArray(lastPage) || lastPage.length < perPage) return undefined
      const curr = typeof lastPageParam === 'number' ? lastPageParam : 1
      return curr + 1
    },
    enabled: courseId != null,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAnnouncement(courseId: string | number | undefined, topicId: string | number | undefined, options?: Partial<UseQueryOptions<AnnouncementDetail | null, Error, AnnouncementDetail | null>>) {
  return useQuery<AnnouncementDetail | null, Error, AnnouncementDetail | null>({
    queryKey: ['announcement', courseId, topicId],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(await window.canvas.getAnnouncement?.(courseId, topicId)) as AnnouncementDetail
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    ...options,
  })
}

// Discussions
export function useCourseDiscussions(
  courseId: string | number | undefined,
  perPage = 50,
  options?: Partial<UseQueryOptions<DiscussionTopic[], Error, DiscussionTopic[]>>
) {
  return useQuery<DiscussionTopic[], Error, DiscussionTopic[]>({
    queryKey: ['course-discussions', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseDiscussions?.(courseId, perPage)) as DiscussionTopic[]
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useDiscussion(
  courseId: string | number | undefined,
  topicId: string | number | undefined,
  options?: Partial<UseQueryOptions<DiscussionTopic | null, Error, DiscussionTopic | null>>
) {
  return useQuery<DiscussionTopic | null, Error, DiscussionTopic | null>({
    queryKey: ['discussion', courseId, topicId],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(await window.canvas.getDiscussion?.(courseId, topicId)) as DiscussionTopic
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    ...options,
  })
}

export function useDiscussionView(
  courseId: string | number | undefined,
  topicId: string | number | undefined,
  options?: Partial<UseQueryOptions<DiscussionView | null, Error, DiscussionView | null>>
) {
  return useQuery<DiscussionView | null, Error, DiscussionView | null>({
    queryKey: ['discussion-view', courseId, topicId],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(await window.canvas.getDiscussionView?.(courseId, topicId)) as DiscussionView
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    ...options,
  })
}

export function useCourseInfo(courseId: string | number | undefined, options?: Partial<UseQueryOptions<CourseInfo | null, Error, CourseInfo | null>>) {
  return useQuery<CourseInfo | null, Error, CourseInfo | null>({
    queryKey: ['course-info', courseId],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseInfo?.(courseId)) as CourseInfo
    },
    enabled: courseId != null && (options?.enabled ?? true),
    // Course images rarely change; cache generously (7 days)
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    ...options,
  })
}

export function useCourseFrontPage(courseId: string | number | undefined, options?: Partial<UseQueryOptions<CourseFrontPage, Error, CourseFrontPage>>) {
  return useQuery<CourseFrontPage, Error, CourseFrontPage>({
    queryKey: ['course-front-page', courseId],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseFrontPage?.(courseId)) as CourseFrontPage
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseFiles(courseId: string | number | undefined, perPage = 100, sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at', order: 'asc' | 'desc' = 'desc', options?: Partial<UseQueryOptions<CanvasFile[], Error, CanvasFile[]>>) {
  return useQuery<CanvasFile[], Error, CanvasFile[]>({
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
export function useCourseFolders(courseId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<CanvasFolder[], Error, CanvasFolder[]>>) {
  return useQuery<CanvasFolder[], Error, CanvasFolder[]>({
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

export function useFolderFiles(folderId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<CanvasFile[], Error, CanvasFile[]>>) {
  return useQuery<CanvasFile[], Error, CanvasFile[]>({
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

export function useCourseUsers(courseId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<CanvasUser[], Error, CanvasUser[]>>) {
  return useQuery<CanvasUser[], Error, CanvasUser[]>({
    queryKey: ['course-users', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const canvas = window.canvas as typeof window.canvas & {
        listCourseUsers?: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listCourseUsers?.(courseId, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load course users')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10, // 10 min cache - users don't change often
    ...options,
  })
}

export function useCourseGroups(courseId: string | number | undefined, perPage = 100, options?: Partial<UseQueryOptions<CanvasGroup[], Error, CanvasGroup[]>>) {
  return useQuery<CanvasGroup[], Error, CanvasGroup[]>({
    queryKey: ['course-groups', courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const canvas = window.canvas as typeof window.canvas & {
        listCourseGroups?: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listCourseGroups?.(courseId, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load course groups')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10, // 10 min cache
    ...options,
  })
}

export function useMyGroups(contextType?: 'Account' | 'Course', options?: Partial<UseQueryOptions<CanvasGroup[], Error, CanvasGroup[]>>) {
  return useQuery<CanvasGroup[], Error, CanvasGroup[]>({
    queryKey: ['my-groups', contextType],
    queryFn: async () => {
      const canvas = window.canvas as typeof window.canvas & {
        listMyGroups?: (contextType?: 'Account' | 'Course') => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listMyGroups?.(contextType)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load my groups')
      return res.data || []
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
    ...options,
  })
}

// Conversations (Inbox)
export function useConversations(scope?: ConversationScope, perPage = 25, options?: Partial<UseQueryOptions<Conversation[], Error, Conversation[]>>) {
  return useQuery<Conversation[], Error, Conversation[]>({
    queryKey: ['conversations', scope, perPage],
    queryFn: async () => {
      const res = await window.canvas.listConversations?.({ scope, perPage })
      if (!res?.ok) throw new Error(res?.error || 'Failed to load conversations')
      return res.data || []
    },
    staleTime: 1000 * 30, // 30 seconds - messages can change frequently
    ...options,
  })
}

export function useConversation(conversationId: string | number | undefined, options?: Partial<UseQueryOptions<Conversation, Error, Conversation>>) {
  return useQuery<Conversation, Error, Conversation>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (conversationId == null) throw new Error('conversationId is required')
      const res = await window.canvas.getConversation?.(conversationId)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load conversation')
      return res.data
    },
    enabled: conversationId != null && (options?.enabled ?? true),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

export function useUnreadCount(options?: Partial<UseQueryOptions<number, Error, number>>) {
  return useQuery<number, Error, number>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await window.canvas.getUnreadCount?.()
      if (!res?.ok) throw new Error(res?.error || 'Failed to load unread count')
      return parseInt(res.data?.unread_count || '0', 10)
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Poll every 2 minutes for new messages
    ...options,
  })
}

export function useRecipientSearch(search: string, context?: string, options?: Partial<UseQueryOptions<Recipient[], Error, Recipient[]>>) {
  return useQuery<Recipient[], Error, Recipient[]>({
    queryKey: ['recipient-search', search, context],
    queryFn: async () => {
      if (!search.trim()) return []
      const res = await window.canvas.searchRecipients?.({ search, context, perPage: 10 })
      if (!res?.ok) throw new Error(res?.error || 'Failed to search recipients')
      return res.data || []
    },
    enabled: search.trim().length >= 2 && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}
