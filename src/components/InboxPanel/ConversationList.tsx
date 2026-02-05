import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Mail, Star } from 'lucide-react'
import { useConversationWorkflowOverrides, useConversations } from '../../hooks/useCanvasQueries'
import type { Conversation, ConversationScope } from '../../types/canvas'
import { usePrefetchOnHover } from '../../hooks/usePrefetchOnHover'
import { useAppFlags } from '../../context/AppContext'
import { SkeletonList } from '../Skeleton'
import { formatRelativeTime, getParticipantNames } from './utils'

type ConversationRowProps = {
  conv: Conversation
  workflowState: Conversation['workflow_state']
  selectedId?: string | number
  onSelect: (id: string | number) => void
}

const ConversationRow: React.FC<ConversationRowProps> = ({
  conv,
  workflowState,
  selectedId,
  onSelect,
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
      }}
      {...hoverHandlers}
      className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors ${
        String(selectedId) === String(conv.id) ? 'bg-slate-100 dark:bg-neutral-800' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {workflowState === 'unread' ? (
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
                workflowState === 'unread'
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
              workflowState === 'unread'
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
  const listRef = useRef<HTMLDivElement | null>(null)
  const listScope: ConversationScope = scope === 'sent' ? 'sent' : 'inbox'
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useConversations(listScope)
  const { data: workflowOverrides = {} } = useConversationWorkflowOverrides()
  const baseConversations = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages],
  )
  const withWorkflowOverrides = useMemo(
    () =>
      baseConversations.map((conv) => ({
        conv,
        workflowState: workflowOverrides[String(conv.id)] ?? conv.workflow_state,
      })),
    [baseConversations, workflowOverrides],
  )
  const conversations = useMemo(() => {
    switch (scope) {
      case 'unread':
        return withWorkflowOverrides.filter((item) => item.workflowState === 'unread')
      case 'starred':
        return withWorkflowOverrides.filter((item) => item.conv.starred)
      case 'archived':
        return withWorkflowOverrides.filter((item) => item.workflowState === 'archived')
      case 'sent':
        return withWorkflowOverrides
      case 'all':
      default:
        return withWorkflowOverrides
    }
  }, [scope, withWorkflowOverrides])

  const handleScroll = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200) {
      fetchNextPage().catch(() => {})
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const handleListRef = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (!node) return
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  useEffect(() => {
    if (scope !== 'all' && scope !== 'sent') return
    const node = listRef.current
    if (!node) return
    if (!hasNextPage || isFetchingNextPage) return
    const fits = node.scrollHeight <= node.clientHeight + 24
    if (fits) fetchNextPage().catch(() => {})
  }, [baseConversations.length, fetchNextPage, hasNextPage, isFetchingNextPage, scope])

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
        {hasNextPage ? (
          <button
            onClick={() => fetchNextPage().catch(() => {})}
            className="mt-4 text-sm text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
          >
            Load more
          </button>
        ) : (
          <button
            onClick={onCompose}
            className="mt-4 px-4 py-2 text-sm rounded-md text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--accent-600)' }}
          >
            Compose message
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={handleListRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
      {conversations.map(({ conv, workflowState }) => (
        <ConversationRow
          key={String(conv.id)}
          conv={conv}
          workflowState={workflowState}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
      {hasNextPage && !isFetchingNextPage && (
        <div className="px-4 py-3">
          <button
            onClick={() => fetchNextPage().catch(() => {})}
            className="text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
      {(isFetchingNextPage || isFetching) && (
        <div className="px-4 py-3 text-xs text-slate-400 dark:text-neutral-500">
          Loading more…
        </div>
      )}
    </div>
  )
}
