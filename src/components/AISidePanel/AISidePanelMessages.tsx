import React, { useEffect, useRef } from 'react'
import { Sparkles, Loader2, AlertCircle, User } from 'lucide-react'
import type { ConversationTurn, SearchResultItem } from '../../context/AIPanelContext'

type Props = {
  messages: ConversationTurn[]
  answer: string | null
  results: SearchResultItem[] | null
  isLoading: boolean
  error: string | null
}

export const AISidePanelMessages: React.FC<Props> = ({
  messages,
  answer,
  results: _results, // TODO: Display references/results
  isLoading,
  error,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, answer, isLoading])

  const isEmpty = messages.length === 0 && !answer && !isLoading && !error

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {isEmpty ? (
        <div className="h-full flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 dark:from-indigo-500/20 dark:to-purple-600/20 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            How can I help?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px]">
            Ask me about your assignments, due dates, course content, or anything else.
          </p>

          <div className="mt-6 space-y-2 w-full max-w-[260px]">
            <ExamplePrompt text="What's due this week?" />
            <ExamplePrompt text="Summarize my upcoming assignments" />
            <ExamplePrompt text="What courses am I enrolled in?" />
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Render conversation history */}
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} role={msg.role} content={msg.content} />
          ))}

          {/* Show current answer if not yet in history */}
          {answer && !messages.some(m => m.role === 'assistant' && m.content === answer) && (
            <MessageBubble role="assistant" content={answer} />
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex-1 pt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Thinking...
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  )
}

const MessageBubble: React.FC<{ role: 'user' | 'assistant'; content: string }> = ({
  role,
  content,
}) => {
  const isUser = role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gray-200 dark:bg-neutral-700'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={`flex-1 px-3 py-2 rounded-xl text-sm ${
          isUser
            ? 'bg-indigo-500 text-white ml-8'
            : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 mr-8'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

const ExamplePrompt: React.FC<{ text: string }> = ({ text }) => {
  return (
    <button
      className="w-full px-3 py-2 text-left text-xs text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      onClick={() => {
        // This could be wired up to fill the input
      }}
    >
      {text}
    </button>
  )
}
