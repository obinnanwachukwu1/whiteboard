import type { QueryClient } from '@tanstack/react-query'

export async function prefetchNavTab(
  queryClient: QueryClient,
  tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  courses: Array<{ id: string | number }>
) {
  try {
    switch (tab) {
      case 'dashboard':
        // Dashboard uses 60 days to catch "also due" items + needs specific flags
        // We also prefetch assignment groups for the top courses to enable instant priority calculation
        const dashboardCourses = courses.slice(0, 5)
        
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['due-assignments', { days: 60, onlyPublished: true, includeCourseName: true }],
            queryFn: async () => {
              const res = await window.canvas.listDueAssignments({ days: 60, onlyPublished: true, includeCourseName: true })
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 60 * 2,
          }),
          queryClient.prefetchQuery({
            queryKey: ['activity-announcements', { n: 20 }],
            queryFn: async () => {
              const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 100 })
              const list = (res?.ok ? res.data : []) as any[]
              const anns = (Array.isArray(list) ? list : []).filter((x) => (x?.type === 'Announcement'))
              anns.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
              return anns.slice(0, Math.max(1, 20))
            },
            staleTime: 1000 * 60 * 5,
          }),
          // Prefetch weights for priority score calculation
          ...dashboardCourses.map(c => 
            queryClient.prefetchQuery({
              queryKey: ['course-assignment-groups-with-assignments', String(c.id)],
              queryFn: async () => {
                const res = await window.canvas.listAssignmentGroups(String(c.id), true)
                if (!res?.ok) throw new Error(res?.error || 'Failed to load assignment groups')
                return { courseId: String(c.id), groups: res.data || [] }
              },
              staleTime: 1000 * 60 * 30,
            })
          )
        ])
        break

      case 'announcements':
        // AnnouncementsPage uses n=200
        await queryClient.prefetchQuery({
          queryKey: ['activity-announcements', { n: 200 }],
          queryFn: async () => {
            const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 100 })
            const list = (res?.ok ? res.data : []) as any[]
            const anns = (Array.isArray(list) ? list : []).filter((x) => (x?.type === 'Announcement'))
            anns.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
            return anns.slice(0, Math.max(1, 200))
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'assignments':
        // AssignmentsPage uses days=365, includeCourseName=true
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['due-assignments', { days: 365, includeCourseName: true }],
            queryFn: async () => {
              const res = await window.canvas.listDueAssignments({ days: 365, includeCourseName: true })
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 60 * 2,
          }),
          queryClient.prefetchQuery({
            queryKey: ['upcoming'],
            queryFn: async () => {
              const res = await window.canvas.listUpcoming?.({ onlyActiveCourses: true })
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 30,
          })
        ])
        break

      case 'grades':
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
        await Promise.all(gradeCourses.map(c => 
          queryClient.prefetchQuery({
            queryKey: ['course-gradebook', c.id],
            queryFn: async () => {
              const [groupsRes, assignmentsRes] = await Promise.all([
                window.canvas.listAssignmentGroups(c.id, false),
                window.canvas.listAssignmentsWithSubmission(c.id, 100),
              ])
              if (!groupsRes?.ok) throw new Error(groupsRes?.error || 'Failed to load assignment groups')
              if (!assignmentsRes?.ok) throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
              return { groups: groupsRes.data || [], raw: assignmentsRes.data || [], assignments: [] as any[] }
            },
            staleTime: 1000 * 60 * 5,
          })
        ))
        break

      case 'discussions':
        // DiscussionsPage loads discussions for ALL visible courses.
        // We'll prefetch the first 6 to cover a typical full-time load.
        const discussionCourses = courses.slice(0, 6)
        await Promise.all(discussionCourses.map(c => 
          queryClient.prefetchQuery({
            queryKey: ['course-discussions', String(c.id), 50],
            queryFn: async () => {
              const res = await window.canvas.listCourseDiscussions?.(String(c.id), 50)
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        ))
        break
    }
  } catch (e) {
    console.error(`Failed to prefetch nav ${tab}`, e)
  }
}
