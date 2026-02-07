import type { SearchIntent } from '../../utils/coordinator'

export type GuardAssignment = {
  title: string
  course: string
  dueISO?: string
  dueLabel?: string
  points?: number | null
}

export type ResponseGuardConfig = {
  intent: SearchIntent
  query: string
  expectedAssignment?: GuardAssignment | null
  candidateAssignments: GuardAssignment[]
  mustDeclineMissingData: boolean
  requireSummaryFormat: boolean
}

type GuardCheck = { ok: boolean; reason: string }

function normalizePhrase(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasDecline(text: string): boolean {
  return /i don't have|do not have|can't determine|cannot determine|not enough/i.test(text)
}

function hasDueSignal(text: string): boolean {
  const s = String(text || '')
  return (
    /\b\d{4}-\d{2}-\d{2}\b/i.test(s) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(s) ||
    /\b\d{1,2}:\d{2}\s?(am|pm)\b/i.test(s)
  )
}

function uniqueTitleCounts(assignments: GuardAssignment[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const a of assignments) {
    const t = normalizePhrase(a.title)
    if (!t) continue
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return counts
}

function detectMentionedAssignments(text: string, assignments: GuardAssignment[]): GuardAssignment[] {
  const out: GuardAssignment[] = []
  const body = normalizePhrase(text)
  const titleCounts = uniqueTitleCounts(assignments)
  for (const a of assignments) {
    const title = normalizePhrase(a.title)
    const course = normalizePhrase(a.course)
    if (!title || !course) continue
    const titleHit = body.includes(title)
    const courseHit = body.includes(course)
    if (titleHit && courseHit) {
      out.push(a)
      continue
    }
    if (titleHit && (titleCounts.get(title) || 0) === 1) out.push(a)
  }
  const deduped: GuardAssignment[] = []
  const seen = new Set<string>()
  for (const a of out) {
    const key = `${normalizePhrase(a.title)}|${normalizePhrase(a.course)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(a)
  }
  return deduped
}

function sameAssignment(a: GuardAssignment | null | undefined, b: GuardAssignment | null | undefined): boolean {
  if (!a || !b) return false
  return (
    normalizePhrase(a.title) === normalizePhrase(b.title) &&
    normalizePhrase(a.course) === normalizePhrase(b.course)
  )
}

function asksForDueDate(query: string): boolean {
  const q = normalizePhrase(query)
  if (!q) return false
  return (
    q.includes('when') ||
    q.includes('due') ||
    q.includes('deadline') ||
    q.includes('time') ||
    q.includes('what about the first') ||
    q.includes('what about the second')
  )
}

export function validateBufferedPrefix(text: string, config: ResponseGuardConfig): GuardCheck {
  const answer = String(text || '').trim()
  if (!answer) return { ok: false, reason: 'empty_prefix' }

  const decline = hasDecline(answer)
  const mentions = detectMentionedAssignments(answer, config.candidateAssignments)

  if (config.requireSummaryFormat) {
    if (answer.length >= 48 && !/^summary:/i.test(answer)) {
      return { ok: false, reason: 'missing_summary_prefix' }
    }
  }

  if (config.mustDeclineMissingData) {
    if (decline) return { ok: true, reason: '' }
    if (mentions.length > 0 || hasDueSignal(answer)) {
      return { ok: false, reason: 'fabricated_missing_data' }
    }
    return { ok: true, reason: '' }
  }

  if (config.expectedAssignment && mentions.length > 0) {
    const hasExpected = mentions.some((m) => sameAssignment(m, config.expectedAssignment))
    if (!hasExpected) return { ok: false, reason: 'wrong_reference' }
  }

  return { ok: true, reason: '' }
}

export function detectGuardViolation(text: string, config: ResponseGuardConfig): string {
  const answer = String(text || '')
  const decline = hasDecline(answer)
  const mentions = detectMentionedAssignments(answer, config.candidateAssignments)

  if (config.mustDeclineMissingData) {
    if (!decline && (mentions.length > 0 || hasDueSignal(answer))) return 'fabricated_missing_data'
    return ''
  }

  if (config.expectedAssignment && mentions.length > 0) {
    const hasExpected = mentions.some((m) => sameAssignment(m, config.expectedAssignment))
    if (!hasExpected) return 'wrong_reference'
  }

  return ''
}

function summaryFormatPass(answer: string): boolean {
  const hasSummary = /^summary:\s+/im.test(answer)
  const hasTakeawaysHeader = /^key takeaways:\s*$/im.test(answer)
  const bullets = String(answer)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+\S/.test(line)).length
  return hasSummary && hasTakeawaysHeader && bullets >= 3 && bullets <= 6
}

export function validateFinalResponse(text: string, config: ResponseGuardConfig): GuardCheck {
  const answer = String(text || '').trim()
  if (!answer) return { ok: false, reason: 'empty' }

  const decline = hasDecline(answer)
  const mentions = detectMentionedAssignments(answer, config.candidateAssignments)

  if (config.mustDeclineMissingData) {
    return decline ? { ok: true, reason: '' } : { ok: false, reason: 'missing_decline' }
  }

  if (config.requireSummaryFormat && !summaryFormatPass(answer)) {
    return { ok: false, reason: 'summary_format' }
  }

  if (config.expectedAssignment) {
    const titleHit = normalizePhrase(answer).includes(normalizePhrase(config.expectedAssignment.title))
    const courseHit = normalizePhrase(answer).includes(normalizePhrase(config.expectedAssignment.course))
    if (!titleHit || !courseHit) return { ok: false, reason: 'missing_expected_assignment' }

    if (asksForDueDate(config.query) && !hasDueSignal(answer)) {
      return { ok: false, reason: 'missing_due_signal' }
    }

    if (mentions.length > 0) {
      const hasExpected = mentions.some((m) => sameAssignment(m, config.expectedAssignment))
      if (!hasExpected) return { ok: false, reason: 'wrong_reference' }
    }
  }

  if (decline && config.intent !== 'general') {
    return { ok: false, reason: 'unexpected_decline' }
  }

  return { ok: true, reason: '' }
}

function formatDueForFallback(a: GuardAssignment): string {
  if (a.dueLabel) return a.dueLabel
  if (!a.dueISO) return 'the listed due date'
  const d = new Date(a.dueISO)
  if (!Number.isFinite(d.getTime())) return a.dueISO
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildRetrySystemPrompt(config: ResponseGuardConfig): string {
  if (config.requireSummaryFormat) {
    return [
      'Retry mode: follow format exactly.',
      'Output exactly:',
      'Summary: <1-3 sentences>',
      '',
      'Key takeaways:',
      '- <bullet>',
      '- <bullet>',
      '- <bullet>',
      'Use 3-6 bullets and only "- " bullets.',
    ].join('\n')
  }

  if (config.mustDeclineMissingData) {
    return 'Retry mode: data is missing. Respond exactly: "I don\'t have that in the provided context."'
  }

  if (config.expectedAssignment) {
    return `Retry mode: answer only about "${config.expectedAssignment.title}" in "${config.expectedAssignment.course}". Do not switch assignments.`
  }

  return 'Retry mode: use only provided context and keep the answer concise.'
}

export function buildFallbackResponse(config: ResponseGuardConfig): string {
  if (config.mustDeclineMissingData) return "I don't have that in the provided context."

  if (config.intent === 'planning') {
    if (!config.candidateAssignments.length) return "I don't have that in the provided context."
    const lines = config.candidateAssignments
      .slice(0, 3)
      .map((a) => {
        const due = formatDueForFallback(a)
        const points =
          typeof a.points === 'number' && Number.isFinite(a.points) ? ` - ${a.points} pts` : ''
        return `- ${a.title} (${a.course}) - due ${due}${points}`
      })
      .join('\n')
    return lines ? `Here are upcoming assignments from your current context:\n${lines}` : "I don't have that in the provided context."
  }

  if (config.expectedAssignment) {
    const due = formatDueForFallback(config.expectedAssignment)
    const points =
      typeof config.expectedAssignment.points === 'number' && Number.isFinite(config.expectedAssignment.points)
        ? ` (${config.expectedAssignment.points} points)`
        : ''
    return `${config.expectedAssignment.title} in ${config.expectedAssignment.course} is due ${due}${points}.`
  }

  if (config.candidateAssignments.length > 1) {
    const options = config.candidateAssignments
      .slice(0, 3)
      .map((a) => `${a.title} (${a.course})`)
      .join('; ')
    return options ? `Which assignment do you mean? ${options}` : 'Which assignment do you mean?'
  }

  return "I don't have that in the provided context."
}

export function detectExpectedAssignment(
  reference:
    | {
        kind: 'assignment' | 'course' | 'content' | 'none'
        title?: string
        course?: string
      }
    | undefined,
  candidates: GuardAssignment[],
): GuardAssignment | null {
  if (!reference || reference.kind !== 'assignment') return null
  const title = normalizePhrase(reference.title)
  const course = normalizePhrase(reference.course)
  if (!title || !course) return null
  for (const c of candidates) {
    if (normalizePhrase(c.title) === title && normalizePhrase(c.course) === course) return c
  }
  return null
}
