import React from 'react'
import { Sparkles, X } from 'lucide-react'

type Props = {
  onClose: () => void
}

export const AISidePanelHeader: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-neutral-700/50 app-drag">
      <div className="flex items-center gap-2 app-no-drag">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          AI Assistant
        </span>
      </div>

      <button
        onClick={onClose}
        className="app-no-drag w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Close AI panel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
