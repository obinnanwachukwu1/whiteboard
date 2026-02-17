import { useMemo, useRef } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useDueAssignments } from './useCanvasQueries'
import { useDashboardSettings } from './useDashboardSettings'
import { useAppFlags } from '../context/AppContext'
import {
  rankAssignmentsByPriority,
  calculatePriorityScore,
  formatRelativeDue,
  type PriorityAssignment,
  type RankedAssignment,
} from '../utils/priorityScore'
import {
  buildWeightContext,
  calculateAssignmentWeight,
  formatWeightDisplay,
  type AssignmentGroupData,
} from '../utils/assignmentWeight'
import { isSubmissionSubmitted } from '../utils/submissionState'
import { extractAssignmentIdFromUrl, extractQuizIdFromUrl } from '../utils/urlHelpers'

/**
 * Extended ranked assignment with display-ready fields.
 */
export type DashboardAssignment = RankedAssignment & {
  /** Formatted relative time, e.g. "2 days" or "Tomorrow" */
  relativeTime: string
  /** Weight display info */
  weightDisplay: { text: string; emphasis: 'high' | 'medium' | 'low' }
  /** Course label (custom name or course code) */
  courseLabel: string
}

/**
 * Hook that fetches assignments and ranks them by priority for the dashboard.
 * Combines due assignments with grade weight information.
 */
export function usePriorityAssignments(options?: {
  /** Gate all background work (default: true) */
  enabled?: boolean
  /** Override time horizon from settings */
  horizonDays?: number
  /** Override max items from settings */
  limit?: number
}) {
  const { showcaseModeEnabled } = useAppFlags()
  const queryClient = useQueryClient()
  const { timeHorizon, showSubmitted, maxPriorityItems } = useDashboardSettings()
  const lastStableRef = useRef<{
    assignments: DashboardAssignment[]
    alsoDue: DashboardAssignment[]
    alsoDueCount: number
  } | null>(null)

  const enabled = options?.enabled ?? true
  const horizonDays = options?.horizonDays ?? timeHorizon
  const limit = options?.limit ?? (showcaseModeEnabled ? Math.max(8, maxPriorityItems) : maxPriorityItems)

  // Fetch due assignments (this uses a longer horizon to get "also due" items)
  const dueQuery = useDueAssignments(
    { days: 60, onlyPublished: true, includeCourseName: true },
    { enabled },
  )

  // Get unique course IDs from due assignments
  const courseIds = useMemo(() => {
    if (!dueQuery.data) return []
    const ids = new Set<string>()
    for (const item of dueQuery.data) {
      if (item.course_id != null) {
        ids.add(String(item.course_id))
      }
    }
    return Array.from(ids)
  }, [dueQuery.data])

  // Fetch assignment groups for each course (to get grade weights)
  const groupQueries = useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: ['course-assignment-groups-with-assignments', courseId],
      queryFn: async () => {
        const res = await window.canvas.listAssignmentGroups(courseId, true)
        if (!res?.ok) throw new Error(res?.error || 'Failed to load assignment groups')
        return { courseId, groups: res.data || [] }
      },
      staleTime: 1000 * 60 * 30, // 30 minutes - weights don't change often
      enabled: enabled && courseIds.length > 0,
    })),
  })

  const weightsReady = useMemo(() => {
    if (courseIds.length === 0) return true
    return groupQueries.every((q) => q.isSuccess || q.isError)
  }, [courseIds.length, groupQueries])

  type PriorityOrderCache = {
    updatedAt: number
    mainIds: string[]
    alsoIds: string[]
  }

  const orderKey = useMemo(() => {
    return ['dashboard-priority-order', { horizonDays, limit, showSubmitted }] as const
  }, [horizonDays, limit, showSubmitted])

  const orderQ = useQuery<PriorityOrderCache | undefined>({
    queryKey: orderKey as any,
    // This query is purely a cache subscription; it should never fetch.
    queryFn: async () => undefined,
    enabled: false,
    staleTime: Infinity,
  })

  const cachedOrder = orderQ.data
  const cachedOrderUsable = Boolean(
    cachedOrder &&
    Array.isArray(cachedOrder.mainIds) &&
    cachedOrder.mainIds.length > 0 &&
    Date.now() - cachedOrder.updatedAt < 1000 * 60 * 60 * 24,
  )

  // Build weight contexts per course
  const weightContexts = useMemo(() => {
    const contexts = new Map<string, ReturnType<typeof buildWeightContext>>()

    for (const q of groupQueries) {
      if (q.data) {
        const { courseId, groups } = q.data
        // Transform to the expected format
        const formattedGroups: AssignmentGroupData[] = groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          group_weight: g.group_weight,
          assignments:
            g.assignments?.map((a: any) => ({
              id: a.id,
              points_possible: a.points_possible,
            })) || [],
        }))
        contexts.set(courseId, buildWeightContext(formattedGroups))
      }
    }

    return contexts
  }, [groupQueries])

  // Build O(1) assignment lookup: courseId -> assignmentId -> { groupId, pointsPossible }
  // This replaces the O(n*m*k) nested loop with O(1) lookups per assignment
  const assignmentLookup = useMemo(() => {
    const lookup = new Map<
      string,
      Map<string, { groupId: number | string; pointsPossible: number | null }>
    >()

    for (const q of groupQueries) {
      if (!q.data) continue
      const { courseId, groups } = q.data
      const courseMap = new Map<
        string,
        { groupId: number | string; pointsPossible: number | null }
      >()

      for (const group of groups) {
        const assignments = (group as any).assignments || []
        for (const a of assignments) {
          courseMap.set(String(a.id), {
            groupId: group.id,
            pointsPossible: a.points_possible ?? null,
          })
        }
      }

      lookup.set(courseId, courseMap)
    }

    return lookup
  }, [groupQueries])

  // Transform due items to PriorityAssignment format with weights
  const priorityAssignments = useMemo((): PriorityAssignment[] => {
    if (!dueQuery.data) return []

    return dueQuery.data.map((item) => {
      const courseId = String(item.course_id)
      const context = weightContexts.get(courseId)

      // Extract assignment ID from URL if available
      let assignmentId: string | null = null
      if (item.htmlUrl) {
        assignmentId = extractAssignmentIdFromUrl(item.htmlUrl) || extractQuizIdFromUrl(item.htmlUrl)
      }

      // Try to calculate weight using O(1) lookup
      let effectiveWeight: number | null = null
      if (context && assignmentId) {
        // Use the pre-built lookup map instead of nested loops
        const courseAssignments = assignmentLookup.get(courseId)
        const assignmentInfo = courseAssignments?.get(assignmentId)

        if (assignmentInfo) {
          effectiveWeight = calculateAssignmentWeight(
            {
              id: assignmentId,
              assignment_group_id: assignmentInfo.groupId,
              points_possible: assignmentInfo.pointsPossible,
            },
            context,
          )
        }
      }

      return {
        id: assignmentId || item.htmlUrl || `${item.course_id}-${item.name}`,
        name: item.name,
        dueAt: item.dueAt,
        courseId: item.course_id,
        courseName: item.course_name,
        pointsPossible: item.pointsPossible ?? null,
        effectiveWeight,
        isSubmitted: isSubmissionSubmitted(item.submission),
        htmlUrl: item.htmlUrl,
      }
    })
  }, [dueQuery.data, weightContexts, assignmentLookup])

  const byId = useMemo(() => {
    const m = new Map<string, PriorityAssignment>()
    for (const a of priorityAssignments) m.set(String(a.id), a)
    return m
  }, [priorityAssignments])

  const rankedAssignments = useMemo(() => {
    const rankOpts = {
      withinDays: horizonDays,
      limit,
      includeSubmitted: showSubmitted,
      includePastDue: true,
    }

    // If we don't have weights yet, prefer last session's order so the list
    // doesn't reshuffle on boot.
    if (!weightsReady && cachedOrderUsable && cachedOrder) {
      const picked: PriorityAssignment[] = []
      const pickedIds = new Set<string>()

      for (const id of cachedOrder.mainIds) {
        const a = byId.get(String(id))
        if (!a) continue
        picked.push(a)
        pickedIds.add(String(a.id))
        if (picked.length >= limit) break
      }

      if (picked.length < limit) {
        const fallback = rankAssignmentsByPriority(
          priorityAssignments.map((a) => ({ ...a, effectiveWeight: null })),
          { ...rankOpts, limit: limit * 2 },
        )
        for (const r of fallback) {
          const a = byId.get(String(r.id))
          if (!a) continue
          const id = String(a.id)
          if (pickedIds.has(id)) continue
          picked.push(a)
          pickedIds.add(id)
          if (picked.length >= limit) break
        }
      }

      // Compute display fields (hoursUntilDue, etc) but keep cached ordering.
      return picked.map((a) => calculatePriorityScore({ ...a, effectiveWeight: null }))
    }

    // Normal path: rank with weights when available, otherwise rank without.
    const source = weightsReady
      ? priorityAssignments
      : priorityAssignments.map((a) => ({ ...a, effectiveWeight: null }))
    return rankAssignmentsByPriority(source, rankOpts)
  }, [
    priorityAssignments,
    byId,
    weightsReady,
    cachedOrderUsable,
    cachedOrder,
    horizonDays,
    limit,
    showSubmitted,
  ])

  // Get assignments that are NOT in the main ranked list (overflow)
  const alsoDue = useMemo(() => {
    // Create set of IDs already shown in main list
    const mainIds = new Set(rankedAssignments.map((a) => String(a.id)))

    // Filter priority assignments
    const pool = weightsReady
      ? priorityAssignments
      : priorityAssignments.map((a) => ({ ...a, effectiveWeight: null }))

    return pool
      .filter((a) => {
        // Exclude if already in main list
        if (mainIds.has(String(a.id))) return false
        // Exclude if submitted (also due should focus on pending work)
        if (a.isSubmitted) return false
        // Exclude if no due date
        if (a.dueAt === null) return false
        return true
      })
      .map((a) => calculatePriorityScore(a))
      .sort((a, b) => (a.hoursUntilDue ?? 0) - (b.hoursUntilDue ?? 0)) // Sort soonest first
  }, [priorityAssignments, rankedAssignments, weightsReady])

  // Persist the "best known" order once we have weights so the next app open
  // can render the last rankings immediately.
  // Only update when IDs actually change to avoid infinite re-render loops.
  const mainIdsRef = useRef<string>('')
  const alsoIdsRef = useRef<string>('')

  useEffect(() => {
    if (!weightsReady) return
    if (!dueQuery.data) return

    const mainIds = rankedAssignments.map((a) => String(a.id))
    const alsoIds = alsoDue.slice(0, 25).map((a) => String(a.id))

    // Only update cache if IDs actually changed
    const mainKey = mainIds.join(',')
    const alsoKey = alsoIds.join(',')
    if (mainKey === mainIdsRef.current && alsoKey === alsoIdsRef.current) {
      return // No change, skip cache update
    }
    mainIdsRef.current = mainKey
    alsoIdsRef.current = alsoKey

    queryClient.setQueryData(orderKey as any, {
      updatedAt: Date.now(),
      mainIds,
      alsoIds,
    } satisfies PriorityOrderCache)
  }, [weightsReady, dueQuery.data, rankedAssignments, alsoDue, queryClient, orderKey])

  // Transform to dashboard-ready format
  const dashboardAssignments = useMemo((): DashboardAssignment[] => {
    return rankedAssignments.map((a) => ({
      ...a,
      relativeTime: formatRelativeDue(a.hoursUntilDue),
      weightDisplay: formatWeightDisplay(a.effectiveWeight, a.pointsPossible),
      courseLabel: a.courseName || String(a.courseId),
    }))
  }, [rankedAssignments])

  // Also due with display format
  const alsoDueAssignments = useMemo((): DashboardAssignment[] => {
    return alsoDue.slice(0, 10).map((a) => ({
      ...a,
      relativeTime: formatRelativeDue(a.hoursUntilDue),
      weightDisplay: formatWeightDisplay(a.effectiveWeight, a.pointsPossible),
      courseLabel: a.courseName || String(a.courseId),
    }))
  }, [alsoDue])

  // Only show the big skeleton on true cold starts.
  // We can render without weights while group queries fill in.
  const isHardLoading = !dueQuery.data && dueQuery.isLoading
  const isError = dueQuery.isError || groupQueries.some((q) => q.isError)

  // Keep last computed list around to avoid flicker when we have cached data
  // but queries are re-spinning (e.g. courseId set changes).
  if (dueQuery.data && rankedAssignments.length >= 0) {
    lastStableRef.current = {
      assignments: dashboardAssignments,
      alsoDue: alsoDueAssignments,
      alsoDueCount: alsoDue.length,
    }
  }

  const stable = lastStableRef.current || {
    assignments: dashboardAssignments,
    alsoDue: alsoDueAssignments,
    alsoDueCount: alsoDue.length,
  }

  return {
    /** Top priority assignments for the dashboard */
    assignments: stable.assignments,
    /** Assignments beyond the time horizon */
    alsoDue: stable.alsoDue,
    /** Count of items beyond horizon */
    alsoDueCount: stable.alsoDueCount,
    /** Loading state */
    isLoading: isHardLoading && !lastStableRef.current,
    /** Error state */
    isError,
    /** Error object */
    error: dueQuery.error || groupQueries.find((q) => q.error)?.error,
    /** Refetch data */
    refetch: () => {
      dueQuery.refetch()
      groupQueries.forEach((q) => q.refetch())
    },
  }
}
