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
import { useAI, type AIMessage } from '../hooks/useAI'
import { usePriorityAssignments } from '../hooks/usePriorityAssignments'
import { useAppFlags } from './AppContext'
import {
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
  const { streamChat } = useAI()
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

        let historyMessagesForPrompt = buildPromptHistory(messagesRef.current)
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
      privateModeEnabled,
      streamChat,
      buildPromptHistory,
      updateMessage,
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
