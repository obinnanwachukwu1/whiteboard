import { useEffect, useRef } from 'react'
import { useAppFlags } from '../../context/AppContext'
import { enqueuePrefetch } from '../../utils/prefetchQueue'
import { extractAssignmentIdFromUrl, extractCourseIdFromUrl } from '../../utils/urlHelpers'
import type { QueryClient } from '@tanstack/react-query'
import type { ActivityFeedItem } from '../../hooks/useActivityFeed'

type AssignmentItem = { id: string | number; courseId: string | number; htmlUrl?: string }

type Params = {
  assignments: AssignmentItem[]
  activityItems: ActivityFeedItem[]
  queryClient: QueryClient
}

export function useDashboardPrefetch({ assignments, activityItems, queryClient }: Params) {
  const { prefetchEnabled, privateModeEnabled } = useAppFlags()
  const prefetchedAssignments = useRef<Set<string>>(new Set())
  const prefetchedAnnouncements = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!prefetchEnabled || privateModeEnabled) return
    if (!assignments.length) return
    const top = assignments.slice(0, 5)
    for (const a of top) {
      if (a.htmlUrl) {
        const extracted = extractAssignmentIdFromUrl(a.htmlUrl) || String(a.id)
        const key = `${a.courseId}-${extracted}`
        if (prefetchedAssignments.current.has(key)) continue
        prefetchedAssignments.current.add(key)
        enqueuePrefetch(async () => {
          await queryClient.prefetchQuery({
            queryKey: ['assignment-rest', String(a.courseId), extracted],
            queryFn: async () => {
              const res = await window.canvas.getAssignmentRest?.(a.courseId, extracted)
              if (!res?.ok) throw new Error(res?.error || 'Failed')
              return res.data
            },
            staleTime: 1000 * 60 * 5,
          })
        })
      }
    }
  }, [assignments, queryClient, prefetchEnabled, privateModeEnabled])

  useEffect(() => {
    if (!prefetchEnabled || privateModeEnabled) return
    if (!activityItems.length) return
    const anns = activityItems.filter((i) => i.type === 'announcement').slice(0, 5)
    for (const a of anns) {
      if (a.topicId) {
        const cid = extractCourseIdFromUrl(a.htmlUrl || '')
        if (cid) {
          const key = `${cid}-${a.topicId}`
          if (prefetchedAnnouncements.current.has(key)) continue
          prefetchedAnnouncements.current.add(key)
          enqueuePrefetch(async () => {
            await queryClient.prefetchQuery({
              queryKey: ['announcement', cid, a.topicId],
              queryFn: async () => {
                const res = await window.canvas.getAnnouncement?.(cid, a.topicId!)
                if (!res?.ok) throw new Error(res?.error || 'Failed')
                return res.data
              },
              staleTime: 1000 * 60 * 5,
            })
          })
        }
      }
    }
  }, [activityItems, queryClient, prefetchEnabled, privateModeEnabled])
}
