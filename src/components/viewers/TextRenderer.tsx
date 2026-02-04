import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ViewerFrame from './ViewerFrame'
import ViewerToolbar from './ViewerToolbar'

type Props = {
  url: string
  ext: string
  className?: string
  isFullscreen?: boolean
  onDownload?: () => void
}

const TextRenderer: React.FC<Props> = ({ url, ext, className = '', isFullscreen, onDownload }) => {
  const [content, setContent] = useState<{ type: 'html' | 'text'; data: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Only fetch local/opaque URLs. Canvas content should be accessed via canvas-file://.
        const parsed = new URL(url)
        if (!['canvas-file:', 'blob:', 'data:'].includes(parsed.protocol)) {
          throw new Error('Blocked non-local URL')
        }
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
      <ViewerFrame
        className={className}
        padding="default"
        toolbar={
          <ViewerToolbar onDownload={onDownload} disableDownload={!onDownload} />
        }
      >
        <div className="rich-html" dangerouslySetInnerHTML={{ __html: content.data }} />
      </ViewerFrame>
    )
  }

  return (
    <ViewerFrame
      className={className}
      padding="default"
      toolbar={
        <ViewerToolbar onDownload={onDownload} disableDownload={!onDownload} />
      }
    >
      <pre className="whitespace-pre-wrap" style={{ maxHeight: isFullscreen ? '100%' : 600 }}>
        {content.data}
      </pre>
    </ViewerFrame>
  )
}

export default TextRenderer
