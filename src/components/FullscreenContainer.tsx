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
    const onChange = () => {
      // Sync state with actual browser fullscreen state
      const active = !!document.fullscreenElement && document.fullscreenElement === rootRef.current
      setIsFullscreen(active)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = async () => {
    try {
      if (!isFullscreen) await rootRef.current?.requestFullscreen()
      else await document.exitFullscreen()
    } catch (e) {
      console.error('Fullscreen toggle failed', e)
      // Fallback to CSS-only fullscreen if API fails
      setIsFullscreen(v => !v)
    }
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
        enter: async () => {
            try { await rootRef.current?.requestFullscreen() } 
            catch { setIsFullscreen(true) }
        },
        exit: async () => {
            try { await document.exitFullscreen() }
            catch { setIsFullscreen(false) }
        },
        toggle,
        containerRef: rootRef,
      })}
    </div>
  )
}
