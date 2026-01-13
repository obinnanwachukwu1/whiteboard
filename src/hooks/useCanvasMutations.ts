import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Conversation } from '../types/canvas'

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
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
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
    onSuccess: (_data, variables) => {
      // Invalidate the specific conversation and list
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Also update unread count if we changed read state
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
      queryClient.removeQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })
}
