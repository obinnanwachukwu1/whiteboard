import React, { useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'

type Props = {
  html: string
  onNavigate?: (url: string) => void
  className?: string
}

export const HtmlContent: React.FC<Props> = ({ html, onNavigate, className = '' }) => {
  const sanitized = useMemo(() => DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } }), [html])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const a = target.closest('a') as HTMLAnchorElement | null
      if (!a || !a.href) return
      const href = a.getAttribute('href') || ''
      if (href.startsWith('http')) return // let external links pass
      e.preventDefault()
      onNavigate?.(href)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onNavigate])

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}


