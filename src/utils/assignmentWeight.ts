/**
 * Calculate the effective weight (% of final grade) for an assignment.
 * 
 * Canvas supports two grading modes:
 * 1. Weighted: Each assignment group has a weight (e.g., Exams = 40%).
 *    Assignment weight = (points / groupTotalPoints) * groupWeight
 * 2. Unweighted: Pure points-based.
 *    Assignment weight = points / totalCoursePoints
 */

export type AssignmentGroupData = {
  id: string | number
  name?: string
  group_weight?: number | null  // 0-100 percentage
  assignments?: Array<{ id: string | number; points_possible?: number | null }>
}

export type AssignmentForWeight = {
  id: string | number
  assignment_group_id?: string | number
  points_possible?: number | null
}

type WeightContext = {
  groups: AssignmentGroupData[]
  /** If true, use weighted grading; if false, use total points */
  useWeights: boolean
  /** Total points across all assignments (for unweighted mode) */
  totalCoursePoints: number
  /** Map of groupId -> total points in that group */
  groupPointsMap: Map<string, number>
}

/**
 * Build context for weight calculations from assignment groups data.
 * Call this once per course, then use it to calculate weights for multiple assignments.
 */
export function buildWeightContext(groups: AssignmentGroupData[]): WeightContext {
  // Determine if any group has a weight > 0
  const hasWeights = groups.some((g) => (g.group_weight ?? 0) > 0)
  
  // Build map of group -> total points
  const groupPointsMap = new Map<string, number>()
  let totalCoursePoints = 0
  
  for (const g of groups) {
    const gid = String(g.id)
    let groupTotal = 0
    
    if (g.assignments) {
      for (const a of g.assignments) {
        const pts = Math.max(0, Number(a.points_possible) || 0)
        groupTotal += pts
        totalCoursePoints += pts
      }
    }
    
    groupPointsMap.set(gid, groupTotal)
  }
  
  return {
    groups,
    useWeights: hasWeights,
    totalCoursePoints,
    groupPointsMap,
  }
}

/**
 * Calculate effective weight of an assignment as a percentage of the final grade.
 * Returns a number 0-100 representing the % of final grade this assignment is worth.
 * Returns null if we can't calculate (missing data).
 */
export function calculateAssignmentWeight(
  assignment: AssignmentForWeight,
  context: WeightContext
): number | null {
  const points = Math.max(0, Number(assignment.points_possible) || 0)
  if (points <= 0) return null
  
  const groupId = String(assignment.assignment_group_id || '')
  
  if (context.useWeights) {
    // Weighted mode: weight = (points / groupPoints) * groupWeight
    const group = context.groups.find((g) => String(g.id) === groupId)
    if (!group) return null
    
    const groupWeight = Math.max(0, Number(group.group_weight) || 0)
    const groupPoints = context.groupPointsMap.get(groupId) || 0
    
    if (groupPoints <= 0 || groupWeight <= 0) return null
    
    const weight = (points / groupPoints) * groupWeight
    return Math.round(weight * 100) / 100  // Round to 2 decimals
  } else {
    // Unweighted mode: weight = points / totalPoints * 100
    if (context.totalCoursePoints <= 0) return null
    
    const weight = (points / context.totalCoursePoints) * 100
    return Math.round(weight * 100) / 100
  }
}

/**
 * Calculate weights for multiple assignments at once.
 * Returns a Map of assignmentId -> weight percentage.
 */
export function calculateAllWeights(
  assignments: AssignmentForWeight[],
  context: WeightContext
): Map<string, number | null> {
  const result = new Map<string, number | null>()
  
  for (const a of assignments) {
    const weight = calculateAssignmentWeight(a, context)
    result.set(String(a.id), weight)
  }
  
  return result
}

/**
 * Format weight for display based on its magnitude.
 * - >= 15%: "High stakes"
 * - 5-14%: "X% of grade"
 * - < 5%: Just show points (caller should handle this case)
 */
export function formatWeightDisplay(
  weight: number | null | undefined,
  pointsPossible?: number | null
): { text: string; emphasis: 'high' | 'medium' | 'low' } {
  if (weight === null || weight === undefined) {
    // Can't calculate weight, show points if available
    if (pointsPossible && pointsPossible > 0) {
      return { text: `${pointsPossible} pts`, emphasis: 'low' }
    }
    return { text: '', emphasis: 'low' }
  }
  
  if (weight >= 15) {
    return { text: 'High stakes', emphasis: 'high' }
  }
  
  if (weight >= 5) {
    return { text: `${Math.round(weight)}% of grade`, emphasis: 'medium' }
  }
  
  // Low weight, just show points
  if (pointsPossible && pointsPossible > 0) {
    return { text: `${pointsPossible} pts`, emphasis: 'low' }
  }
  
  return { text: `${Math.round(weight)}%`, emphasis: 'low' }
}
