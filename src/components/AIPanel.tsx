import React, { useRef, useEffect, useState, useCallback } from 'react'
import { X, Sparkles, ArrowRight, Loader2, FileText, BookOpen, Megaphone, Layers, File } from 'lucide-react'
import { useAIPanel, type SearchResultItem } from '../context/AIPanelContext'
import { useAppActions, useAppFlags } from '../context/AppContext'
import { extractAnnouncementIdFromUrl, extractAssignmentIdFromUrl } from '../utils/urlHelpers'
import './AIPanel.css'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  assignment: <FileText className="w-4 h-4" />,
  page: <BookOpen className="w-4 h-4" />,
  module: <Layers className="w-4 h-4" />,
  file: <File className="w-4 h-4" />,
}

export function AIPanel() {
  const panel = useAIPanel()
  const actions = useAppActions()
  const flags = useAppFlags()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Focus input when panel opens
  useEffect(() => {
    if (panel.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [panel.isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!panel.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        panel.close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [panel.isOpen, panel.close])

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y
      panel.setPosition({ x, y })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, panel.setPosition])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    panel.submit()
  }

  // Handle result click
  const handleResultClick = (result: SearchResultItem) => {
    const { courseId, type } = result.metadata
    const rawId = result.id.split(':').pop()
    const contentId = rawId && rawId !== 'undefined' ? rawId : null

    // Try to navigate internally first
    if (type === 'announcement' && contentId) {
      actions.onOpenAnnouncement(courseId, contentId, result.metadata.title)
      // Don't close panel automatically for AI chat, unlike search?
      // Actually, standard behavior is close. User can reopen.
      // Or keep open? Let's close for now to be unobtrusive.
      // panel.close()
      return
    }

    if (type === 'assignment') {
      const assignmentId = contentId || extractAssignmentIdFromUrl(result.metadata.url)
      if (assignmentId) {
        actions.onOpenAssignment(courseId, assignmentId, result.metadata.title)
        return
      }

      // Some “discussion assignments” link to discussion topics.
      const topicId = extractAnnouncementIdFromUrl(result.metadata.url)
      if (topicId) {
        actions.onOpenAnnouncement(courseId, topicId, result.metadata.title)
        return
      }

      if (result.metadata.url) {
        window.system?.openExternal?.(result.metadata.url)
        return
      }

      actions.onOpenCourse(courseId)
      return
    }

    if (type === 'page' && contentId) {
      actions.onOpenPage(courseId, contentId, result.metadata.title)
    } else if (type === 'file' && contentId) {
      actions.onOpenFile(courseId, contentId, result.metadata.title)
    } else if (type === 'module') {
      actions.onOpenModules(courseId)
    } else if (result.metadata.url) {
      window.system?.openExternal?.(result.metadata.url)
    } else {
      actions.onOpenCourse(courseId)
    }
  }

  if (!panel.isOpen) return null

  // Calculate position (center if not set)
  const style: React.CSSProperties = {}
  if (panel.position.x >= 0 && panel.position.y >= 0) {
    style.left = panel.position.x
    style.top = panel.position.y
  } else {
    style.left = '50%'
    style.top = '15%'
    style.transform = 'translateX(-50%)'
  }

  const isEnabled = flags.embeddingsEnabled && flags.aiEnabled

  return (
    <div className="ai-panel" ref={panelRef} style={style}>
      {/* Header */}
      <div className="ai-panel-header" onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium select-none">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-500)' }} />
          AI Assistant
        </div>
        <button className="ai-panel-close ml-auto" onClick={panel.close} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Input */}
      <form className="ai-panel-input-section" onSubmit={handleSubmit}>
        <div className="ai-panel-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="ai-panel-input"
            value={panel.query}
            onChange={(e) => panel.setQuery(e.target.value)}
            placeholder={isEnabled ? "Ask anything about your courses..." : "Enable AI in Settings"}
            disabled={!isEnabled}
          />
          <button
            type="submit"
            className="ai-panel-submit"
            disabled={!isEnabled || !panel.query.trim() || panel.isLoading}
          >
            {panel.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="ai-panel-results">
        {panel.error && (
          <div className="ai-panel-error">{panel.error}</div>
        )}

        {panel.isLoading && (
          <div className="ai-panel-loading">
            <Loader2 className="ai-panel-spinner" />
            <span>Thinking...</span>
          </div>
        )}

        {!panel.isLoading && !panel.error && !panel.results && !panel.answer && (
          <div className="ai-panel-empty">
            <Sparkles className="ai-panel-empty-icon" style={{ color: 'var(--accent-400)', opacity: 0.5 }} />
            <div className="ai-panel-empty-title">
              How can I help?
            </div>
            <div className="ai-panel-empty-hint">
              "What's due this week?"<br/>
              "Explain the grading policy"<br/>
              "Find the syllabus for Bio"
            </div>
          </div>
        )}

        {!panel.isLoading && !panel.error && panel.answer && (
          <div className="ai-panel-answer">
            {panel.answer.split('\n').map((line, i) => (
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

        {!panel.isLoading && !panel.error && panel.results && panel.results.length > 0 && (
          <>
            <div className="ai-panel-references-header">
              <span>References</span>
            </div>
            {panel.results.map((result) => (
              <div
                key={result.id}
                className="ai-panel-result"
                onClick={() => handleResultClick(result)}
              >
                <div className={`ai-panel-result-icon ${result.metadata.type}`}>
                  {TYPE_ICONS[result.metadata.type] || <FileText className="w-4 h-4" />}
                </div>
                <div className="ai-panel-result-content">
                  <div className="ai-panel-result-title">
                    {result.metadata.title}
                  </div>
                  <div className="ai-panel-result-meta">
                    {result.metadata.courseName}
                  </div>
                  {result.metadata.snippet && (
                    <div className="ai-panel-result-snippet">
                      {result.metadata.snippet}
                    </div>
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

      {/* Status Bar */}
      <div className="ai-panel-status">
        <div className="ai-panel-status-item">
          <span className="ai-panel-kbd">esc</span>
          <span>to close</span>
        </div>
        <div className="ai-panel-status-item">
          <span className="ai-panel-kbd">↵</span>
          <span>to submit</span>
        </div>
      </div>
    </div>
  )
}
