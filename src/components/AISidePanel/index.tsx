import React, { useEffect, useRef, useState } from 'react'
import { useAIPanel } from '../../context/AIPanelContext'
import { AISidePanelHeader } from './AISidePanelHeader'
import { AISidePanelInput } from './AISidePanelInput'
import { AISidePanelMessages } from './AISidePanelMessages'

type Props = {
  className?: string
}

const ANIMATION_DURATION = 350 // ms

export const AISidePanel: React.FC<Props> = ({ className = '' }) => {
  const panel = useAIPanel()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Track render state for close animation
  const [rendered, setRendered] = useState(panel.isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (panel.isOpen) {
      setRendered(true)
      setIsClosing(false)
    } else if (rendered) {
      // Start close animation
      setIsClosing(true)
      const t = setTimeout(() => {
        setRendered(false)
        setIsClosing(false)
      }, ANIMATION_DURATION)
      return () => clearTimeout(t)
    }
  }, [panel.isOpen, rendered])

  // Focus input when panel opens
  useEffect(() => {
    if (panel.isOpen && !isClosing) {
      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(t)
    }
  }, [panel.isOpen, isClosing])

  // Handle escape key
  useEffect(() => {
    if (!panel.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        panel.close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [panel.isOpen, panel])

  if (!rendered) return null

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
          bg-white/70 dark:bg-neutral-900/70
          backdrop-blur-xl
          rounded-2xl
          shadow-lg
          ring-1 ring-gray-200/80 dark:ring-neutral-700/80
          overflow-hidden
          mr-4
        "
      >
        <AISidePanelHeader onClose={panel.close} />

        <AISidePanelMessages
          messages={panel.history}
          answer={panel.answer}
          results={panel.results}
          isLoading={panel.isLoading}
          error={panel.error}
        />

        <AISidePanelInput
          ref={inputRef}
          query={panel.query}
          onQueryChange={panel.setQuery}
          onSubmit={panel.submit}
          isLoading={panel.isLoading}
          onClear={panel.clear}
        />
      </div>
    </div>
  )
}
