import React, { useEffect, useRef } from 'react'
import { HtmlContent } from '../HtmlContent'
import { SkeletonList } from '../Skeleton'
import { useAppData, useAppFlags } from '../../context/AppContext'
import { isSafeMediaSrc } from '../../utils/urlPolicy'

type Message = {
  id: string | number
  author_id: string | number
  created_at: string
  body?: string
  attachments?: Array<{
    id: string | number
    url?: string
    display_name?: string
    filename?: string
  }>
}

type Props = {
  messages: Message[]
  participantsMap: Map<string, { name?: string; avatar_url?: string }>
  isLoading: boolean
  hasConversation: boolean
}

export const MessageList = React.memo(function MessageList({
  messages,
  participantsMap,
  isLoading,
  hasConversation,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const appData = useAppData()
  const { externalMediaEnabled } = useAppFlags()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoading && !hasConversation && (
        <div className="py-2">
          <SkeletonList count={5} hasAvatar />
        </div>
      )}
      {messages.map((msg) => {
        const author = participantsMap.get(String(msg.author_id))
        const avatarUrl =
          author?.avatar_url && isSafeMediaSrc(author.avatar_url, appData.baseUrl, externalMediaEnabled)
            ? author.avatar_url
            : undefined
        return (
          <div key={msg.id} className="flex gap-3">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={author?.name}
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
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
  )
})
