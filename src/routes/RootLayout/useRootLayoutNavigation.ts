import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { enqueuePrefetch, requestIdle } from '../../utils/prefetchQueue'
import { prefetchNavTab } from '../../utils/navPrefetch'
import { toAssignmentGroupInputsFromRest, toAssignmentInputsFromRest } from '../../utils/gradeCalc'
import type { SidebarConfig } from '../../components/Sidebar'

type CurrentView =
  | 'dashboard'
  | 'announcements'
  | 'assignments'
  | 'grades'
  | 'discussions'
  | 'course'
  | 'allCourses'

type Params = {
  coursesData: any[] | undefined
  sidebarCfg: SidebarConfig
  activeCourseId: string | number | null
  prefetchEnabled: boolean
  hasToken: boolean | null
  queryClient: QueryClient
}

export function useRootLayoutNavigation({
  coursesData,
  sidebarCfg,
  activeCourseId,
  prefetchEnabled,
  hasToken,
  queryClient,
}: Params) {
  const coursePrefetchCooldown = useRef<Map<string, number>>(new Map())
  const navPrefetchCooldown = useRef<Map<string, number>>(new Map())

  const pathname = useRouterState({ select: (s: any) => s.location.pathname })
  const rawSearch = useRouterState({
    select: (s: any) => (s.location as any).searchStr ?? (s.location as any).search ?? '',
  }) as any
  const searchStr = useMemo(() => {
    if (typeof rawSearch === 'string') return rawSearch
    try {
      return new URLSearchParams(rawSearch as any).toString()
    } catch {
      return ''
    }
  }, [rawSearch])

  const isEmbeddedContent = useMemo(() => {
    if (!pathname.startsWith('/content')) return false
    try {
      return new URLSearchParams(searchStr || '').get('embed') === '1'
    } catch {
      return false
    }
  }, [pathname, searchStr])

  const currentView: CurrentView = pathname.startsWith('/course/')
    ? 'course'
    : pathname.startsWith('/announcements')
      ? 'announcements'
      : pathname.startsWith('/assignments')
        ? 'assignments'
        : pathname.startsWith('/grades')
          ? 'grades'
          : pathname.startsWith('/discussions')
            ? 'discussions'
            : pathname.startsWith('/all-courses')
              ? 'allCourses'
              : 'dashboard'

  const derivedCourseId = useMemo(() => {
    if (!pathname.startsWith('/course/')) return null
    const parts = pathname.split('/')
    return parts[2] ? decodeURIComponent(parts[2]) : null
  }, [pathname])

  const navCooldownMs = 10 * 60 * 1000

  const getPrefetchCourses = useCallback(() => {
    if (!coursesData?.length) return [] as Array<{ id: string | number }>
    const hidden = new Set(sidebarCfg.hiddenCourseIds || [])
    const visible = coursesData.filter((c: any) => !hidden.has(String(c.id)))
    const targetId = derivedCourseId ?? activeCourseId ?? visible[0]?.id ?? null
    return targetId ? [{ id: targetId }] : []
  }, [coursesData, sidebarCfg.hiddenCourseIds, derivedCourseId, activeCourseId])

  const handlePrefetchNav = useCallback(
    (tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions') => {
      const now = Date.now()
      const last = navPrefetchCooldown.current.get(tab) || 0
      if (now - last < navCooldownMs) return
      const coursesForPrefetch = getPrefetchCourses()
      if (!coursesForPrefetch.length) return
      navPrefetchCooldown.current.set(tab, now)
      enqueuePrefetch(() => prefetchNavTab(queryClient, tab, coursesForPrefetch))
    },
    [getPrefetchCourses, queryClient],
  )

  useEffect(() => {
    if (!prefetchEnabled) return
    if (!hasToken || !coursesData?.length) return
    requestIdle(() => {
      const coursesForPrefetch = getPrefetchCourses()
      if (!coursesForPrefetch.length) return
      enqueuePrefetch(() => prefetchNavTab(queryClient, 'announcements', coursesForPrefetch))
      enqueuePrefetch(() => prefetchNavTab(queryClient, 'assignments', coursesForPrefetch))
      enqueuePrefetch(() => prefetchNavTab(queryClient, 'discussions', coursesForPrefetch))
      enqueuePrefetch(() => prefetchNavTab(queryClient, 'grades', coursesForPrefetch))
    })
  }, [prefetchEnabled, hasToken, coursesData, queryClient, getPrefetchCourses])

  const coursePrefetchCooldownMs = 10 * 60 * 1000

  const prefetchCourseData = (courseId: string | number, opts?: { isActive?: boolean }) => {
    const id = String(courseId)
    const last = coursePrefetchCooldown.current.get(id) || 0
    if (Date.now() - last < coursePrefetchCooldownMs) return
    coursePrefetchCooldown.current.set(id, Date.now())

    enqueuePrefetch(async () => {
      const info = await queryClient.fetchQuery({
        queryKey: ['course-info', id],
        queryFn: async () => {
          const res = await window.canvas.getCourseInfo?.(id)
          if (!res?.ok) throw new Error(res?.error || 'Failed to load course info')
          return res.data || null
        },
        staleTime: 1000 * 60 * 5,
      })

      const defaultView = (info?.default_view || 'wiki').toLowerCase()
      const promises: Array<Promise<any>> = []

      promises.push(
        queryClient.prefetchQuery({
          queryKey: ['course-tabs', id, true],
          queryFn: async () => {
            const res = await window.canvas.listCourseTabs?.(id, true)
            return res?.data || []
          },
          staleTime: 1000 * 60 * 5,
        }),
      )

      if (defaultView === 'wiki' || defaultView === 'pages') {
        promises.push(
          queryClient.prefetchQuery({
            queryKey: ['course-front-page', id],
            queryFn: async () => {
              const res = await window.canvas.getCourseFrontPage?.(id)
              return res?.data || null
            },
            staleTime: 1000 * 60 * 5,
          }),
        )
      } else if (defaultView === 'modules') {
        promises.push(
          queryClient.prefetchQuery({
            queryKey: ['course-modules', id, 'v2'],
            queryFn: async () => {
              const res = await window.canvas.listCourseModulesGql(id, 20, 50)
              return res?.data || []
            },
            staleTime: 1000 * 60 * 5,
          }),
        )
      } else if (defaultView === 'assignments') {
        promises.push(
          queryClient.prefetchQuery({
            queryKey: ['course-assignments', id, 200],
            queryFn: async () => {
              const res = await window.canvas.listAssignmentsWithSubmission(id, 200)
              return res?.data || []
            },
            staleTime: 1000 * 60 * 5,
          }),
        )
      } else if (defaultView === 'feed' || defaultView === 'announcements') {
        promises.push(
          queryClient.prefetchInfiniteQuery({
            queryKey: ['course-announcements-infinite', id, 10],
            queryFn: async ({ pageParam = 1 }) => {
              const res = await window.canvas.listCourseAnnouncementsPage?.(
                id,
                pageParam as number,
                10,
              )
              if (!res?.ok) throw new Error(res?.error || 'Failed to load announcements')
              return res.data || []
            },
            getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: any) => {
              if (!Array.isArray(lastPage) || lastPage.length < 10) return undefined
              return (lastPageParam as number) + 1
            },
            staleTime: 1000 * 60 * 5,
          }),
        )
      }

      await Promise.all(promises)

      if (opts?.isActive) {
        requestIdle(() => {
          enqueuePrefetch(async () => {
            await queryClient.prefetchQuery({
              queryKey: ['course-gradebook', id],
              queryFn: async () => {
                const [groupsRes, assignmentsRes] = await Promise.all([
                  window.canvas.listAssignmentGroups(id, false),
                  window.canvas.listAssignmentsWithSubmission(id, 100),
                ])
                if (!groupsRes?.ok)
                  throw new Error(groupsRes?.error || 'Failed to load assignment groups')
                if (!assignmentsRes?.ok)
                  throw new Error(assignmentsRes?.error || 'Failed to load gradebook assignments')
                const groups = toAssignmentGroupInputsFromRest(groupsRes.data || [])
                const raw = (assignmentsRes.data || []) as any[]
                const assignments = toAssignmentInputsFromRest(raw)
                return { groups, assignments, raw }
              },
              staleTime: 1000 * 60 * 5,
            })
          })
          enqueuePrefetch(async () => {
            await queryClient.prefetchQuery({
              queryKey: ['course-discussions', id, 50, { maxPages: 2 }],
              queryFn: async () => {
                const res = await window.canvas.listCourseDiscussions?.(id, {
                  perPage: 50,
                  maxPages: 2,
                })
                if (!res?.ok) throw new Error(res?.error || 'Failed to load discussions')
                return res.data || []
              },
              staleTime: 1000 * 60 * 5,
            })
          })
        })
      }
    })
  }

  return {
    currentView,
    derivedCourseId,
    isEmbeddedContent,
    handlePrefetchNav,
    prefetchCourseData,
  }
}
