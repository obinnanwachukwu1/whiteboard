import React from 'react'
import { Mail, Star } from 'lucide-react'
import { useConversations } from '../../hooks/useCanvasQueries'
import { useUpdateConversation } from '../../hooks/useCanvasMutations'
import type { Conversation, ConversationScope } from '../../types/canvas'
import { usePrefetchOnHover } from '../../hooks/usePrefetchOnHover'
import { useAppFlags } from '../../context/AppContext'
import { SkeletonList } from '../Skeleton'
import { formatRelativeTime, getParticipantNames } from './utils'

type ConversationRowProps = {
  conv: Conversation
  selectedId?: string | number
  onSelect: (id: string | number) => void
  updateMutation: ReturnType<typeof useUpdateConversation>
}

const ConversationRow: React.FC<ConversationRowProps> = ({
  conv,
  selectedId,
  onSelect,
  updateMutation,
}) => {
  const { prefetchEnabled, privateModeEnabled } = useAppFlags()
  const hoverHandlers = usePrefetchOnHover({
    queryKey: ['conversation', String(conv.id)],
    queryFn: async () => {
      const res = await window.canvas.getConversation?.(String(conv.id))
      if (!res?.ok) throw new Error(res?.error || 'Failed to load conversation')
      return res.data
    },
    enabled: prefetchEnabled && !privateModeEnabled,
    staleTime: 1000 * 60 * 2,
  })

  return (
    <button
      key={conv.id}
      onClick={() => {
        onSelect(conv.id)
        if (conv.workflow_state === 'unread') {
          updateMutation.mutate({ conversationId: conv.id, params: { workflowState: 'read' } })
        }
      }}
      {...hoverHandlers}
      className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors ${
        String(selectedId) === String(conv.id) ? 'bg-slate-100 dark:bg-neutral-800' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {conv.workflow_state === 'unread' ? (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--accent-500)' }}
            />
          ) : (
            <div className="w-2 h-2" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm truncate ${
                conv.workflow_state === 'unread'
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {getParticipantNames(conv)}
            </span>
            <span className="flex-shrink-0 text-xs text-slate-400 dark:text-neutral-500">
              {formatRelativeTime(conv.last_message_at)}
            </span>
          </div>
          <div
            className={`text-sm truncate ${
              conv.workflow_state === 'unread'
                ? 'font-medium text-slate-700 dark:text-slate-300'
                : 'text-slate-500 dark:text-neutral-400'
            }`}
          >
            {conv.subject || '(no subject)'}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 truncate mt-0.5">
            {conv.last_message}
          </div>
        </div>
        {conv.starred && <Star className="flex-shrink-0 w-4 h-4 text-yellow-500 fill-yellow-500" />}
      </div>
    </button>
  )
}

type Props = {
  scope: ConversationScope | 'all'
  selectedId?: string | number
  onSelect: (id: string | number) => void
  onCompose: () => void
}

export const ConversationList: React.FC<Props> = ({ scope, selectedId, onSelect, onCompose }) => {
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useConversations(scope === 'all' ? undefined : (scope as ConversationScope))
  const updateMutation = useUpdateConversation()

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <SkeletonList count={8} variant="row" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-red-500">
        Failed to load messages
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Mail className="w-12 h-12 text-slate-300 dark:text-neutral-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-neutral-400">No messages</p>
        <button
          onClick={onCompose}
          className="mt-4 px-4 py-2 text-sm rounded-md text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--accent-600)' }}
        >
          Compose message
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <ConversationRow
          key={String(conv.id)}
          conv={conv}
          selectedId={selectedId}
          onSelect={onSelect}
          updateMutation={updateMutation}
        />
      ))}
    </div>
  )
}
