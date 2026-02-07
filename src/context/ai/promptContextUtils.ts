import { type SearchIntent, type SearchNeeds, type SearchPlan } from '../../utils/coordinator'
import { extractAssignmentIdFromUrl } from '../../utils/urlHelpers'

export function truncateForPrompt(text: string, maxChars: number): string {
  const t = String(text || '')
  if (t.length <= maxChars) return t
  if (maxChars <= 0) return ''
  const suffix = '\n\n[truncated]'
  if (maxChars <= suffix.length) return t.slice(0, maxChars)
  return t.slice(0, maxChars - suffix.length) + suffix
}

export function estimatePromptChars(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + String(m.content || '').length, 0)
}

export function normalizeAIStreamError(error: string): string {
  const raw = String(error || '')
  const lower = raw.toLowerCase()
  if (
    lower.includes('socket hang up') ||
    lower.includes('econnreset') ||
    lower.includes('empty reply') ||
    lower.includes('context_length_exceeded') ||
    lower.includes('context window exceeded')
  ) {
    return (
      'The AI request failed (likely because the prompt was too large). ' +
      'Try removing attachments, starting a new chat, or asking a narrower question.'
    )
  }
  return raw
}

export function isLikelyPromptTooLargeError(error: string): boolean {
  const lower = String(error || '').toLowerCase()
  return (
    lower.includes('socket hang up') ||
    lower.includes('econnreset') ||
    lower.includes('empty reply') ||
    lower.includes('context_length_exceeded') ||
    lower.includes('context window exceeded')
  )
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 0) return 'overdue'
  if (diffHours < 1) return 'due soon'
  if (diffHours < 24) return `in ${diffHours}h`
  if (diffDays === 1) return 'tomorrow'
  if (diffDays < 7) return `in ${diffDays} days`
  return `in ${diffDays} days`
}

/**
 * Build structured context from app data for time-sensitive queries
 */
export function xmlEscapeText(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function xmlEscapeAttr(value: unknown): string {
  return xmlEscapeText(value).replace(/"/g, '&quot;')
}

export function xmlEl(tag: string, content: string, attrs?: Record<string, unknown>): string {
  const attrStr = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v != null && String(v) !== '')
        .map(([k, v]) => ` ${k}="${xmlEscapeAttr(v)}"`)
        .join('')
    : ''
  return `<${tag}${attrStr}>${content}</${tag}>`
}

export type PromptHistoryMessage = { role: 'user' | 'assistant'; content: string }

export type ConversationAssignmentSummary = {
  title: string
  course: string
  due?: string
  points?: number | null
}

export function buildConversationSummaryContext(
  history: PromptHistoryMessage[],
  lastAssignments: ConversationAssignmentSummary[],
): string {
  const userGoals = (history || [])
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) =>
      String(m.content || '')
        .replace(/[\r\n]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)

  const goalXml = userGoals.map((g) => xmlEl('Goal', xmlEscapeText(g))).join('')

  const assignmentXml = (lastAssignments || [])
    .slice(0, 5)
    .map((a, i) => {
      const parts =
        xmlEl('Title', xmlEscapeText(a.title)) +
        xmlEl('Course', xmlEscapeText(a.course)) +
        (a.due ? xmlEl('Due', xmlEscapeText(a.due)) : '') +
        (typeof a.points === 'number' && Number.isFinite(a.points)
          ? xmlEl('Points', xmlEscapeText(a.points))
          : '')
      return xmlEl('A', parts, { ord: String(i + 1) })
    })
    .join('')

  const sections: string[] = []
  if (goalXml) sections.push(xmlEl('RecentUserGoals', goalXml))
  if (assignmentXml) sections.push(xmlEl('LastAssignments', assignmentXml))
  if (!sections.length) return ''
  return xmlEl('ConversationState', sections.join(''), { source: 'deterministic' })
}

export function looksLikeAssignmentsQuery(query: string): boolean {
  const q = String(query || '').toLowerCase()
  if (!q.trim()) return false

  return (
    q.includes("what's due") ||
    q.includes('whats due') ||
    q.includes('due today') ||
    q.includes('due tomorrow') ||
    q.includes('tomorrow') ||
    q.includes('upcoming assignment') ||
    q.includes('upcoming assignments') ||
    q.includes('summarize my upcoming') ||
    q.includes('summarize upcoming') ||
    q.includes('due this week') ||
    q.includes('due next week') ||
    q.includes('due soon') ||
    q.includes('what should i work on') ||
    q.includes('what should i get started on') ||
    q.includes('prioritize') ||
    q.includes('priority') ||
    // Catch-alls
    q.includes('assignments') ||
    q.includes('upcoming')
  )
}

export function mergeNeeds(a: SearchNeeds | undefined, b: SearchNeeds | undefined): SearchNeeds {
  return {
    ...(a || {}),
    ...(b || {}),
    assignments: Boolean(a?.assignments || b?.assignments),
    grades: Boolean(a?.grades || b?.grades),
    recentSubmissions: Boolean(a?.recentSubmissions || b?.recentSubmissions),
    announcements: Boolean(a?.announcements || b?.announcements),
    contentSearch: Boolean(a?.contentSearch || b?.contentSearch),
    includeDate: Boolean(a?.includeDate || b?.includeDate),
  }
}

export function inferNeedsFromQuery(query: string): SearchNeeds {
  const q = String(query || '').toLowerCase()
  const needs: SearchNeeds = {}
  if (looksLikeAssignmentsQuery(q)) {
    needs.assignments = true
    needs.includeDate = true
  }
  if (q.includes('grade') || q.includes('grades') || q.includes('score') || q.includes('points')) {
    needs.grades = true
  }
  if (
    q.includes('submission') ||
    q.includes('submissions') ||
    q.includes('feedback') ||
    q.includes('graded')
  ) {
    needs.recentSubmissions = true
  }
  if (q.includes('announcement') || q.includes('announcements')) {
    needs.announcements = true
  }
  if (q.includes('explain') || q.includes('summarize') || q.includes('policy')) {
    needs.contentSearch = true
  }
  return needs
}

/**
 * Build concise system prompt (rules only, no examples)
 * Examples are provided as few-shot message pairs instead
 */
export type SystemPromptMeta = {
  userName?: string
  pinnedCourses?: string[]
}

export function buildSystemPrompt(intent: SearchIntent, meta?: SystemPromptMeta): string {
  const pinned = (meta?.pinnedCourses || [])
    .map((s) =>
      String(s || '')
        .replace(/[\r\n]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 8)

  const userName = String(meta?.userName || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()

  const hints =
    userName || pinned.length
      ? `\nThe user's name is: ${userName || 'Unknown'}.` +
        (pinned.length ? ` They are enrolled in the following courses: ${pinned.join(', ')}.` : '')
      : ''

  const appInfo =
    `Whiteboard is an open source desktop client for Canvas. ` +
    `Whiteboard is not affiliated with Canvas LMS. ` +
    `Canvas is a learning management system (LMS) where courses contain assignments, grades, announcements, modules, pages, and files. `

  const base =
    `You are an assistant inside Whiteboard. ` +
    appInfo +
    hints +
    `Answer using only facts from the provided Context. ` +
    `Some structured data may be provided as XML (for example, <StructuredContext>...). ` +
    `If the Context is missing the needed data (for example, it contains "DueAssignments: []"), say you don't have enough information and do not guess. ` +
    `Never mention courses or assignments that are not explicitly listed in the Context.`

  // Style guidelines to improve response quality
  const styleGuide = `
Use plain language. Avoid filler phrases like "in order to", "due to", "crucial", "significant".
If mentioning time: use "in N hours" or "in N days", not ordinals like "3rd day".
Prefer active voice and simple verbs (start, review, submit, check).
Do not invent information not in the context.`

  switch (intent) {
    case 'planning':
      return `${base} For planning: if <PriorityContext> is provided, treat it as the ranked priority order; do not reorder it or invent priorities. List items with bullets. Include course, due date, points. End with a 1-sentence recommendation.${styleGuide}`
    case 'due_date':
      return `${base} State the exact due date/time, course name, and points in 1-2 sentences.${styleGuide}`
    case 'content_qa':
      return `${base} Follow the user's requested format.
If the user asks for a summary and key takeaways: write a "Summary:" section (1-3 sentences) and a "Key takeaways:" section (3-6 bullets starting with "- ").
Otherwise: answer in 2-4 sentences.
Reference the source when possible.${styleGuide}`
    case 'general':
    default:
      return `${base} Keep responses brief (1-2 sentences).${styleGuide}`
  }
}

/**
 * Build few-shot examples as message pairs for the given intent
 * Returns array of {role, content} to insert before the real query
 */
export function buildFewShotExamples(
  intent: SearchIntent,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  switch (intent) {
    case 'planning':
      return [
        {
          role: 'user',
          content:
            'Context:\n<StructuredContext authoritative="true">' +
            '<Overdue count="1"><A><Title>HW 3</Title><Course>Course A</Course><Due>Mon, Mar 10, 11:59 PM</Due><Points>50</Points></A></Overdue>' +
            '<Upcoming count="2">' +
            '<A><Title>Quiz 2</Title><Course>Course B</Course><Due>Tue, Mar 11, 11:59 PM</Due><Relative>tomorrow</Relative><Points>25</Points></A>' +
            '<A><Title>Essay</Title><Course>Course C</Course><Due>Fri, Mar 14, 11:59 PM</Due><Relative>in 4 days</Relative><Points>100</Points></A>' +
            '</Upcoming>' +
            '</StructuredContext>\n\nQuestion: what should I work on',
        },
        {
          role: 'assistant',
          content:
            "Here's your priority:\n• [OVERDUE] HW 3 (Course A) - was due Mon, 50 pts\n• Quiz 2 (Course B) - due tomorrow, 25 pts\n• Essay (Course C) - due Fri, 100 pts\n\nFocus on the overdue item first, then the one due tomorrow.",
        },
      ]
    case 'due_date':
      return [
        {
          role: 'user',
          content:
            'Context:\n<StructuredContext authoritative="true">' +
            '<Assignments scope="matches" count="1">' +
            '<A><Title>Homework 2</Title><Course>Math 101</Course><Due>Sat, Mar 15, 11:59 PM</Due><Points>50</Points><DueISO>2025-03-15T23:59:00</DueISO></A>' +
            '</Assignments>' +
            '</StructuredContext>\n\nQuestion: when is homework 2 due',
        },
        {
          role: 'assistant',
          content: 'Homework 2 is due Saturday, March 15 at 11:59 PM (50 points).',
        },
      ]
    case 'content_qa':
      return [
        {
          role: 'user',
          content:
            'Context:\n## Related Content\n[page] Syllabus (Eng 102): Late work accepted up to 3 days with 10% penalty per day. No submissions after 3 days.\n\nQuestion: what is the late policy',
        },
        {
          role: 'assistant',
          content:
            'According to the Eng 102 syllabus, late work is accepted up to 3 days after the deadline with a 10% penalty per day. After 3 days, no late submissions are accepted.',
        },
      ]
    case 'general':
    default:
      return [
        { role: 'user', content: 'Question: hello' },
        { role: 'assistant', content: 'Hi! How can I help you with your courses today?' },
      ]
  }
}

export function buildStructuredContext(
  plan: SearchPlan,
  query: string,
  dueAssignments: any[] = [],
  courses: any[] = [],
  courseGrades: Array<{ courseId: string | number; courseName: string; grade: number | null }> = [],
  recentSubmissions: Array<{
    courseId: string | number
    courseName: string
    assignmentId: string | number
    name: string
    score: number | null
    pointsPossible: number | null
    gradedAt: string
    htmlUrl?: string
  }> = [],
): string {
  const normalizePhrase = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  }

  function startOfWeek(d: Date, weekStartsOnMonday = true): Date {
    const day = d.getDay() // 0=Sun
    const weekStart = weekStartsOnMonday ? 1 : 0
    const diff = (day - weekStart + 7) % 7
    const out = new Date(d)
    out.setDate(out.getDate() - diff)
    return startOfDay(out)
  }

  function parseDueWindow(qLower: string): { start: Date; end: Date } | null {
    const now = new Date()
    const today0 = startOfDay(now)

    if (qLower.includes('due today')) {
      return { start: today0, end: endOfDay(now) }
    }
    if (qLower.includes('tomorrow')) {
      const t = new Date(today0)
      t.setDate(t.getDate() + 1)
      return { start: t, end: endOfDay(t) }
    }
    if (qLower.includes('this week')) {
      const ws = startOfWeek(now, true)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      return { start: today0, end: endOfDay(we) }
    }
    if (qLower.includes('next week')) {
      const ws = startOfWeek(now, true)
      const next = new Date(ws)
      next.setDate(next.getDate() + 7)
      const we = new Date(next)
      we.setDate(we.getDate() + 6)
      return { start: next, end: endOfDay(we) }
    }
    return null
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const qLower = String(query || '').toLowerCase()
  const matchQuery =
    plan.intent === 'due_date' && String(plan.rewrittenQuery || '').trim()
      ? String(plan.rewrittenQuery || '')
      : query
  const matchQueryLower = String(matchQuery || '').toLowerCase()
  const dueWindow = parseDueWindow(qLower)

  // Only include raw data if coordinator thinks it's needed (planning/due_date)
  const isPlanning = plan.intent === 'planning'
  const isDueDate = plan.intent === 'due_date'
  const mergedNeeds = mergeNeeds(plan.needs, inferNeedsFromQuery(query))

  const wantsAssignments = Boolean(mergedNeeds.assignments) || looksLikeAssignmentsQuery(query)
  const needsData = Boolean(mergedNeeds.includeDate) || isPlanning || isDueDate || wantsAssignments
  const includeRawData = isPlanning || isDueDate

  const courseIdSet = plan.filters?.courseIds?.length ? new Set(plan.filters.courseIds) : null

  const applyTimeRange = (dueAt: string | null): boolean => {
    const range = plan.filters?.timeRange || 'all'
    if (range === 'all') return true
    if (!dueAt) return true
    const t = Date.parse(String(dueAt))
    if (!Number.isFinite(t)) return true
    return range === 'upcoming' ? t >= today.getTime() : t < today.getTime()
  }

  const applyDueWindow = (dueAt: string | null): boolean => {
    if (!dueWindow) return true
    if (!dueAt) return false
    const t = Date.parse(String(dueAt))
    if (!Number.isFinite(t)) return false
    return t >= dueWindow.start.getTime() && t <= dueWindow.end.getTime()
  }

  const dueRows = includeRawData
    ? dueAssignments
        .filter((a) => {
          const dueAt = a?.due_at || a?.dueAt
          if (!dueAt) return false
          return true
        })
        .filter((a: any) => {
          const cid = String(a?.course_id || a?.courseId || '')
          if (courseIdSet && cid && !courseIdSet.has(cid)) return false
          const dueAt = a?.due_at || a?.dueAt || null
          if (!applyTimeRange(dueAt)) return false
          const isDueListQuery =
            qLower.includes("what's due") ||
            qLower.includes('whats due') ||
            qLower.includes('due today') ||
            qLower.includes('tomorrow') ||
            qLower.includes('this week') ||
            qLower.includes('next week')
          if (isDueListQuery && !applyDueWindow(dueAt)) return false
          return true
        })
        .slice(0, 50)
        .map((a: any) => {
          const htmlUrl = a.html_url || a.htmlUrl || a.url || ''
          const id =
            a.assignment_rest_id ??
            a.assignmentRestId ??
            a.assignment_id ??
            a.id ??
            a._id ??
            extractAssignmentIdFromUrl(htmlUrl) ??
            ''

          return {
            id: String(id),
            name: a.name,
            courseId: String(a.course_id || a.courseId || ''),
            due_at: a.due_at || a.dueAt,
            points: a.points_possible || a.pointsPossible || 0,
            submitted: !!(a.has_submitted_submissions || a.submission?.submitted_at),
            htmlUrl,
          }
        })
    : []

  // Human-friendly summary (good for "what should I work on")
  const courseNames = new Map<string, string>()
  const courseCodes = new Map<string, string>()
  for (const c of courses) {
    courseNames.set(String(c.id), c.name || c.course_code || 'Unknown Course')
    courseCodes.set(String(c.id), String(c.course_code || ''))
  }

  const courseLabelFor = (courseId: string): string => {
    const name = courseNames.get(courseId) || 'Unknown Course'
    const code = courseCodes.get(courseId) || ''
    if (!code) return name
    if (name.includes(code)) return name
    return `${name} (${code})`
  }

  const formatDueHuman = (dueAt: string): string => {
    const d = new Date(dueAt)
    if (!Number.isFinite(d.getTime())) return String(dueAt)
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const upcoming = (dueAssignments || [])
    .filter((a: any) => {
      const dueAt = a?.due_at || a?.dueAt
      if (!dueAt) return false
      const cid = String(a?.course_id || a?.courseId || '')
      if (courseIdSet && cid && !courseIdSet.has(cid)) return false
      if (!applyTimeRange(dueAt)) return false
      if (!applyDueWindow(dueAt)) return false
      return new Date(dueAt) >= today
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.due_at || a.dueAt).getTime() - new Date(b.due_at || b.dueAt).getTime(),
    )
    .slice(0, 10)

  const overdue = (dueAssignments || [])
    .filter((a: any) => {
      const dueAt = a?.due_at || a?.dueAt
      if (!dueAt) return false
      const cid = String(a?.course_id || a?.courseId || '')
      if (courseIdSet && cid && !courseIdSet.has(cid)) return false
      if (!applyTimeRange(dueAt)) return false
      // Overdue shouldn't be constrained to a future window.
      return new Date(dueAt) < today && !(a.has_submitted_submissions || a.submission?.submitted_at)
    })
    .slice(0, 10)

  const shouldShowOverdue =
    overdue.length > 0 && !(qLower.includes('tomorrow') || qLower.includes('next week'))

  // Only include the current date when the intent is time-sensitive.
  // For content explanations, including the date causes frequent "date leakage" in the model output.
  const contextParts: string[] = []

  if (needsData) {
    const todayStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    contextParts.push(xmlEl('Today', xmlEscapeText(todayStr)))
  }

  const stopwords = new Set([
    'when',
    'what',
    'whats',
    "what's",
    'is',
    'due',
    'the',
    'a',
    'an',
    'for',
    'in',
    'on',
    'at',
    'to',
    'my',
    'i',
  ])

  const tokens = matchQueryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))

  const filteredDueRows = (() => {
    if (!includeRawData) return []
    const base = (dueRows || []).slice(0, 25)
    if (plan.intent !== 'due_date') return base
    if (tokens.length === 0) return base.slice(0, 12)
    const matches = base.filter((a: any) => {
      const name = String(a?.name || '').toLowerCase()
      return tokens.every((t) => name.includes(t))
    })
    return (matches.length ? matches : base).slice(0, 12)
  })()

  const orderedDueRows = (() => {
    if (plan.reference?.kind !== 'assignment') return filteredDueRows
    const title = normalizePhrase(plan.reference.title)
    const course = normalizePhrase(plan.reference.course)
    if (!title || !course) return filteredDueRows

    const matched = filteredDueRows.filter((a: any) => {
      const rowTitle = normalizePhrase(a?.name)
      const rowCourse = normalizePhrase(courseLabelFor(String(a?.courseId || '')))
      const titleMatch = rowTitle === title
      const courseMatch = rowCourse === course || rowCourse.includes(course) || course.includes(rowCourse)
      return titleMatch && courseMatch
    })
    if (!matched.length) return filteredDueRows
    const remaining = filteredDueRows.filter((a: any) => !matched.includes(a))
    return [...matched, ...remaining]
  })()

  if (plan.intent === 'due_date' && orderedDueRows.length) {
    const assignmentNodes = orderedDueRows.map((a: any) => {
      const courseId = String(a?.courseId || '')
      const dueAt = String(a?.due_at || '')
      const parts =
        xmlEl('Title', xmlEscapeText(a?.name || '')) +
        xmlEl('Course', xmlEscapeText(courseLabelFor(courseId))) +
        (dueAt ? xmlEl('Due', xmlEscapeText(formatDueHuman(dueAt))) : '') +
        (dueAt ? xmlEl('Relative', xmlEscapeText(formatRelativeTime(dueAt))) : '') +
        (typeof a?.points === 'number' && Number.isFinite(a.points)
          ? xmlEl('Points', xmlEscapeText(a.points))
          : '') +
        (plan.intent === 'due_date' && dueAt ? xmlEl('DueISO', xmlEscapeText(dueAt)) : '')
      return xmlEl('A', parts)
    })

    contextParts.push(
      xmlEl('Assignments', assignmentNodes.join(''), {
        scope: plan.intent === 'due_date' ? 'matches' : 'upcoming',
        count: String(assignmentNodes.length),
      }),
    )
  }

  // Keep assignment lists only for planning intent.
  if (isPlanning && (overdue.length || upcoming.length)) {
    const overdueNodes = shouldShowOverdue
      ? overdue.slice(0, 10).map((a: any) => {
          const dueAt = a?.due_at || a?.dueAt || ''
          const courseId = String(a?.course_id || a?.courseId || '')
          const points = a?.points_possible || a?.pointsPossible || 0
          const parts =
            xmlEl('Title', xmlEscapeText(a?.name || '')) +
            xmlEl('Course', xmlEscapeText(courseLabelFor(courseId))) +
            (dueAt ? xmlEl('Due', xmlEscapeText(formatDueHuman(dueAt))) : '') +
            (typeof points === 'number' && Number.isFinite(points)
              ? xmlEl('Points', xmlEscapeText(points))
              : '')
          return xmlEl('A', parts)
        })
      : []

    const upcomingNodes = upcoming.slice(0, 10).map((a: any) => {
      const dueAt = a?.due_at || a?.dueAt || ''
      const courseId = String(a?.course_id || a?.courseId || '')
      const points = a?.points_possible || a?.pointsPossible || 0
      const parts =
        xmlEl('Title', xmlEscapeText(a?.name || '')) +
        xmlEl('Course', xmlEscapeText(courseLabelFor(courseId))) +
        (dueAt ? xmlEl('Due', xmlEscapeText(formatDueHuman(dueAt))) : '') +
        (dueAt ? xmlEl('Relative', xmlEscapeText(formatRelativeTime(dueAt))) : '') +
        (typeof points === 'number' && Number.isFinite(points)
          ? xmlEl('Points', xmlEscapeText(points))
          : '')
      return xmlEl('A', parts)
    })

    if (overdueNodes.length) {
      contextParts.push(
        xmlEl('Overdue', overdueNodes.join(''), { count: String(overdueNodes.length) }),
      )
    }
    if (upcomingNodes.length) {
      contextParts.push(
        xmlEl('Upcoming', upcomingNodes.join(''), { count: String(upcomingNodes.length) }),
      )
    }
  }

  if (mergedNeeds.grades) {
    const gradeNodes = (courseGrades || [])
      .filter((g) => typeof g?.grade === 'number' && Number.isFinite(g.grade))
      .slice(0, 20)
      .map((g) =>
        xmlEl(
          'CourseGrade',
          xmlEl('CourseName', xmlEscapeText(g.courseName)) +
            xmlEl('GradePercent', xmlEscapeText(`${g.grade}%`)),
          { courseId: String(g.courseId) },
        ),
      )

    contextParts.push(
      xmlEl('CourseGrades', gradeNodes.join(''), { count: String(gradeNodes.length) }),
    )
  }

  if (mergedNeeds.recentSubmissions) {
    const submissionNodes = (recentSubmissions || []).slice(0, 8).map((s) => {
      const scoreStr =
        typeof s.score === 'number' && typeof s.pointsPossible === 'number'
          ? `${s.score}/${s.pointsPossible}`
          : typeof s.score === 'number'
            ? String(s.score)
            : 'No score'
      return xmlEl(
        'Submission',
        xmlEl('Name', xmlEscapeText(s.name)) +
          xmlEl('Course', xmlEscapeText(s.courseName)) +
          xmlEl('Score', xmlEscapeText(scoreStr)) +
          xmlEl('GradedAt', xmlEscapeText(s.gradedAt || '')) +
          (s.htmlUrl ? xmlEl('Url', xmlEscapeText(s.htmlUrl)) : ''),
        { courseId: String(s.courseId), assignmentId: String(s.assignmentId) },
      )
    })

    contextParts.push(
      xmlEl('RecentSubmissions', submissionNodes.join(''), {
        count: String(submissionNodes.length),
      }),
    )
  }

  return xmlEl('StructuredContext', contextParts.join(''), { authoritative: 'true' })
}
