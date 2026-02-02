import { memo } from 'react'
import { X, Plus } from 'lucide-react'

type Props = {
  onClose: () => void
  onNewChat: () => void
}

export const AISidePanelHeader = memo(function AISidePanelHeader({ onClose, onNewChat }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-neutral-700/50 app-drag">
      <div className="flex items-center gap-2 app-no-drag">
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Whiteboard AI</span>
      </div>

      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-[color:var(--accent-700)] dark:text-gray-400 dark:hover:text-[color:var(--accent-900)] hover:bg-[color:var(--accent-100)] dark:hover:bg-[color:var(--accent-50)] transition-colors"
          aria-label="New chat"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close AI panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})
