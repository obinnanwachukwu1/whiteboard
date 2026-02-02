import React, { forwardRef } from 'react'
import { Send, Trash2 } from 'lucide-react'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  onSubmit: () => Promise<void>
  isLoading: boolean
  onClear: () => void
}

export const AISidePanelInput = forwardRef<HTMLInputElement, Props>(
  ({ query, onQueryChange, onSubmit, isLoading, onClear }, ref) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim() && !isLoading) {
        onSubmit()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (query.trim() && !isLoading) {
          onSubmit()
        }
      }
    }

    return (
      <div className="px-4 py-3 border-t border-gray-200/50 dark:border-neutral-700/50">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={ref}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-lg outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={onClear}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white transition-colors disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 text-center">
          Press Enter to send
        </p>
      </div>
    )
  }
)

AISidePanelInput.displayName = 'AISidePanelInput'
