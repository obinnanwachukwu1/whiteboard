import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import { coordinateSearch } from '../utils/coordinator'
import type { ContentType } from '../utils/coordinator'
import { extractAssignmentIdFromUrl } from '../utils/urlHelpers'
import { stripHtmlToText } from '../utils/stripHtmlToText'
import { usePriorityAssignments } from '../hooks/usePriorityAssignments'
import { useAppFlags } from './AppContext'
import type { AITelemetryEvent } from '../types/ipc'
import {
  buildDeterministicPlanningAnswer,
  selectDeterministicPlanningItems,
  type DeterministicPlanningItem,
} from './ai/deterministicPlanning'
import {
  buildConversationSummaryContext,
  buildFewShotExamples,
  buildStructuredContext,
  buildSystemPrompt,
  estimatePromptChars,
  inferNeedsFromQuery,
  isLikelyPromptTooLargeError,
  looksLikeAssignmentsQuery,
  mergeNeeds,
  normalizeAIStreamError,
  truncateForPrompt,
  xmlEl,
  xmlEscapeText,
} from './ai/promptContextUtils'
import {
  buildFallbackResponse,
  buildRetrySystemPrompt,
  detectExpectedAssignment,
  detectGuardViolation,
  validateBufferedPrefix,
  validateFinalResponse,
  type GuardAssignment,
  type ResponseGuardConfig,
} from './ai/responseGuard'

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

function estimateTokensApprox(text: string): number {
  const s = String(text || '')
  if (!s) return 0
  return Math.ceil(s.length / 4)
}

function normalizePhrase(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function computeDueDateExactMatch(
  query: string,
  dueAssignments: any[],
): { exactHit: boolean; hadCandidates: boolean } {
  const rows = (dueAssignments || []).filter((a) => Boolean(a?.due_at || a?.dueAt))
  if (!rows.length) return { exactHit: false, hadCandidates: false }

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

  const tokens = String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))

  if (!tokens.length) return { exactHit: false, hadCandidates: true }

  const exactHit = rows.some((a) => {
    const name = String(a?.name || '').toLowerCase()
    return tokens.every((t) => name.includes(t))
  })

  return { exactHit, hadCandidates: true }
}

function normalizeQueryTokensForDueMatch(query: string): string[] {
  const stopwords = new Set([
    'when',
    'what',
    'whats',
    "what's",
    'is',
    'due',
    'deadline',
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
    'me',
    'soon',
    'exactly',
    'please',
    'can',
    'you',
  ])

  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopwords.has(t))
}

function buildDueAssignmentCandidates(dueAssignments: any[], courses: any[]): GuardAssignment[] {
  const courseNameById = new Map<string, string>()
  for (const c of courses || []) {
    courseNameById.set(String(c?.id), String(c?.name || c?.course_code || 'Unknown Course'))
  }

  return (dueAssignments || [])
    .filter((a) => Boolean(a?.name))
    .slice(0, 80)
    .map((a) => {
      const courseId = String(a?.course_id || a?.courseId || '')
      const dueISO = String(a?.due_at || a?.dueAt || '')
      const dueDate = dueISO ? new Date(dueISO) : null
      const dueLabel =
        dueDate && Number.isFinite(dueDate.getTime())
          ? dueDate.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : ''
      const pointsRaw = a?.points_possible ?? a?.pointsPossible
      return {
        title: String(a?.name || ''),
        course: String(a?.course_name || a?.courseName || courseNameById.get(courseId) || 'Unknown Course'),
        dueISO: dueISO || undefined,
        dueLabel: dueLabel || undefined,
        points:
          typeof pointsRaw === 'number' && Number.isFinite(pointsRaw)
            ? pointsRaw
            : null,
      } satisfies GuardAssignment
    })
    .filter((a) => Boolean(a.title && a.course))
}

function shouldDeclineDueDateForMissingMatch(
  query: string,
  planIntent: string,
  candidates: GuardAssignment[],
  expectedAssignment: GuardAssignment | null,
): boolean {
  if (planIntent !== 'due_date') return false
  if (expectedAssignment) return false
  const q = String(query || '').toLowerCase()
  const asksForDue = q.includes('when') || q.includes('due') || q.includes('deadline')
  if (!asksForDue) return false

  const tokens = normalizeQueryTokensForDueMatch(query)
  if (!tokens.length) return false

  const matches = candidates.some((a) => {
    const haystack = `${String(a.title || '').toLowerCase()} ${String(a.course || '').toLowerCase()}`
    return tokens.every((t) => haystack.includes(t))
  })
  return !matches
}

function buildReferenceContext(expected: GuardAssignment | null): string {
  if (!expected) return ''
  return xmlEl(
    'ResolvedReference',
    xmlEl('Title', xmlEscapeText(expected.title)) +
      xmlEl('Course', xmlEscapeText(expected.course)) +
      (expected.dueLabel ? xmlEl('Due', xmlEscapeText(expected.dueLabel)) : '') +
      (expected.dueISO ? xmlEl('DueISO', xmlEscapeText(expected.dueISO)) : '') +
      (typeof expected.points === 'number' && Number.isFinite(expected.points)
        ? xmlEl('Points', xmlEscapeText(expected.points))
        : ''),
    { authoritative: 'true' },
  )
}

function toDeterministicPlanningReferences(items: DeterministicPlanningItem[]): SearchResultItem[] {
  return (items || []).slice(0, 8).map((item) => ({
    id: item.id,
    score: 1,
    metadata: {
      type: 'assignment',
      courseId: item.courseId,
      courseName: item.courseName,
      title: item.title,
      snippet: `Due: ${item.dueLabel}`,
      contentHash: 'structured',
    },
  }))
}

function buildAllowedEntitySet(
  dueAssignments: any[],
  references: SearchResultItem[],
  priority: PriorityItem[],
  alsoDue: PriorityItem[],
): Set<string> {
  const out = new Set<string>()
  for (const a of dueAssignments || []) {
    const name = normalizePhrase(a?.name)
    const course = normalizePhrase(a?.course_name || a?.courseName || a?.course_code || a?.courseCode)
    if (name) out.add(name)
    if (course) out.add(course)
  }
  for (const r of references || []) {
    const t = normalizePhrase(r?.metadata?.title)
    const c = normalizePhrase(r?.metadata?.courseName)
    if (t) out.add(t)
    if (c) out.add(c)
  }
  for (const p of [...(priority || []), ...(alsoDue || [])]) {
    const t = normalizePhrase(p?.title)
    const c = normalizePhrase(p?.course)
    if (t) out.add(t)
    if (c) out.add(c)
  }
  return out
}

function detectUnsupportedClaimHeuristic(answer: string, allowed: Set<string>): { flagged: boolean } {
  const text = String(answer || '').trim()
  if (!text) return { flagged: false }

  const lower = text.toLowerCase()
  if (
    lower.includes("i don't have") ||
    lower.includes('do not have enough') ||
    lower.includes("can't determine")
  ) {
    return { flagged: false }
  }

  const candidates = new Set<string>()
  for (const m of text.matchAll(/"([^"]{3,80})"/g)) {
    const v = normalizePhrase(m[1])
    if (v) candidates.add(v)
  }
  for (const line of text.split('\n')) {
    const l = line.trim()
    if (!l.startsWith('-') && !l.startsWith('•')) continue
    const raw = l.replace(/^[-•]\s*/, '')
    const title = raw.split(/\s+\(/)[0]?.split(/\s+-\s+/)[0] || ''
    const v = normalizePhrase(title)
    if (v && v.split(' ').length >= 2) candidates.add(v)
  }

  if (!candidates.size) return { flagged: false }

  for (const c of candidates) {
    if (c.length < 6) continue
    const matched = Array.from(allowed).some((a) => a.includes(c) || c.includes(a))
    if (!matched) return { flagged: true }
  }
  return { flagged: false }
}

function extractLastAssignmentsForCoordinator(
  messages: ChatMessage[],
): Array<{ title: string; course: string; due?: string }> {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (msg.role !== 'assistant' || msg.status !== 'done' || !msg.references?.length) continue
    const assignments = msg.references
      .filter((r) => r.metadata.type === 'assignment')
      .slice(0, 6)
      .map((r) => {
        const snippet = String(r.metadata.snippet || '')
        const due = snippet.startsWith('Due:') ? snippet.replace(/^Due:\s*/, '') : undefined
        return {
          title: String(r.metadata.title || ''),
          course: String(r.metadata.courseName || ''),
          due: due || undefined,
        }
      })
      .filter((a) => a.title && a.course)
    if (assignments.length) return assignments
  }
  return []
}

function toAttachmentChip(a: AIAttachment): AIAttachmentChip {
  return { id: a.id, title: a.title, courseName: a.courseName }
}

function upsertViewAttachment(existing: AIAttachment[], next: AIAttachment): AIAttachment[] {
  const withoutView = existing.filter((a) => a.slot !== 'view')
  return [...withoutView, { ...next, slot: 'view' }]
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
  const { privateModeEnabled, aiAvailable, aiAvailability } = useAppFlags()

  const messagesRef = useRef<ChatMessage[]>(state.messages)
  const attachmentsRef = useRef<AIAttachment[]>(state.attachments)
  const contextOfferRef = useRef<AIAttachment | null>(state.contextOffer)
  const followContextOfferRef = useRef<boolean>(state.followContextOffer)
  const queryRef = useRef<string>(state.query)

  useEffect(() => {
    messagesRef.current = state.messages
  }, [state.messages])

  useEffect(() => {
    attachmentsRef.current = state.attachments
  }, [state.attachments])

  useEffect(() => {
    contextOfferRef.current = state.contextOffer
  }, [state.contextOffer])

  useEffect(() => {
    followContextOfferRef.current = state.followContextOffer
  }, [state.followContextOffer])

  useEffect(() => {
    queryRef.current = state.query
  }, [state.query])

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
  // For the model prompt, truncate to a short deterministic tail.
  const buildPromptHistory = useCallback((messages: ChatMessage[]) => {
    const done = messages.filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && m.status === 'done',
    )

    if (done.length === 0) return []

    const maxMessages = 6
    return done.slice(-maxMessages).map((m) => ({ role: m.role, content: m.content }))
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

  const recordTelemetry = useCallback((event: AITelemetryEvent) => {
    try {
      void window.ai?.recordTelemetry?.(event)
    } catch {
      // ignore telemetry failures
    }
  }, [])

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
      const requestStartedAt = Date.now()
      let streamStartedAt = 0
      let firstChunkAt = 0
      let didRetry = false
      let overflowTelemetrySent = false

      const emitOverflowTelemetry = (triggered: boolean) => {
        if (overflowTelemetrySent) return
        overflowTelemetrySent = true
        recordTelemetry({
          name: 'overflow_retry',
          data: { triggered },
          ts: Date.now(),
        })
      }

      const emitStageTiming = (stage: string, startedAt: number, endedAt = Date.now()) => {
        if (!startedAt || endedAt < startedAt) return
        recordTelemetry({
          name: 'stage_timing',
          data: { stage, ms: endedAt - startedAt },
          ts: endedAt,
        })
      }

      const wantsAssignments = looksLikeAssignmentsQuery(trimmedQuery)

      const userMessageId = `u_${requestId}`
      const assistantMessageId = `a_${requestId}`

      const baseAttachments = attachmentsRef.current
      const offer = contextOfferRef.current
      const shouldUseOffer = !privateModeEnabled && followContextOfferRef.current && !!offer
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
        const coordinatorStartedAt = Date.now()
        const coordinatorHistory = buildPromptHistory(messagesRef.current)
        const coordinatorLastAssignments = extractLastAssignmentsForCoordinator(messagesRef.current)
        const plan = await coordinateSearch(trimmedQuery, coursesNow, {
          history: coordinatorHistory,
          lastAssignments: coordinatorLastAssignments,
        })
        emitStageTiming('coordinator', coordinatorStartedAt)

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
          emitOverflowTelemetry(false)
          emitStageTiming('end_to_end', requestStartedAt, Date.now())
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
        const retrievalStartedAt = Date.now()
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
          const refTitle = normalizePhrase(plan.reference?.title)
          const refCourse = normalizePhrase(plan.reference?.course)

          const matches = dueAssignmentsNow
            .filter((a: any) => {
              if (courseIdSet && !courseIdSet.has(String(a.course_id || a.courseId))) return false
              if (plan.intent === 'due_date' && plan.reference?.kind === 'assignment' && refTitle && refCourse) {
                const title = normalizePhrase(a?.name)
                const course = normalizePhrase(a?.course_name || a?.courseName || '')
                const titleMatch = title === refTitle
                const courseMatch = course === refCourse || course.includes(refCourse) || refCourse.includes(course)
                return titleMatch && courseMatch
              }
              return true
            })
            .sort((a: any, b: any) => {
              const da = Date.parse(String(a?.due_at || a?.dueAt || ''))
              const db = Date.parse(String(b?.due_at || b?.dueAt || ''))
              if (!Number.isFinite(da) && !Number.isFinite(db)) return 0
              if (!Number.isFinite(da)) return 1
              if (!Number.isFinite(db)) return -1
              return da - db
            })
            .slice(0, 12)

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
        emitStageTiming('retrieval', retrievalStartedAt)

        if (plan.intent === 'due_date') {
          const courseIdSet = plan.filters?.courseIds?.length
            ? new Set(plan.filters.courseIds)
            : null
          const dueRowsForEval = dueAssignmentsNow.filter((a: any) => {
            if (!courseIdSet) return true
            return courseIdSet.has(String(a.course_id || a.courseId))
          })
          const dueDateEval = computeDueDateExactMatch(trimmedQuery, dueRowsForEval)
          recordTelemetry({
            name: 'due_date_exact_match',
            data: dueDateEval,
            ts: Date.now(),
          })
        }

        const contextBuildStartedAt = Date.now()
        const shouldUseDeterministicPlanning =
          plan.intent === 'planning' &&
          Boolean(mergedNeeds.assignments) &&
          !mergedNeeds.contentSearch

        if (shouldUseDeterministicPlanning) {
          const planningItems = selectDeterministicPlanningItems(trimmedQuery, dueAssignmentsNow, coursesNow, 8)
          const planningAnswer = buildDeterministicPlanningAnswer(planningItems)
          const planningRefs = toDeterministicPlanningReferences(planningItems)
          const finishedAt = Date.now()

          emitStageTiming('context_build', contextBuildStartedAt, finishedAt)
          emitStageTiming('end_to_end', requestStartedAt, finishedAt)
          emitOverflowTelemetry(false)

          updateMessage(assistantMessageId, (msg) => ({
            ...msg,
            content: planningAnswer,
            status: 'done',
            references: planningRefs.length ? planningRefs : null,
          }))
          setState((prev) => ({ ...prev, isLoading: false }))
          return
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

        const dueAssignmentCandidates = buildDueAssignmentCandidates(dueAssignmentsNow, coursesNow)
        const expectedAssignment = detectExpectedAssignment(plan.reference, dueAssignmentCandidates)
        const mustDeclineMissingData = shouldDeclineDueDateForMissingMatch(
          trimmedQuery,
          plan.intent,
          dueAssignmentCandidates,
          expectedAssignment,
        )

        const systemPrompt = buildSystemPrompt(plan.intent, {
          userName: userNameRef.current,
          pinnedCourses: pinnedCoursesRef.current,
        })
        const fewShotExamples = buildFewShotExamples(plan.intent)

        const conversationSummaryContext = buildConversationSummaryContext(
          coordinatorHistory,
          coordinatorLastAssignments,
        )
        const referenceContext = buildReferenceContext(expectedAssignment)

        const MAX_PROMPT_CHARS = 9000

        let historyMessagesForPrompt = buildPromptHistory(messagesRef.current)
        let attachmentContextForPrompt = attachmentContext
        let structuredContextForPrompt = structuredContext
        let priorityContextForPrompt = priorityContext
        let semanticContextForPrompt = semanticContext
        let conversationSummaryForPrompt = conversationSummaryContext
        let referenceContextForPrompt = referenceContext

        const buildFullContext = () => {
          const semanticSection = semanticContextForPrompt
            ? `## Related Content (Semantic Search)\n${semanticContextForPrompt}`
            : ''

          if (plan.intent === 'content_qa') {
            return [
              conversationSummaryForPrompt,
              referenceContextForPrompt,
              attachmentContextForPrompt,
              semanticSection,
              structuredContextForPrompt,
            ]
              .filter(Boolean)
              .join('\n\n')
          }

          return [
            conversationSummaryForPrompt,
            referenceContextForPrompt,
            structuredContextForPrompt,
            priorityContextForPrompt,
            attachmentContextForPrompt,
            semanticSection,
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
            if (attachmentContextForPrompt) attachmentContextForPrompt = truncateForPrompt(attachmentContextForPrompt, 3500)
          },
          () => {
            if (priorityContextForPrompt) priorityContextForPrompt = ''
          },
          () => {
            structuredContextForPrompt = truncateForPrompt(structuredContextForPrompt, 2200)
          },
          () => {
            conversationSummaryForPrompt = ''
          },
          () => {
            referenceContextForPrompt = ''
          },
        ]) {
          if (estimatePromptChars(messages) <= MAX_PROMPT_CHARS) break
          trim()
          messages = buildMessagesForPrompt()
        }
        const fullContextForPrompt = buildFullContext()
        const promptSectionTokens = {
          system: estimateTokensApprox(systemPrompt),
          few_shot: estimateTokensApprox(
            fewShotExamples.map((m) => String(m.content || '')).join('\n'),
          ),
          history: estimateTokensApprox(
            historyMessagesForPrompt.map((m) => String(m.content || '')).join('\n'),
          ),
          conversation_state: estimateTokensApprox(conversationSummaryForPrompt),
          reference: estimateTokensApprox(referenceContextForPrompt),
          attachments: estimateTokensApprox(attachmentContextForPrompt),
          structured: estimateTokensApprox(structuredContextForPrompt),
          priority: estimateTokensApprox(priorityContextForPrompt),
          semantic: estimateTokensApprox(semanticContextForPrompt),
          question: estimateTokensApprox(trimmedQuery),
          full_context: estimateTokensApprox(fullContextForPrompt),
          total: estimateTokensApprox(messages.map((m) => String(m.content || '')).join('\n')),
        }

        recordTelemetry({
          name: 'prompt_section_tokens',
          data: { sections: promptSectionTokens },
          ts: Date.now(),
        })
        emitStageTiming('context_build', contextBuildStartedAt)

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

        const guardConfig: ResponseGuardConfig = {
          intent: plan.intent,
          query: trimmedQuery,
          expectedAssignment,
          candidateAssignments: dueAssignmentCandidates.slice(0, 8),
          mustDeclineMissingData,
          requireSummaryFormat:
            plan.intent === 'content_qa' &&
            /(summary|summarize|key takeaways|takeaways)/i.test(trimmedQuery),
        }

        if (mustDeclineMissingData) {
          const fallback = buildFallbackResponse(guardConfig)
          const finishedAt = Date.now()
          emitStageTiming('end_to_end', requestStartedAt, finishedAt)
          emitOverflowTelemetry(false)
          updateMessage(assistantMessageId, (msg) => ({
            ...msg,
            content: fallback,
            status: 'done',
            references: finalResults,
          }))
          setState((prev) => ({ ...prev, isLoading: false }))
          return
        }

        const retryUserPrompt = (() => {
          const retryContext = [
            truncateForPrompt(conversationSummaryContext, 900),
            truncateForPrompt(referenceContext, 500),
            truncateForPrompt(attachmentContext, 2200),
            truncateForPrompt(structuredContext, 1800),
          ]
            .filter(Boolean)
            .join('\n\n')
          return retryContext
            ? `Context:\n${retryContext}\n\nQuestion: ${trimmedQuery}`
            : `Question: ${trimmedQuery}`
        })()

        const runGuardedStreamAttempt = async (
          attemptMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          opts: { bufferTokens: number; useGuard: boolean },
        ): Promise<{ output: string; abortReason: string | null; errorText: string | null }> => {
          return new Promise((resolve) => {
            let settled = false
            let accumulated = ''
            let pending = ''
            let bufferValidated = opts.bufferTokens <= 0
            let cleanup: (() => void) | null = null

            const settle = (result: { output: string; abortReason: string | null; errorText: string | null }) => {
              if (settled) return
              settled = true
              streamCleanupRef.current = null
              resolve(result)
            }

            const abortWithReason = (reason: string) => {
              if (settled) return
              if (cleanup) cleanup()
              settle({ output: accumulated || pending, abortReason: reason, errorText: null })
            }

            streamStartedAt = Date.now()
            cleanup = window.ai.chatStream(
              attemptMessages,
              (chunk: string) => {
                if (settled || activeRequestIdRef.current !== requestId) return
                if (!firstChunkAt && streamStartedAt > 0) {
                  firstChunkAt = Date.now()
                  emitStageTiming('stream_ttfb', streamStartedAt, firstChunkAt)
                }

                if (!bufferValidated) {
                  pending += chunk
                  if (estimateTokensApprox(pending) < opts.bufferTokens) return
                  const prefixCheck = validateBufferedPrefix(pending, guardConfig)
                  if (!prefixCheck.ok) {
                    abortWithReason(`buffer:${prefixCheck.reason}`)
                    return
                  }
                  bufferValidated = true
                  accumulated += pending
                  pending = ''
                } else {
                  accumulated += chunk
                }

                if (opts.useGuard) {
                  const violation = detectGuardViolation(accumulated, guardConfig)
                  if (violation) {
                    abortWithReason(`guard:${violation}`)
                    return
                  }
                }

                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  content: accumulated,
                  status: 'streaming',
                }))
              },
              () => {
                if (settled) return
                if (activeRequestIdRef.current !== requestId) {
                  settle({ output: accumulated, abortReason: 'cancelled', errorText: null })
                  return
                }

                if (!bufferValidated) {
                  const finalPrefix = validateBufferedPrefix(pending, guardConfig)
                  if (!finalPrefix.ok) {
                    abortWithReason(`buffer:${finalPrefix.reason}`)
                    return
                  }
                  bufferValidated = true
                }

                if (pending) {
                  accumulated += pending
                  pending = ''
                }

                if (opts.useGuard) {
                  const violation = detectGuardViolation(accumulated, guardConfig)
                  if (violation) {
                    abortWithReason(`guard:${violation}`)
                    return
                  }
                }

                const finalContract = validateFinalResponse(accumulated, guardConfig)
                if (!finalContract.ok) {
                  settle({
                    output: accumulated,
                    abortReason: `final:${finalContract.reason}`,
                    errorText: null,
                  })
                  return
                }
                settle({ output: accumulated, abortReason: null, errorText: null })
              },
              (error: string) => {
                if (settled) return
                if (activeRequestIdRef.current !== requestId) {
                  settle({ output: accumulated, abortReason: 'cancelled', errorText: null })
                  return
                }
                settle({ output: accumulated, abortReason: null, errorText: error })
              },
            )

            streamCleanupRef.current = cleanup
          })
        }

        const guardTokenBudget = 15
        const isPlanningIntent = plan.intent === 'planning'
        const shouldUseStrictGuard = !isPlanningIntent && plan.intent !== 'general'

        const firstAttempt = await runGuardedStreamAttempt(messages, {
          bufferTokens: shouldUseStrictGuard ? guardTokenBudget : 0,
          useGuard: shouldUseStrictGuard,
        })
        if (activeRequestIdRef.current !== requestId) return

        let attemptResult = firstAttempt
        if (
          firstAttempt.abortReason ||
          (firstAttempt.errorText && isLikelyPromptTooLargeError(firstAttempt.errorText))
        ) {
          if (firstAttempt.errorText && isLikelyPromptTooLargeError(firstAttempt.errorText)) {
            didRetry = true
          }

          updateMessage(assistantMessageId, (msg) => ({ ...msg, content: '', status: 'streaming' }))
          const retrySystem = buildRetrySystemPrompt(guardConfig)
          const retryMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: `${systemPrompt}\n${retrySystem}` },
            ...fewShotExamples,
            { role: 'user', content: retryUserPrompt },
          ]

          attemptResult = await runGuardedStreamAttempt(retryMessages, {
            bufferTokens: shouldUseStrictGuard ? guardTokenBudget : 0,
            useGuard: shouldUseStrictGuard,
          })
          if (activeRequestIdRef.current !== requestId) return
        }

        if (attemptResult.errorText) {
          const failedAt = Date.now()
          if (streamStartedAt > 0) emitStageTiming('stream_complete', streamStartedAt, failedAt)
          emitStageTiming('end_to_end', requestStartedAt, failedAt)
          emitOverflowTelemetry(didRetry)
          updateMessage(assistantMessageId, (msg) => ({ ...msg, status: 'error' }))
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: normalizeAIStreamError(attemptResult.errorText || 'Unknown AI stream error'),
          }))
          streamCleanupRef.current = null
          return
        }

        let finalAnswer = attemptResult.output
        if (!finalAnswer || attemptResult.abortReason) {
          finalAnswer = buildFallbackResponse(guardConfig)
        }
        const finishedAt = Date.now()
        if (streamStartedAt > 0) emitStageTiming('stream_complete', streamStartedAt, finishedAt)
        emitStageTiming('end_to_end', requestStartedAt, finishedAt)
        emitOverflowTelemetry(didRetry)

        if (requestId % 10 === 0) {
          const allowedEntities = buildAllowedEntitySet(
            dueAssignmentsNow,
            finalResults,
            priorityItems,
            alsoDueItems,
          )
          const unsupported = detectUnsupportedClaimHeuristic(finalAnswer, allowedEntities)
          recordTelemetry({
            name: 'unsupported_claim_sample',
            data: { sampled: true, flagged: unsupported.flagged },
            ts: finishedAt,
          })
        }

        updateMessage(assistantMessageId, (msg) => ({
          ...msg,
          content: finalAnswer,
          status: 'done',
          references: finalResults,
        }))
        setState((prev) => ({ ...prev, isLoading: false }))
        streamCleanupRef.current = null
      } catch (e) {
        emitOverflowTelemetry(false)
        emitStageTiming('end_to_end', requestStartedAt, Date.now())
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
      privateModeEnabled,
      buildPromptHistory,
      updateMessage,
      recordTelemetry,
      priorityItems,
      alsoDueItems,
    ],
  )

  const submit = useCallback(async () => {
    await runSubmit(queryRef.current)
  }, [runSubmit])

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
    queryRef.current = query
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
