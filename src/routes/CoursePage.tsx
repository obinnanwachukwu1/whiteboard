import React from 'react'
import { useParams, useSearch, useNavigate } from '@tanstack/react-router'
import { useAppData, useAppFlags } from '../context/AppContext'
import { CourseView } from '../components/CourseView'
import { useQueryClient } from '@tanstack/react-query'
import { enqueuePrefetch } from '../utils/prefetchQueue'
import { useTabUsage } from '../hooks/useTabUsage'
import { prefetchCourseTab } from '../utils/coursePrefetch'
import { useCourseInfo } from '../hooks/useCanvasQueries'

export default function CoursePage() {
  const data = useAppData()
  const flags = useAppFlags()
  const { courseId } = useParams({ from: '/course/$courseId' })
  const search = useSearch({ from: '/course/$courseId' }) as { tab?: string; type?: string; contentId?: string; title?: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { recordVisit, getSortedTabs } = useTabUsage()

  // Use cached course info to detect default view
  const { data: courseInfo } = useCourseInfo(courseId)
  
  // Determine default tab from course info if URL doesn't specify one
  const defaultTab = React.useMemo(() => {
    if (search?.tab) return search.tab
    
    // Map Canvas default_view to our tab keys
    const dv = (courseInfo?.default_view || '').toLowerCase()
    if (dv === 'wiki' || dv === 'pages') return 'home'
    if (dv === 'modules') return 'modules'
    if (dv === 'assignments') return 'assignments'
    if (dv === 'syllabus') return 'syllabus'
    if (dv === 'feed' || dv === 'announcements') return 'announcements'
    
    // Fallback: use announcements
    return 'announcements'
  }, [search?.tab, courseInfo])

  const [courseTab, setCourseTab] = React.useState<any>(defaultTab)
  const [courseDetail, setCourseDetail] = React.useState<any | null>(search?.type && search?.contentId ? ({ contentType: search.type, contentId: search.contentId, title: search.title }) : null)
  // Simple history stack for detail view to support "Back" returning to previous detail
  const [detailStack, setDetailStack] = React.useState<any[]>([])

  // Update tab when defaultTab resolves (e.g. after course info loads) or URL changes
  React.useEffect(() => {
    setCourseTab(defaultTab)
    
    // Record usage when tab changes
    if (courseId && defaultTab) {
      recordVisit(courseId, defaultTab)
    }

    if (search?.type && search?.contentId) setCourseDetail({ contentType: search.type, contentId: search.contentId, title: search.title })
    else setCourseDetail(null)
  }, [defaultTab, search?.type, search?.contentId, search?.title, courseId])

  const onChangeTab = (t: any) => {
    setCourseTab(t)
    // Clear any subpage detail in the URL when switching tabs
    navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: t } })
  }

  const onClearDetail = () => {
    if (detailStack.length > 0) {
      // Pop the last item
      const prev = detailStack[detailStack.length - 1]
      const newStack = detailStack.slice(0, -1)
      setDetailStack(newStack)
      setCourseDetail(prev)
      
      // Restore URL state without changing the tab
      navigate({ 
        to: '/course/$courseId', 
        params: { courseId }, 
        search: { tab: courseTab, type: prev.contentType, contentId: prev.contentId, title: prev.title } 
      })
    } else {
      setCourseDetail(null)
      // Update URL to remove detail params, keeping the current tab
      navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: courseTab } })
    }
  }

  const onOpenDetail = (d: { contentType: 'assignment'|'announcement'|'page'|'file'|'discussion'; contentId: string; title: string }) => {
    if (courseDetail) {
      setDetailStack(prev => [...prev, courseDetail])
    }
    setCourseDetail(d)

    // Keep the current tab as the "source" so Back returns to where you opened it.
    // (Deep-links already set tab explicitly via the URL.)
    navigate({ to: '/course/$courseId', params: { courseId }, search: { tab: courseTab, type: d.contentType, contentId: d.contentId, title: d.title } })
  }

  const onNavigateCourse = (cid: string | number, init?: { type: 'assignment'|'announcement'|'page'|'file'|'discussion'; id: string; title?: string }) => {
    if (!cid) return
    if (init) {
      const t = init.type === 'assignment' ? 'assignments' : init.type === 'announcement' ? 'announcements' : init.type === 'discussion' ? 'discussions' : init.type === 'page' ? 'home' : 'files'
      navigate({ to: '/course/$courseId', params: { courseId: String(cid) }, search: { tab: t, type: init.type, contentId: String(init.id), title: init.title } })
    } else {
      navigate({ to: '/course/$courseId', params: { courseId: String(cid) } })
    }
  }

  const courseName = (data.courses || []).find((c: any) => String(c.id) === String(courseId))?.name

  // Warm other tabs in the background once the course is mounted
  React.useEffect(() => {
    if (!flags.prefetchEnabled) return
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

        const currentTab = search?.tab || courseTab || 'announcements'
        const allTabs = ['syllabus', 'announcements', 'modules', 'assignments', 'grades', 'files', 'people', 'discussions', 'links', 'home']
        
        // Use smart sorting based on usage stats, but ensure the current tab is warmed too.
        const sortedTabs = getSortedTabs(courseId, allTabs)
        const warmOrder = [currentTab, ...sortedTabs.filter((t) => t !== currentTab)]

        // Queue a small number of highest-likelihood tabs. The prefetch queue
        // has its own rate guard/backoff.
        const maxWarm = 4
        for (const t of warmOrder.slice(0, maxWarm)) {
          enqueuePrefetch(() => prefetchCourseTab(queryClient, id, t))
        }
      } catch {}
    }, 250)
    return () => { clearTimeout(timer); cancelled = true }
  }, [courseId, flags.prefetchEnabled])

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
        baseUrl={data.baseUrl}
        onNavigateCourse={onNavigateCourse}
      />
    </>
  )
}
