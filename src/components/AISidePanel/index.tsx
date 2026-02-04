import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  useAIPanelActions,
  useAIPanelState,
  type SearchResultItem,
} from '../../context/AIPanelContext'
import { useAppActions } from '../../context/AppContext'
import { extractAnnouncementIdFromUrl, extractAssignmentIdFromUrl } from '../../utils/urlHelpers'
import { AISidePanelHeader } from './AISidePanelHeader'
import { AISidePanelContextBar } from './AISidePanelContextBar'
import { AISidePanelInput } from './AISidePanelInput'
import { AISidePanelMessages } from './AISidePanelMessages'

type Props = {
  className?: string
}

const ANIMATION_DURATION = 350 // ms

export const AISidePanel: React.FC<Props> = ({ className = '' }) => {
  const panelState = useAIPanelState()
  const panelActions = useAIPanelActions()
  const actions = useAppActions()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [scrollNonce, setScrollNonce] = useState(0)

  // render tracing removed from AI sidebar to reduce dev noise

  // Track render state for close animation
  const [rendered, setRendered] = useState(panelState.isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (panelState.isOpen) {
      setRendered(true)
      setIsClosing(false)
    } else if (rendered) {
      // Start close animation
      setIsClosing(true)
      const t = window.setTimeout(() => {
        setRendered(false)
        setIsClosing(false)
      }, ANIMATION_DURATION)
      return () => clearTimeout(t)
    }
  }, [panelState.isOpen, rendered])

  // Focus input when panel opens
  useEffect(() => {
    if (panelState.isOpen && !isClosing) {
      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(t)
    }
  }, [panelState.isOpen, isClosing])

  // Handle escape key
  useEffect(() => {
    if (!panelState.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        panelActions.close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [panelState.isOpen, panelActions])

  const handleExamplePromptClick = useCallback(
    (prompt: string) => {
      setScrollNonce((n) => n + 1)
      panelActions.sendMessage(prompt)
    },
    [panelActions],
  )

  const handleSubmit = useCallback(async () => {
    setScrollNonce((n) => n + 1)
    await panelActions.submit()
  }, [panelActions])

  const handleResultClick = useCallback(
    (result: SearchResultItem) => {
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
    },
    [actions],
  )

  if (!rendered) return null

  const pinnedView = panelState.attachments.find((a) => a.slot === 'view') || null
  const offer = panelState.contextOffer
  const offerIsPinnedView = !!(pinnedView && offer && pinnedView.id === offer.id)
  const offerDisabled = !offer || offerIsPinnedView
  const offerLabel = offerIsPinnedView ? 'Content Attached' : 'Attach content'
  const draft = panelState.followContextOffer && offer ? offer : null
  const handleOfferClick = () => {
    if (offerDisabled) return
    if (panelState.followContextOffer) return
    panelActions.startFollowContextOffer()
  }

  return (
    // Outer wrapper: animates width, clips content, vertical padding for spacing
    <div
      ref={panelRef}
      className={`
        flex-shrink-0 overflow-hidden py-4
        ${className}
      `}
      style={{
        // Open: easeOutExpo (fast start, smooth end) | Close: easeOutCubic (less extreme deceleration)
        animation: `${isClosing ? 'ai-panel-collapse' : 'ai-panel-expand'} ${ANIMATION_DURATION}ms ${isClosing ? 'cubic-bezier(0.33, 1, 0.68, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)'} forwards`,
      }}
    >
      {/* Inner content: fixed width card with right margin, appears to slide in */}
      <div
        className="
          w-[360px] h-full flex flex-col
          bg-white dark:bg-neutral-900
          rounded-2xl
          shadow-lg
          overflow-hidden
          mr-4
        "
      >
        <AISidePanelHeader onClose={panelActions.close} onNewChat={panelActions.clearHistory} />

        <AISidePanelMessages
          messages={panelState.messages}
          isLoading={panelState.isLoading}
          error={panelState.error}
          scrollOnInput={panelState.query}
          scrollToBottomNonce={scrollNonce}
          onExamplePromptClick={handleExamplePromptClick}
          onResultClick={handleResultClick}
        />

        <AISidePanelContextBar
          offerLabel={offerLabel}
          offerDisabled={offerDisabled}
          draftTitle={draft?.title}
          draftSubtitle={draft?.courseName}
          onOfferClick={handleOfferClick}
          onCancelDraft={panelActions.cancelFollowContextOffer}
        />

        <AISidePanelInput
          ref={inputRef}
          query={panelState.query}
          onQueryChange={panelActions.setQuery}
          onSubmit={handleSubmit}
          isLoading={panelState.isLoading}
        />
      </div>
    </div>
  )
}
