import type { QueryClient } from '@tanstack/react-query'

export async function prefetchCourseTab(queryClient: QueryClient, courseId: string | number, tab: string) {
  const id = String(courseId)
  
  try {
    switch (tab) {
      case 'modules':
        await queryClient.prefetchQuery({
          queryKey: ['course-modules', id],
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
            const res = await window.canvas.listCourseAssignments(id, 200)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
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
          queryKey: ['course-discussions', id, 50],
          queryFn: async () => {
            const res = await window.canvas.listCourseDiscussions?.(id, 50)
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
        // For files, we prefetch folders + root file list
        const folders = await queryClient.fetchQuery({
          queryKey: ['course-folders', id, 100],
          queryFn: async () => {
            const res = await window.canvas.listCourseFolders?.(id, 100)
            if (!res?.ok) throw new Error(res?.error || 'Failed to load folders')
            return res.data || []
          },
          staleTime: 1000 * 60 * 5,
        })

        // Find root folder to prefetch initial file list
        let rootId: string | null = null
        if (Array.isArray(folders)) {
          for (const f of folders) {
            const name = String(f?.full_name || f?.name || '').toLowerCase()
            const isTop = f?.parent_folder_id == null
            if (isTop && /\bcourse files\b/i.test(name)) {
              rootId = String(f.id)
              break
            }
          }
          if (!rootId) {
            const top = folders.find((f) => f?.parent_folder_id == null)
            rootId = top ? String(top.id) : null
          }
        }

        if (rootId) {
          await queryClient.prefetchQuery({
            queryKey: ['folder-files', rootId, 100],
            queryFn: async () => {
              const res = await window.canvas.listFolderFiles?.(rootId, 100)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load root files')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        }
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
  } catch (e) {
    console.error(`Failed to prefetch tab ${tab}`, e)
  }
}
