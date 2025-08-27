import React, { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'

type Props = {
  html: string
  onNavigate?: (url: string) => void
  className?: string
}

export const HtmlContent: React.FC<Props> = ({ html, onNavigate, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html || '', {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['style', 'target', 'rel', 'class', 'id', 'srcset', 'sizes', 'loading', 'decoding', 'referrerpolicy', 'allow', 'allowfullscreen', 'frameborder'],
      ADD_TAGS: ['img', 'video', 'audio', 'source', 'picture', 'figure', 'figcaption', 'iframe'],
      // Keep links and images functional
      ALLOW_UNKNOWN_PROTOCOLS: true,
    } as any)
  }, [html])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const a = target.closest('a') as HTMLAnchorElement | null
      if (!a || !a.href) return
      // Only intercept if consumer provided a handler
      if (!onNavigate) return
      e.preventDefault()
      const href = a.href || a.getAttribute('href') || ''
      onNavigate(href)
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [onNavigate])

  return <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
