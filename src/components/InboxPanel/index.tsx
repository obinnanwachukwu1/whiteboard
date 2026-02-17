import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { ConversationScope } from '../../types/canvas'
import { fetchConversationsPage } from '../../hooks/useCanvasQueries'
import { SlideInPanel } from '../SlideInPanel'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'
import { ComposeMessage } from './ComposeMessage'
import { useAppData, useAppFlags } from '../../context/AppContext'
import { openExternal } from '../../utils/openExternal'

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
  const { baseUrl } = useAppData()
  const { canvasWriteEnabled } = useAppFlags()
  const [scope, setScope] = useState<ConversationScope | 'all'>('all')
  const [selectedConversation, setSelectedConversation] = useState<string | number | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const openInCanvasUrl = useMemo(() => {
    const base = String(baseUrl || '').replace(/\/+$/, '')
    return base ? `${base}/conversations` : null
  }, [baseUrl])

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

  const openInboxInCanvas = async (conversationId?: string | number | null) => {
    if (conversationId != null) {
      const base = String(baseUrl || '').replace(/\/+$/, '')
      await openExternal(base ? `${base}/conversations/${conversationId}` : null)
      return
    }
    await openExternal(openInCanvasUrl)
  }

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

  return (
    <SlideInPanel
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="inbox-title"
      panelRef={panelRef}
      closeOnEscape={false}
    >
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-neutral-700/50 app-drag">
        <h2 id="inbox-title" className="font-semibold text-sm text-gray-900 dark:text-gray-100 app-no-drag">
          Inbox
        </h2>
        <div className="flex items-center gap-1.5 app-no-drag">
          {!selectedConversation && !isComposing && (
            <>
              {canvasWriteEnabled ? (
                <button
                  onClick={() => setIsComposing(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Compose
                </button>
              ) : (
                <button
                  onClick={() => {
                    void openInboxInCanvas()
                  }}
                  className="inline-flex items-center h-7 px-2.5 text-xs rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  Open in Canvas
                </button>
              )}
            </>
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
          readOnly={!canvasWriteEnabled}
          onOpenInCanvas={openInboxInCanvas}
        />
      ) : selectedConversation ? (
        <ConversationThread
          conversationId={selectedConversation}
          onBack={() => setSelectedConversation(null)}
          readOnly={!canvasWriteEnabled}
          onOpenInCanvas={() => openInboxInCanvas(selectedConversation)}
        />
      ) : (
        <>
          {!canvasWriteEnabled && (
            <div className="px-4 py-2 border-b border-gray-200/50 dark:border-neutral-700/50 bg-amber-50/70 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
              <span>Inbox is read-only in Whiteboard for this school.</span>
              <button
                onClick={() => {
                  void openInboxInCanvas()
                }}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                Open in Canvas
              </button>
            </div>
          )}
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
            onCompose={() => {
              if (!canvasWriteEnabled) {
                void openInboxInCanvas()
                return
              }
              setIsComposing(true)
            }}
          />
        </>
      )}
    </SlideInPanel>
  )
}
