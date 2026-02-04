import React, { forwardRef } from 'react'
import { ArrowUp } from 'lucide-react'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  onSubmit: () => Promise<void>
  isLoading: boolean
}

export const AISidePanelInput = forwardRef<HTMLInputElement, Props>(
  ({ query, onQueryChange, onSubmit, isLoading }, ref) => {
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
      <div className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center">
          <div className="flex-1 relative">
            <input
              ref={ref}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="w-full pr-10 pl-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 border border-gray-200/70 dark:border-neutral-700/70 focus:border-[color:var(--accent-500)] rounded-lg outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md bg-[color:var(--accent-600)] hover:bg-[color:var(--accent-700)] disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white transition-colors disabled:cursor-not-allowed"
              aria-label="Send message"
              title="Send"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 text-center">
          Press Enter to send
        </p>
      </div>
    )
  },
)

AISidePanelInput.displayName = 'AISidePanelInput'
