import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Conversation, DiscussionEntry } from '../types/canvas'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
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
        if (!Array.isArray(list)) continue
        queryClient.setQueryData<Conversation[]>(key, list.map((c) => (String(c.id) === convId ? patch(c) : c)))
      }

      if (variables.params.workflowState) {
        // Keep badge responsive even before server roundtrip.
        queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      }

      return { prevConversation, prevLists }
    },
    onError: (_err, variables, ctx) => {
      const convId = String(variables.conversationId)
      if (ctx?.prevConversation) {
        queryClient.setQueryData(['conversation', convId], ctx.prevConversation)
      }
      if (ctx?.prevLists) {
        for (const [key, data] of ctx.prevLists) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: (_data, _err, variables) => {
      const convId = String(variables.conversationId)
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (variables.params.workflowState) {
        queryClient.invalidateQueries({ queryKey: ['unread-count'] })
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
