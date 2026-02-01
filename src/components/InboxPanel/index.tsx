import React, { useEffect, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { ConversationScope } from '../../types/canvas'
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
  const isWin = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)
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

  if (!rendered) return null

  return (
    <>
      <div
        className={
          `fixed inset-0 bg-black/20 dark:bg-black/40 z-[200] transition-opacity ` +
          (closing ? 'animate-fade-out pointer-events-none' : entering ? 'animate-fade-in' : '')
        }
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        className={
          `fixed top-0 bottom-0 w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl z-[201] flex flex-col ` +
          (isWin ? 'left-0 ' : 'right-0 ') +
          (closing
            ? isWin
              ? 'animate-slide-out-left'
              : 'animate-slide-out-right'
            : entering
              ? isWin
                ? 'animate-slide-in-left'
                : 'animate-slide-in-right'
              : '')
        }
      >
        <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-neutral-700 app-drag">
          <h2 className="font-semibold text-lg app-no-drag">Inbox</h2>
          <div className="flex items-center gap-2 app-no-drag">
            {!selectedConversation && !isComposing && (
              <button
                onClick={() => setIsComposing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--accent-600)' }}
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
            <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 dark:border-neutral-700 overflow-x-auto">
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
    </>
  )
}
