import React from 'react'

type Props = {
  className?: string
  children: (ctx: { isFullscreen: boolean; enter: () => Promise<void>; exit: () => Promise<void>; toggle: () => Promise<void>; containerRef: React.RefObject<HTMLDivElement> }) => React.ReactNode
}

export const FullscreenContainer: React.FC<Props> = ({ className = '', children }) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => {
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
    } catch {}
  }

  return (
    <div ref={rootRef} className={`relative w-full h-full ${className}`}>
      {/* In fullscreen, give the container a solid card-like background so translucent headers look identical */}
      <div className={isFullscreen ? 'w-screen h-screen bg-white dark:bg-neutral-900' : 'w-full h-full'}>
        {children({ isFullscreen, enter: () => rootRef.current?.requestFullscreen?.() as any, exit: () => document.exitFullscreen(), toggle, containerRef: rootRef })}
      </div>
    </div>
  )
}
