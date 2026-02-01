import React, { useRef, useState } from 'react'
import { ArrowLeft, X, Send } from 'lucide-react'
import { useCreateConversation } from '../../hooks/useCanvasMutations'
import { useRecipientSearch } from '../../hooks/useCanvasQueries'
import type { Recipient } from '../../types/canvas'
import { SkeletonText } from '../Skeleton'

type Props = {
  onBack: () => void
  onSent: () => void
}

export const ComposeMessage: React.FC<Props> = ({ onBack, onSent }) => {
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
        recipients: recipients.map((r) => r.id),
        subject: subject.trim() || undefined,
        body: body.trim(),
        groupConversation: recipients.length > 1,
      })
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const addRecipient = (recipient: Recipient) => {
    if (!recipients.find((r) => r.id === recipient.id)) {
      setRecipients([...recipients, recipient])
    }
    setSearchQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            {showDropdown && searchQuery.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
                {searchLoading ? (
                  <div className="p-3">
                    <SkeletonText lines={3} lastLineWidth="w-1/2" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-sm text-slate-500">No results found</div>
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

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]/30"
          />
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]/30"
          />
        </div>
      </div>

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: 'var(--accent-600)' }}
          >
            {createMutation.isPending ? (
              'Sending…'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
