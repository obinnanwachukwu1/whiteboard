import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  className?: string
  children: (ctx: { isFullscreen: boolean; enter: () => Promise<void>; exit: () => Promise<void>; toggle: () => Promise<void>; containerRef: React.RefObject<HTMLDivElement> }) => React.ReactNode
}

export const FullscreenContainer: React.FC<Props> = ({ className = '', children }) => {
  // "Fullscreen" here is an in-app focus mode, not OS / native fullscreen.
  // We use a React Portal to ensure the content overlays the *entire* window (including sidebar/header)
  // regardless of where this component is deeply nested in the DOM tree.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const toggle = async () => {
    setIsFullscreen(v => !v)
  }

  const content = children({
    isFullscreen,
    enter: async () => setIsFullscreen(true),
    exit: async () => setIsFullscreen(false),
    toggle,
    containerRef: rootRef,
  })

  // When active, portal the content to document.body to break out of all containers
  if (isFullscreen) {
    if (typeof document === 'undefined') return null // Safety for SSR if needed
    
    return createPortal(
      <div
        ref={rootRef}
        className={`fixed top-0 left-0 w-screen h-screen m-0 p-0 bg-white dark:bg-neutral-950 ${className}`}
        style={{ zIndex: 2147483647 }} // Max z-index to ensure it covers everything (Sidebar, Header, etc.)
      >
        {content}
      </div>,
      document.body
    )
  }

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-full ${className}`}
    >
      {content}
    </div>
  )
}
