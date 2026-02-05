import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { Conversation, DiscussionEntry } from '../types/canvas'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
}

type ConversationsPage = {
  items: Conversation[]
  nextPageUrl?: string | null
}

type ConversationWorkflowOverride = Record<string, Conversation['workflow_state']>
type UnreadCountLocalDeltaMap = Record<string, number>

function isWorkflowFallbackError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '')
  return (
    /HTTP 401|HTTP 403|HTTP 405|read.?only|method not allowed|forbidden|not authorized/i.test(msg)
  )
}

// Create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: {
      recipients: string[]
      subject?: string
      body: string
      groupConversation?: boolean
      contextCode?: string
    }) => {
      const res = await window.canvas.createConversation(params)
      return ensureOk(res) as Conversation[]
    },
    onSuccess: () => {
      // Invalidate conversations to show new message
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// Reply to an existing conversation
export function useAddMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
      includedMessages,
    }: {
      conversationId: string | number
      body: string
      includedMessages?: string[]
    }) => {
      const res = await window.canvas.addMessage(conversationId, body, includedMessages)
      return ensureOk(res) as Conversation
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific conversation and list
      queryClient.invalidateQueries({ queryKey: ['conversation', String(variables.conversationId)] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })
}

// Update conversation (mark read/unread, star, archive)
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      conversationId,
      params,
    }: {
      conversationId: string | number
      params: {
        workflowState?: 'read' | 'unread' | 'archived'
        starred?: boolean
        subscribed?: boolean
      }
    }) => {
      const res = await window.canvas.updateConversation(conversationId, params)
      return ensureOk(res) as Conversation
    },
    onMutate: async (variables) => {
      const convId = String(variables.conversationId)

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['conversation', convId] }),
        queryClient.cancelQueries({ queryKey: ['conversations'] }),
      ])

      const prevConversation = queryClient.getQueryData<Conversation>(['conversation', convId])
      const prevLists = queryClient.getQueriesData<Conversation[]>({ queryKey: ['conversations'] })
      const prevUnreadCount = queryClient.getQueryData<number>(['unread-count'])
      const prevWorkflowOverrides = queryClient.getQueryData<ConversationWorkflowOverride>([
        'conversation-workflow-overrides',
      ])
      const prevUnreadDeltaMap = queryClient.getQueryData<UnreadCountLocalDeltaMap>([
        'unread-count-local-delta-map',
      ])

      const prevWorkflowState =
        prevConversation?.workflow_state ??
        (() => {
          for (const [, list] of prevLists) {
            if (Array.isArray(list)) {
              const found = list.find((c) => String(c.id) === convId)
              if (found) return found.workflow_state
              continue
            }
            if (list && typeof list === 'object' && Array.isArray((list as any).pages)) {
              const data = list as InfiniteData<ConversationsPage>
              for (const page of data.pages) {
                const found = page.items.find((c) => String(c.id) === convId)
                if (found) return found.workflow_state
              }
            }
          }
          return undefined
        })()

      const patch = (c: Conversation): Conversation => {
        const next: Conversation = { ...c }
        if (variables.params.workflowState) next.workflow_state = variables.params.workflowState
        if (typeof variables.params.starred === 'boolean') next.starred = variables.params.starred
        if (typeof variables.params.subscribed === 'boolean') next.subscribed = variables.params.subscribed
        return next
      }

      if (prevConversation) {
        queryClient.setQueryData<Conversation>(['conversation', convId], patch(prevConversation))
      }

      for (const [key, list] of prevLists) {
        if (Array.isArray(list)) {
          queryClient.setQueryData<Conversation[]>(
            key,
            list.map((c) => (String(c.id) === convId ? patch(c) : c)),
          )
          continue
        }
        if (list && typeof list === 'object' && Array.isArray((list as any).pages)) {
          const data = list as InfiniteData<ConversationsPage>
          const nextPages = data.pages.map((page) => ({
            ...page,
            items: page.items.map((c) => (String(c.id) === convId ? patch(c) : c)),
          }))
          queryClient.setQueryData(key, { ...data, pages: nextPages })
        }
      }

      if (typeof prevUnreadCount === 'number' && variables.params.workflowState) {
        let delta = 0
        if (
          prevWorkflowState === 'unread' &&
          (variables.params.workflowState === 'read' || variables.params.workflowState === 'archived')
        ) {
          delta = -1
        } else if (
          prevWorkflowState !== 'unread' &&
          variables.params.workflowState === 'unread'
        ) {
          delta = 1
        }
        if (delta !== 0) {
          queryClient.setQueryData<number>(['unread-count'], Math.max(0, prevUnreadCount + delta))
        }
      }

      return {
        prevConversation,
        prevLists,
        prevUnreadCount,
        prevWorkflowOverrides,
        prevUnreadDeltaMap,
        prevWorkflowState,
      }
    },
    onError: (err, variables, ctx) => {
      const convId = String(variables.conversationId)
      const workflowTarget = variables.params.workflowState
      const useFallback = Boolean(workflowTarget) && isWorkflowFallbackError(err)

      if (!useFallback) {
        if (ctx?.prevConversation) {
          queryClient.setQueryData(['conversation', convId], ctx.prevConversation)
        }
        if (ctx?.prevLists) {
          for (const [key, data] of ctx.prevLists) {
            queryClient.setQueryData(key, data)
          }
        }
        if (typeof ctx?.prevUnreadCount === 'number') {
          queryClient.setQueryData(['unread-count'], ctx.prevUnreadCount)
        }
        return
      }

      const nextOverrides: ConversationWorkflowOverride = {
        ...(ctx?.prevWorkflowOverrides || {}),
        [convId]: workflowTarget!,
      }
      queryClient.setQueryData<ConversationWorkflowOverride>(
        ['conversation-workflow-overrides'],
        nextOverrides,
      )

      const prevState = ctx?.prevWorkflowState
      let delta = 0
      if (prevState === 'unread' && (workflowTarget === 'read' || workflowTarget === 'archived')) {
        delta = -1
      } else if (prevState !== 'unread' && workflowTarget === 'unread') {
        delta = 1
      }
      if (delta !== 0) {
        const nextDeltaMap: UnreadCountLocalDeltaMap = { ...(ctx?.prevUnreadDeltaMap || {}) }
        nextDeltaMap[convId] = delta
        queryClient.setQueryData<UnreadCountLocalDeltaMap>(
          ['unread-count-local-delta-map'],
          nextDeltaMap,
        )
      }
    },
    onSettled: (_data, err, variables) => {
      const convId = String(variables.conversationId)
      const workflowTarget = variables.params.workflowState
      const useFallback = Boolean(workflowTarget) && Boolean(err) && isWorkflowFallbackError(err)

      if (!useFallback) {
        queryClient.invalidateQueries({ queryKey: ['conversation', convId] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
        if (variables.params.workflowState) {
          queryClient.invalidateQueries({ queryKey: ['unread-count'] })
        }
      }

      if (!err && workflowTarget) {
        const overrides = queryClient.getQueryData<ConversationWorkflowOverride>([
          'conversation-workflow-overrides',
        ])
        if (overrides && overrides[convId]) {
          const next = { ...overrides }
          delete next[convId]
          queryClient.setQueryData<ConversationWorkflowOverride>(
            ['conversation-workflow-overrides'],
            next,
          )
        }
        const deltaMap = queryClient.getQueryData<UnreadCountLocalDeltaMap>([
          'unread-count-local-delta-map',
        ])
        if (deltaMap && deltaMap[convId] !== undefined) {
          const next = { ...deltaMap }
          delete next[convId]
          queryClient.setQueryData<UnreadCountLocalDeltaMap>(['unread-count-local-delta-map'], next)
        }
      }
    },
  })
}

// Delete a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (conversationId: string | number) => {
      const res = await window.canvas.deleteConversation(conversationId)
      return ensureOk(res) as Conversation
    },
    onSuccess: (_data, conversationId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: ['conversation', String(conversationId)] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })
}

// Post a top-level reply to a discussion
export function usePostDiscussionEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      courseId,
      topicId,
      message,
    }: {
      courseId: string | number
      topicId: string | number
      message: string
    }) => {
      const res = await window.canvas.postDiscussionEntry(courseId, topicId, message)
      return ensureOk(res) as DiscussionEntry
    },
    onSuccess: (_data, variables) => {
      // Invalidate the discussion view to show new reply
      queryClient.invalidateQueries({ queryKey: ['discussion-view', String(variables.courseId), String(variables.topicId)] })
      queryClient.invalidateQueries({ queryKey: ['discussion', String(variables.courseId), String(variables.topicId)] })
      queryClient.invalidateQueries({ queryKey: ['course-discussions', String(variables.courseId)] })
    },
  })
}

// Reply to a specific entry in a discussion (threaded reply)
export function usePostDiscussionReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      courseId,
      topicId,
      entryId,
      message,
    }: {
      courseId: string | number
      topicId: string | number
      entryId: string | number
      message: string
    }) => {
      const res = await window.canvas.postDiscussionReply(courseId, topicId, entryId, message)
      return ensureOk(res) as DiscussionEntry
    },
    onSuccess: (_data, variables) => {
      // Invalidate the discussion view to show new reply
      queryClient.invalidateQueries({ queryKey: ['discussion-view', String(variables.courseId), String(variables.topicId)] })
      queryClient.invalidateQueries({ queryKey: ['discussion', String(variables.courseId), String(variables.topicId)] })
    },
  })
}

// Mark discussion entries as read
export function useMarkDiscussionEntriesRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      courseId,
      topicId,
      entryIds,
    }: {
      courseId: string | number
      topicId: string | number
      entryIds: (string | number)[]
    }) => {
      const res = await window.canvas.markDiscussionEntriesRead(courseId, topicId, entryIds)
      return ensureOk(res)
    },
    onSuccess: (_data, variables) => {
      // Invalidate the discussion view to update read state
      queryClient.invalidateQueries({ queryKey: ['discussion-view', String(variables.courseId), String(variables.topicId)] })
    },
  })
}

// Submissions
export function useSubmitAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      courseId: string | number
      assignmentRestId: string | number
      submissionType: 'online_text_entry' | 'online_url'
      body?: string
      url?: string
    }) => {
      const res = await window.canvas.submitAssignment(params.courseId, params.assignmentRestId, {
        submissionType: params.submissionType,
        body: params.body,
        url: params.url,
      })
      return ensureOk(res)
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-submission', vars.courseId, vars.assignmentRestId] })
      queryClient.invalidateQueries({ queryKey: ['assignment-rest', vars.courseId, vars.assignmentRestId] })
      queryClient.invalidateQueries({ queryKey: ['course-gradebook', String(vars.courseId)] })
      queryClient.invalidateQueries({ queryKey: ['due-assignments'] })
    },
  })
}

export function useSubmitAssignmentUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      courseId: string | number
      assignmentRestId: string | number
      filePaths: string[]
    }) => {
      const res = await window.canvas.submitAssignmentUpload(params.courseId, params.assignmentRestId, params.filePaths)
      return ensureOk(res)
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-submission', vars.courseId, vars.assignmentRestId] })
      queryClient.invalidateQueries({ queryKey: ['assignment-rest', vars.courseId, vars.assignmentRestId] })
      queryClient.invalidateQueries({ queryKey: ['course-gradebook', String(vars.courseId)] })
      queryClient.invalidateQueries({ queryKey: ['due-assignments'] })
    },
  })
}
