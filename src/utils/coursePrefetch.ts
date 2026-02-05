import type { QueryClient } from '@tanstack/react-query'

const tabCooldownMs = 10 * 60 * 1000
const lastTabPrefetch = new Map<string, number>()

export async function prefetchCourseTab(queryClient: QueryClient, courseId: string | number, tab: string) {
  const id = String(courseId)

  const key = `${id}:${tab}`
  const last = lastTabPrefetch.get(key) || 0
  if (Date.now() - last < tabCooldownMs) return

  try {
    switch (tab) {
      case 'modules':
        await queryClient.prefetchQuery({
          queryKey: ['course-modules', id, 'v2'],
          queryFn: async () => {
            const res = await window.canvas.listCourseModulesGql(id, 20, 50)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load modules')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'assignments':
        await queryClient.prefetchQuery({
          queryKey: ['course-assignments', id, 200],
          queryFn: async () => {
            const res = await window.canvas.listAssignmentsWithSubmission(id, 200)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'quizzes':
        await queryClient.prefetchQuery({
          queryKey: ['course-quizzes', id, 100],
          queryFn: async () => {
            const res = await window.canvas.listCourseQuizzes?.(id, 100)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load quizzes')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'announcements':
        await queryClient.prefetchInfiniteQuery({
          queryKey: ['course-announcements-infinite', id, 10],
          queryFn: async ({ pageParam = 1 }) => {
            const res = await window.canvas.listCourseAnnouncementsPage?.(id, pageParam as number, 10)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load announcements')
            return (res.data || [])
          },
          initialPageParam: 1,
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'discussions':
        await queryClient.prefetchQuery({
          queryKey: ['course-discussions', id, 50, { maxPages: 2 }],
          queryFn: async () => {
            const res = await window.canvas.listCourseDiscussions?.(id, { perPage: 50, maxPages: 2 })
            if (!res?.ok) throw new Error(res?.error || 'Failed to load discussions')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'grades':
        await queryClient.prefetchQuery({
          queryKey: ['course-gradebook', id],
          queryFn: async () => {
            const [groupsRes, assignmentsRes] = await Promise.all([
              window.canvas.listAssignmentGroups(id, false),
              window.canvas.listAssignmentsWithSubmission(id, 100),
            ])
            if (!groupsRes?.ok) throw new Error(groupsRes?.error || 'Failed to load assignment groups')
            if (!assignmentsRes?.ok) throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
            return { groups: groupsRes.data || [], raw: assignmentsRes.data || [], assignments: [] as any[] }
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'people':
        await queryClient.prefetchQuery({
          queryKey: ['course-users', id, 100],
          queryFn: async () => {
            const canvas = window.canvas as typeof window.canvas & {
              listCourseUsers?: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
            }
            const res = await canvas.listCourseUsers?.(id, 100)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load course users')
            return res.data || []
          },
          staleTime: 1000 * 60 * 10,
        })
        break

      case 'files':
        // Skip prefetching files to reduce API load; load on-demand when tab opens
        break

      case 'home':
        await queryClient.prefetchQuery({
          queryKey: ['course-front-page', id],
          queryFn: async () => {
            const res = await window.canvas.getCourseFrontPage?.(id)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load front page')
            return res.data || null
          },
          staleTime: 1000 * 60 * 5,
        })
        break
    }
    lastTabPrefetch.set(key, Date.now())
  } catch (e) {
    console.error(`Failed to prefetch tab ${tab}`, e)
  }
}
