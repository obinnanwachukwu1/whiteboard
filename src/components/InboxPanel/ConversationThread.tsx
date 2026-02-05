import React, { useState } from 'react'
import { ArrowLeft, Archive, Trash2, Star } from 'lucide-react'
import { useConversation } from '../../hooks/useCanvasQueries'
import {
  useAddMessage,
  useUpdateConversation,
  useDeleteConversation,
} from '../../hooks/useCanvasMutations'
import { Skeleton } from '../Skeleton'
import { ConfirmModal } from '../ui/Modal'
import { MessageList } from './MessageList'
import { ReplyComposer } from './ReplyComposer'
import { getParticipantNames } from './utils'

type Props = {
  conversationId: string | number
  onBack: () => void
}

export const ConversationThread: React.FC<Props> = ({ conversationId, onBack }) => {
  const {
    data: conversation,
    isLoading,
    isFetching,
    error,
  } = useConversation(conversationId, {
    refetchInterval: 1000 * 60,
  })
  const addMessageMutation = useAddMessage()
  const updateMutation = useUpdateConversation()
  const deleteMutation = useDeleteConversation()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const handleToggleStar = () => {
    if (!conversation) return
    updateMutation.mutate({
      conversationId,
      params: { starred: !conversation.starred },
    })
  }

  const handleArchive = () => {
    updateMutation.mutate({
      conversationId,
      params: { workflowState: 'archived' },
    })
    onBack()
  }

  const handleDelete = () => {
    setConfirmDeleteOpen(true)
  }

  if (error && !conversation) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-sm truncate flex-1">Conversation</h3>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-sm text-red-500 mb-4">Failed to load conversation</p>
          <button
            onClick={onBack}
            className="text-sm hover:underline"
            style={{ color: 'var(--accent-600)' }}
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const messages = conversation?.messages || []
  const participantsMap = new Map((conversation?.participants || []).map((p) => [String(p.id), p]))

  return (
    <div className="flex-1 flex flex-col">
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate(conversationId)
          onBack()
        }}
        title="Delete conversation?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-sm truncate flex-1">
            {conversation?.subject || (isLoading ? 'Loading…' : '(no subject)')}
          </h3>
          {isFetching && <Skeleton width="w-4" height="h-4" variant="circular" />}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">
            {conversation ? getParticipantNames(conversation) : ''}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleStar}
              disabled={!conversation}
              className={`p-1.5 rounded-md transition-colors ${
                conversation?.starred
                  ? 'text-[color:var(--accent-700)]'
                  : 'text-[color:var(--accent-600)]'
              } hover:bg-[color:var(--accent-100)] dark:hover:bg-[color:var(--accent-50)] ${!conversation ? 'opacity-50' : ''}`}
              title={conversation?.starred ? 'Unstar' : 'Star'}
            >
              <Star
                className={`w-4 h-4 ${
                  conversation?.starred ? 'fill-[color:var(--accent-600)]' : ''
                }`}
              />
            </button>
            <button
              onClick={handleArchive}
              disabled={!conversation}
              className={`p-1.5 rounded-md text-[color:var(--accent-600)] hover:bg-[color:var(--accent-100)] dark:hover:bg-[color:var(--accent-50)] hover:text-[color:var(--accent-700)] transition-colors ${!conversation ? 'opacity-50' : ''}`}
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={!conversation}
              className={`p-1.5 rounded-md text-[color:var(--accent-600)] hover:bg-[color:var(--accent-100)] dark:hover:bg-[color:var(--accent-50)] hover:text-[color:var(--accent-700)] transition-colors ${!conversation ? 'opacity-50' : ''}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <MessageList
        key={String(conversationId)}
        messages={messages}
        participantsMap={participantsMap}
        isLoading={isLoading}
        hasConversation={!!conversation}
      />

      <ReplyComposer
        conversationId={conversationId}
        disabled={!conversation || isLoading}
        addMessageMutation={addMessageMutation}
      />
    </div>
  )
}
