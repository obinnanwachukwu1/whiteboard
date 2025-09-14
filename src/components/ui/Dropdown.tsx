import React from 'react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  align?: 'left' | 'right'
  offsetY?: number
  className?: string
  style?: React.CSSProperties
}

export const Dropdown: React.FC<Props> = ({ open, onOpenChange, children, align = 'right', offsetY = 32, className = '', style }) => {
  const [visible, setVisible] = React.useState(false)
  const mounted = open

  React.useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); setVisible(false); document.removeEventListener('keydown', onKey) }
  }, [open, onOpenChange])

  if (!mounted) return null

  const side = align === 'right' ? 'right-0' : 'left-0'

  return (
    <>
      <div className="fixed inset-0 z-[105]" aria-hidden onClick={() => onOpenChange(false)} />
      <div
        role="menu"
        className={`absolute ${side} z-[110] min-w-[180px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md overflow-hidden origin-top-right transition-all duration-150 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'} ${className}`}
        style={{ top: offsetY, ...style }}
      >
        {children}
      </div>
    </>
  )
}

