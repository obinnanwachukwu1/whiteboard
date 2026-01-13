import React from 'react'
import { useParams, useSearch, useNavigate } from '@tanstack/react-router'
import { useAppContext } from '../context/AppContext'
import { CourseView } from '../components/CourseView'
import { useQueryClient } from '@tanstack/react-query'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'

export default function CoursePage() {
  const ctx = useAppContext()
  const { courseId } = useParams({ from: '/course/$courseId' })
  const search = useSearch({ from: '/course/$courseId' }) as { tab?: string; type?: string; contentId?: string; title?: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [courseTab, setCourseTab] = React.useState<any>(search?.tab || 'announcements')
  const [courseDetail, setCourseDetail] = React.useState<any | null>(search?.type && search?.contentId ? ({ contentType: search.type, contentId: search.contentId, title: search.title }) : null)

  React.useEffect(() => {
    // reflect URL -> state on param change
    setCourseTab(search?.tab || 'announcements')
    if (search?.type && search?.contentId) setCourseDetail({ contentType: search.type, contentId: search.contentId, title: search.title })
    else setCourseDetail(null)
  }, [search?.tab, search?.type, search?.contentId, search?.title])

  const onChangeTab = (t: any) => {
    setCourseTab(t)
    // Clear any subpage detail in the URL when switching tabs
    navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: t } })
  }

  const onClearDetail = () => {
    setCourseDetail(null)
    // Update URL to remove detail params, keeping the current tab
    navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: courseTab } })
  }

  const onOpenDetail = (d: { contentType: 'assignment'|'announcement'|'page'|'file'; contentId: string; title: string }) => {
    setCourseDetail(d)
    const tabFor: any = d.contentType === 'assignment' ? 'assignments' : d.contentType === 'announcement' ? 'announcements' : d.contentType === 'page' ? 'home' : 'files'
    setCourseTab(tabFor)
    navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: tabFor, type: d.contentType, contentId: d.contentId, title: d.title } })
  }

  const onNavigateCourse = (cid: string | number, init?: { type: 'assignment'|'announcement'|'page'|'file'; id: string; title?: string }) => {
    if (!cid) return
    if (init) {
      const t = init.type === 'assignment' ? 'assignments' : init.type === 'announcement' ? 'announcements' : init.type === 'page' ? 'home' : 'files'
      navigate({ to: '/course/$courseId', params: { courseId: String(cid) }, search: { tab: t, type: init.type, contentId: String(init.id), title: init.title } })
    } else {
      navigate({ to: '/course/$courseId', params: { courseId: String(cid) } })
    }
  }

  const courseName = (ctx.courses || []).find((c: any) => String(c.id) === String(courseId))?.name

  // Warm other tabs in the background once the course is mounted
  React.useEffect(() => {
    let cancelled = false
    const id = String(courseId)
    // Small delay to avoid competing with initial render
    const timer = setTimeout(async () => {
      try {
        // Ensure basic metadata is ready (tabs + info)
        await Promise.all([
          queryClient.fetchQuery({
            queryKey: ['course-tabs', id, true],
            queryFn: async () => {
              const res = await window.canvas.listCourseTabs?.(id, true)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load course tabs')
              return res.data || []
            },
            staleTime: 1000 * 60 * 60 * 24,
          }),
          queryClient.fetchQuery({
            queryKey: ['course-info', id],
            queryFn: async () => {
              const res = await window.canvas.getCourseInfo?.(id)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
              return res.data || null
            },
            staleTime: 1000 * 60 * 5,
          }),
        ])

        if (cancelled) return

        const otherTabs = ['announcements', 'modules', 'files', 'assignments', 'grades', 'home', 'syllabus', 'links', 'people']
          .filter((t) => t !== (search?.tab || courseTab || 'announcements'))

        // Medium-priority: modules + assignments list
        if (otherTabs.includes('modules')) enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-modules', id],
            queryFn: async () => {
              const res = await window.canvas.listCourseModulesGql(id, 20, 50)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load modules')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        })
        if (otherTabs.includes('assignments')) enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-assignments', id, 200],
            queryFn: async () => {
              const res = await window.canvas.listCourseAssignments(id, 200)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load assignments')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        })

        // Announcements list
        if (otherTabs.includes('announcements')) enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-announcements', id, 50],
            queryFn: async () => {
              const res = await window.canvas.listCourseAnnouncements?.(id, 50)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load announcements')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        })

        // Idle: gradebook-heavy requests
        requestIdle(() => {
          if (otherTabs.includes('grades')) enqueuePrefetch(async () => {
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
          })
          // People: prefetch in idle since it's typically less frequently accessed
          if (otherTabs.includes('people')) enqueuePrefetch(async () => {
            const canvas = window.canvas as typeof window.canvas & {
              listCourseUsers?: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
            }
            await queryClient.prefetchQuery({
              queryKey: ['course-users', id, 100],
              queryFn: async () => {
                const res = await canvas.listCourseUsers?.(id, 100)
                if (!res?.ok) throw new Error(res?.error || 'Failed to load course users')
                return res.data || []
              },
              staleTime: 1000 * 60 * 10, // 10 min cache
            })
          })
        })

        // Files: just prefetch top-level folders
        if (otherTabs.includes('files')) enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-folders', id, 100],
            queryFn: async () => {
              const res = await window.canvas.listCourseFolders?.(id, 100)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load folders')
              return res.data || []
            },
            staleTime: 1000 * 60 * 5,
          })
        })

        // Home/Syllabus
        if (otherTabs.includes('home')) enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['course-front-page', id],
            queryFn: async () => {
              const res = await window.canvas.getCourseFrontPage?.(id)
              if (!res?.ok) throw new Error(res?.error || 'Failed to load front page')
              return res.data || null
            },
            staleTime: 1000 * 60 * 5,
          })
        })
        // syllabus uses course-info already loaded
      } catch {}
    }, 250)
    return () => { clearTimeout(timer); cancelled = true }
  }, [courseId])

  return (
    <>
      <h1 className="mt-0 mb-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{courseName || 'Course'}</h1>
      <CourseView
        key={String(courseId)}
        courseId={courseId}
        courseName={courseName}
        activeTab={courseTab}
        onChangeTab={onChangeTab}
        content={courseDetail}
        onOpenDetail={onOpenDetail}
        onClearDetail={onClearDetail}
        baseUrl={ctx.baseUrl}
        onNavigateCourse={onNavigateCourse}
      />
    </>
  )
}
