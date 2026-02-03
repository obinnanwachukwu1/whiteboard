export type RestAssignmentSubmission = {
  submitted_at?: string | null
  workflow_state?: string
}

export type RestAssignment = {
  id: string | number
  name?: string
  due_at?: string | null
  workflow_state?: string
  points_possible?: number | null
  submission_types?: string[]
  html_url?: string
  submission?: RestAssignmentSubmission
  published?: boolean
}

export type NormalizedAssignmentSubmission = {
  submittedAt: string | null
  workflowState?: string
}

export type NormalizedAssignment = {
  id: string
  _id: string
  name: string
  dueAt: string | null
  state: string | null
  pointsPossible: number | null
  submissionTypes: string[]
  htmlUrl: string | null
  submission?: NormalizedAssignmentSubmission
}

export function normalizeAssignmentFromRest(rest: RestAssignment): NormalizedAssignment {
  const id = String(rest.id)
  const submission =
    rest.submission != null
      ? {
          submittedAt: typeof rest.submission.submitted_at === 'string' ? rest.submission.submitted_at : null,
          workflowState:
            typeof rest.submission.workflow_state === 'string' ? rest.submission.workflow_state : undefined,
        }
      : undefined

  const state =
    typeof rest.workflow_state === 'string'
      ? rest.workflow_state
      : rest.published === true
        ? 'published'
        : rest.published === false
          ? 'unpublished'
          : null

  return {
    id,
    _id: id,
    name: rest.name ?? '',
    dueAt: typeof rest.due_at === 'string' ? rest.due_at : null,
    state,
    pointsPossible: typeof rest.points_possible === 'number' ? rest.points_possible : null,
    submissionTypes: Array.isArray(rest.submission_types) ? rest.submission_types : [],
    htmlUrl: typeof rest.html_url === 'string' ? rest.html_url : null,
    submission,
  }
}

export function assertNormalizedAssignmentDev(a: NormalizedAssignment): void {
  if (process.env.NODE_ENV === 'production') return

  if (!a || typeof a !== 'object') {
    throw new Error('[Canvas] Normalized assignment is not an object')
  }

  if (typeof a.id !== 'string' || typeof a._id !== 'string' || typeof a.name !== 'string') {
    throw new Error('[Canvas] Normalized assignment missing id/_id/name strings')
  }

  if (a.dueAt !== null && typeof a.dueAt !== 'string') {
    throw new Error('[Canvas] Normalized assignment dueAt must be string|null')
  }
  if (typeof a.dueAt === 'string') {
    const d = new Date(a.dueAt)
    if (Number.isNaN(d.getTime())) {
      throw new Error('[Canvas] Normalized assignment dueAt is not parseable')
    }
  }

  if (a.state !== null && typeof a.state !== 'string') {
    throw new Error('[Canvas] Normalized assignment state must be string|null')
  }

  if (a.pointsPossible !== null && typeof a.pointsPossible !== 'number') {
    throw new Error('[Canvas] Normalized assignment pointsPossible must be number|null')
  }

  if (!Array.isArray(a.submissionTypes) || a.submissionTypes.some((t) => typeof t !== 'string')) {
    throw new Error('[Canvas] Normalized assignment submissionTypes must be string[]')
  }

  if (a.htmlUrl !== null && typeof a.htmlUrl !== 'string') {
    throw new Error('[Canvas] Normalized assignment htmlUrl must be string|null')
  }

  if (a.submission !== undefined) {
    if (!a.submission || typeof a.submission !== 'object') {
      throw new Error('[Canvas] Normalized assignment submission must be object when present')
    }
    if (a.submission.submittedAt !== null && typeof a.submission.submittedAt !== 'string') {
      throw new Error('[Canvas] Normalized assignment submission.submittedAt must be string|null')
    }
    if (
      a.submission.workflowState !== undefined &&
      typeof a.submission.workflowState !== 'string'
    ) {
      throw new Error('[Canvas] Normalized assignment submission.workflowState must be string|undefined')
    }
  }
}

