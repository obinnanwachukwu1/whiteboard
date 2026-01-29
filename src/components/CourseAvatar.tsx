import React, { useState, useEffect } from 'react'
import { courseHueFor } from '../utils/colorHelpers'

// Module-level cache of URLs that have been successfully loaded
// This prevents flickering when components remount or lists re-render
const loadedUrls = new Set<string>()

type Props = {
  courseId: string | number
  courseName?: string
  src?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export const CourseAvatar: React.FC<Props> = ({ courseId, courseName, src, className = '', style, size }) => {
  // Check if this URL has already been loaded (from cache or previous render)
  const isAlreadyLoaded = src ? loadedUrls.has(src) : false
  const [loaded, setLoaded] = useState(isAlreadyLoaded)

  // Deterministic color generation
  const hVal = courseHueFor(courseId, courseName || String(courseId))
  const hue = Number.isFinite(hVal) ? hVal : 0
  const fallback = `linear-gradient(135deg, hsl(${hue}, 75%, 62%), hsl(${(hue + 24) % 360}, 85%, 50%))`

  useEffect(() => {
    if (!src) {
      setLoaded(false)
      return
    }

    // If already in our cache, mark as loaded immediately
    if (loadedUrls.has(src)) {
      setLoaded(true)
      return
    }

    // Check if browser has it cached (complete = true means already loaded)
    const img = new Image()
    img.src = src

    if (img.complete && img.naturalWidth > 0) {
      // Image is already cached by browser
      loadedUrls.add(src)
      setLoaded(true)
      return
    }

    // Otherwise wait for load
    setLoaded(false)
    img.onload = () => {
      loadedUrls.add(src)
      setLoaded(true)
    }
    img.onerror = () => setLoaded(false)

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  const finalStyle = {
    ...style,
    width: size ?? style?.width,
    height: size ?? style?.height,
    background: fallback
  }

  return (
    <div
      className={`relative overflow-hidden shrink-0 aspect-square rounded-full flex items-center justify-center ${className}`}
      style={finalStyle}
    >
      {src && (
        <img
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transition: loaded ? 'none' : 'opacity 200ms ease-out' }}
        />
      )}
    </div>
  )
}
