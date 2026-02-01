import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAIPanel, type SearchResultItem } from '../../context/AIPanelContext'
import { useAppActions, useAppFlags } from '../../context/AppContext'
import { extractAnnouncementIdFromUrl, extractAssignmentIdFromUrl } from '../../utils/urlHelpers'
import { AIPanelHeader } from './AIPanelHeader'
import { AIPanelInput } from './AIPanelInput'
import { AIPanelResults } from './AIPanelResults'
import '../AIPanel.css'

export function AIPanel() {
  const panel = useAIPanel()
  const actions = useAppActions()
  const flags = useAppFlags()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (panel.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [panel.isOpen])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    panel.submit()
  }

  const handleResultClick = (result: SearchResultItem) => {
    const { courseId, type } = result.metadata
    const rawId = result.id.split(':').pop()
    const contentId = rawId && rawId !== 'undefined' ? rawId : null

    if (type === 'announcement' && contentId) {
      actions.onOpenAnnouncement(courseId, contentId, result.metadata.title)
      return
    }

    if (type === 'assignment') {
      const assignmentId = contentId || extractAssignmentIdFromUrl(result.metadata.url)
      if (assignmentId) {
        actions.onOpenAssignment(courseId, assignmentId, result.metadata.title)
        return
      }

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
      <AIPanelHeader onClose={panel.close} onDragStart={handleMouseDown} />
      <AIPanelInput
        query={panel.query}
        isEnabled={isEnabled}
        isLoading={panel.isLoading}
        onChange={panel.setQuery}
        onSubmit={handleSubmit}
        inputRef={inputRef}
      />
      <AIPanelResults
        error={panel.error}
        isLoading={panel.isLoading}
        answer={panel.answer}
        results={panel.results}
        onResultClick={handleResultClick}
      />
    </div>
  )
}
