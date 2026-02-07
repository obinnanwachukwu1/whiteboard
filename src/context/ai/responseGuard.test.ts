import { describe, expect, it } from 'vitest'
import {
  buildFallbackResponse,
  detectExpectedAssignment,
  validateBufferedPrefix,
  validateFinalResponse,
  type GuardAssignment,
} from './responseGuard'

const candidates: GuardAssignment[] = [
  {
    title: 'Homework 2',
    course: 'Applied Combinatorics',
    dueISO: '2026-02-10T23:59:00',
    dueLabel: 'Feb 10, 2026, 11:59 PM',
    points: 50,
  },
  {
    title: 'Discussion Post 3',
    course: 'Tech Communication',
    dueISO: '2026-02-09T17:00:00',
    dueLabel: 'Feb 9, 2026, 5:00 PM',
    points: 20,
  },
]

describe('responseGuard', () => {
  it('flags wrong reference in buffered prefix', () => {
    const expected = candidates[0]
    const result = validateBufferedPrefix('Discussion Post 3 in Tech Communication is due Feb 9.', {
      intent: 'due_date',
      query: 'what about the first one',
      expectedAssignment: expected,
      candidateAssignments: candidates,
      mustDeclineMissingData: false,
      requireSummaryFormat: false,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('wrong_reference')
  })

  it('requires missing-data decline when configured', () => {
    const result = validateFinalResponse('Homework 2 is due Feb 10.', {
      intent: 'due_date',
      query: 'when is final exam 2 due',
      expectedAssignment: null,
      candidateAssignments: candidates,
      mustDeclineMissingData: true,
      requireSummaryFormat: false,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('missing_decline')
  })

  it('enforces content summary format when requested', () => {
    const result = validateFinalResponse('This policy allows late submissions.', {
      intent: 'content_qa',
      query: 'Summarize this and give key takeaways.',
      expectedAssignment: null,
      candidateAssignments: [],
      mustDeclineMissingData: false,
      requireSummaryFormat: true,
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('summary_format')
  })

  it('builds deterministic fallback from expected assignment', () => {
    const text = buildFallbackResponse({
      intent: 'due_date',
      query: 'when is that assignment due exactly',
      expectedAssignment: candidates[0],
      candidateAssignments: candidates,
      mustDeclineMissingData: false,
      requireSummaryFormat: false,
    })
    expect(text).toContain('Homework 2')
    expect(text).toContain('Applied Combinatorics')
  })

  it('resolves expected assignment from coordinator reference', () => {
    const expected = detectExpectedAssignment(
      { kind: 'assignment', title: 'Homework 2', course: 'Applied Combinatorics' },
      candidates,
    )
    expect(expected?.title).toBe('Homework 2')
    expect(expected?.course).toBe('Applied Combinatorics')
  })
})
