import React, { memo, useLayoutEffect, useRef, useState } from 'react'
import {
  Sparkles,
  AlertCircle,
  FileText,
  BookOpen,
  Megaphone,
  Layers,
  File,
  ChevronRight,
  ChevronDown,
  Paperclip,
} from 'lucide-react'
import type { AIAttachmentChip, ChatMessage, SearchResultItem } from '../../context/AIPanelContext'
import { MarkdownMessage } from './MarkdownMessage'

function ThinkingBar() {
  return (
    <span className="relative inline-block text-gray-500 dark:text-gray-400">
      <span>Thinking</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 text-transparent bg-clip-text bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.0)_42%,rgba(255,255,255,0.9)_50%,rgba(255,255,255,0.0)_58%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.0)_42%,rgba(255,255,255,0.55)_50%,rgba(255,255,255,0.0)_58%,transparent_100%)]"
        style={{
          // Start/end positions are fully "off-text" so the loop reset is invisible.
          backgroundSize: '600% 100%',
          animation: 'ai-thinking-text-sweep 5.8s linear infinite',
          willChange: 'background-position',
        }}
      >
        Thinking
      </span>
    </span>
  )
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-3.5 h-3.5" />,
  assignment: <FileText className="w-3.5 h-3.5" />,
  page: <BookOpen className="w-3.5 h-3.5" />,
  module: <Layers className="w-3.5 h-3.5" />,
  file: <File className="w-3.5 h-3.5" />,
}

type Props = {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  scrollOnInput?: string
  scrollToBottomNonce?: number
  onExamplePromptClick?: (prompt: string) => void
  onResultClick?: (result: SearchResultItem) => void
}

export const AISidePanelMessages = memo(function AISidePanelMessages({
  messages,
  isLoading,
  error,
  scrollOnInput,
  scrollToBottomNonce,
  onExamplePromptClick,
  onResultClick,
}: Props) {
  // render tracing removed from AI sidebar to avoid noisy dev output
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isPinnedRef = useRef(true)
  const rafRef = useRef<number | null>(null)

  const scrollToBottomNow = () => {
    const el = containerRef.current
    if (!el) return

    // Prefer direct scrollTop manipulation (most reliable), then ensure the anchor is visible.
    el.scrollTop = el.scrollHeight
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }

  useLayoutEffect(() => {
    if (!isPinnedRef.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      scrollToBottomNow()
    })
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [messages, scrollOnInput])

  useLayoutEffect(() => {
    if (scrollToBottomNonce == null) return
    // Explicit user action (send/quick prompt): force pin + scroll.
    isPinnedRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      // One rAF isn't always enough when the message list grows in the same tick.
      scrollToBottomNow()
      requestAnimationFrame(() => scrollToBottomNow())
    })
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scrollToBottomNonce])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const threshold = 40
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isPinnedRef.current = distanceFromBottom < threshold
  }

  const isEmpty = messages.length === 0 && !isLoading && !error

  return (
    <div className="flex-1 overflow-y-auto min-h-0" ref={containerRef} onScroll={handleScroll}>
      {isEmpty ? (
        <div className="h-full flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--accent-100)] dark:bg-[color:var(--accent-500)]/20 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[color:var(--accent-600)] dark:text-[color:var(--accent-300)]" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            How can I help?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px]">
            Ask me about your assignments, due dates, course content, or anything else.
          </p>

          <div className="mt-6 space-y-2 w-full max-w-[260px]">
            <ExamplePrompt text="What's due this week?" onClick={onExamplePromptClick} />
            <ExamplePrompt
              text="Summarize my upcoming assignments"
              onClick={onExamplePromptClick}
            />
            <ExamplePrompt text="What courses am I enrolled in?" onClick={onExamplePromptClick} />
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble role={msg.role} content={msg.content} status={msg.status} />

              {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                <AttachmentList attachments={msg.attachments} />
              )}

              {msg.role === 'assistant' &&
                msg.status !== 'streaming' &&
                msg.references &&
                msg.references.length > 0 && (
                  <ReferencesList results={msg.references} onResultClick={onResultClick} />
                )}
            </div>
          ))}

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
})

const MessageBubble = memo(function MessageBubble({
  role,
  content,
  status,
}: {
  role: 'user' | 'assistant'
  content: string
  status: ChatMessage['status']
}) {
  const isUser = role === 'user'
  const isStreaming = role === 'assistant' && status === 'streaming'

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      {isUser ? (
        <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed text-white ml-8 bg-[color:var(--accent-primary)]">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        <div className="flex-1 pl-2 text-sm leading-relaxed text-gray-900 dark:text-gray-100 mr-8">
          {isStreaming && !content ? (
            <ThinkingBar />
          ) : (
            <MarkdownMessage markdown={content} streaming={isStreaming} className="ai-markdown" />
          )}
        </div>
      )}
    </div>
  )
})

const ExamplePrompt = memo(function ExamplePrompt({
  text,
  onClick,
}: {
  text: string
  onClick?: (text: string) => void
}) {
  return (
    <button
      className="w-full px-3 py-2 text-left text-xs text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      onClick={() => onClick?.(text)}
    >
      {text}
    </button>
  )
})

const ReferenceCard = memo(function ReferenceCard({
  result,
  onClick,
}: {
  result: SearchResultItem
  onClick?: (result: SearchResultItem) => void
}) {
  const { type, title, courseName, snippet } = result.metadata

  return (
    <button
      onClick={() => onClick?.(result)}
      className="w-full flex items-start gap-2.5 p-2.5 text-left rounded-lg bg-gray-50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200/50 dark:border-neutral-700/50 transition-colors group"
    >
      <div className="w-6 h-6 rounded-md bg-[color:var(--accent-100)] dark:bg-[color:var(--accent-50)] flex items-center justify-center flex-shrink-0 text-[color:var(--accent-700)] dark:text-[color:var(--accent-900)]">
        {TYPE_ICONS[type] || <FileText className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{title}</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{courseName}</div>
        {snippet && (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {snippet}
          </div>
        )}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
    </button>
  )
})

const ReferencesList = memo(function ReferencesList({
  results,
  onResultClick,
}: {
  results: SearchResultItem[]
  onResultClick?: (result: SearchResultItem) => void
}) {
  const [open, setOpen] = useState(false)
  const displayResults = results.slice(0, 6)

  if (!results.length) return null

  return (
    <div className="mt-3 space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        aria-expanded={open}
      >
        <span>References ({results.length})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        displayResults.map((result) => (
          <ReferenceCard key={result.id} result={result} onClick={onResultClick} />
        ))}
    </div>
  )
})

const AttachmentList = memo(function AttachmentList({ attachments }: { attachments: AIAttachmentChip[] }) {
  return (
    <div className="mt-1 flex justify-end">
      <div className="max-w-[85%] ml-8 flex flex-wrap gap-1">
        {attachments.map((a) => (
          <AttachmentPill key={a.id} title={a.title} subtitle={a.courseName} />
        ))}
      </div>
    </div>
  )
})

const AttachmentPill = memo(function AttachmentPill({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="px-2 py-1 rounded-md bg-[color:var(--accent-100)] dark:bg-[color:var(--accent-50)] ring-1 ring-[color:var(--accent-200)] dark:ring-[color:var(--accent-200)]">
      <div className="flex items-center gap-1.5 text-[10px] leading-tight text-[color:var(--accent-800)] dark:text-[color:var(--accent-900)]">
        <Paperclip className="w-3 h-3 opacity-80" />
        <span className="truncate">{title}</span>
      </div>
      {subtitle && (
        <div className="text-[9px] leading-tight text-[color:var(--accent-700)] dark:text-[color:var(--accent-800)] truncate opacity-80">
          {subtitle}
        </div>
      )}
    </div>
  )
})
