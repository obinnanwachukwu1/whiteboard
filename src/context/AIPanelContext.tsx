import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { coordinateSearch, type SearchPlan, type SearchIntent } from '../utils/coordinator'
import type { ContentType } from '../utils/coordinator'
import { extractAssignmentIdFromUrl } from '../utils/urlHelpers'

export type AIMode = 'ask-ai'

export interface SearchResultItem {
  id: string
  score: number
  metadata: {
    type: ContentType
    courseId: string
    courseName: string
    title: string
    snippet: string
    url?: string
    contentHash: string
  }
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AIPanelState {
  isOpen: boolean
  mode: AIMode
  query: string
  position: { x: number; y: number }
  results: SearchResultItem[] | null
  answer: string | null
  isLoading: boolean
  error: string | null
  autoSubmit: boolean
  // Conversation history for multi-turn context
  history: ConversationTurn[]
}

interface AIPanelContextValue extends AIPanelState {
  open: (query?: string, mode?: AIMode, autoSubmit?: boolean) => void
  close: () => void
  toggle: () => void
  setMode: (mode: AIMode) => void
  setQuery: (query: string) => void
  setPosition: (position: { x: number; y: number }) => void
  submit: () => Promise<void>
  clear: () => void
  clearHistory: () => void
}

const defaultState: AIPanelState = {
  isOpen: false,
  mode: 'ask-ai',
  query: '',
  position: { x: -1, y: -1 }, // -1 means "center"
  results: null,
  answer: null,
  isLoading: false,
  error: null,
  autoSubmit: false,
  history: [],
}

const AIPanelContext = createContext<AIPanelContextValue | null>(null)

export function useAIPanel(): AIPanelContextValue {
  const ctx = useContext(AIPanelContext)
  if (!ctx) throw new Error('useAIPanel must be used within AIPanelProvider')
  return ctx
}

interface AIPanelProviderProps {
  children: React.ReactNode
  embeddingsEnabled?: boolean
  aiEnabled?: boolean // Whether AI chat is available (macOS 26.1+)
  // Structured data from the app for richer context
  dueAssignments?: any[]
  courses?: any[]
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateStr: string): string {
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
function courseAliases(c: any): string[] {
  const out: string[] = []
  const name = String(c?.name || '')
  const code = String(c?.course_code || '')
  if (name) out.push(name)
  if (code) out.push(code)

  // Common user shorthands / nicknames
  if (/combinatorics/i.test(name) || /combinatorics/i.test(code)) {
    out.push('combo')
    out.push('combos')
  }

  return Array.from(new Set(out.map(s => s.trim()).filter(Boolean)))
}

function toCompactJson(value: any, maxChars: number): string {
  const raw = JSON.stringify(value)
  if (raw.length <= maxChars) return raw
  return raw.slice(0, Math.max(0, maxChars - 3)) + '...'
}

/**
 * Build concise system prompt (rules only, no examples)
 * Examples are provided as few-shot message pairs instead
 */
function buildSystemPrompt(intent: SearchIntent): string {
  const base = `You are an assistant in a Canvas LMS app. Answer concisely using only facts from the provided Context.`

  switch (intent) {
    case 'planning':
      return `${base} List assignments by urgency with bullets. Include course, due date, points. End with a brief recommendation.`
    case 'due_date':
      return `${base} State the exact due date/time, course name, and points.`
    case 'content_qa':
      return `${base} Explain in 2-4 sentences. Reference the source when possible.`
    case 'general':
    default:
      return `${base} Keep responses brief (1-2 sentences).`
  }
}

/**
 * Build few-shot examples as message pairs for the given intent
 * Returns array of {role, content} to insert before the real query
 */
function buildFewShotExamples(intent: SearchIntent): Array<{ role: 'user' | 'assistant'; content: string }> {
  switch (intent) {
    case 'planning':
      return [
        { role: 'user', content: 'Context:\n## Overdue\n- "HW 3" (Math 101) - OVERDUE (was due Mon) - 50 pts\n## Upcoming\n- "Quiz 2" (Bio 200) - Due tomorrow - 25 pts\n- "Essay" (Eng 102) - Due Fri - 100 pts\n\nQuestion: what should I work on' },
        { role: 'assistant', content: 'Here\'s your priority:\n• [OVERDUE] HW 3 (Math 101) - was due Mon, 50 pts\n• Quiz 2 (Bio 200) - due tomorrow, 25 pts\n• Essay (Eng 102) - due Fri, 100 pts\n\nFocus on the overdue Math homework first, then prep for tomorrow\'s quiz.' }
      ]
    case 'due_date':
      return [
        { role: 'user', content: 'Context:\nDueAssignments=[{"name":"Homework 2","course":"Math 101","due_at":"2025-03-15T23:59:00","points":50}]\n\nQuestion: when is homework 2 due' },
        { role: 'assistant', content: 'Homework 2 for Math 101 is due Saturday, March 15 at 11:59 PM (50 points).' }
      ]
    case 'content_qa':
      return [
        { role: 'user', content: 'Context:\n## Related Content\n[page] Syllabus (Eng 102): Late work accepted up to 3 days with 10% penalty per day. No submissions after 3 days.\n\nQuestion: what is the late policy' },
        { role: 'assistant', content: 'According to the Eng 102 syllabus, late work is accepted up to 3 days after the deadline with a 10% penalty per day. After 3 days, no late submissions are accepted.' }
      ]
    case 'general':
    default:
      return [
        { role: 'user', content: 'Question: hello' },
        { role: 'assistant', content: 'Hi! How can I help you with your courses today?' }
      ]
  }
}

function buildStructuredContext(
  plan: SearchPlan,
  _query: string,
  dueAssignments: any[] = [],
  courses: any[] = []
): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Only include raw data if coordinator thinks it's needed (planning/due_date)
  const isPlanning = plan.intent === 'planning'
  const isDueDate = plan.intent === 'due_date'
  const needsData = isPlanning || isDueDate

  // Compact, machine-readable-ish blocks help the model answer precisely.
  const courseRows = needsData ? courses
    .slice(0, 50)
    .map((c: any) => ({
      id: String(c.id),
      name: c.name || c.course_code || 'Unknown Course',
      code: c.course_code || '',
      aliases: courseAliases(c),
    })) : []

  const dueRows = needsData ? dueAssignments
    .filter(a => {
      const dueAt = a?.due_at || a?.dueAt
      if (!dueAt) return false
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
    }) : []

  // Human-friendly summary (good for "what should I work on")
  const courseNames = new Map<string, string>()
  for (const c of courses) courseNames.set(String(c.id), c.name || c.course_code || 'Unknown Course')

  const upcoming = (dueAssignments || [])
    .filter((a: any) => {
      const dueAt = a?.due_at || a?.dueAt
      if (!dueAt) return false
      return new Date(dueAt) >= today
    })
    .sort((a: any, b: any) => new Date(a.due_at || a.dueAt).getTime() - new Date(b.due_at || b.dueAt).getTime())
    .slice(0, 10)

  const overdue = (dueAssignments || [])
    .filter((a: any) => {
      const dueAt = a?.due_at || a?.dueAt
      if (!dueAt) return false
      return new Date(dueAt) < today && !(a.has_submitted_submissions || a.submission?.submitted_at)
    })
    .slice(0, 10)

  const summaryLines: string[] = []
  if (overdue.length) {
    summaryLines.push('## Overdue (Needs Attention!)')
    for (const a of overdue) {
      const dueAt = a.due_at || a.dueAt
      const courseName = courseNames.get(String(a.course_id || a.courseId)) || 'Unknown'
      summaryLines.push(`- "${a.name}" (${courseName}) - OVERDUE${dueAt ? ` (was due ${new Date(dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})` : ''}`)
    }
  }
  if (upcoming.length) {
    summaryLines.push('## Upcoming Assignments')
    for (const a of upcoming) {
      const dueAt = a.due_at || a.dueAt
      const courseName = courseNames.get(String(a.course_id || a.courseId)) || 'Unknown'
      const points = a.points_possible || a.pointsPossible || 0
      const relTime = dueAt ? formatRelativeTime(dueAt) : ''
      const dueStr = dueAt ? new Date(dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'
      summaryLines.push(`- "${a.name}" (${courseName}) - Due ${dueStr}${relTime ? ` (${relTime})` : ''}${points ? ` - ${points} pts` : ''}`)
    }
  }

  const dateContext = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`

  const dataBlock = needsData ? [
    '## Data (Use for precise answers)',
    'Courses=' + toCompactJson(courseRows, 5000),
    'DueAssignments=' + toCompactJson(dueRows, 5000),
  ].join('\n') : ''

  const summaryBlock = isPlanning && summaryLines.length ? summaryLines.join('\n') : ''

  return [dateContext, dataBlock, summaryBlock].filter(Boolean).join('\n\n')
}

export function AIPanelProvider({ 
  children,
  embeddingsEnabled = true,
  aiEnabled = false,
  dueAssignments = [],
  courses = [],
}: AIPanelProviderProps) {
  const [state, setState] = useState<AIPanelState>(defaultState)

  const open = useCallback((query?: string, mode?: AIMode, autoSubmit = false) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      query: query ?? prev.query,
      mode: mode ?? prev.mode,
      autoSubmit,
      // Ensure auto-submit always runs from a clean state
      ...(autoSubmit ? { results: null, answer: null, error: null, isLoading: false } : {}),
      // Clear results when opening with a new query
      ...(query && query !== prev.query ? { results: null, answer: null, error: null } : {}),
    }))
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  const setMode = useCallback((mode: AIMode) => {
    setState(prev => ({ ...prev, mode, results: null, answer: null, error: null }))
  }, [])

  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }))
  }, [])

  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({ ...prev, position }))
  }, [])

  const clear = useCallback(() => {
    setState(prev => ({
      ...prev,
      query: '',
      results: null,
      answer: null,
      error: null,
      isLoading: false,
      autoSubmit: false,
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }))
  }, [])

  const submit = useCallback(async () => {
    const { query } = state
    if (!query.trim()) return

    // Clear autoSubmit once we start
    setState(prev => ({ ...prev, isLoading: true, error: null, autoSubmit: false }))

    try {
      if (!embeddingsEnabled) {
        throw new Error('Deep Search must be enabled for AI features')
      }
      if (!window.embedding || !window.ai) {
        throw new Error('AI features are not available')
      }
      if (!aiEnabled) {
        throw new Error('AI requires macOS 26.1 or later')
      }

      const trimmedQuery = query.trim()

      // Pass 1: Coordinate
      const plan = await coordinateSearch(trimmedQuery, courses)
      
      // Pass 2: Fetch Data
      let references: SearchResultItem[] = []
      let candidates: SearchResultItem[] = []

      // If intent requires semantic search (content_qa or due_date lookup backup)
      if (plan.intent === 'content_qa' || plan.intent === 'general' || plan.intent === 'due_date') {
        // Fetch more results (8) with higher quality threshold, then take top 5 after deduplication
        const searchResult = await window.embedding.search(plan.rewrittenQuery, 8, {
          courseIds: plan.filters?.courseIds,
          types: plan.filters?.types,
          minScore: 0.25,  // Higher threshold for better quality
          dedupe: true,    // Avoid multiple chunks from same file/document
        })
        if (searchResult.ok) {
          // Take top 5 deduplicated results
          references = (searchResult.data || []).slice(0, 5)
        }
      }

      // If intent requires structured data lookup (planning/due_date), find explicit matches in assignments
      if (plan.intent === 'planning' || plan.intent === 'due_date') {
        // Filter due assignments based on plan filters
        const courseIdSet = plan.filters?.courseIds?.length ? new Set(plan.filters.courseIds) : null
        
        const matches = dueAssignments.filter((a: any) => {
          if (courseIdSet && !courseIdSet.has(String(a.course_id || a.courseId))) return false
          // Could filter by date range if plan specifies 'upcoming' vs 'past'
          return true
        }).slice(0, 5) // Top 5 relevant

        const courseNameById = new Map<string, string>()
        for (const c of courses) courseNameById.set(String(c.id), c.name || c.course_code || 'Unknown Course')

        candidates = matches
          .map((a: any) => {
            const courseId = String(a.course_id || a.courseId)
            const url: string | undefined = a.html_url || a.htmlUrl || a.url
            const restId =
              a.assignment_rest_id ??
              a.assignmentRestId ??
              a.assignment_id ??
              a.id ??
              a._id ??
              extractAssignmentIdFromUrl(url)

            if (restId == null || String(restId) === '' || String(restId) === 'undefined') {
              return null
            }

            const dueAt = a.due_at || a.dueAt

            return {
              id: `assignment:${courseId}:${String(restId)}`,
              score: 1,
              metadata: {
                type: 'assignment',
                courseId,
                courseName: courseNameById.get(courseId) || 'Unknown Course',
                title: a.name,
                snippet: `Due: ${dueAt ? new Date(dueAt).toLocaleDateString() : 'No date'}`,
                ...(url ? { url } : {}),
                contentHash: 'structured',
              },
            } as SearchResultItem
          })
          .filter(Boolean) as SearchResultItem[]
      }

      // Build Context
      const structuredContext = buildStructuredContext(plan, trimmedQuery, dueAssignments, courses)
      
      const semanticContext = references.map(r =>
        `[${r.metadata.type}] ${r.metadata.title} (${r.metadata.courseName}): ${r.metadata.snippet}`
      ).join('\n\n')

      const fullContext = [
        structuredContext,
        semanticContext ? '## Related Content (Semantic Search)\n' + semanticContext : ''
      ].filter(Boolean).join('\n\n')

      // Pass 3: Synthesize Answer
      // Dynamic token limits based on intent and query complexity
      const maxTokens = plan.intent === 'planning' ? 500 
        : plan.intent === 'content_qa' ? 400 
        : 250

      // Build messages with few-shot examples for better quality on smaller models
      const systemPrompt = buildSystemPrompt(plan.intent)
      const fewShotExamples = buildFewShotExamples(plan.intent)
      
      // Include recent conversation history (last 2 exchanges max to save tokens)
      // Each exchange is ~100-200 tokens, so 2 exchanges = ~400 tokens
      const recentHistory = state.history.slice(-4) // Last 2 Q&A pairs
      const historyMessages = recentHistory.map(h => ({ role: h.role, content: h.content }))
      
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...fewShotExamples,
        ...historyMessages,
        {
          role: 'user',
          content: fullContext
            ? `Context:\n${fullContext}\n\nQuestion: ${trimmedQuery}`
            : `Question: ${trimmedQuery}`,
        },
      ]

      const chatResult = await window.ai.chat(messages, maxTokens)

      if (!chatResult.ok || !chatResult.choices?.length) {
        throw new Error(chatResult.error?.toString() || 'AI response failed')
      }

      const answer = chatResult.choices[0]?.message?.content || 'No response received'

      // Update state with answer and add to conversation history
      setState(prev => {
        // Keep history limited to last 6 turns (3 exchanges) to manage token budget
        const newHistory: ConversationTurn[] = [
          ...prev.history,
          { role: 'user' as const, content: trimmedQuery },
          { role: 'assistant' as const, content: answer },
        ].slice(-6)
        
        return {
          ...prev,
          // Prefer explicit structured candidates if planning/due_date, otherwise semantic references
          results: candidates.length > 0 ? candidates : references,
          answer,
          isLoading: false,
          history: newHistory,
        }
      })

    } catch (e) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      }))
    }
  }, [state.query, state.history, embeddingsEnabled, aiEnabled, dueAssignments, courses])

  useEffect(() => {
    if (!state.isOpen) return
    if (!state.autoSubmit) return
    if (!state.query.trim()) return
    if (state.isLoading) return

    // Fire-and-forget; errors handled in submit()
    submit()
  }, [state.isOpen, state.autoSubmit, state.query, state.isLoading, submit])

  const value = useMemo<AIPanelContextValue>(() => ({
    ...state,
    open,
    close,
    toggle,
    setMode,
    setQuery,
    setPosition,
    submit,
    clear,
    clearHistory,
  }), [state, open, close, toggle, setMode, setQuery, setPosition, submit, clear, clearHistory])

  return (
    <AIPanelContext.Provider value={value}>
      {children}
    </AIPanelContext.Provider>
  )
}
