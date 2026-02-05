import React, { useCallback, useState } from 'react'
import { ArrowUp } from 'lucide-react'
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
    <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-neutral-700/50 bg-white dark:bg-neutral-900">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendReply()
        }}
        className="px-4 py-3"
      >
        <div className="relative">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply..."
            rows={2}
            className="w-full pr-10 pl-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 border border-gray-200/70 dark:border-neutral-700/70 focus:border-[color:var(--accent-500)] rounded-lg outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 resize-none"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSendReply()
              }
            }}
          />
          <button
            type="submit"
            disabled={disabled || !replyText.trim() || addMessageMutation.isPending}
            className="absolute right-1 top-1 w-7 h-7 flex items-center justify-center rounded-md bg-[color:var(--accent-600)] hover:bg-[color:var(--accent-700)] disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white transition-colors disabled:cursor-not-allowed"
            title="Send (Cmd+Enter)"
            aria-label="Send reply"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}
