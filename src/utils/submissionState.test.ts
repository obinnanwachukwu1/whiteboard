import { describe, expect, it } from 'vitest'
import { isSubmissionSubmitted } from './submissionState'

describe('isSubmissionSubmitted', () => {
  it('treats pending_review as submitted (external tool)', () => {
    expect(isSubmissionSubmitted({ workflowState: 'pending_review', submittedAt: null })).toBe(true)
  })

  it('treats submitted_at as submitted even without workflow state', () => {
    expect(isSubmissionSubmitted({ submittedAt: '2026-02-04T04:00:00.000Z' })).toBe(true)
  })

  it('treats unsubmitted as not submitted', () => {
    expect(isSubmissionSubmitted({ workflowState: 'unsubmitted', submittedAt: null })).toBe(false)
  })
})

