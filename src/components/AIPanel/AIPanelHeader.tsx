import React from 'react'
import { X, Sparkles } from 'lucide-react'

type Props = {
  onClose: () => void
  onDragStart: (e: React.MouseEvent) => void
}

export const AIPanelHeader: React.FC<Props> = ({ onClose, onDragStart }) => {
  return (
    <div className="ai-panel-header" onMouseDown={onDragStart}>
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium select-none">
        <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-500)' }} />
        AI Assistant
      </div>
      <button className="ai-panel-close ml-auto" onClick={onClose} aria-label="Close">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
