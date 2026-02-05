import {
  useQuery,
  UseQueryOptions,
  UseInfiniteQueryOptions,
  type InfiniteData,
  useInfiniteQuery,
} from '@tanstack/react-query'
import type {
  CanvasProfile,
  CanvasCourse,
  CanvasAssignment,
  CanvasQuiz,
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
  SubmissionDetail,
  AssignmentRestDetail,
  CanvasPage,
} from '../types/canvas'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
}

function keyId(id: string | number | null | undefined) {
  return id == null ? id : String(id)
}

function filterDueAssignmentsByDays(list: DueItem[], days: number) {
  const now = Date.now()
  const horizon = now + Math.max(0, days) * 24 * 60 * 60 * 1000
  return (Array.isArray(list) ? list : []).filter((it) => {
    const raw = (it as any)?.dueAt
    if (!raw) return true
    const t = Date.parse(String(raw))
    if (!Number.isFinite(t)) return true
    return t <= horizon
  })
}

export function useProfile(
  options?: Partial<UseQueryOptions<CanvasProfile, Error, CanvasProfile>>,
) {
  return useQuery<CanvasProfile, Error, CanvasProfile>({
    queryKey: ['profile'],
    queryFn: async () => ensureOk(await window.canvas.getProfile()),
    ...options,
  })
}

export function useCourses(
  params: { enrollment_state?: string } = {},
  options?: Partial<UseQueryOptions<CanvasCourse[], Error, CanvasCourse[]>>,
) {
  return useQuery<CanvasCourse[], Error, CanvasCourse[]>({
    queryKey: ['courses', params],
    queryFn: async () => ensureOk(await window.canvas.listCourses(params)),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useDueAssignments(
  params: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean } = {},
  options?: Partial<UseQueryOptions<DueItem[], Error, DueItem[]>>,
) {
  const days = typeof params.days === 'number' && Number.isFinite(params.days) ? params.days : 365
  const { select: _select, ...rest } = options ?? {}
  return useQuery<DueItem[], Error, DueItem[]>({
    // Student-only: standardize to a single cached list, then slice/filter client-side.
    queryKey: ['due-assignments'],
    queryFn: async () =>
      ensureOk(
        await window.canvas.listDueAssignments({
          days: 365,
          onlyPublished: true,
          includeCourseName: true,
        }),
      ),
    select: (data) => filterDueAssignmentsByDays(data || [], days),
    // Due assignments change less frequently; keep cache warm longer to avoid
    // constant refetching/popping when navigating.
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...rest,
  })
}

export function useCourseAssignments(
  courseId: string | number | undefined,
  first = 200,
  options?: Partial<UseQueryOptions<CanvasAssignment[], Error, CanvasAssignment[]>>,
) {
  return useQuery<CanvasAssignment[], Error, CanvasAssignment[]>({
    queryKey: ['course-assignments', courseId != null ? String(courseId) : courseId, first],
    queryFn: async () => {
      if (courseId == null) return []
      // Use REST endpoint with submission data included for "Done" status
      return ensureOk(await window.canvas.listAssignmentsWithSubmission(String(courseId), first))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseQuizzes(
  courseId: string | number | undefined,
  perPage = 100,
  options?: Partial<UseQueryOptions<CanvasQuiz[], Error, CanvasQuiz[]>>,
) {
  return useQuery<CanvasQuiz[], Error, CanvasQuiz[]>({
    queryKey: ['course-quizzes', courseId != null ? String(courseId) : courseId, perPage],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseQuizzes(String(courseId), perPage))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseQuiz(
  courseId: string | number | undefined,
  quizId: string | number | undefined,
  options?: Partial<UseQueryOptions<CanvasQuiz | null, Error, CanvasQuiz | null>>,
) {
  return useQuery<CanvasQuiz | null, Error, CanvasQuiz | null>({
    queryKey: ['course-quiz', keyId(courseId), keyId(quizId)],
    queryFn: async () => {
      if (courseId == null || quizId == null) return null
      return ensureOk(await window.canvas.getCourseQuiz(String(courseId), String(quizId))) as CanvasQuiz
    },
    enabled: courseId != null && quizId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  })
}

export function useCourseModules(
  courseId: string | number | undefined,
  options?: Partial<UseQueryOptions<CanvasModule[], Error, CanvasModule[]>>,
) {
  return useQuery<CanvasModule[], Error, CanvasModule[]>({
    queryKey: ['course-modules', courseId != null ? String(courseId) : courseId, 'v2'],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseModulesGql(String(courseId), 20, 50))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useUpcoming(
  options?: Partial<UseQueryOptions<UpcomingEvent[], Error, UpcomingEvent[]>>,
) {
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
export function useActivityAnnouncements(
  n = 20,
  options?: Partial<UseQueryOptions<ActivityAnnouncement[], Error, ActivityAnnouncement[]>>,
) {
  const { select: _select, ...rest } = options ?? {}
  return useQuery<ActivityAnnouncement[], Error, ActivityAnnouncement[]>({
    queryKey: ['activity-announcements'],
    queryFn: async () => {
      const res = await window.canvas.listActivityStream?.({
        onlyActiveCourses: true,
        perPage: 100,
      })
      const list = (ensureOk(res as any) as ActivityAnnouncement[]) || []
      const anns = (Array.isArray(list) ? list : []).filter((x) => x?.type === 'Announcement')
      anns.sort(
        (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
      )
      return anns
    },
    select: (anns) => (Array.isArray(anns) ? anns : []).slice(0, Math.max(1, n)),
    // Announcements are time-sensitive; refresh more often.
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...rest,
  })
}

export function useCoursePage(
  courseId: string | number | undefined,
  slugOrUrl: string | undefined,
  options?: Partial<UseQueryOptions<CanvasPage | null, Error, CanvasPage | null>>,
) {
  return useQuery<CanvasPage | null, Error, CanvasPage | null>({
    queryKey: ['course-page', keyId(courseId), slugOrUrl],
    queryFn: async () => {
      if (courseId == null || !slugOrUrl) return null
      return ensureOk(
        await window.canvas.getCoursePage?.(String(courseId), slugOrUrl),
      ) as CanvasPage
    },
    enabled: courseId != null && !!slugOrUrl && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    // Detail views: show cached instantly, but always revalidate when opened.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  })
}

export function useAssignmentRest(
  courseId: string | number | undefined,
  assignmentRestId: string | number | undefined,
  include: string[] = [],
  options?: Partial<
    UseQueryOptions<AssignmentRestDetail | null, Error, AssignmentRestDetail | null>
  >,
) {
  return useQuery<AssignmentRestDetail | null, Error, AssignmentRestDetail | null>({
    queryKey: [
      'assignment-rest',
      keyId(courseId),
      keyId(assignmentRestId),
      include.slice().sort().join(','),
    ],
    queryFn: async () => {
      if (courseId == null || assignmentRestId == null) return null
      return ensureOk(
        await window.canvas.getAssignmentRest?.(
          String(courseId),
          String(assignmentRestId),
          include,
        ),
      )
    },
    enabled: courseId != null && assignmentRestId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    // Detail views: show cached instantly, but always revalidate when opened.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  })
}

export function useMySubmission(
  courseId: string | number | undefined,
  assignmentRestId: string | number | undefined,
  include: string[] = [],
  options?: Partial<UseQueryOptions<SubmissionDetail | null, Error, SubmissionDetail | null>>,
) {
  return useQuery<SubmissionDetail | null, Error, SubmissionDetail | null>({
    queryKey: [
      'my-submission',
      keyId(courseId),
      keyId(assignmentRestId),
      include.slice().sort().join(','),
    ],
    queryFn: async () => {
      if (courseId == null || assignmentRestId == null) return null
      const res = await window.canvas.getMySubmission?.(
        String(courseId),
        String(assignmentRestId),
        include,
      )
      if (!res?.ok) throw new Error(res?.error || 'Failed to load submission')
      return (res.data || null) as SubmissionDetail | null
    },
    enabled: courseId != null && assignmentRestId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  })
}

export function useFileMeta(
  fileId: string | number | undefined,
  options?: Partial<UseQueryOptions<CanvasFile | null, Error, CanvasFile | null>>,
) {
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

export function useFileBytes(
  fileId: string | number | undefined,
  options?: Partial<UseQueryOptions<string, Error, string>>,
) {
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

export function useCourseTabs(
  courseId: string | number | undefined,
  includeExternal = true,
  options?: Partial<UseQueryOptions<CanvasTab[], Error, CanvasTab[]>>,
) {
  return useQuery<CanvasTab[], Error, CanvasTab[]>({
    queryKey: ['course-tabs', keyId(courseId), includeExternal],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(await window.canvas.listCourseTabs?.(String(courseId), includeExternal))
    },
    enabled: courseId != null && (options?.enabled ?? true),
    // Tabs rarely change, but refetch periodically to avoid stale localization issues
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // keep in cache for 1h
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useCourseAnnouncements(
  courseId: string | number | undefined,
  perPage = 50,
  options?: Partial<UseQueryOptions<CourseDiscussion[], Error, CourseDiscussion[]>>,
) {
  return useQuery<CourseDiscussion[], Error, CourseDiscussion[]>({
    queryKey: ['course-announcements', keyId(courseId), perPage],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(
        await window.canvas.listCourseAnnouncements?.(String(courseId), perPage),
      ) as CourseDiscussion[]
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCourseAnnouncementsInfinite(
  courseId: string | number | undefined,
  perPage = 10,
) {
  return useInfiniteQuery<CourseDiscussion[], Error>({
    queryKey: ['course-announcements-infinite', keyId(courseId), perPage],
    queryFn: async ({ pageParam = 1 }) => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseAnnouncementsPage?.(
        String(courseId),
        pageParam as number,
        perPage,
      )
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

export function useAnnouncement(
  courseId: string | number | undefined,
  topicId: string | number | undefined,
  options?: Partial<UseQueryOptions<AnnouncementDetail | null, Error, AnnouncementDetail | null>>,
) {
  return useQuery<AnnouncementDetail | null, Error, AnnouncementDetail | null>({
    queryKey: ['announcement', keyId(courseId), keyId(topicId)],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(
        await window.canvas.getAnnouncement?.(String(courseId), String(topicId)),
      ) as AnnouncementDetail
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    // Detail views: show cached instantly, but always revalidate when opened.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  })
}

// Discussions
export function useCourseDiscussions(
  courseId: string | number | undefined,
  params: {
    perPage?: number
    searchTerm?: string
    filterBy?: 'all' | 'unread'
    scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
    orderBy?: 'position' | 'recent_activity' | 'title'
    maxPages?: number
  } = {},
  options?: Partial<UseQueryOptions<DiscussionTopic[], Error, DiscussionTopic[]>>,
) {
  const { perPage = 50, ...restParams } = params

  // Clean undefined/empty values from restParams to normalize key
  const cleanParams: Record<string, any> = {}
  if (restParams.searchTerm?.trim()) cleanParams.searchTerm = restParams.searchTerm.trim()
  if (restParams.filterBy) cleanParams.filterBy = restParams.filterBy
  if (restParams.scope) cleanParams.scope = restParams.scope
  if (restParams.orderBy) cleanParams.orderBy = restParams.orderBy
  if (restParams.maxPages) cleanParams.maxPages = restParams.maxPages

  return useQuery<DiscussionTopic[], Error, DiscussionTopic[]>({
    queryKey: ['course-discussions', keyId(courseId), perPage, cleanParams],
    queryFn: async () => {
      if (courseId == null) return []
      return ensureOk(
        await window.canvas.listCourseDiscussions?.(String(courseId), { perPage, ...cleanParams }),
      ) as DiscussionTopic[]
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useDiscussion(
  courseId: string | number | undefined,
  topicId: string | number | undefined,
  options?: Partial<UseQueryOptions<DiscussionTopic | null, Error, DiscussionTopic | null>>,
) {
  return useQuery<DiscussionTopic | null, Error, DiscussionTopic | null>({
    queryKey: ['discussion', keyId(courseId), keyId(topicId)],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(
        await window.canvas.getDiscussion?.(String(courseId), String(topicId)),
      ) as DiscussionTopic
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useDiscussionView(
  courseId: string | number | undefined,
  topicId: string | number | undefined,
  options?: Partial<UseQueryOptions<DiscussionView | null, Error, DiscussionView | null>>,
) {
  return useQuery<DiscussionView | null, Error, DiscussionView | null>({
    queryKey: ['discussion-view', keyId(courseId), keyId(topicId)],
    queryFn: async () => {
      if (courseId == null || topicId == null) return null
      return ensureOk(
        await window.canvas.getDiscussionView?.(String(courseId), String(topicId)),
      ) as DiscussionView
    },
    enabled: courseId != null && topicId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseInfo(
  courseId: string | number | undefined,
  options?: Partial<UseQueryOptions<CourseInfo | null, Error, CourseInfo | null>>,
) {
  return useQuery<CourseInfo | null, Error, CourseInfo | null>({
    queryKey: ['course-info', keyId(courseId)],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseInfo?.(String(courseId))) as CourseInfo
    },
    enabled: courseId != null && (options?.enabled ?? true),
    // Course images rarely change; cache generously (7 days)
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    ...options,
  })
}

export function useCourseFrontPage(
  courseId: string | number | undefined,
  options?: Partial<UseQueryOptions<CourseFrontPage, Error, CourseFrontPage>>,
) {
  return useQuery<CourseFrontPage, Error, CourseFrontPage>({
    queryKey: ['course-front-page', keyId(courseId)],
    queryFn: async () => {
      if (courseId == null) return null
      return ensureOk(await window.canvas.getCourseFrontPage?.(String(courseId))) as CourseFrontPage
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseFiles(
  courseId: string | number | undefined,
  perPage = 100,
  sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at',
  order: 'asc' | 'desc' = 'desc',
  options?: Partial<UseQueryOptions<CanvasFile[], Error, CanvasFile[]>>,
) {
  return useQuery<CanvasFile[], Error, CanvasFile[]>({
    queryKey: ['course-files', keyId(courseId), perPage, sort, order],
    queryFn: async () => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseFiles?.(String(courseId), perPage, sort, order)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load files')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}
export function useCourseFolders(
  courseId: string | number | undefined,
  perPage = 100,
  options?: Partial<UseQueryOptions<CanvasFolder[], Error, CanvasFolder[]>>,
) {
  return useQuery<CanvasFolder[], Error, CanvasFolder[]>({
    queryKey: ['course-folders', keyId(courseId), perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const res = await window.canvas.listCourseFolders?.(String(courseId), perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load folders')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useFolderFiles(
  folderId: string | number | undefined,
  perPage = 100,
  options?: Partial<UseQueryOptions<CanvasFile[], Error, CanvasFile[]>>,
) {
  return useQuery<CanvasFile[], Error, CanvasFile[]>({
    queryKey: ['folder-files', folderId, perPage],
    queryFn: async () => {
      if (folderId == null) return []
      const res = await window.canvas.listFolderFiles?.(folderId, perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load folder files')
      return res.data || []
    },
    enabled: folderId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseUsers(
  courseId: string | number | undefined,
  perPage = 100,
  options?: Partial<UseQueryOptions<CanvasUser[], Error, CanvasUser[]>>,
) {
  return useQuery<CanvasUser[], Error, CanvasUser[]>({
    queryKey: ['course-users', keyId(courseId), perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const canvas = window.canvas as typeof window.canvas & {
        listCourseUsers?: (
          courseId: string | number,
          perPage?: number,
        ) => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listCourseUsers?.(String(courseId), perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load course users')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10, // 10 min cache - users don't change often
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useCourseGroups(
  courseId: string | number | undefined,
  perPage = 100,
  options?: Partial<UseQueryOptions<CanvasGroup[], Error, CanvasGroup[]>>,
) {
  return useQuery<CanvasGroup[], Error, CanvasGroup[]>({
    queryKey: ['course-groups', keyId(courseId), perPage],
    queryFn: async () => {
      if (courseId == null) return []
      const canvas = window.canvas as typeof window.canvas & {
        listCourseGroups?: (
          courseId: string | number,
          perPage?: number,
        ) => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listCourseGroups?.(String(courseId), perPage)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load course groups')
      return res.data || []
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 10, // 10 min cache
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useMyGroups(
  contextType?: 'Account' | 'Course',
  options?: Partial<UseQueryOptions<CanvasGroup[], Error, CanvasGroup[]>>,
) {
  return useQuery<CanvasGroup[], Error, CanvasGroup[]>({
    queryKey: ['my-groups', contextType],
    queryFn: async () => {
      const canvas = window.canvas as typeof window.canvas & {
        listMyGroups?: (
          contextType?: 'Account' | 'Course',
        ) => Promise<{ ok: boolean; data?: any; error?: string }>
      }
      const res = await canvas.listMyGroups?.(contextType)
      if (!res?.ok) throw new Error(res?.error || 'Failed to load my groups')
      return res.data || []
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

// Conversations (Inbox)
export type ConversationsPage = {
  items: Conversation[]
  nextPageUrl?: string | null
}

export async function fetchConversationsPage(params: {
  scope?: ConversationScope
  perPage?: number
  pageUrl?: string
}): Promise<ConversationsPage> {
  const res = await window.canvas.listConversations?.({
    scope: params.scope,
    perPage: params.perPage,
    pageUrl: params.pageUrl,
  })
  if (!res?.ok) throw new Error(res?.error || 'Failed to load conversations')
  const data = res.data as ConversationsPage | Conversation[] | undefined
  if (Array.isArray(data)) {
    return { items: data, nextPageUrl: null }
  }
  return {
    items: Array.isArray(data?.items) ? data!.items : [],
    nextPageUrl: data?.nextPageUrl ?? null,
  }
}

export function useConversations(
  scope?: ConversationScope,
  perPage = 20,
  options?: Partial<UseInfiniteQueryOptions<ConversationsPage, Error, InfiniteData<ConversationsPage>>>,
) {
  const normalizedScope = scope ?? 'inbox'
  return useInfiniteQuery<ConversationsPage, Error, InfiniteData<ConversationsPage>>({
    queryKey: ['conversations', normalizedScope, perPage, 'v2'],
    queryFn: ({ pageParam }) =>
      fetchConversationsPage({
        scope: normalizedScope,
        perPage,
        pageUrl: typeof pageParam === 'string' ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPageUrl ?? undefined,
    initialPageParam: undefined,
    // Inbox: avoid refetching on every open; still refresh reasonably often.
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...options,
  })
}

export function useConversation(
  conversationId: string | number | undefined,
  options?: Partial<UseQueryOptions<Conversation, Error, Conversation>>,
) {
  return useQuery<Conversation, Error, Conversation>({
    queryKey: ['conversation', keyId(conversationId)],
    queryFn: async () => {
      if (conversationId == null) throw new Error('conversationId is required')
      const res = await window.canvas.getConversation?.(String(conversationId))
      if (!res?.ok) throw new Error(res?.error || 'Failed to load conversation')
      return res.data
    },
    enabled: conversationId != null && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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

export function useRecipientSearch(
  search: string,
  context?: string,
  options?: Partial<UseQueryOptions<Recipient[], Error, Recipient[]>>,
) {
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
