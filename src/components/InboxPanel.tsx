import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Send, Star, Archive, Trash2, Mail, ArrowLeft } from 'lucide-react'
import { useConversations, useConversation, useRecipientSearch } from '../hooks/useCanvasQueries'
import { useCreateConversation, useAddMessage, useUpdateConversation, useDeleteConversation } from '../hooks/useCanvasMutations'
import type { Conversation, ConversationScope, Recipient } from '../types/canvas'
import { HtmlContent } from './HtmlContent'
import { usePrefetchOnHover } from '../hooks/usePrefetchOnHover'
import { Skeleton, SkeletonList, SkeletonText } from './Skeleton'

type Props = {
  isOpen: boolean
  onClose: () => void
}

const SCOPES: { value: ConversationScope | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'starred', label: 'Starred' },
  { value: 'sent', label: 'Sent' },
  { value: 'archived', label: 'Archived' },
]

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getParticipantNames(conversation: Conversation, excludeSelf?: string | number): string {
  const participants = conversation.participants || []
  const others = excludeSelf 
    ? participants.filter(p => String(p.id) !== String(excludeSelf))
    : participants
  if (others.length === 0) return participants[0]?.name || 'Unknown'
  if (others.length === 1) return others[0].name || 'Unknown'
  if (others.length === 2) return `${others[0].name}, ${others[1].name}`
  return `${others[0].name} +${others.length - 1}`
}

// Conversation List Component
const ConversationRow: React.FC<{
  conv: Conversation
  selectedId?: string | number
  onSelect: (id: string | number) => void
  updateMutation: ReturnType<typeof useUpdateConversation>
}> = ({ conv, selectedId, onSelect, updateMutation }) => {
  const hoverHandlers = usePrefetchOnHover({
    queryKey: ['conversation', String(conv.id)],
    queryFn: async () => {
      const res = await window.canvas.getConversation?.(String(conv.id))
      if (!res?.ok) throw new Error(res?.error || 'Failed to load conversation')
      return res.data
    },
    staleTime: 1000 * 60 * 2,
  })

  return (
    <button
      key={conv.id}
      onClick={() => {
        onSelect(conv.id)
        // Mark as read when opening
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
            <div className="w-2 h-2 rounded-full bg-blue-500" />
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
        {conv.starred && (
          <Star className="flex-shrink-0 w-4 h-4 text-yellow-500 fill-yellow-500" />
        )}
      </div>
    </button>
  )
}

const ConversationList: React.FC<{
  scope: ConversationScope | 'all'
  selectedId?: string | number
  onSelect: (id: string | number) => void
  onCompose: () => void
}> = ({ scope, selectedId, onSelect, onCompose }) => {
  const { data: conversations = [], isLoading, error } = useConversations(
    scope === 'all' ? undefined : scope as ConversationScope
  )
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
          className="mt-4 px-4 py-2 text-sm rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
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

// Conversation Thread Component
const ConversationThread: React.FC<{
  conversationId: string | number
  onBack: () => void
}> = ({ conversationId, onBack }) => {
  const { data: conversation, isLoading, isFetching, error } = useConversation(conversationId, {
    // While the thread is open, keep it reasonably fresh.
    refetchInterval: 1000 * 60,
  })
  const addMessageMutation = useAddMessage()
  const updateMutation = useUpdateConversation()
  const deleteMutation = useDeleteConversation()
  const [replyText, setReplyText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  const handleSendReply = async () => {
    if (!conversation || isLoading) return
    if (!replyText.trim()) return
    await addMessageMutation.mutateAsync({
      conversationId,
      body: replyText.trim(),
    })
    setReplyText('')
  }

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
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    deleteMutation.mutate(conversationId)
    onBack()
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
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const messages = conversation?.messages || []
  const participantsMap = new Map(
    (conversation?.participants || []).map(p => [String(p.id), p])
  )

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread Header */}
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
            {isFetching && (
              <Skeleton width="w-4" height="h-4" variant="circular" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">
              {conversation ? getParticipantNames(conversation) : ''}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleStar}
                disabled={!conversation}
                className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors ${conversation?.starred ? 'text-yellow-500' : 'text-slate-400'} ${!conversation ? 'opacity-50' : ''}`}
                title={conversation?.starred ? 'Unstar' : 'Star'}
              >
                <Star className={`w-4 h-4 ${conversation?.starred ? 'fill-yellow-500' : ''}`} />
              </button>
              <button
                onClick={handleArchive}
                disabled={!conversation}
                className={`p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${!conversation ? 'opacity-50' : ''}`}
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={!conversation}
                className={`p-1.5 rounded-md text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors ${!conversation ? 'opacity-50' : ''}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && !conversation && (
          <div className="py-2">
            <SkeletonList count={5} hasAvatar />
          </div>
        )}
        {messages.map((msg) => {
          const author = participantsMap.get(String(msg.author_id))
          return (
            <div key={msg.id} className="flex gap-3">
              <div className="flex-shrink-0">
                {author?.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={author.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium">
                    {(author?.name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-slate-900 dark:text-white">
                    {author?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-neutral-500">
                    {new Date(msg.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <HtmlContent
                  html={msg.body || ''}
                  className="mt-1 text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none"
                />
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {att.display_name || att.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            disabled={!conversation || isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSendReply()
              }
            }}
          />
          <button
            onClick={handleSendReply}
            disabled={!conversation || isLoading || !replyText.trim() || addMessageMutation.isPending}
            className="px-4 py-2 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
            title="Send (Cmd+Enter)"
          >
            {addMessageMutation.isPending ? 'Sending…' : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// Compose Message Component
const ComposeMessage: React.FC<{
  onBack: () => void
  onSent: () => void
}> = ({ onBack, onSent }) => {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createMutation = useCreateConversation()
  const { data: searchResults = [], isLoading: searchLoading } = useRecipientSearch(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (recipients.length === 0 || !body.trim()) return
    setError(null)
    try {
      await createMutation.mutateAsync({
        recipients: recipients.map(r => r.id),
        subject: subject.trim() || undefined,
        body: body.trim(),
        groupConversation: recipients.length > 1,
      })
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      console.error('Failed to send message:', err)
    }
  }

  const addRecipient = (recipient: Recipient) => {
    if (!recipients.find(r => r.id === recipient.id)) {
      setRecipients([...recipients, recipient])
    }
    setSearchQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Compose Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-sm">New Message</h3>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Recipients */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
            To
          </label>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 min-h-[38px]">
              {recipients.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-slate-200"
                >
                  {r.name}
                  <button
                    onClick={() => removeRecipient(r.id)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={recipients.length === 0 ? 'Search for people...' : ''}
                className="flex-1 min-w-[120px] px-1 py-0.5 text-sm bg-transparent focus:outline-none"
              />
            </div>
            {/* Search Dropdown */}
            {showDropdown && searchQuery.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
                {searchLoading ? (
                  <div className="p-3">
                    <SkeletonText lines={3} lastLineWidth="w-1/2" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500">
                    No results found
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => addRecipient(result)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {result.avatar_url ? (
                        <img
                          src={result.avatar_url}
                          alt={result.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-neutral-600 flex items-center justify-center text-xs">
                          {result.name[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {result.name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Body */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Send Button */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        {error && (
          <div className="mb-3 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={recipients.length === 0 || !body.trim() || createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createMutation.isPending ? 'Sending…' : (<><Send className="w-4 h-4" />Send</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main InboxPanel Component
export const InboxPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const isWin = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)
  const [scope, setScope] = useState<ConversationScope | 'all'>('all')
  const [selectedConversation, setSelectedConversation] = useState<string | number | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(isOpen)
  const [entering, setEntering] = useState(false)
  const [closing, setClosing] = useState(false)

  // Mount/unmount with slide animations.
  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      setClosing(false)
      setEntering(true)
      const t = setTimeout(() => setEntering(false), 260)
      return () => clearTimeout(t)
    }

    if (rendered) {
      setClosing(true)
      const t = setTimeout(() => {
        setRendered(false)
        setClosing(false)
        setEntering(false)
      }, 260)
      return () => clearTimeout(t)
    }
  }, [isOpen, rendered])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedConversation || isComposing) {
          setSelectedConversation(null)
          setIsComposing(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedConversation, isComposing, onClose])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSelectedConversation(null)
      setIsComposing(false)
    }
  }, [isOpen])

  if (!rendered) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={
          `fixed inset-0 bg-black/20 dark:bg-black/40 z-[200] transition-opacity ` +
          (closing ? 'animate-fade-out pointer-events-none' : entering ? 'animate-fade-in' : '')
        }
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={
          `fixed top-0 bottom-0 w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl z-[201] flex flex-col ` +
          (isWin ? 'left-0 ' : 'right-0 ') +
          (closing
            ? (isWin ? 'animate-slide-out-left' : 'animate-slide-out-right')
            : entering
              ? (isWin ? 'animate-slide-in-left' : 'animate-slide-in-right')
              : '')
        }
      >
        {/* Header */}
        <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-neutral-700 app-drag">
          <h2 className="font-semibold text-lg app-no-drag">Inbox</h2>
          <div className="flex items-center gap-2 app-no-drag">
            {!selectedConversation && !isComposing && (
              <button
                onClick={() => setIsComposing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Compose
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isComposing ? (
          <ComposeMessage
            onBack={() => setIsComposing(false)}
            onSent={() => {
              setIsComposing(false)
              setScope('sent')
            }}
          />
        ) : selectedConversation ? (
          <ConversationThread
            conversationId={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <>
            {/* Scope Tabs */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 dark:border-neutral-700 overflow-x-auto">
              <div className="flex gap-1">
                {SCOPES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScope(s.value)}
                    className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                      scope === s.value
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <ConversationList
              scope={scope}
              selectedId={selectedConversation ?? undefined}
              onSelect={setSelectedConversation}
              onCompose={() => setIsComposing(true)}
            />
          </>
        )}
      </div>
    </>
  )
}
