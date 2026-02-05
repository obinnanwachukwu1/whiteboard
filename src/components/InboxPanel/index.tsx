import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { ConversationScope } from '../../types/canvas'
import { fetchConversationsPage } from '../../hooks/useCanvasQueries'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'
import { ComposeMessage } from './ComposeMessage'

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

export const InboxPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<ConversationScope | 'all'>('all')
  const [selectedConversation, setSelectedConversation] = useState<string | number | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(isOpen)
  const [entering, setEntering] = useState(false)
  const [closing, setClosing] = useState(false)

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

  useEffect(() => {
    if (!isOpen) {
      setSelectedConversation(null)
      setIsComposing(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const prefetch = (scopeValue: ConversationScope) =>
      queryClient.prefetchInfiniteQuery({
        queryKey: ['conversations', scopeValue, 20, 'v2'],
        queryFn: ({ pageParam }) =>
          fetchConversationsPage({
            scope: scopeValue,
            perPage: 20,
            pageUrl: typeof pageParam === 'string' ? pageParam : undefined,
          }),
        initialPageParam: undefined,
      })
    prefetch('inbox')
    prefetch('sent')
  }, [isOpen, queryClient])

  useEffect(() => {
    if (rendered) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [rendered])

  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => {
      panelRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(t)
  }, [isOpen])

  if (!rendered) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
      <div
        className={
          `absolute inset-0 bg-black/20 dark:bg-black/40 transition-opacity ` +
          (closing ? 'animate-fade-out pointer-events-none' : entering ? 'animate-fade-in' : '')
        }
        onClick={onClose}
        aria-hidden
      />

      <div className="relative h-full w-full flex items-stretch justify-end p-4 pointer-events-none">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={
            `pointer-events-auto w-full max-w-[420px] h-full bg-white dark:bg-neutral-900 rounded-2xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden flex flex-col ` +
            (closing
              ? 'animate-slide-out-right'
              : entering
                ? 'animate-slide-in-right'
                : '')
          }
        >
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-neutral-700/50 app-drag">
            <h2 id="inbox-title" className="font-semibold text-sm text-gray-900 dark:text-gray-100 app-no-drag">
              Inbox
            </h2>
            <div className="flex items-center gap-1.5 app-no-drag">
              {!selectedConversation && !isComposing && (
                <button
                  onClick={() => setIsComposing(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Compose
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                title="Close (Esc)"
                aria-label="Close inbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

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
              <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200/50 dark:border-neutral-700/50 overflow-x-auto">
                <div className="flex gap-1">
                  {SCOPES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setScope(s.value)}
                      className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                        scope === s.value
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                      }`}
                      style={scope === s.value ? { backgroundColor: 'var(--accent-600)' } : undefined}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <ConversationList
                scope={scope}
                selectedId={selectedConversation ?? undefined}
                onSelect={setSelectedConversation}
                onCompose={() => setIsComposing(true)}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
