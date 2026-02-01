import React from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

type Props = {
  query: string
  isEnabled: boolean
  isLoading: boolean
  onChange: (next: string) => void
  onSubmit: (e: React.FormEvent) => void
  inputRef: React.RefObject<HTMLInputElement>
}

export const AIPanelInput: React.FC<Props> = ({
  query,
  isEnabled,
  isLoading,
  onChange,
  onSubmit,
  inputRef,
}) => {
  return (
    <form className="ai-panel-input-section" onSubmit={onSubmit}>
      <div className="ai-panel-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="ai-panel-input"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isEnabled ? 'Ask anything about your courses...' : 'Enable AI in Settings'}
          disabled={!isEnabled}
        />
        <button
          type="submit"
          className="ai-panel-submit"
          disabled={!isEnabled || !query.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </form>
  )
}
