import { describe, expect, it, vi } from 'vitest'
import { calculatePriorityScore, rankAssignmentsByPriority } from './priorityScore'

describe('priorityScore', () => {
  it('boosts any unsubmitted item due within 24h above later items', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-04T04:00:00.000Z'))

    const dueSoon = calculatePriorityScore({
      id: 'soon',
      name: 'Due soon (low weight)',
      courseId: 'c',
      dueAt: '2026-02-04T05:00:00.000Z', // +1h
      effectiveWeight: 0,
      isSubmitted: false,
    })

    const laterHighWeight = calculatePriorityScore({
      id: 'later',
      name: 'Later (high weight)',
      courseId: 'c',
      dueAt: '2026-02-07T04:00:00.000Z', // +72h
      effectiveWeight: 100,
      isSubmitted: false,
    })

    expect(dueSoon.priorityScore).toBeGreaterThan(laterHighWeight.priorityScore)

    const ranked = rankAssignmentsByPriority([laterHighWeight, dueSoon], {
      withinDays: 30,
      limit: 10,
      includeSubmitted: true,
      includePastDue: true,
    })
    expect(String(ranked[0]?.id)).toBe('soon')
  })

  it('treats past-due unsubmitted as highest urgency', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-04T04:00:00.000Z'))

    const pastDue = calculatePriorityScore({
      id: 'past',
      name: 'Past due',
      courseId: 'c',
      dueAt: '2026-02-04T03:00:00.000Z', // -1h
      effectiveWeight: 0,
      isSubmitted: false,
    })
    const dueSoon = calculatePriorityScore({
      id: 'soon',
      name: 'Due soon',
      courseId: 'c',
      dueAt: '2026-02-04T05:00:00.000Z', // +1h
      effectiveWeight: 0,
      isSubmitted: false,
    })

    expect(pastDue.priorityScore).toBeGreaterThan(dueSoon.priorityScore)
  })
})

