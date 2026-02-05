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

  it('allows a high-impact 3-7d item to jump one bucket above low-impact 24-72h work', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T00:00:00.000Z'))

    const ranked = rankAssignmentsByPriority(
      [
        {
          id: 'soon-low',
          name: 'Soon low impact',
          courseId: 'c1',
          dueAt: '2026-02-06T12:00:00.000Z', // +36h
          effectiveWeight: 2,
          isSubmitted: false,
        },
        {
          id: 'later-high',
          name: 'Later high impact',
          courseId: 'c2',
          dueAt: '2026-02-10T00:00:00.000Z', // +120h (3-7d bucket)
          effectiveWeight: 100,
          isSubmitted: false,
        },
      ],
      {
        withinDays: 30,
        limit: 10,
        includeSubmitted: true,
        includePastDue: true,
      },
    )

    expect(String(ranked[0]?.id)).toBe('later-high')
  })

  it('does not let 24-72h work jump into <=24h bucket', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T00:00:00.000Z'))

    const ranked = rankAssignmentsByPriority(
      [
        {
          id: 'due-today',
          name: 'Due today low impact',
          courseId: 'c1',
          dueAt: '2026-02-05T12:00:00.000Z', // +12h
          effectiveWeight: 1,
          isSubmitted: false,
        },
        {
          id: 'due-tomorrow-high',
          name: 'Due tomorrow very high impact',
          courseId: 'c2',
          dueAt: '2026-02-06T12:00:00.000Z', // +36h
          effectiveWeight: 100,
          isSubmitted: false,
        },
      ],
      {
        withinDays: 30,
        limit: 10,
        includeSubmitted: true,
        includePastDue: true,
      },
    )

    expect(String(ranked[0]?.id)).toBe('due-today')
  })
})
