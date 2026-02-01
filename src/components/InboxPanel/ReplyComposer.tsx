import React, { useCallback, useState } from 'react'
import { Send } from 'lucide-react'
import { useAddMessage } from '../../hooks/useCanvasMutations'

type Props = {
  conversationId: string | number
  disabled: boolean
  addMessageMutation: ReturnType<typeof useAddMessage>
}

export const ReplyComposer: React.FC<Props> = ({
  conversationId,
  disabled,
  addMessageMutation,
}) => {
  const [replyText, setReplyText] = useState('')

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || disabled) return
    await addMessageMutation.mutateAsync({
      conversationId,
      body: replyText.trim(),
    })
    setReplyText('')
  }, [replyText, disabled, conversationId, addMessageMutation])

  return (
    <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="flex gap-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type a reply..."
          rows={2}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)]/30"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSendReply()
            }
          }}
        />
        <button
          onClick={handleSendReply}
          disabled={disabled || !replyText.trim() || addMessageMutation.isPending}
          className="px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: 'var(--accent-600)' }}
          title="Send (Cmd+Enter)"
        >
          {addMessageMutation.isPending ? 'Sending…' : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
