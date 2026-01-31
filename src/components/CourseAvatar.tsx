import React, { useEffect, useLayoutEffect, useState } from 'react'
import { courseHueFor } from '../utils/colorHelpers'
import { isImagePreloaded, markImagePreloaded, preloadImage } from '../utils/imagePreload'

type Props = {
  courseId: string | number
  courseName?: string
  src?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export const CourseAvatar: React.FC<Props> = ({ courseId, courseName, src, className = '', style, size }) => {
  const [loaded, setLoaded] = useState(() => (src ? isImagePreloaded(src) : false))

  // Deterministic color generation
  const hVal = courseHueFor(courseId, courseName || String(courseId))
  const hue = Number.isFinite(hVal) ? hVal : 0
  const fallback = `linear-gradient(135deg, hsl(${hue}, 75%, 62%), hsl(${(hue + 24) % 360}, 85%, 50%))`

  // Best-effort sync check before paint (helps avoid first-frame fallback when cached)
  useLayoutEffect(() => {
    if (!src) return

    if (isImagePreloaded(src)) {
      if (!loaded) setLoaded(true)
      return
    }

    const img = new Image()
    img.src = src
    if (img.complete && img.naturalWidth > 0) {
      markImagePreloaded(src)
      if (!loaded) setLoaded(true)
    }
  }, [src, loaded])

  useEffect(() => {
    if (!src) {
      setLoaded(false)
      return
    }

    if (isImagePreloaded(src)) {
      setLoaded(true)
      return
    }

    let cancelled = false
    setLoaded(false)
    preloadImage(src)
      .then(() => {
        if (!cancelled) setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(false)
      })
    return () => {
      cancelled = true
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
        />
      )}
    </div>
  )
}
