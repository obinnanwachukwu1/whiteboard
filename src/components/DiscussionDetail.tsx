import React, { useState, useMemo } from 'react'
import { Button } from './ui/Button'
import { ArrowLeft, Send, MessageCircle, User, Maximize2, Minimize2, Search } from 'lucide-react'
import { useDiscussion, useDiscussionView, useProfile } from '../hooks/useCanvasQueries'
import { usePostDiscussionEntry, usePostDiscussionReply } from '../hooks/useCanvasMutations'
import { HtmlContent } from './HtmlContent'
import { FullscreenContainer } from './FullscreenContainer'
import type { DiscussionEntry, DiscussionParticipant } from '../types/canvas'
import { SkeletonText } from './Skeleton'

// Helper to check if the current user has replied in a thread
function containsUserReply(entry: DiscussionEntry, myId: string): boolean {
  if (!entry.replies) return false
  for (const r of entry.replies) {
    if (String(r.user_id) === myId) return true
    if (containsUserReply(r, myId)) return true
  }
  return false
}

type Props = {
  courseId: string | number
  topicId: string | number
  title?: string
  onBack: () => void
  onNavigate?: (url: string) => void
  isEmbedded?: boolean
  canGoBack?: boolean
}

export const DiscussionDetail: React.FC<Props> = ({ courseId, topicId, title, onBack, onNavigate, isEmbedded, canGoBack }) => {
  const isWin =
    (typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)) ||
    (typeof navigator !== 'undefined' && typeof (navigator as any).platform === 'string' && /^win/i.test((navigator as any).platform))

  const { data: topic, isLoading: topicLoading } = useDiscussion(courseId, topicId)
  const { data: view, isLoading: viewLoading, refetch } = useDiscussionView(courseId, topicId)
  const { data: profile } = useProfile()
  const postEntry = usePostDiscussionEntry()
  const postReply = usePostDiscussionReply()

  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | number | null>(null)
  const [threadSearch, setThreadSearch] = useState('')

  const isLoading = topicLoading || viewLoading
  const participants = view?.participants || []
  const rawEntries = view?.view || []
  const myId = profile?.id ? String(profile.id) : null

  // Helper: check if entry (or any descendant) matches search
  const matchesSearch = (entry: DiscussionEntry, search: string): boolean => {
    if (!search) return true
    const term = search.toLowerCase()
    
    // Check entry content
    if (entry.message?.toLowerCase().includes(term)) return true
    if (entry.user_name?.toLowerCase().includes(term)) return true
    
    // Check replies
    if (entry.replies) {
      return entry.replies.some(r => matchesSearch(r, search))
    }
    
    return false
  }

  const entries = useMemo(() => {
    // First, filter by search term if active
    let filtered = rawEntries
    if (threadSearch.trim()) {
      filtered = rawEntries.filter(e => matchesSearch(e, threadSearch.trim()))
    }
    
    if (!myId || !filtered.length) return filtered

    // Pre-calculate buckets to avoid expensive recursion during sort
    const scored = filtered.map((entry, index) => {
      let bucket = 2 // Default: Others
      
      if (String(entry.user_id) === myId) {
        bucket = 0 // My posts
      } else if (containsUserReply(entry, myId)) {
        bucket = 1 // Threads I replied to
      }
      
      return { entry, bucket, originalIndex: index }
    })

    return scored.sort((a, b) => {
      if (a.bucket !== b.bucket) {
        return a.bucket - b.bucket
      }
      return a.originalIndex - b.originalIndex
    }).map(item => item.entry)
  }, [rawEntries, myId, threadSearch])

  const getParticipant = (userId: string | number): DiscussionParticipant | undefined => {
    return participants.find(p => String(p.id) === String(userId))
  }

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return

    try {
      if (replyingTo) {
        await postReply.mutateAsync({ courseId, topicId, entryId: replyingTo, message: replyText })
      } else {
        await postEntry.mutateAsync({ courseId, topicId, message: replyText })
      }
      setReplyText('')
      setReplyingTo(null)
      refetch()
    } catch (err) {
      console.error('Failed to post reply:', err)
    }
  }

  const renderEntry = (entry: DiscussionEntry, depth = 0) => {
    const participant = getParticipant(entry.user_id)
    const isUnread = view?.unread_entries?.includes(entry.id)

    return (
      <div
        key={entry.id}
        className={`${depth > 0 ? 'ml-6 border-l-2 border-neutral-200 dark:border-neutral-800 pl-4' : ''} mb-4`}
      >
        <div
          className={
            `p-4 rounded-xl border transition-colors ` +
            (isUnread
              ? 'bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 shadow-md ring-1 ring-black/5 dark:ring-white/10'
              : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5')
          }
        >
          {/* Author header */}
          <div className="flex items-center gap-3 mb-3">
            {participant?.avatar_image_url ? (
              <img
                src={participant.avatar_image_url}
                alt=""
                className="w-8 h-8 rounded-full ring-1 ring-black/5 dark:ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </div>
            )}
            <div className="flex flex-col leading-none gap-1">
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                {participant?.display_name || entry.user_name || 'Unknown'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {timeAgo(entry.created_at)}
                </span>
                {isUnread && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">New</span>
                )}
              </div>
            </div>
          </div>

          {/* Message content */}
          <div className="text-sm text-neutral-800 dark:text-neutral-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-a:text-blue-600 dark:prose-a:text-blue-400">
            <HtmlContent html={entry.message} onNavigate={onNavigate} />
          </div>

          {/* Reply button */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setReplyingTo(replyingTo === entry.id ? null : entry.id)}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1.5 px-2 py-1 -ml-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>

          {/* Inline reply form */}
          {replyingTo === entry.id && (
            <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-4 py-2.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply()
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || postReply.isPending}
                className="w-10 h-10 flex items-center justify-center bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nested replies */}
        {entry.replies && entry.replies.length > 0 && (
          <div className="mt-3">
            {entry.replies.map(reply => renderEntry(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return <SkeletonText lines={10} />
    }

    if (!topic) return null

    return (
      <>
        {/* Discussion prompt / original post */}
        {topic.message && (
          <div className="mb-8 p-5 md:p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              {topic.author?.avatar_image_url ? (
                <img src={topic.author.avatar_image_url} alt="" className="w-10 h-10 rounded-full ring-1 ring-black/5 dark:ring-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {topic.author?.display_name || topic.user_name || 'Instructor'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Posted {timeAgo(topic.posted_at)}
                </span>
              </div>
            </div>
            <div className="text-base text-neutral-900 dark:text-neutral-200 prose prose-neutral dark:prose-invert max-w-none">
              <HtmlContent html={topic.message} onNavigate={onNavigate} />
            </div>
          </div>
        )}

        {/* Replies */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {entries.length} {entries.length === 1 ? 'Reply' : 'Replies'}
            </h3>
          </div>
          
          {entries.length === 0 && !topic.require_initial_post && (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30">
              <p className="text-neutral-500 dark:text-neutral-400">
                No replies yet. Be the first to join the conversation.
              </p>
            </div>
          )}
          
          {topic.require_initial_post && entries.length === 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/30 text-sm">
              You must post a reply before viewing other responses.
            </div>
          )}
          
          {entries.map(entry => renderEntry(entry))}
        </div>
      </>
    )
  }

  const renderReplyBox = () => {
    if (isLoading || !topic || topic.locked || replyingTo !== null) return null
    return (
      <div className="shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Add a reply..."
            className="flex-1 px-4 py-3 text-sm border border-neutral-300 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 shadow-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmitReply()
              }
            }}
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || postEntry.isPending}
            className="px-5 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Reply</span>
          </button>
        </div>
      </div>
    )
  }

  const header = (ctx: { isFullscreen: boolean; toggle: () => Promise<void> }) => {
    if (isEmbedded || ctx.isFullscreen) {
      // Single-row titlebar for embedded windows or focus mode
      return (
        <div className="flex flex-col shrink-0">
          <div
            className={`h-14 ${canGoBack ? '' : 'border-b border-gray-200 dark:border-neutral-700'} bg-white/95 dark:bg-neutral-900/95 app-drag titlebar-left-inset titlebar-right-inset px-5 grid grid-cols-[1fr_auto_1fr] items-center`}
          >
            <div className="flex items-center justify-start">
              {!isEmbedded && ctx.isFullscreen && isWin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ctx.toggle}
                  className="w-8 h-8 p-0 justify-center rounded-full app-no-drag"
                  title="Exit Focus Mode"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider truncate text-center">
              {topic?.title || title || 'Discussion'}
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Find in thread..."
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  className="w-40 sm:w-48 pl-8 pr-3 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded-md bg-white/50 dark:bg-neutral-800/50 focus:ring-1 focus:ring-neutral-500 outline-none transition-all focus:w-56"
                />
              </div>

              {!isEmbedded && ctx.isFullscreen && !isWin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ctx.toggle}
                  className="w-8 h-8 p-0 justify-center rounded-full app-no-drag"
                  title="Exit Focus Mode"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Secondary Toolbar for Navigation */}
          {canGoBack && (
            <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0">
              <Button variant="ghost" size="sm" onClick={onBack} className="w-8 h-8 p-0 justify-center rounded-full app-no-drag" title="Back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shrink-0"
      >
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Back to discussions"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>
        <h2 className="m-0 text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1">
          {topic?.title || title || 'Discussion'}
        </h2>
        <div className="flex-1 flex items-center justify-end gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Find in thread..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-40 sm:w-48 pl-8 pr-3 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded-md bg-white/50 dark:bg-neutral-800/50 focus:ring-1 focus:ring-neutral-500 outline-none transition-all focus:w-56"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={ctx.toggle}
            title={ctx.isFullscreen ? 'Enter Focus Mode' : 'Exit Focus Mode'}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <FullscreenContainer className="flex flex-col h-full relative">
      {(ctx) => (
        <div className="flex flex-col h-full">
          {header(ctx)}

          {/* Content */}
          <div className={`flex-1 overflow-y-auto min-h-0 pb-4 ${ctx.isFullscreen ? 'px-6 md:px-10 pt-8' : 'px-4 pt-6'}`}>
            <div className={ctx.isFullscreen ? 'max-w-4xl mx-auto w-full' : ''}>
              {renderContent()}
            </div>
          </div>

          {/* Reply Box */}
          {renderReplyBox()}
        </div>
      )}
    </FullscreenContainer>
  )
}
