import React, { useState } from 'react'
import { ArrowLeft, Send, MessageCircle, User } from 'lucide-react'
import { useDiscussion, useDiscussionView } from '../hooks/useCanvasQueries'
import { usePostDiscussionEntry, usePostDiscussionReply } from '../hooks/useCanvasMutations'
import { HtmlContent } from './HtmlContent'
import type { DiscussionEntry, DiscussionParticipant } from '../types/canvas'
import { SkeletonText } from './Skeleton'

type Props = {
  courseId: string | number
  topicId: string | number
  title?: string
  onBack: () => void
}

export const DiscussionDetail: React.FC<Props> = ({ courseId, topicId, title, onBack }) => {
  const { data: topic, isLoading: topicLoading } = useDiscussion(courseId, topicId)
  const { data: view, isLoading: viewLoading, refetch } = useDiscussionView(courseId, topicId)
  const postEntry = usePostDiscussionEntry()
  const postReply = usePostDiscussionReply()

  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | number | null>(null)

  const isLoading = topicLoading || viewLoading
  const participants = view?.participants || []
  const entries = view?.view || []

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
        className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''} mb-4`}
      >
        <div className={`p-3 rounded-lg ${isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
          {/* Author header */}
          <div className="flex items-center gap-2 mb-2">
            {participant?.avatar_image_url ? (
              <img
                src={participant.avatar_image_url}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </div>
            )}
            <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
              {participant?.display_name || entry.user_name || 'Unknown'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {timeAgo(entry.created_at)}
            </span>
            {isUnread && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500 text-white">New</span>
            )}
          </div>

          {/* Message content */}
          <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
            <HtmlContent html={entry.message} />
          </div>

          {/* Reply button */}
          <button
            onClick={() => setReplyingTo(replyingTo === entry.id ? null : entry.id)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <MessageCircle className="w-3 h-3" />
            Reply
          </button>

          {/* Inline reply form */}
          {replyingTo === entry.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply()
                  }
                }}
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || postReply.isPending}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nested replies */}
        {entry.replies && entry.replies.length > 0 && (
          <div className="mt-2">
            {entry.replies.map(reply => renderEntry(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Back to discussions"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="m-0 text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
          {topic?.title || title || 'Discussion'}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {isLoading && (
          <SkeletonText lines={10} />
        )}

        {!isLoading && topic && (
          <>
            {/* Discussion prompt / original post */}
            {topic.message && (
              <div className="mb-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  {topic.author?.avatar_image_url ? (
                    <img src={topic.author.avatar_image_url} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                      <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    </div>
                  )}
                  <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                    {topic.author?.display_name || topic.user_name || 'Instructor'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {timeAgo(topic.posted_at)}
                  </span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none">
                  <HtmlContent html={topic.message} />
                </div>
              </div>
            )}

            {/* Replies */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                {entries.length} {entries.length === 1 ? 'Reply' : 'Replies'}
              </h3>
              {entries.length === 0 && !topic.require_initial_post && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No replies yet. Be the first to respond!
                </p>
              )}
              {topic.require_initial_post && entries.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  You must post a reply before viewing other responses.
                </p>
              )}
              {entries.map(entry => renderEntry(entry))}
            </div>
          </>
        )}
      </div>

      {/* Reply input at bottom */}
      {!isLoading && topic && !topic.locked && replyingTo === null && (
        <div className="shrink-0 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Locked notice */}
      {topic?.locked && (
        <div className="shrink-0 pt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          This discussion is locked.
        </div>
      )}
    </div>
  )
}
