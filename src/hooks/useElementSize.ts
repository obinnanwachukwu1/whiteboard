import { useState, useCallback, useLayoutEffect } from 'react'

type Size = {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  (node: T | null) => void,
  Size
] {
  const [ref, setRef] = useState<T | null>(null)
  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  })

  const handleSize = useCallback(() => {
    setSize({
      width: ref?.offsetWidth || 0,
      height: ref?.offsetHeight || 0,
    })
  }, [ref])

  useLayoutEffect(() => {
    if (!ref) return
    handleSize()
    
    // Use ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => handleSize())
      resizeObserver.observe(ref)
      return () => resizeObserver.disconnect()
    } else {
      window.addEventListener('resize', handleSize)
      return () => window.removeEventListener('resize', handleSize)
    }
  }, [ref, handleSize])

  return [setRef, size]
}
