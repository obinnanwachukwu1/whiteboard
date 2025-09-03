import React from 'react'

type Props = {
  className?: string
  children: React.ReactNode | ((isFullscreen: boolean) => React.ReactNode)
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
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button
          onClick={toggle}
          className="px-2 py-1 text-xs bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur rounded shadow hover:bg-slate-200 dark:hover:bg-slate-700"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      <div className={isFullscreen ? 'w-screen h-screen' : ''}>
        {typeof children === 'function' ? (children as any)(isFullscreen) : children}
      </div>
    </div>
  )
}

