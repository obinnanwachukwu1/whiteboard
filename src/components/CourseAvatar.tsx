import React, { useState, useEffect } from 'react'
import { courseHueFor } from '../utils/colorHelpers'

type Props = {
  courseId: string | number
  courseName?: string
  src?: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
}

export const CourseAvatar: React.FC<Props> = ({ courseId, courseName, src, className = '', style, size }) => {
  const [loaded, setLoaded] = useState(false)
  
  // Deterministic color generation
  const hVal = courseHueFor(courseId, courseName || String(courseId))
  const hue = Number.isFinite(hVal) ? hVal : 0
  const fallback = `linear-gradient(135deg, hsl(${hue}, 75%, 62%), hsl(${(hue + 24) % 360}, 85%, 50%))`

  useEffect(() => {
    if (!src) {
      setLoaded(false)
      return
    }
    const img = new Image()
    img.src = src
    img.onload = () => setLoaded(true)
    img.onerror = () => setLoaded(false)
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
