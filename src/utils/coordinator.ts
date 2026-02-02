export type ContentType = 'announcement' | 'assignment' | 'page' | 'module' | 'file'

export type SearchIntent = 'planning' | 'due_date' | 'content_qa' | 'general'

export type SearchNeeds = {
  assignments?: boolean
  grades?: boolean
  recentSubmissions?: boolean
  announcements?: boolean
  contentSearch?: boolean
  includeDate?: boolean
}

export interface SearchPlan {
  intent: SearchIntent
  rewrittenQuery: string
  needs?: SearchNeeds
  reference?: {
    kind: 'assignment' | 'course' | 'content' | 'none'
    ordinal?: number
    title?: string
    course?: string
  }
  filters?: {
    courseIds?: string[]
    types?: ContentType[]
    timeRange?: 'upcoming' | 'past' | 'all'
  }
  searchDisabled?: boolean
}

export type CoordinatorHistoryMessage = { role: 'user' | 'assistant'; content: string }

export type CoordinateSearchOptions = {
  history?: CoordinatorHistoryMessage[]
  lastAssignments?: Array<{ title: string; course: string; due?: string }>
}

function toCoordinatorText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
}

function formatHistoryForCoordinator(history: CoordinatorHistoryMessage[] | undefined): string {
  if (!history?.length) return ''
  const tail = history.slice(-6)
  return tail
    .map((m) => `${m.role.toUpperCase()}: ${toCoordinatorText(m.content).slice(0, 220)}`)
    .join('\n')
}

function formatLastAssignmentsForCoordinator(
  lastAssignments: Array<{ title: string; course: string; due?: string }> | undefined,
): string {
  if (!lastAssignments?.length) return ''
  return lastAssignments
    .slice(0, 6)
    .map(
      (a, i) =>
        `${i + 1}. ${toCoordinatorText(a.title)} - ${toCoordinatorText(a.course)}${a.due ? ` - ${toCoordinatorText(a.due)}` : ''}`,
    )
    .join('\n')
}

function inferNeedsFromQuery(query: string): SearchNeeds {
  const q = String(query || '').toLowerCase()
  const needs: SearchNeeds = {}
  if (
    q.includes("what's due") ||
    q.includes('whats due') ||
    q.includes('what assignments do i have due') ||
    q.includes('what assignments are due') ||
    q.includes('which assignments are due') ||
    q.includes('upcoming assignment') ||
    q.includes('upcoming assignments') ||
    q.includes('due this week') ||
    q.includes('due next week') ||
    q.includes('due soon') ||
    q.includes('what should i work on') ||
    q.includes('prioritize') ||
    q.includes('priority') ||
    q.includes('assignments') ||
    q.includes('upcoming')
  ) {
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

function looksLikeGreeting(query: string): boolean {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return false
  return (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q === 'yo' ||
    q.startsWith('hello ') ||
    q.startsWith('hi ')
  )
}

function looksLikeDueListQuery(query: string): boolean {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return false
  return (
    q.includes("what's due") ||
    q.includes('whats due') ||
    q.includes('what assignments do i have due') ||
    q.includes('what assignments are due') ||
    q.includes('which assignments are due') ||
    (q.includes('assignments') && q.includes('do i have') && q.includes('due')) ||
    q.includes('due tomorrow') ||
    q.includes('due this week') ||
    q.includes('due next week') ||
    q.includes('due today')
  )
}

/**
 * Coordinate search intent and parameters using a fast LLM pass.
 */
export async function coordinateSearch(
  query: string,
  courses: any[],
  options?: CoordinateSearchOptions,
): Promise<SearchPlan> {
  // Fallback if AI not available
  if (!window.ai) {
    const needs = inferNeedsFromQuery(query)
    return {
      intent: looksLikeGreeting(query) ? 'general' : 'content_qa',
      rewrittenQuery: query,
      needs,
      filters: {},
      searchDisabled: looksLikeGreeting(query),
    }
  }

  // Quick course alias map for the system prompt
  const courseMap = courses
    .map((c: any) => {
      const name = c.name || c.course_code || ''
      const id = String(c.id)
      return `${id}: ${name}`
    })
    .join('\n')
    .slice(0, 1500) // Truncate to save context

  try {
    const historyText = formatHistoryForCoordinator(options?.history)
    const lastAssignmentsText = formatLastAssignmentsForCoordinator(options?.lastAssignments)

    // Build few-shot examples as message pairs for reliable JSON output
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a search coordinator. Output JSON only.

Courses: ${courseMap}

Intents: planning (priorities/schedule), due_date (deadlines), content_qa (explain/find content), general (greetings)

Also output a "needs" object that flags what app data is needed (assignments, grades, recentSubmissions, announcements, contentSearch, includeDate).

You may receive recent conversation history and an ordered list of assignments from the last answer.
If the user asks follow-ups like "the first one", "the second one", "that assignment", resolve it using LastAssignments and rewrite the query to include the assignment title and course.
If you cannot resolve the reference, keep rewrittenQuery close to the user's text and do not invent a course or assignment.

JSON format: {"intent":"...","rewrittenQuery":"keywords","needs":{},"filters":{"courseIds":[]},"searchDisabled":false}`,
      },
      // Few-shot examples
      { role: 'user', content: 'when is homework 3 due' },
      {
        role: 'assistant',
        content:
          '{"intent":"due_date","rewrittenQuery":"homework 3","needs":{"assignments":true,"includeDate":true},"filters":{},"searchDisabled":false}',
      },
      { role: 'user', content: 'what should I work on this week' },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"","needs":{"assignments":true,"includeDate":true},"filters":{},"searchDisabled":false}',
      },
      { role: 'user', content: "what's due tomorrow" },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"due tomorrow","needs":{"assignments":true,"includeDate":true},"filters":{"types":["assignment"],"timeRange":"upcoming"},"searchDisabled":false}',
      },
      { role: 'user', content: 'what assignments do i have due' },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"due assignments","needs":{"assignments":true,"includeDate":true},"filters":{"types":["assignment"],"timeRange":"upcoming"},"searchDisabled":false}',
      },
      { role: 'user', content: "what's due this week" },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"due this week","needs":{"assignments":true,"includeDate":true},"filters":{"types":["assignment"],"timeRange":"upcoming"},"searchDisabled":false}',
      },
      { role: 'user', content: "what's due next week" },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"due next week","needs":{"assignments":true,"includeDate":true},"filters":{"types":["assignment"],"timeRange":"upcoming"},"searchDisabled":false}',
      },
      { role: 'user', content: 'summarize my upcoming assignments' },
      {
        role: 'assistant',
        content:
          '{"intent":"planning","rewrittenQuery":"upcoming assignments","needs":{"assignments":true,"includeDate":true},"filters":{},"searchDisabled":false}',
      },
      { role: 'user', content: 'explain the late policy' },
      {
        role: 'assistant',
        content:
          '{"intent":"content_qa","rewrittenQuery":"late policy syllabus","needs":{"contentSearch":true},"filters":{},"searchDisabled":false}',
      },
      { role: 'user', content: 'hello' },
      {
        role: 'assistant',
        content:
          '{"intent":"general","rewrittenQuery":"","needs":{},"filters":{},"searchDisabled":true}',
      },
      // Follow-up reference example
      {
        role: 'user',
        content:
          'Conversation:\nUSER: what assignments do i have due\nASSISTANT: • Homework 2 (Applied Combinatorics) - due Tue\n• Discussion Post 3 (Tech Communication) - due Thu\n\nLastAssignments:\n1. Homework 2 - Applied Combinatorics\n2. Discussion Post 3 - Tech Communication\n\nQuery: can you give me more info on the first one',
      },
      {
        role: 'assistant',
        content:
          '{"intent":"due_date","rewrittenQuery":"Homework 2 Applied Combinatorics","needs":{"assignments":true,"includeDate":true},"filters":{"types":["assignment"],"timeRange":"upcoming"},"searchDisabled":false,"reference":{"kind":"assignment","ordinal":1,"title":"Homework 2","course":"Applied Combinatorics"}}',
      },
      // Actual query
      {
        role: 'user',
        content: [
          historyText ? `Conversation:\n${historyText}` : '',
          lastAssignmentsText ? `LastAssignments:\n${lastAssignmentsText}` : '',
          `Query: ${query}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ]

    const result = await window.ai.chat(messages, {
      max_tokens: 220,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'SearchPlan',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              intent: {
                type: 'string',
                enum: ['planning', 'due_date', 'content_qa', 'general'],
              },
              rewrittenQuery: { type: 'string' },
              needs: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  assignments: { type: 'boolean' },
                  grades: { type: 'boolean' },
                  recentSubmissions: { type: 'boolean' },
                  announcements: { type: 'boolean' },
                  contentSearch: { type: 'boolean' },
                  includeDate: { type: 'boolean' },
                },
              },
              reference: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  kind: { type: 'string', enum: ['assignment', 'course', 'content', 'none'] },
                  ordinal: { type: 'number' },
                  title: { type: 'string' },
                  course: { type: 'string' },
                },
              },
              filters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  courseIds: { type: 'array', items: { type: 'string' } },
                  types: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['announcement', 'assignment', 'page', 'module', 'file'],
                    },
                  },
                  timeRange: { type: 'string', enum: ['upcoming', 'past', 'all'] },
                },
              },
              searchDisabled: { type: 'boolean' },
            },
            required: ['intent', 'rewrittenQuery', 'needs', 'filters', 'searchDisabled'],
          },
        },
      },
    })

    if (!result.ok || !result.choices?.[0]?.message?.content) {
      throw new Error('Coordinator failed')
    }

    const content = result.choices[0].message.content
    const plan = JSON.parse(content) as SearchPlan

    // Default safe values
    if (!plan.rewrittenQuery) plan.rewrittenQuery = query
    if (!plan.intent) plan.intent = 'general'

    if (!plan.filters) plan.filters = {}
    if (!plan.needs) plan.needs = {}
    if (typeof plan.searchDisabled !== 'boolean') plan.searchDisabled = plan.intent === 'general'
    if (!plan.reference) plan.reference = { kind: 'none' }

    // Hard override: greeting-like queries should never trigger planning/search.
    // The coordinator model can occasionally misclassify short greetings.
    if (looksLikeGreeting(query)) {
      return {
        intent: 'general',
        rewrittenQuery: '',
        needs: {},
        filters: {},
        searchDisabled: true,
      }
    }

    // Hard override: list-style "what's due ..." queries should be planning (lists),
    // not due_date (single deadline).
    if (looksLikeDueListQuery(query)) {
      return {
        intent: 'planning',
        rewrittenQuery: plan.rewrittenQuery || query,
        needs: { ...(plan.needs || {}), assignments: true, includeDate: true },
        filters: { ...(plan.filters || {}), timeRange: plan.filters?.timeRange || 'upcoming' },
        searchDisabled: false,
      }
    }

    return plan
  } catch (e) {
    console.warn('Coordinator fallback:', e)
    // Fallback heuristic
    const q = query.toLowerCase()
    const needs = inferNeedsFromQuery(q)
    const intent = looksLikeDueListQuery(q)
      ? 'planning'
      : q.includes('when is') || q.startsWith('when ')
        ? 'due_date'
        : q.includes("what's due") ||
            q.includes('whats due') ||
            (q.includes('assignment') &&
              (q.includes('upcoming') || q.includes('summarize') || q.includes('week'))) ||
            q.includes('what should i work on')
          ? 'planning'
          : looksLikeGreeting(q)
            ? 'general'
            : 'content_qa'
    return {
      intent,
      rewrittenQuery: query,
      needs,
      reference: { kind: 'none' },
      filters: {},
      searchDisabled: intent === 'general',
    }
  }
}
