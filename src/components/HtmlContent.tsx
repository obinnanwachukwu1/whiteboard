
import React, { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'

// Configure global DOMPurify hooks for security
// 1. Enforce strict sandbox on iframes
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const el = node as Element
    const src = el.getAttribute('src') || ''
    // Only allow http/https protocols
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      el.remove()
      return
    }

    // Force sandbox with minimal permissions
    // NO allow-same-origin (prevents accessing parent)
    // NO allow-top-navigation (prevents redirecting app)
    // Removed allow-popups-to-escape-sandbox as recommended
    const sandbox = 'allow-scripts allow-forms allow-downloads allow-modals'
    el.setAttribute('sandbox', sandbox)
    
    // Prevent srcdoc abuse
    el.removeAttribute('srcdoc')
    
    // Security headers for the frame
    el.setAttribute('loading', 'lazy')
    el.setAttribute('referrerpolicy', 'no-referrer')
  }
})

// 2. Ensure links open safely if they bypass the click handler
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as Element
  if ('target' in el) {
    el.setAttribute('target', '_blank')
    el.setAttribute('rel', 'noopener noreferrer')
  }
})

type Props = {

  html: string

  onNavigate?: (url: string, title?: string) => void
  className?: string
}

export const HtmlContent: React.FC<Props> = ({ html, onNavigate, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html || '', {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['style', 'target', 'rel', 'class', 'id', 'src', 'href', 'alt', 'title', 'width', 'height', 'srcset', 'sizes', 'loading', 'decoding', 'referrerpolicy', 'allow', 'allowfullscreen', 'frameborder', 'data-api-endpoint', 'data-api-returntype'],
      ADD_TAGS: ['img', 'video', 'audio', 'source', 'picture', 'figure', 'figcaption', 'iframe'],
      // Keep links and images functional, but block unknown protocols
      ALLOW_UNKNOWN_PROTOCOLS: false,
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
      const title = a.innerText || a.textContent || undefined
      onNavigate(href, title)
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [onNavigate])

  return <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
