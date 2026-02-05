import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import {
  coordinateSearch,
  type SearchPlan,
  type SearchIntent,
  type SearchNeeds,
} from '../utils/coordinator'
import type { ContentType } from '../utils/coordinator'
import { extractAssignmentIdFromUrl } from '../utils/urlHelpers'
import { stripHtmlToText } from '../utils/stripHtmlToText'
import { useAI, type AIMessage } from '../hooks/useAI'
import { usePriorityAssignments } from '../hooks/usePriorityAssignments'
import { useAppFlags } from './AppContext'

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

type AttachmentSlot = 'view' | 'manual'

type PageAttachment = {
  id: string
  slot: AttachmentSlot
  kind: 'page'
  courseId: string | number
  courseName?: string
  title: string
  pageUrl: string
  contentText?: string
}

type SyllabusAttachment = {
  id: string
  slot: AttachmentSlot
  kind: 'syllabus'
  courseId: string | number
  courseName?: string
  title: string
  contentText?: string
}

type ListAttachment = {
  id: string
  slot: AttachmentSlot
  kind:
    | 'announcements'
    | 'announcement'
    | 'assignments'
    | 'assignment'
    | 'dashboard'
    | 'home'
    | 'discussions'
    | 'discussion'
    | 'grades'
    | 'modules'
    | 'files'
    | 'file'
    | 'links'
    | 'people'
  title: string
  courseId?: string | number
  courseName?: string
  contentText?: string
}

export type AIAttachment = PageAttachment | SyllabusAttachment | ListAttachment

export type AIAttachmentChip = {
  id: string
  title: string
  courseName?: string
}

export type ChatMessageStatus = 'streaming' | 'done' | 'error'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: ChatMessageStatus
  references?: SearchResultItem[] | null
  attachments?: AIAttachmentChip[] | null
}

export interface AIPanelState {
  isOpen: boolean
  mode: AIMode
  query: string
  position: { x: number; y: number }
  isLoading: boolean
  error: string | null
  autoSubmit: boolean
  attachments: AIAttachment[]
  contextOffer: AIAttachment | null
  followContextOffer: boolean
  // Chat messages (user + assistant)
  messages: ChatMessage[]
}

interface AIPanelContextValue extends AIPanelState {
  open: (query?: string, mode?: AIMode, autoSubmit?: boolean) => void
  openExplainPage: (args: {
    courseId: string | number
    courseName?: string
    pageUrl: string
    title: string
  }) => void
  registerContextOffer: (key: string, offer: AIAttachment) => void
  unregisterContextOffer: (key: string) => void
  startFollowContextOffer: () => void
  cancelFollowContextOffer: () => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
  close: () => void
  toggle: () => void
  setMode: (mode: AIMode) => void
  setQuery: (query: string) => void
  setPosition: (position: { x: number; y: number }) => void
  submit: () => Promise<void>
  sendMessage: (query: string) => Promise<void>
  clear: () => void
  clearHistory: () => void
}

const defaultState: AIPanelState = {
  isOpen: false,
  mode: 'ask-ai',
  query: '',
  position: { x: -1, y: -1 }, // -1 means "center"
  isLoading: false,
  error: null,
  autoSubmit: false,
  attachments: [],
  contextOffer: null,
  followContextOffer: false,
  messages: [],
}

function toAttachmentChip(a: AIAttachment): AIAttachmentChip {
  return { id: a.id, title: a.title, courseName: a.courseName }
}

function upsertViewAttachment(existing: AIAttachment[], next: AIAttachment): AIAttachment[] {
  const withoutView = existing.filter((a) => a.slot !== 'view')
  return [...withoutView, { ...next, slot: 'view' }]
}

function truncateForPrompt(text: string, maxChars: number): string {
  const t = String(text || '')
  if (t.length <= maxChars) return t
  if (maxChars <= 0) return ''
  const suffix = '\n\n[truncated]'
  if (maxChars <= suffix.length) return t.slice(0, maxChars)
  return t.slice(0, maxChars - suffix.length) + suffix
}

function estimatePromptChars(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + String(m.content || '').length, 0)
}

function normalizeAIStreamError(error: string): string {
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

function isLikelyPromptTooLargeError(error: string): boolean {
  const lower = String(error || '').toLowerCase()
  return (
    lower.includes('socket hang up') ||
    lower.includes('econnreset') ||
    lower.includes('empty reply') ||
    lower.includes('context_length_exceeded') ||
    lower.includes('context window exceeded')
  )
}

type AIPanelActions = {
  open: (query?: string, mode?: AIMode, autoSubmit?: boolean) => void
  openExplainPage: (args: {
    courseId: string | number
    courseName?: string
    pageUrl: string
    title: string
  }) => void
  registerContextOffer: (key: string, offer: AIAttachment) => void
  unregisterContextOffer: (key: string) => void
  startFollowContextOffer: () => void
  cancelFollowContextOffer: () => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
  close: () => void
  toggle: () => void
  setMode: (mode: AIMode) => void
  setQuery: (query: string) => void
  setPosition: (position: { x: number; y: number }) => void
  submit: () => Promise<void>
  sendMessage: (query: string) => Promise<void>
  clear: () => void
  clearHistory: () => void
}

const AIPanelStateContext = createContext<AIPanelState | null>(null)
const AIPanelActionsContext = createContext<AIPanelActions | null>(null)

export function useAIPanelState(): AIPanelState {
  const ctx = useContext(AIPanelStateContext)
  if (!ctx) throw new Error('useAIPanelState must be used within AIPanelProvider')
  return ctx
}

export function useAIPanelActions(): AIPanelActions {
  const ctx = useContext(AIPanelActionsContext)
  if (!ctx) throw new Error('useAIPanelActions must be used within AIPanelProvider')
  return ctx
}

export function useAIPanel(): AIPanelContextValue {
  const state = useAIPanelState()
  const actions = useAIPanelActions()
  return { ...state, ...actions }
}

// For edge cases (e.g. dev fast refresh) where a component might briefly render
// without the provider, this returns null instead of throwing.
export function useOptionalAIPanelActions(): AIPanelActions | null {
  return useContext(AIPanelActionsContext)
}

interface AIPanelProviderProps {
  children: React.ReactNode
  embeddingsEnabled?: boolean
  aiEnabled?: boolean // Whether AI is enabled in settings
  // Structured data from the app for richer context
  userName?: string
  pinnedCourses?: string[]
  dueAssignments?: any[]
  courses?: any[]
  courseGrades?: Array<{ courseId: string | number; courseName: string; grade: number | null }>
  recentSubmissions?: Array<{
    courseId: string | number
    courseName: string
    assignmentId: string | number
    name: string
    score: number | null
    pointsPossible: number | null
    gradedAt: string
    htmlUrl?: string
  }>
}

type PriorityItem = {
  title: string
  course: string
  due: string
  relative?: string
  points?: number | null
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
function xmlEscapeText(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xmlEscapeAttr(value: unknown): string {
  return xmlEscapeText(value).replace(/"/g, '&quot;')
}

function xmlEl(tag: string, content: string, attrs?: Record<string, unknown>): string {
  const attrStr = attrs
    ? Object.entries(attrs)
        .filter(([, v]) => v != null && String(v) !== '')
        .map(([k, v]) => ` ${k}="${xmlEscapeAttr(v)}"`)
        .join('')
    : ''
  return `<${tag}${attrStr}>${content}</${tag}>`
}

function looksLikeAssignmentsQuery(query: string): boolean {
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

function mergeNeeds(a: SearchNeeds | undefined, b: SearchNeeds | undefined): SearchNeeds {
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

function inferNeedsFromQuery(query: string): SearchNeeds {
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
type SystemPromptMeta = {
  userName?: string
  pinnedCourses?: string[]
}

function buildSystemPrompt(intent: SearchIntent, meta?: SystemPromptMeta): string {
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
function buildFewShotExamples(
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

function buildStructuredContext(
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

  const tokens = qLower
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

  if (plan.intent === 'due_date' && filteredDueRows.length) {
    const assignmentNodes = filteredDueRows.map((a: any) => {
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

export function AIPanelProvider({
  children,
  embeddingsEnabled = true,
  aiEnabled = false,
  userName,
  pinnedCourses,
  dueAssignments = [],
  courses = [],
  courseGrades = [],
  recentSubmissions = [],
}: AIPanelProviderProps) {
  const [state, setState] = useState<AIPanelState>(defaultState)
  const { streamChat } = useAI()
  const { privateModeEnabled, aiAvailable, aiAvailability } = useAppFlags()

  // Precompute the dashboard-ranked priority list so planning answers don't "guess".
  // This is gated behind AI availability.
  const priorityData = usePriorityAssignments({
    enabled: Boolean(aiEnabled && aiAvailable && embeddingsEnabled),
  })
  const priorityItems: PriorityItem[] = useMemo(() => {
    const list = priorityData.assignments || []
    return list.slice(0, 10).map((a: any) => ({
      title: String(a?.name || ''),
      course: String(a?.courseLabel || a?.courseName || a?.courseId || ''),
      due: a?.dueAt ? String(a.dueAt) : '',
      relative: a?.relativeTime ? String(a.relativeTime) : undefined,
      points: typeof a?.pointsPossible === 'number' ? a.pointsPossible : null,
    }))
  }, [priorityData.assignments])

  const alsoDueItems: PriorityItem[] = useMemo(() => {
    const list = priorityData.alsoDue || []
    return list.slice(0, 10).map((a: any) => ({
      title: String(a?.name || ''),
      course: String(a?.courseLabel || a?.courseName || a?.courseId || ''),
      due: a?.dueAt ? String(a.dueAt) : '',
      relative: a?.relativeTime ? String(a.relativeTime) : undefined,
      points: typeof a?.pointsPossible === 'number' ? a.pointsPossible : null,
    }))
  }, [priorityData.alsoDue])

  const coursesRef = useRef<any[]>(courses)
  const dueAssignmentsRef = useRef<any[]>(dueAssignments)
  const courseGradesRef = useRef<any[]>(courseGrades)
  const recentSubmissionsRef = useRef<any[]>(recentSubmissions)
  const userNameRef = useRef<string>(userName || '')
  const pinnedCoursesRef = useRef<string[]>(pinnedCourses || [])

  useEffect(() => {
    coursesRef.current = courses
  }, [courses])

  useEffect(() => {
    dueAssignmentsRef.current = dueAssignments
  }, [dueAssignments])

  useEffect(() => {
    courseGradesRef.current = courseGrades
  }, [courseGrades])

  useEffect(() => {
    recentSubmissionsRef.current = recentSubmissions
  }, [recentSubmissions])

  useEffect(() => {
    userNameRef.current = userName || ''
  }, [userName])

  useEffect(() => {
    pinnedCoursesRef.current = pinnedCourses || []
  }, [pinnedCourses])

  // Ref to hold stream cleanup function
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const requestIdRef = useRef(0)
  const activeRequestIdRef = useRef(0)

  // We keep the full chat history in the UI to avoid jumpy deletions.
  // For the model prompt, we pass a compact window (baseline + recent tail).
  const buildPromptHistory = useCallback((messages: ChatMessage[]) => {
    const done = messages.filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && m.status === 'done',
    )

    if (done.length === 0) return []

    const baselineCount = 2 // first user message + first assistant reply (if present)
    const tailTurns = 5
    const tailCount = tailTurns * 2

    const baseline = done.slice(0, baselineCount)
    const tail = done.slice(-tailCount)

    // Dedupe while preserving order (baseline should win).
    const seen = new Set<string>()
    const out: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const m of [...baseline, ...tail]) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      out.push({ role: m.role, content: m.content })
    }
    return out
  }, [])

  const updateMessage = useCallback(
    (id: string, updater: ChatMessage | ((msg: ChatMessage) => ChatMessage)) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === id ? (typeof updater === 'function' ? updater(msg) : updater) : msg,
        ),
      }))
    },
    [],
  )

  const runSubmit = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return

      if (!embeddingsEnabled) {
        setState((prev) => ({ ...prev, error: 'Deep Search must be enabled for AI features' }))
        return
      }
      if (!window.embedding || !window.ai) {
        setState((prev) => ({ ...prev, error: 'AI features are not available' }))
        return
      }
      if (!aiAvailable) {
        const status = aiAvailability?.status
        const message =
          status === 'disabled'
            ? 'Enable Apple Intelligence in System Settings to use this feature.'
            : status === 'unsupported'
              ? 'Apple Intelligence is not supported on this Mac.'
              : status === 'error'
                ? 'Apple Intelligence availability could not be verified.'
                : 'AI features are not available.'
        setState((prev) => ({ ...prev, error: message }))
        return
      }
      if (!aiEnabled) {
        setState((prev) => ({ ...prev, error: 'Apple Intelligence is turned off in Settings.' }))
        return
      }

      // Cancel any existing stream
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }

      const trimmedQuery = queryText.trim()
      const requestId = ++requestIdRef.current
      activeRequestIdRef.current = requestId

      const wantsAssignments = looksLikeAssignmentsQuery(trimmedQuery)

      const userMessageId = `u_${requestId}`
      const assistantMessageId = `a_${requestId}`

      const baseAttachments = state.attachments
      const offer = state.contextOffer
      const shouldUseOffer = !privateModeEnabled && state.followContextOffer && !!offer
      const attachmentsForTurn = privateModeEnabled
        ? []
        : shouldUseOffer && offer
          ? upsertViewAttachment(baseAttachments, offer)
          : baseAttachments

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmedQuery,
        status: 'done',
        attachments: attachmentsForTurn.length ? attachmentsForTurn.map(toAttachmentChip) : null,
      }
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        references: null,
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        autoSubmit: false,
        query: '',
        attachments: attachmentsForTurn,
        followContextOffer: false,
        messages: [...prev.messages, userMessage, assistantMessage],
      }))

      try {
        if (wantsAssignments) {
          // Give the app a moment to populate due assignments (common race on first open).
          const start = Date.now()
          while (dueAssignmentsRef.current.length === 0 && Date.now() - start < 1200) {
            await new Promise((r) => setTimeout(r, 150))
          }
        }

        const coursesNow = coursesRef.current
        let dueAssignmentsNow = dueAssignmentsRef.current

        // Resolve attachments (fetch missing text) during the "Thinking" phase.
        let attachmentContext = ''
        const attachmentResults: SearchResultItem[] = []

        if (attachmentsForTurn.length) {
          const parts: string[] = []

          for (const attachment of attachmentsForTurn) {
            if (attachment.kind === 'page') {
              const courseName =
                attachment.courseName ||
                coursesNow.find((c: any) => String(c?.id) === String(attachment.courseId))?.name ||
                ''

              let contentText = attachment.contentText
              if (!contentText) {
                if (!window.canvas?.getCoursePage) {
                  throw new Error('Canvas page API is not available')
                }
                const res = await window.canvas.getCoursePage(attachment.courseId, attachment.pageUrl)
                if (!res?.ok || !res.data) {
                  throw new Error(res?.error || 'Failed to load page content')
                }
                const bodyHtml = String((res.data as any)?.body || '')
                contentText = stripHtmlToText(bodyHtml).slice(0, 4000)
              }

              if (!contentText) continue

              parts.push(
                [
                  '## Attached Page',
                  `Title: ${attachment.title}`,
                  courseName ? `Course: ${courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )

              attachmentResults.push({
                id: attachment.id,
                score: 1,
                metadata: {
                  type: 'page',
                  courseId: String(attachment.courseId),
                  courseName: courseName || 'Unknown Course',
                  title: attachment.title,
                  snippet: contentText.slice(0, 160),
                  contentHash: 'attachment',
                },
              })

              continue
            }

            if (attachment.kind === 'syllabus') {
              const courseName =
                attachment.courseName ||
                coursesNow.find((c: any) => String(c?.id) === String(attachment.courseId))?.name ||
                ''

              let contentText = attachment.contentText
              if (!contentText) {
                if (!window.canvas?.getCourseInfo) {
                  throw new Error('Canvas course info API is not available')
                }
                const res = await window.canvas.getCourseInfo(attachment.courseId)
                if (!res?.ok || !res.data) {
                  throw new Error(res?.error || 'Failed to load course info')
                }
                const syllabusHtml = String((res.data as any)?.syllabus_body || '')
                contentText = stripHtmlToText(syllabusHtml).slice(0, 4000)
              }

              if (!contentText) continue

              parts.push(
                [
                  '## Attached Syllabus',
                  courseName ? `Course: ${courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
            }

            if (attachment.kind === 'announcements') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Announcements',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'announcement') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Announcement',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'assignments') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Assignments',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'assignment') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Assignment',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'dashboard') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(['## Attached Dashboard Snapshot', 'Content:', contentText].join('\n'))
              continue
            }

            if (attachment.kind === 'home') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Course Home',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'discussions') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Discussions',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'discussion') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Discussion',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'grades') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Grades',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'modules') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Modules',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'files') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Files',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'file') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached File',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'links') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached Course Links',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }

            if (attachment.kind === 'people') {
              const contentText = attachment.contentText
              if (!contentText) continue

              parts.push(
                [
                  '## Attached People',
                  attachment.courseName ? `Course: ${attachment.courseName}` : '',
                  'Content:',
                  contentText,
                ]
                  .filter(Boolean)
                  .join('\n'),
              )
              continue
            }
          }

          attachmentContext = parts.filter(Boolean).join('\n\n')
        }

        // Pass 1: Coordinate
        const plan = await coordinateSearch(trimmedQuery, coursesNow)

        const mergedNeeds = mergeNeeds(plan.needs, inferNeedsFromQuery(trimmedQuery))

        // If coordinator says we need assignments but they're not loaded yet, wait briefly.
        if (mergedNeeds.assignments) {
          const start = Date.now()
          while (dueAssignmentsRef.current.length === 0 && Date.now() - start < 1200) {
            await new Promise((r) => setTimeout(r, 150))
          }
          dueAssignmentsNow = dueAssignmentsRef.current
        }

        // If we still don't have due assignments, do NOT ask the model to "fill in".
        if (mergedNeeds.assignments && dueAssignmentsNow.length === 0) {
          updateMessage(assistantMessageId, (msg) => ({
            ...msg,
            content:
              "I don't have any due assignments loaded right now, so I can't tell what's due. Give it a moment (or open Dashboard) and try again.",
            status: 'done',
            references: null,
          }))
          setState((prev) => ({ ...prev, isLoading: false }))
          return
        }

        if (import.meta.env.DEV) {
          try {
            if (localStorage.getItem('wb.ai.debugCoordinator') === '1') {
              console.log('[ai:plan]', plan)
              console.log('[ai:mergedNeeds]', mergedNeeds)
            }
          } catch {
            // ignore
          }
        }

        // Pass 2: Fetch Data
        let references: SearchResultItem[] = []
        let candidates: SearchResultItem[] = []

        // Semantic search is only helpful for content questions (pages/files/modules).
        // For assignment due/planning questions it adds unrelated noise (exams, files, etc.).
        if (plan.intent === 'content_qa' || mergedNeeds.contentSearch) {
          const primaryPageAttachment = [...attachmentsForTurn]
            .reverse()
            .find((a): a is PageAttachment => a.kind === 'page')

          const forcedCourseIds = primaryPageAttachment
            ? [String(primaryPageAttachment.courseId)]
            : undefined
          const forcedTypes: ContentType[] | undefined = primaryPageAttachment ? ['page'] : undefined
          const semanticQuery = primaryPageAttachment
            ? primaryPageAttachment.title
            : plan.rewrittenQuery

          const searchResult = await window.embedding.search(semanticQuery, 8, {
            courseIds: forcedCourseIds ?? plan.filters?.courseIds,
            types: forcedTypes ?? plan.filters?.types,
            minScore: primaryPageAttachment ? 0.35 : 0.25,
            dedupe: true,
          })
          if (searchResult.ok) {
            references = (searchResult.data || []).slice(0, 5)
          }
        }

        if (plan.intent === 'planning' || plan.intent === 'due_date') {
          const courseIdSet = plan.filters?.courseIds?.length
            ? new Set(plan.filters.courseIds)
            : null

          const matches = dueAssignmentsNow
            .filter((a: any) => {
              if (courseIdSet && !courseIdSet.has(String(a.course_id || a.courseId))) return false
              return true
            })
            .slice(0, 5)

          const courseNameById = new Map<string, string>()
          for (const c of coursesNow)
            courseNameById.set(String(c.id), c.name || c.course_code || 'Unknown Course')

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

        const structuredContext = buildStructuredContext(
          plan,
          trimmedQuery,
          dueAssignmentsNow,
          coursesNow,
          courseGradesRef.current,
          recentSubmissionsRef.current,
        )

        // If we have the dashboard-ranked priority list, include it for planning.
        // This avoids the model "guessing" priority.
        const priorityContext = (() => {
          if (plan.intent !== 'planning') return ''
          if (!priorityItems.length && !alsoDueItems.length) return ''

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

          const aNode = (a: PriorityItem) => {
            const parts =
              xmlEl('Title', xmlEscapeText(a.title)) +
              xmlEl('Course', xmlEscapeText(a.course)) +
              (a.due ? xmlEl('Due', xmlEscapeText(formatDueHuman(a.due))) : '') +
              (a.relative ? xmlEl('Relative', xmlEscapeText(a.relative)) : '') +
              (typeof a.points === 'number' && Number.isFinite(a.points)
                ? xmlEl('Points', xmlEscapeText(a.points))
                : '')
            return xmlEl('A', parts)
          }

          const priorityNodes = priorityItems.map(aNode)
          const alsoNodes = alsoDueItems.map(aNode)

          const parts: string[] = []
          if (priorityNodes.length) {
            parts.push(
              xmlEl('Priority', priorityNodes.join(''), { count: String(priorityNodes.length) }),
            )
          }
          if (alsoNodes.length) {
            parts.push(xmlEl('AlsoDue', alsoNodes.join(''), { count: String(alsoNodes.length) }))
          }
          return xmlEl('PriorityContext', parts.join(''), { authoritative: 'true' })
        })()

        const semanticContext = references
          .map(
            (r) =>
              `[${r.metadata.type}] ${r.metadata.title} (${r.metadata.courseName}): ${r.metadata.snippet}`,
          )
          .join('\n\n')

        const systemPrompt = buildSystemPrompt(plan.intent, {
          userName: userNameRef.current,
          pinnedCourses: pinnedCoursesRef.current,
        })
        const fewShotExamples = buildFewShotExamples(plan.intent)

        const MAX_PROMPT_CHARS = 15000

        let historyMessagesForPrompt = buildPromptHistory(state.messages)
        let attachmentContextForPrompt = attachmentContext
        let structuredContextForPrompt = structuredContext
        let priorityContextForPrompt = priorityContext
        let semanticContextForPrompt = semanticContext

        const buildFullContext = () => {
          return [
            attachmentContextForPrompt,
            structuredContextForPrompt,
            priorityContextForPrompt,
            semanticContextForPrompt
              ? '## Related Content (Semantic Search)\n' + semanticContextForPrompt
              : '',
          ]
            .filter(Boolean)
            .join('\n\n')
        }

        const buildUserPrompt = () => {
          const fullContext = buildFullContext()
          return fullContext
            ? `Context:\n${fullContext}\n\nQuestion: ${trimmedQuery}`
            : `Question: ${trimmedQuery}`
        }

        const buildMessagesForPrompt = () => {
          const userPrompt = buildUserPrompt()
          return [
            { role: 'system', content: systemPrompt },
            ...fewShotExamples,
            ...historyMessagesForPrompt,
            { role: 'user', content: userPrompt },
          ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
        }

        let messages = buildMessagesForPrompt()
        for (const trim of [
          () => {
            if (historyMessagesForPrompt.length) historyMessagesForPrompt = []
          },
          () => {
            if (semanticContextForPrompt) semanticContextForPrompt = ''
          },
          () => {
            if (priorityContextForPrompt) priorityContextForPrompt = ''
          },
          () => {
            structuredContextForPrompt = truncateForPrompt(structuredContextForPrompt, 2600)
          },
          () => {
            attachmentContextForPrompt = truncateForPrompt(attachmentContextForPrompt, 6000)
          },
        ]) {
          if (estimatePromptChars(messages) <= MAX_PROMPT_CHARS) break
          trim()
          messages = buildMessagesForPrompt()
        }

        if (import.meta.env.DEV) {
          try {
            if (localStorage.getItem('wb.ai.debugPrompt') === '1') {
              // NOTE: This may contain sensitive course content; keep it opt-in.
              console.log('[ai:userPrompt]', buildUserPrompt())
            }
          } catch {
            // ignore
          }
        }

        const fallbackResults = candidates.length > 0 ? candidates : references
        const attachmentResultIds = new Set(attachmentResults.map((r) => r.id))
        const finalResults =
          attachmentResults.length > 0
            ? [
                ...attachmentResults,
                ...fallbackResults.filter((r) => !attachmentResultIds.has(r.id)),
              ]
            : fallbackResults

        updateMessage(assistantMessageId, (msg) => ({ ...msg, references: finalResults }))

        const retryUserPrompt = (() => {
          const retryContext = [
            truncateForPrompt(attachmentContext, 3000),
            truncateForPrompt(structuredContext, 2000),
          ]
            .filter(Boolean)
            .join('\n\n')
          return retryContext
            ? `Context:\n${retryContext}\n\nQuestion: ${trimmedQuery}`
            : `Question: ${trimmedQuery}`
        })()

        const retryMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...fewShotExamples,
          { role: 'user', content: retryUserPrompt },
        ]

        let didRetry = false

        const onUpdate = (text: string) => {
          if (activeRequestIdRef.current !== requestId) return
          updateMessage(assistantMessageId, (msg) => ({
            ...msg,
            content: text,
            status: 'streaming',
          }))
        }

        const onDone = () => {
          if (activeRequestIdRef.current !== requestId) return
          updateMessage(assistantMessageId, (msg) => ({ ...msg, status: 'done' }))
          setState((prev) => ({ ...prev, isLoading: false }))
          streamCleanupRef.current = null
        }

        const onError = (err: string) => {
          if (activeRequestIdRef.current !== requestId) return

          if (!didRetry && isLikelyPromptTooLargeError(err)) {
            didRetry = true
            updateMessage(assistantMessageId, (msg) => ({ ...msg, content: '', status: 'streaming' }))
            const retryCleanup = streamChat(retryMessages as AIMessage[], onUpdate, {
              onDone,
              onError: (e2) => {
                if (activeRequestIdRef.current !== requestId) return
                updateMessage(assistantMessageId, (msg) => ({ ...msg, status: 'error' }))
                setState((prev) => ({ ...prev, isLoading: false, error: normalizeAIStreamError(e2) }))
                streamCleanupRef.current = null
              },
            })
            streamCleanupRef.current = retryCleanup
            return
          }

          updateMessage(assistantMessageId, (msg) => ({ ...msg, status: 'error' }))
          setState((prev) => ({ ...prev, isLoading: false, error: normalizeAIStreamError(err) }))
          streamCleanupRef.current = null
        }

        const cleanup = streamChat(messages as AIMessage[], onUpdate, { onDone, onError })
        streamCleanupRef.current = cleanup
      } catch (e) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: e instanceof Error ? e.message : String(e),
        }))
      }
    },
    [
      embeddingsEnabled,
      aiAvailable,
      aiAvailability,
      aiEnabled,
      dueAssignments,
      courses,
      state.messages,
      state.attachments,
      state.contextOffer,
      state.followContextOffer,
      privateModeEnabled,
      streamChat,
      buildPromptHistory,
      updateMessage,
    ],
  )

  const submit = useCallback(async () => {
    await runSubmit(state.query)
  }, [runSubmit, state.query])

  const sendMessage = useCallback(
    async (queryText: string) => {
      await runSubmit(queryText)
    },
    [runSubmit],
  )

  const open = useCallback((query?: string, mode?: AIMode, autoSubmit = false) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      query: query ?? prev.query,
      mode: mode ?? prev.mode,
      autoSubmit,
      // Ensure auto-submit always runs from a clean state
      ...(autoSubmit ? { error: null, isLoading: false } : {}),
      // Clear error when opening with a new query
      ...(query && query !== prev.query ? { error: null } : {}),
    }))
  }, [])

  const openExplainPage = useCallback(
    ({
      courseId,
      courseName,
      pageUrl,
      title,
    }: {
      courseId: string | number
      courseName?: string
      pageUrl: string
      title: string
    }) => {
      if (privateModeEnabled) {
        setState((prev) => ({
          ...prev,
          isOpen: true,
          error: 'Private Mode is enabled. Disable it to attach page content.',
          autoSubmit: false,
        }))
        return
      }
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }

      setState((prev) => ({
        ...prev,
        isOpen: true,
        // Explain should always start a fresh chat
        messages: [],
        mode: 'ask-ai',
        query: `Explain the attached page "${title}". Summarize it and list key takeaways.`,
        autoSubmit: true,
        error: null,
        isLoading: false,
        attachments: [
          {
            id: `page:${String(courseId)}:${String(pageUrl)}`,
            slot: 'manual',
            kind: 'page',
            courseId,
            courseName,
            title,
            pageUrl,
          },
        ],
        followContextOffer: false,
      }))
    },
    [privateModeEnabled],
  )

  const contextOffersRef = useRef<
    Map<string, { offer: AIAttachment; updatedAt: number }>
  >(new Map())

  const updateActiveContextOffer = useCallback(() => {
    const entries = Array.from(contextOffersRef.current.values())
    let next: AIAttachment | null = null
    let bestTime = -1
    for (const entry of entries) {
      if (!entry?.offer) continue
      if (entry.updatedAt > bestTime) {
        bestTime = entry.updatedAt
        next = entry.offer
      }
    }

    setState((prev) => {
      const current = prev.contextOffer
      if (!next && !current) return prev
      if (
        next &&
        current &&
        next.id === current.id &&
        next.kind === current.kind &&
        next.title === current.title &&
        next.courseId === current.courseId &&
        next.courseName === current.courseName &&
        next.contentText === current.contentText
      ) {
        return prev
      }
      return { ...prev, contextOffer: next }
    })
  }, [])

  const registerContextOffer = useCallback(
    (key: string, offer: AIAttachment) => {
      if (!key) return
      if (privateModeEnabled) return
      contextOffersRef.current.set(key, { offer, updatedAt: Date.now() })
      updateActiveContextOffer()
    },
    [privateModeEnabled, updateActiveContextOffer],
  )

  const unregisterContextOffer = useCallback(
    (key: string) => {
      if (!key) return
      contextOffersRef.current.delete(key)
      updateActiveContextOffer()
    },
    [updateActiveContextOffer],
  )

  const startFollowContextOffer = useCallback(() => {
    if (privateModeEnabled) return
    setState((prev) => ({ ...prev, followContextOffer: true }))
  }, [privateModeEnabled])

  const cancelFollowContextOffer = useCallback(() => {
    setState((prev) => ({ ...prev, followContextOffer: false }))
  }, [])

  useEffect(() => {
    if (!privateModeEnabled) return
    contextOffersRef.current.clear()
    setState((prev) => {
      if (!prev.attachments.length && !prev.contextOffer && !prev.followContextOffer) return prev
      return {
        ...prev,
        attachments: [],
        contextOffer: null,
        followContextOffer: false,
      }
    })
  }, [privateModeEnabled])

  const removeAttachment = useCallback((attachmentId: string) => {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== attachmentId),
    }))
  }, [])

  const clearAttachments = useCallback(() => {
    setState((prev) => ({ ...prev, attachments: [] }))
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  const setMode = useCallback((mode: AIMode) => {
    setState((prev) => ({ ...prev, mode, error: null }))
  }, [])

  const setQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, query }))
  }, [])

  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, position }))
  }, [])

  const clear = useCallback(() => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current()
      streamCleanupRef.current = null
    }
    setState((prev) => ({
      ...prev,
      query: '',
      error: null,
      isLoading: false,
      autoSubmit: false,
      attachments: [],
      followContextOffer: false,
      messages: [],
    }))
  }, [])

  const clearHistory = useCallback(() => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current()
      streamCleanupRef.current = null
    }
    setState((prev) => ({
      ...prev,
      messages: [],
      query: '',
      error: null,
      isLoading: false,
      autoSubmit: false,
      attachments: [],
      followContextOffer: false,
    }))
  }, [])

  // NOTE: legacy submit() implementation removed.
  // `runSubmit()` is the single source of truth for sending messages.

  useEffect(() => {
    if (!state.isOpen) return
    if (!state.autoSubmit) return
    if (!state.query.trim()) return
    if (state.isLoading) return

    // Fire-and-forget; errors handled in submit()
    submit()
  }, [state.isOpen, state.autoSubmit, state.query, state.isLoading, submit])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }
    }
  }, [])

  const actions = useMemo<AIPanelActions>(
    () => ({
      open,
      openExplainPage,
      registerContextOffer,
      unregisterContextOffer,
      startFollowContextOffer,
      cancelFollowContextOffer,
      removeAttachment,
      clearAttachments,
      close,
      toggle,
      setMode,
      setQuery,
      setPosition,
      submit,
      sendMessage,
      clear,
      clearHistory,
    }),
    [
      open,
      openExplainPage,
      registerContextOffer,
      unregisterContextOffer,
      startFollowContextOffer,
      cancelFollowContextOffer,
      removeAttachment,
      clearAttachments,
      close,
      toggle,
      setMode,
      setQuery,
      setPosition,
      submit,
      sendMessage,
      clear,
      clearHistory,
    ],
  )

  return (
    <AIPanelStateContext.Provider value={state}>
      <AIPanelActionsContext.Provider value={actions}>{children}</AIPanelActionsContext.Provider>
    </AIPanelStateContext.Provider>
  )
}
