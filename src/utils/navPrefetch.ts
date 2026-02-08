import type { QueryClient } from '@tanstack/react-query'
import { courseGradebookQueryKey, fetchCourseGradebook } from '../hooks/courseGradebookQuery'

export async function prefetchNavTab(
  queryClient: QueryClient,
  tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  courses: Array<{ id: string | number }>,
) {
  try {
    switch (tab) {
      case 'dashboard':
        // Dashboard uses 60 days to catch "also due" items + needs specific flags
        // We use fetchQuery for assignments so we can read the result immediately and prefetch weights

        await Promise.all([
          queryClient
            .fetchQuery({
              // Shared due list cache (student-only; onlyPublished)
              queryKey: ['due-assignments'],
              queryFn: async () => {
                const res = await window.canvas.listDueAssignments({
                  days: 365,
                  onlyPublished: true,
                  includeCourseName: true,
                })
                if (!res?.ok) throw new Error(res?.error || 'Failed')
                return res.data || []
              },
              staleTime: 1000 * 60 * 5,
            })
            .then((allAssignments: any[]) => {
              // Identify courses that need weights (limit to near-term assignments to avoid excess)
              const now = Date.now()
              const horizon = now + 60 * 24 * 60 * 60 * 1000
              const courseIds = new Set<string>()
              for (const a of Array.isArray(allAssignments) ? allAssignments : []) {
                const raw = (a as any)?.dueAt
                const t = raw ? Date.parse(String(raw)) : NaN
                if (Number.isFinite(t) && t > horizon) continue
                if (a?.course_id != null) courseIds.add(String(a.course_id))
              }

              const weightPromises = Array.from(courseIds).map((cid) =>
                queryClient.prefetchQuery({
                  queryKey: ['course-assignment-groups-with-assignments', cid],
                  queryFn: async () => {
                    const res = await window.canvas.listAssignmentGroups(cid, true)
                    if (!res?.ok) throw new Error(res?.error || 'Failed to load assignment groups')
                    return { courseId: cid, groups: res.data || [] }
                  },
                  staleTime: 1000 * 60 * 30,
                }),
              )
              return Promise.all(weightPromises)
            }),

          queryClient.prefetchQuery({
            queryKey: ['activity-announcements'],
            queryFn: async () => {
              const res = await window.canvas.listActivityStream?.({
                onlyActiveCourses: true,
                perPage: 100,
              })
              const list = (res?.ok ? res.data : []) as any[]
              const anns = (Array.isArray(list) ? list : []).filter(
                (x) => x?.type === 'Announcement',
              )
              anns.sort(
                (a, b) =>
                  new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
              )
              return anns
            },
            staleTime: 1000 * 60 * 5,
          }),
        ])
        break

      case 'announcements':
        // AnnouncementsPage uses n=200
        await queryClient.prefetchQuery({
          queryKey: ['activity-announcements'],
          queryFn: async () => {
            const res = await window.canvas.listActivityStream?.({
              onlyActiveCourses: true,
              perPage: 100,
            })
            const list = (res?.ok ? res.data : []) as any[]
            const anns = (Array.isArray(list) ? list : []).filter((x) => x?.type === 'Announcement')
            anns.sort(
              (a, b) =>
                new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
            )
            return anns
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'assignments':
        // AssignmentsPage uses days=365, includeCourseName=true
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['due-assignments'],
            queryFn: async () => {
              const res = await window.canvas.listDueAssignments({
                days: 365,
                onlyPublished: true,
                includeCourseName: true,
              })
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.prefetchQuery({
            queryKey: ['upcoming'],
            queryFn: async () => {
              const res = await window.canvas.listUpcoming?.({ onlyActiveCourses: true })
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 30,
          }),
        ])
        break

      case 'grades': {
        // GradesPage loads course list, then prefetches gradebooks.
        // We can prefetch the course list AND start prefetching gradebooks for top courses.
        await queryClient.prefetchQuery({
          queryKey: ['courses', { enrollment_state: 'active' }],
          queryFn: async () => {
            const res = await window.canvas.listCourses({ enrollment_state: 'active' })
            if (!res?.ok) throw new Error(res?.error || 'Failed')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })

        // Also prefetch gradebooks for top 3 courses to speed up the grid render
        const gradeCourses = courses.slice(0, 3)
        await Promise.all(
          gradeCourses.map((c) =>
            queryClient.prefetchQuery({
              queryKey: courseGradebookQueryKey(String(c.id)),
              queryFn: async () => fetchCourseGradebook(String(c.id), 100),
              staleTime: 1000 * 60 * 5,
            }),
          ),
        )
        break
      }

      case 'discussions': {
        // DiscussionsPage loads discussions for ALL visible courses.
        // We'll prefetch the first 6 to cover a typical full-time load.
        const discussionCourses = courses.slice(0, 6)
        await Promise.all(
          discussionCourses.map((c) =>
            queryClient.prefetchQuery({
              queryKey: ['course-discussions', String(c.id), 50, { maxPages: 2 }],
              queryFn: async () => {
                const res = await window.canvas.listCourseDiscussions?.(String(c.id), {
                  perPage: 50,
                  maxPages: 2,
                })
                if (!res?.ok) throw new Error(res?.error || 'Failed')
                return res.data || []
              },
              staleTime: 1000 * 60 * 5,
            }),
          ),
        )
        break
      }
    }
  } catch (e) {
    console.error(`Failed to prefetch nav ${tab}`, e)
  }
}
