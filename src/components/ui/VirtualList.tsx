import React, { useMemo, useRef, useState, useEffect } from 'react'

type Props<T> = {
  items: T[]
  height: number
  itemHeight: number
  overscan?: number
  className?: string
  renderItem: (item: T, index: number) => React.ReactNode
}

export function VirtualList<T>({ items, height, itemHeight, overscan = 6, className = '', renderItem }: Props<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const total = items.length
  const totalHeight = total * itemHeight

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(total, Math.ceil((scrollTop + height) / itemHeight) + overscan)

  const offsetY = startIndex * itemHeight
  const visible = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={containerRef} className={className} style={{ height, overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {visible.map((it, i) => (
            <div key={(startIndex + i)} style={{ height: itemHeight }}>
              {renderItem(it, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

