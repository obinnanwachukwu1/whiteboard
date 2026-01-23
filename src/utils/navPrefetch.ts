import type { QueryClient } from '@tanstack/react-query'

export async function prefetchNavTab(
  queryClient: QueryClient,
  tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  courses: Array<{ id: string | number }>
) {
  try {
    switch (tab) {
      case 'dashboard':
        // Dashboard needs due assignments and activity stream
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['due-assignments', { days: 7 }],
            queryFn: async () => {
              const res = await window.canvas.listDueAssignments({ days: 7 })
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
          })
        ])
        break

      case 'announcements':
        // Same activity stream as dashboard usually
        await queryClient.prefetchQuery({
          queryKey: ['activity-announcements', { n: 20 }],
          queryFn: async () => {
            const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 100 })
            const list = (res?.ok ? res.data : []) as any[]
            const anns = (Array.isArray(list) ? list : []).filter((x) => (x?.type === 'Announcement'))
            anns.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
            return anns.slice(0, Math.max(1, 20))
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'assignments':
        // Needs due assignments + upcoming
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['due-assignments', { days: 7 }],
            queryFn: async () => {
              const res = await window.canvas.listDueAssignments({ days: 7 })
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
        // Needs basic course list (usually cached) and maybe course grades if not in list
        // Global grades page mainly uses course list data which has grades embedded.
        // We can ensure courses are fresh.
        await queryClient.prefetchQuery({
          queryKey: ['courses', { enrollment_state: 'active' }],
          queryFn: async () => {
            const res = await window.canvas.listCourses({ enrollment_state: 'active' })
            if (!res?.ok) throw new Error(res?.error || 'Failed')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })
        break

      case 'discussions':
        // This is heavy: iterates all courses. We'll pick top 3 visible courses to be safe.
        // Or if the user has a lot of courses, this might be too much.
        // Let's just do top 3.
        const topCourses = courses.slice(0, 3)
        await Promise.all(topCourses.map(c => 
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
