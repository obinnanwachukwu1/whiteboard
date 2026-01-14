import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useDueAssignments } from './useCanvasQueries'
import { useDashboardSettings } from './useDashboardSettings'
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
  /** Override time horizon from settings */
  horizonDays?: number
  /** Override max items from settings */
  limit?: number
}) {
  const { timeHorizon, showSubmitted, maxPriorityItems } = useDashboardSettings()
  
  const horizonDays = options?.horizonDays ?? timeHorizon
  const limit = options?.limit ?? maxPriorityItems
  
  // Fetch due assignments (this uses a longer horizon to get "also due" items)
  const dueQuery = useDueAssignments({ days: 60, onlyPublished: true, includeCourseName: true })
  
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
      enabled: courseIds.length > 0,
    })),
  })
  
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
          assignments: g.assignments?.map((a: any) => ({
            id: a.id,
            points_possible: a.points_possible,
          })) || [],
        }))
        contexts.set(courseId, buildWeightContext(formattedGroups))
      }
    }
    
    return contexts
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
        try {
          const url = new URL(item.htmlUrl)
          const parts = url.pathname.split('/')
          const aIdx = parts.indexOf('assignments')
          if (aIdx >= 0 && parts[aIdx + 1]) {
            assignmentId = parts[aIdx + 1]
          }
        } catch {}
      }
      
      // Try to calculate weight
      let effectiveWeight: number | null = null
      if (context && assignmentId) {
        // We need the assignment_group_id - try to find it from groups
        for (const q of groupQueries) {
          if (q.data?.courseId === courseId) {
            for (const group of q.data.groups) {
              const assignment = (group as any).assignments?.find(
                (a: any) => String(a.id) === assignmentId
              )
              if (assignment) {
                effectiveWeight = calculateAssignmentWeight(
                  {
                    id: assignment.id,
                    assignment_group_id: group.id,
                    points_possible: assignment.points_possible,
                  },
                  context
                )
                break
              }
            }
          }
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
        isSubmitted: false, // TODO: Check submission status if available
        htmlUrl: item.htmlUrl,
      }
    })
  }, [dueQuery.data, weightContexts, groupQueries])
  
  // Rank assignments by priority
  const rankedAssignments = useMemo(() => {
    return rankAssignmentsByPriority(priorityAssignments, {
      withinDays: horizonDays,
      limit,
      includeSubmitted: showSubmitted,
      includePastDue: true,
    })
  }, [priorityAssignments, horizonDays, limit, showSubmitted])
  
  // Get assignments that are NOT in the main ranked list (overflow)
  const alsoDue = useMemo(() => {
    // Create set of IDs already shown in main list
    const mainIds = new Set(rankedAssignments.map((a) => String(a.id)))
    
    // Filter priority assignments
    return priorityAssignments
      .filter((a) => {
        // Exclude if already in main list
        if (mainIds.has(String(a.id))) return false
        // Exclude if submitted (also due should focus on pending work)
        if (a.isSubmitted) return false
        // Exclude if no due date
        if (a.dueAt === null) return false
        return true
      })
      .map(calculatePriorityScore)
      .sort((a, b) => (a.hoursUntilDue ?? 0) - (b.hoursUntilDue ?? 0)) // Sort soonest first
  }, [priorityAssignments, rankedAssignments])
  
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
  
  const isLoading = dueQuery.isLoading || groupQueries.some((q) => q.isLoading)
  const isError = dueQuery.isError || groupQueries.some((q) => q.isError)
  
  return {
    /** Top priority assignments for the dashboard */
    assignments: dashboardAssignments,
    /** Assignments beyond the time horizon */
    alsoDue: alsoDueAssignments,
    /** Count of items beyond horizon */
    alsoDueCount: alsoDue.length,
    /** Loading state */
    isLoading,
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
