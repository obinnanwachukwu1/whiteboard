/**
 * Priority score calculation for ranking assignments.
 *
 * Hybrid scoring model:
 * - Urgency buckets provide the base ranking structure.
 * - Impact score (weight, submission status, course pressure) ranks items within a bucket.
 * - Very high-impact items can jump at most one urgency bucket via a fixed bonus.
 */

export type PriorityAssignment = {
  id: string | number
  name: string
  dueAt: string | Date | null
  courseId: string | number
  courseName?: string
  pointsPossible?: number | null
  effectiveWeight?: number | null  // % of grade (0-100)
  isSubmitted?: boolean
  htmlUrl?: string
}

export type RankedAssignment = PriorityAssignment & {
  priorityScore: number
  urgencyMultiplier: number
  hoursUntilDue: number | null
  daysUntilDue: number | null
}

type PriorityScoreOptions = {
  /** Small boost when a course has multiple due-soon items */
  coursePressureBoost?: number
}

const IMPACT_WEIGHT_CAP = 40
const IMPACT_WEIGHT_MULTIPLIER = 1.5
const IMPACT_SUBMITTED_PENALTY = -20
const IMPACT_UNSUBMITTED_BONUS = 10
const HIGH_IMPACT_JUMP_THRESHOLD = 70
const HIGH_IMPACT_JUMP_BONUS = 60

const BUCKET_BASE_SCORES = {
  pastDue: 420,
  due24h: 360,
  due72h: 260,
  due7d: 160,
  later: 80,
  none: 0,
} as const

/**
 * Calculate hours until a due date from now.
 * Returns null if no due date or invalid date.
 * Negative values mean past due.
 */
export function hoursUntilDue(
  dueAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!dueAt) return null
  
  try {
    const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt
    if (isNaN(due.getTime())) return null
    
    const diffMs = due.getTime() - nowMs
    return diffMs / (1000 * 60 * 60)
  } catch {
    return null
  }
}

/**
 * Calculate days until due (rounded).
 */
export function daysUntilDue(dueAt: string | Date | null | undefined): number | null {
  const hours = hoursUntilDue(dueAt)
  if (hours === null) return null
  return Math.round(hours / 24)
}

/**
 * Get urgency multiplier based on hours until due.
 * - ≤24h: 3x
 * - ≤48h: 2x
 * - ≤72h: 1.5x
 * - >72h: 1x
 * - Past due: 4x (highest urgency)
 */
export function getUrgencyMultiplier(hours: number | null): number {
  if (hours === null) return 1  // No due date, lowest urgency
  
  if (hours < 0) return 4       // Past due - highest urgency
  if (hours <= 24) return 3     // Due within 24 hours
  if (hours <= 48) return 2     // Due within 48 hours
  if (hours <= 72) return 1.5   // Due within 72 hours
  return 1                      // More than 72 hours out
}

function getUrgencyBucket(hours: number | null): {
  index: number
  baseScore: number
} {
  if (hours === null) {
    return { index: 4, baseScore: BUCKET_BASE_SCORES.none }
  }
  if (hours < 0) {
    return { index: 0, baseScore: BUCKET_BASE_SCORES.pastDue }
  }
  if (hours <= 24) {
    return { index: 0, baseScore: BUCKET_BASE_SCORES.due24h }
  }
  if (hours <= 72) {
    return { index: 1, baseScore: BUCKET_BASE_SCORES.due72h }
  }
  if (hours <= 168) {
    return { index: 2, baseScore: BUCKET_BASE_SCORES.due7d }
  }
  return { index: 3, baseScore: BUCKET_BASE_SCORES.later }
}

function calculateImpactScore(
  assignment: PriorityAssignment,
  coursePressureBoost: number
): number {
  const weight = Math.max(0, assignment.effectiveWeight ?? 0)
  const normalizedWeight = Math.min(weight, IMPACT_WEIGHT_CAP)
  const weightScore = normalizedWeight * IMPACT_WEIGHT_MULTIPLIER
  const statusScore = assignment.isSubmitted ? IMPACT_SUBMITTED_PENALTY : IMPACT_UNSUBMITTED_BONUS
  return weightScore + statusScore + coursePressureBoost
}

/**
 * Calculate priority score for a single assignment.
 * Higher score = higher priority.
 */
export function calculatePriorityScore(
  assignment: PriorityAssignment,
  options: PriorityScoreOptions = {}
): RankedAssignment {
  const hours = hoursUntilDue(assignment.dueAt)
  const days = hours !== null ? Math.round(hours / 24) : null
  const urgency = getUrgencyMultiplier(hours)

  const bucket = getUrgencyBucket(hours)
  const impactScore = calculateImpactScore(assignment, options.coursePressureBoost ?? 0)

  // High-impact items can jump one bucket only from 3-7d (or later) into the next bucket.
  // This keeps urgency meaningful while still surfacing meaningful long-range work.
  const canJumpOneBucket = !assignment.isSubmitted && bucket.index >= 2 && impactScore >= HIGH_IMPACT_JUMP_THRESHOLD
  const jumpBonus = canJumpOneBucket ? HIGH_IMPACT_JUMP_BONUS : 0

  const priorityScore = bucket.baseScore + impactScore + jumpBonus
  
  return {
    ...assignment,
    priorityScore,
    urgencyMultiplier: urgency,
    hoursUntilDue: hours,
    daysUntilDue: days,
  }
}

/**
 * Rank assignments by priority score (descending).
 * Optionally filter to only assignments due within a time horizon.
 */
export function rankAssignmentsByPriority(
  assignments: PriorityAssignment[],
  options: {
    /** Only include assignments due within this many days (null = no limit) */
    withinDays?: number | null
    /** Maximum number of results to return */
    limit?: number
    /** Include submitted assignments? Default false */
    includeSubmitted?: boolean
    /** Include past due assignments? Default true */
    includePastDue?: boolean
  } = {}
): RankedAssignment[] {
  const {
    withinDays = null,
    limit = 5,
    includeSubmitted = false,
    includePastDue = true,
  } = options
  
  const dueSoonCounts = new Map<string, number>()
  for (const a of assignments) {
    const hours = hoursUntilDue(a.dueAt)
    if (a.isSubmitted || hours === null || hours > 72) continue
    const cid = String(a.courseId)
    dueSoonCounts.set(cid, (dueSoonCounts.get(cid) ?? 0) + 1)
  }

  // Score all assignments
  const scored = assignments.map((a) => {
    const courseDueSoonCount = dueSoonCounts.get(String(a.courseId)) ?? 0
    const coursePressureBoost = courseDueSoonCount >= 2 ? 5 : 0
    return calculatePriorityScore(a, { coursePressureBoost })
  })
  
  // Filter
  const filtered = scored.filter((a) => {
    // Filter out submitted if requested
    if (!includeSubmitted && a.isSubmitted) return false
    
    // Filter out past due if requested
    if (!includePastDue && a.hoursUntilDue !== null && a.hoursUntilDue < 0) return false
    
    // Filter by time horizon
    if (withinDays !== null && a.hoursUntilDue !== null) {
      const horizonHours = withinDays * 24
      if (a.hoursUntilDue > horizonHours) return false
    }
    
    // Must have a due date to be prioritized
    if (a.dueAt === null) return false
    
    return true
  })
  
  // Sort by priority score descending
  filtered.sort((a, b) => b.priorityScore - a.priorityScore)
  
  // Apply limit, but include any remaining items that are urgent (due within 48h)
  const result = filtered.slice(0, limit)
  const remainder = filtered.slice(limit)
  
  for (const item of remainder) {
    // If due within 48 hours (including past due), force include it
    if (item.hoursUntilDue !== null && item.hoursUntilDue <= 48) {
      result.push(item)
    }
  }
  
  return result
}

/**
 * Get assignments that are beyond the time horizon (for "Also Due" section).
 */
export function getAssignmentsBeyondHorizon(
  assignments: PriorityAssignment[],
  horizonDays: number
): RankedAssignment[] {
  const horizonHours = horizonDays * 24
  
  const scored = assignments.map((a) => calculatePriorityScore(a))
  
  return scored.filter((a) => {
    // Must not be submitted
    if (a.isSubmitted) return false
    
    // Must have a due date
    if (a.hoursUntilDue === null) return false
    
    // Must be beyond the horizon (future, not past)
    return a.hoursUntilDue > horizonHours
  }).sort((a, b) => {
    // Sort by due date ascending (soonest first among "later" items)
    return (a.hoursUntilDue ?? 0) - (b.hoursUntilDue ?? 0)
  })
}

/**
 * Format relative time for display.
 * - Past: "2 days ago", "5 hours ago"
 * - Future: "in 2 days", "in 5 hours", "tomorrow"
 */
export function formatRelativeDue(hours: number | null): string {
  if (hours === null) return 'No due date'
  
  const absHours = Math.abs(hours)
  const isPast = hours < 0
  
  if (absHours < 1) {
    const mins = Math.round(absHours * 60)
    if (mins < 1) return isPast ? 'Just now' : 'Due now'
    return isPast ? `${mins}m ago` : `${mins}m`
  }
  
  if (absHours < 24) {
    const h = Math.round(absHours)
    return isPast ? `${h}h ago` : `${h}h`
  }
  
  const days = Math.round(absHours / 24)
  
  if (days === 1) {
    return isPast ? 'Yesterday' : 'Tomorrow'
  }
  
  if (days < 7) {
    return isPast ? `${days}d ago` : `${days}d`
  }
  
  const weeks = Math.round(days / 7)
  if (weeks === 1) {
    return isPast ? '1 week ago' : '1 week'
  }
  
  return isPast ? `${weeks} weeks ago` : `${weeks} weeks`
}
