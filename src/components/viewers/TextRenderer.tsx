import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type Props = {
  url: string
  ext: string
  className?: string
  isFullscreen?: boolean
}

const TextRenderer: React.FC<Props> = ({ url, ext, className = '', isFullscreen }) => {
  const [content, setContent] = useState<{ type: 'html' | 'text'; data: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed')
        const text = await resp.text()
        if (cancelled) return

        if (ext === 'md') {
          const html = await marked.parse(text)
          setContent({ type: 'html', data: DOMPurify.sanitize(html) })
        } else if (ext === 'json') {
          try {
            const pretty = JSON.stringify(JSON.parse(text), null, 2)
            setContent({ type: 'text', data: pretty })
          } catch {
            setContent({ type: 'text', data: text })
          }
        } else {
          setContent({ type: 'text', data: text })
        }
      } catch {
        if (!cancelled) setContent(null)
      }
    })()
    return () => { cancelled = true }
  }, [url, ext])

  if (!content) return null

  if (content.type === 'html') {
    return (
      <div className={`p-4 overflow-auto ${className}`} style={{ height: '100%' }}>
        <div className="rich-html" dangerouslySetInnerHTML={{ __html: content.data }} />
      </div>
    )
  }

  return (
    <pre className={`p-4 overflow-auto ${className}`} style={{ maxHeight: isFullscreen ? '100%' : 600 }}>
      {content.data}
    </pre>
  )
}

export default TextRenderer
