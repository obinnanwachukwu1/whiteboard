import React from 'react'

type Props = {
  className?: string
  children: (ctx: { isFullscreen: boolean; enter: () => Promise<void>; exit: () => Promise<void>; toggle: () => Promise<void>; containerRef: React.RefObject<HTMLDivElement> }) => React.ReactNode
}

export const FullscreenContainer: React.FC<Props> = ({ className = '', children }) => {
  // "Fullscreen" here is an in-app focus mode, not OS / native fullscreen.
  // On macOS users can still use the green traffic light for native fullscreen.
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const toggle = async () => {
    setIsFullscreen((v) => !v)
  }

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? `fixed inset-0 z-[1000] bg-white dark:bg-neutral-900 ${className}`
          : `relative w-full h-full ${className}`
      }
    >
      {children({
        isFullscreen,
        enter: async () => setIsFullscreen(true),
        exit: async () => setIsFullscreen(false),
        toggle,
        containerRef: rootRef,
      })}
    </div>
  )
}
