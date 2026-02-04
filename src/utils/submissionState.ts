type CanvasSubmissionLike = {
  submittedAt?: string | null
  workflowState?: string | null
  state?: string | null
}

/**
 * Determine whether Canvas considers the assignment "submitted" for the current user.
 *
 * Note: External tool submissions (e.g., Gradescope) can report `workflow_state`
 * values like `pending_review` while `submitted_at` remains null. We still treat
 * these as submitted, since "submitted" should not imply "graded".
 */
export function isSubmissionSubmitted(submission: CanvasSubmissionLike | null | undefined): boolean {
  if (!submission) return false
  if (submission.submittedAt) return true

  const state = String(submission.workflowState || submission.state || '').toLowerCase()
  if (!state) return false

  return state === 'submitted' || state === 'graded' || state === 'pending_review'
}
