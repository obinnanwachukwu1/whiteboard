import React, { useEffect, useRef, useState } from 'react'
import { renderAsync as renderDocx } from 'docx-preview'

type Props = {
  url: string
  className?: string
  isFullscreen?: boolean
}

const DocxRenderer: React.FC<Props> = ({ url, className = '', isFullscreen }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed to fetch file')
        const blob = await resp.blob()
        if (cancelled || !containerRef.current) return
        
        containerRef.current.innerHTML = ''
        await renderDocx(blob, containerRef.current, undefined, { inWrapper: false })
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      }
    })()
    return () => { cancelled = true }
  }, [url])

  return (
    <div className={`p-4 overflow-auto ${className}`} style={{ height: '100%' }}>
      <div ref={containerRef} className="prose prose-slate dark:prose-invert max-w-none" style={{ minHeight: isFullscreen ? '100%' : undefined }} />
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  )
}

export default DocxRenderer
