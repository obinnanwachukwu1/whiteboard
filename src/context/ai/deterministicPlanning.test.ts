import { describe, expect, it } from 'vitest'
import { buildDeterministicPlanningAnswer, selectDeterministicPlanningItems } from './deterministicPlanning'

const courses = [
  { id: 'c1', name: 'Applied Combinatorics - MATH-3012-K&L' },
  { id: 'c2', name: 'Tech Communication - LMC-3403-CX5' },
]

const dueAssignments = [
  {
    id: 'a1',
    name: 'Homework 3',
    course_id: 'c1',
    due_at: '2026-02-07T23:59:00',
    points_possible: 20,
  },
  {
    id: 'a2',
    name: 'Annotation and Reflection for Rhetorical Analysis',
    course_id: 'c2',
    due_at: '2026-02-10T14:00:00',
    points_possible: 5,
  },
  {
    id: 'a3',
    name: 'Homework 1',
    course_id: 'c1',
    due_at: '2026-02-11T23:59:00',
    points_possible: 100,
  },
]

describe('deterministicPlanning', () => {
  it('selects and sorts upcoming items from now', () => {
    const now = new Date('2026-02-07T08:00:00')
    const items = selectDeterministicPlanningItems('Summarize my upcoming assignments', dueAssignments, courses, 8, now)
    expect(items.map((i) => i.title)).toEqual([
      'Homework 3',
      'Annotation and Reflection for Rhetorical Analysis',
      'Homework 1',
    ])
  })

  it('applies this-week window', () => {
    const now = new Date('2026-02-07T08:00:00')
    const items = selectDeterministicPlanningItems("what's due this week", dueAssignments, courses, 8, now)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => new Date(i.dueISO) <= new Date('2026-02-08T23:59:59.999'))).toBe(true)
  })

  it('renders deterministic response lines and recommendation', () => {
    const now = new Date('2026-02-07T08:00:00')
    const items = selectDeterministicPlanningItems('Summarize my upcoming assignments', dueAssignments, courses, 8, now)
    const text = buildDeterministicPlanningAnswer(items)
    expect(text).toContain('Here are your upcoming assignments:')
    expect(text).toContain('- Homework 3')
    expect(text).toContain('Start with Homework 3')
  })
})
