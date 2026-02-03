import { describe, expect, it } from 'vitest'
import { normalizeAssignmentFromRest } from './assignmentNormalization'

describe('normalizeAssignmentFromRest', () => {
  it('maps REST snake_case to GraphQL-like keys', () => {
    const a = normalizeAssignmentFromRest({
      id: 123,
      name: 'HW 1',
      due_at: '2026-02-01T12:34:56Z',
      workflow_state: 'published',
      points_possible: 10,
      submission_types: ['online_text_entry'],
      html_url: 'https://gatech.instructure.com/courses/1/assignments/123',
      submission: { submitted_at: '2026-01-31T00:00:00Z', workflow_state: 'submitted' },
    })

    expect(a).toEqual({
      id: '123',
      _id: '123',
      name: 'HW 1',
      dueAt: '2026-02-01T12:34:56Z',
      state: 'published',
      pointsPossible: 10,
      submissionTypes: ['online_text_entry'],
      htmlUrl: 'https://gatech.instructure.com/courses/1/assignments/123',
      submission: { submittedAt: '2026-01-31T00:00:00Z', workflowState: 'submitted' },
    })
  })

  it('handles null due_at and missing submission', () => {
    const a = normalizeAssignmentFromRest({
      id: 'abc',
      name: 'No due date',
      due_at: null,
      points_possible: null,
      submission_types: ['none'],
      html_url: undefined,
    })

    expect(a.dueAt).toBeNull()
    expect(a.submission).toBeUndefined()
  })

  it('defaults submissionTypes to []', () => {
    const a = normalizeAssignmentFromRest({
      id: 1,
      name: 'Test',
      due_at: null,
    })
    expect(a.submissionTypes).toEqual([])
  })
})

