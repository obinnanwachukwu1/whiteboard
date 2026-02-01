import React from 'react'
import { ArrowRight, Loader2, FileText, BookOpen, Megaphone, Layers, File, Sparkles } from 'lucide-react'
import type { SearchResultItem } from '../../context/AIPanelContext'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  assignment: <FileText className="w-4 h-4" />,
  page: <BookOpen className="w-4 h-4" />,
  module: <Layers className="w-4 h-4" />,
  file: <File className="w-4 h-4" />,
}

type Props = {
  error: string | null
  isLoading: boolean
  answer: string | null
  results: SearchResultItem[] | null
  onResultClick: (result: SearchResultItem) => void
}

export const AIPanelResults: React.FC<Props> = ({ error, isLoading, answer, results, onResultClick }) => {
  return (
    <div className="ai-panel-results">
      {error && <div className="ai-panel-error">{error}</div>}

      {isLoading && (
        <div className="ai-panel-loading">
          <Loader2 className="ai-panel-spinner" />
          <span>Thinking...</span>
        </div>
      )}

      {!isLoading && !error && !results && !answer && (
        <div className="ai-panel-empty">
          <Sparkles className="ai-panel-empty-icon" style={{ color: 'var(--accent-400)', opacity: 0.5 }} />
          <div className="ai-panel-empty-title">How can I help?</div>
          <div className="ai-panel-empty-hint">
            "What's due this week?"<br />
            "Explain the grading policy"<br />
            "Find the syllabus for Bio"
          </div>
        </div>
      )}

      {!isLoading && !error && answer && (
        <div className="ai-panel-answer">
          {answer.split('\n').map((line, i) => (
            <div key={i} style={{ minHeight: line.trim() ? undefined : '0.5em' }}>
              {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j}>{part.slice(2, -2)}</strong>
                }
                return part
              })}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && results && results.length > 0 && (
        <>
          <div className="ai-panel-references-header">
            <span>References</span>
          </div>
          {results.map((result) => (
            <div
              key={result.id}
              className="ai-panel-result"
              onClick={() => onResultClick(result)}
            >
              <div className={`ai-panel-result-icon ${result.metadata.type}`}>
                {TYPE_ICONS[result.metadata.type] || <FileText className="w-4 h-4" />}
              </div>
              <div className="ai-panel-result-content">
                <div className="ai-panel-result-title">{result.metadata.title}</div>
                <div className="ai-panel-result-meta">{result.metadata.courseName}</div>
                {result.metadata.snippet && (
                  <div className="ai-panel-result-snippet">{result.metadata.snippet}</div>
                )}
              </div>
              <div className="ai-panel-result-arrow">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
