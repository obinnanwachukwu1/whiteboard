import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFileMeta, useFileBytes } from '../hooks/useCanvasQueries'
import { PdfViewer } from './PdfViewer'
import { marked } from 'marked'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { renderAsync as renderDocx } from 'docx-preview'

type Props = {
  fileId: string | number
  className?: string
  isFullscreen?: boolean
}

function extFromName(name?: string): string | null {
  if (!name) return null
  const i = name.lastIndexOf('.')
  if (i < 0) return null
  return name.slice(i + 1).toLowerCase()
}

export const FileViewer: React.FC<Props> = ({ fileId, className = '', isFullscreen = false }) => {
  const metaQ = useFileMeta(fileId)
  const bytesQ = useFileBytes(fileId)
  const [error, setError] = useState<string | null>(null)
  const name = (metaQ.data as any)?.display_name || (metaQ.data as any)?.filename || (metaQ.data as any)?.name
  const url = (metaQ.data as any)?.url as string | undefined
  const contentType = (metaQ.data as any)?.content_type as string | undefined
  const ext = (extFromName(name || '') || '').toLowerCase()

  const containerRef = useRef<HTMLDivElement | null>(null)

  const isPdf = contentType?.includes('pdf') || ext === 'pdf'
  const isImage = ['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(ext)
  const isAudio = ['mp3','wav','ogg','m4a','aac'].includes(ext) || contentType?.startsWith('audio/')
  const isVideo = ['mp4','webm','ogg','mov','m4v'].includes(ext) || contentType?.startsWith('video/')
  const isDocx = ext === 'docx'
  const isDoc = ext === 'doc'
  const isXlsx = ext === 'xlsx' || ext === 'xls' || ext === 'csv'
  const isPptx = ext === 'pptx' || ext === 'ppt'
  const isTextLike = ext === 'txt' || contentType?.startsWith('text/') || ['json','xml','html','md','csv'].includes(ext)

  useEffect(() => {
    setError(null)
  }, [fileId])

  // DOCX local render
  useEffect(() => {
    const el = containerRef.current
    if (!isDocx || !bytesQ.data || !el) return
    let cancelled = false
    ;(async () => {
      try {
        el.innerHTML = ''
        await renderDocx(bytesQ.data as ArrayBuffer, el, undefined, { inWrapper: false })
      } catch (e: any) {
        if (!cancelled) setError('Failed to render DOCX locally')
      }
    })()
    return () => { cancelled = true }
  }, [isDocx, bytesQ.data])

  // XLSX/CSV local render (memoized html string)
  const xlsxTable = useMemo(() => {
    if (!isXlsx || !bytesQ.data) return null
    try {
      const wb = XLSX.read(new Uint8Array(bytesQ.data as ArrayBuffer), { type: 'array' })
      const sheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      return XLSX.utils.sheet_to_html(sheet, { editable: false })
    } catch (e) {
      return null
    }
  }, [isXlsx, bytesQ.data])

  // PPTX basic text fallback (extract slide text) -> use state + effect (no async in useMemo)
  const [pptxSlides, setPptxSlides] = useState<{ index: number; text: string }[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isPptx || !bytesQ.data) { setPptxSlides([]); return }
      try {
        const zip = new JSZip()
        const buf = bytesQ.data as ArrayBuffer
        const z = await zip.loadAsync(buf)
        const files = Object.keys(z.files).filter((p) => p.startsWith('ppt/slides/slide') && p.endsWith('.xml'))
        files.sort((a,b) => {
          const pa = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
          const pb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
          return pa - pb
        })
        const slides: { index: number; text: string }[] = []
        for (const p of files) {
          const xml = await z.file(p)!.async('text')
          const dom = new DOMParser().parseFromString(xml, 'application/xml')
          const texts = Array.from(dom.getElementsByTagName('a:t')).map((t) => t.textContent || '')
          slides.push({ index: slides.length + 1, text: texts.join(' ') })
        }
        if (!cancelled) setPptxSlides(slides)
      } catch {
        if (!cancelled) setPptxSlides([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [isPptx, bytesQ.data])

  // Create blob URL for media (stable hooks order regardless of branches)

  const _mimeFromExt = (e?: string): string | undefined => {
    switch ((e || '').toLowerCase()) {
      case 'png': return 'image/png'
      case 'jpg':
      case 'jpeg': return 'image/jpeg'
      case 'gif': return 'image/gif'
      case 'webp': return 'image/webp'
      case 'bmp': return 'image/bmp'
      case 'svg': return 'image/svg+xml'
      case 'avif': return 'image/avif'
      case 'mp3': return 'audio/mpeg'
      case 'wav': return 'audio/wav'
      case 'ogg': return (contentType && contentType.startsWith('video/')) ? 'video/ogg' : 'audio/ogg'
      case 'm4a': return 'audio/mp4'
      case 'aac': return 'audio/aac'
      case 'mp4': return 'video/mp4'
      case 'webm': return 'video/webm'
      case 'mov': return 'video/quicktime'
      case 'm4v': return 'video/x-m4v'
      default: return contentType
    }
  }
  const __blobUrl = (() => {
    if (!bytesQ.data) return null as string | null
    try {
      const mime = _mimeFromExt(ext)
      const blob = new Blob([bytesQ.data as ArrayBuffer], { type: mime })
      return URL.createObjectURL(blob)
    } catch { return null }
  })()
  React.useEffect(() => { return () => { if (__blobUrl) URL.revokeObjectURL(__blobUrl) } }, [__blobUrl])
  let body: React.ReactNode = null
  if (metaQ.isLoading || bytesQ.isLoading) {
    body = <div className={`p-8 text-slate-500 dark:text-slate-400 ${className}`}>Loading file…</div>
  } else if (!metaQ.data) {
    body = <div className={`p-8 text-slate-500 dark:text-slate-400 ${className}`}>Unable to load file metadata.</div>
  } else if (isPdf) {
    body = <PdfViewer fileId={fileId} className={className} fullscreen={isFullscreen} />
  } else if (isImage) {
    if (__blobUrl) {
      body = (
        <div className={`p-4 ${className}`} style={{ height: '100%' }}>
          <img src={__blobUrl} alt={name || 'Image'} style={{ width: '100%', height: isFullscreen ? '100%' : 'auto', objectFit: 'contain' }} />
        </div>
      )
    } else {
      body = (
        <div className={`p-4 ${className}`}>
          <div className="text-slate-500 dark:text-slate-400 mb-2">Unable to preview image inline.</div>
          {url && (
            <button className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => window.system?.openExternal?.(url)}>
              Open in Browser
            </button>
          )}
        </div>
      )
    }
  } else if (isAudio) {
    if (__blobUrl) {
      body = (
        <div className={`p-4 ${className}`}>
          <audio src={__blobUrl} controls style={{ width: '100%' }} />
        </div>
      )
    } else {
      body = (
        <div className={`p-4 ${className}`}>
          <div className="text-slate-500 dark:text-slate-400 mb-2">Unable to preview audio inline.</div>
          {url && (
            <button className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => window.system?.openExternal?.(url)}>
              Open in Browser
            </button>
          )}
        </div>
      )
    }
  } else if (isVideo) {
    if (__blobUrl) {
      body = (
        <div className={`p-4 ${className}`} style={{ height: '100%' }}>
          <video src={__blobUrl} controls style={{ width: '100%', maxHeight: isFullscreen ? '100%' : 600 }} />
        </div>
      )
    } else {
      body = (
        <div className={`p-4 ${className}`}>
          <div className="text-slate-500 dark:text-slate-400 mb-2">Unable to preview video inline.</div>
          {url && (
            <button className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => window.system?.openExternal?.(url)}>
              Open in Browser
            </button>
          )}
        </div>
      )
    }
  } else if ((isDocx || isXlsx || isPptx || isDoc) && url) {
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    body = (
      <div className={className} style={{ height: '100%' }}>
        <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg" style={{ height: isFullscreen ? '100%' : '600px' }}>
          <iframe
            src={viewer}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={name || 'Document viewer'}
          />
        </div>
        {(isDocx || isXlsx || isPptx) && (
          <div className="p-3 text-xs text-slate-500">If the embedded viewer fails to load, a simplified local preview may be shown.</div>
        )}
      </div>
    )
  } else if (isDocx) {
    body = (
      <div className={`p-4 ${className}`} style={{ height: '100%' }}>
        <div ref={containerRef} className="prose prose-slate dark:prose-invert max-w-none" style={{ minHeight: isFullscreen ? '100%' : undefined }} />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    )
  } else if (isXlsx && xlsxTable) {
    body = (
      <div className={`p-4 ${className}`} style={{ height: '100%' }}>
        <div dangerouslySetInnerHTML={{ __html: xlsxTable }} />
      </div>
    )
  } else if (isPptx && Array.isArray(pptxSlides)) {
    body = (
      <div className={`p-4 space-y-4 ${className}`} style={{ height: '100%' }}>
        {pptxSlides.map((s: any, idx: number) => (
          <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded p-3">
            <div className="text-xs text-slate-500">Slide {s.index}</div>
            <div className="mt-1 whitespace-pre-wrap">{s.text || '—'}</div>
          </div>
        ))}
      </div>
    )
  } else if (isTextLike && bytesQ.data) {
    try {
      const text = new TextDecoder('utf-8').decode(bytesQ.data as ArrayBuffer)
      if (ext === 'md') {
        const html = marked.parse(text)
        body = <div className={`p-4 ${className}`} style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: String(html) }} />
      } else if (ext === 'json') {
        const pretty = JSON.stringify(JSON.parse(text), null, 2)
        body = <pre className={`p-4 overflow-auto ${className}`} style={{ maxHeight: isFullscreen ? '100%' : 600 }}>{pretty}</pre>
      } else {
        body = <pre className={`p-4 overflow-auto ${className}`} style={{ maxHeight: isFullscreen ? '100%' : 600 }}>{text}</pre>
      }
    } catch {
      body = <div className={`p-4 ${className}`}>Unable to preview text.</div>
    }
  } else if (url) {
    body = (
      <div className={className} style={{ height: '100%' }}>
        <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg" style={{ height: isFullscreen ? '100%' : '600px' }}>
          <iframe src={url} className="w-full h-full" style={{ border: 'none' }} title={name || 'File'} />
        </div>
        <div className="p-2 text-right">
          <button
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={() => window.system?.openExternal?.(url)}
          >
            Open in Browser
          </button>
        </div>
      </div>
    )
  } else {
    body = <div className={`p-8 text-slate-500 dark:text-slate-400 ${className}`}>No preview available.</div>
  }

  return <>{body}</>

  if (isAudio) {
    if (bytesQ.isLoading) {
      return <div className={`p-4 ${className} text-slate-500 dark:text-slate-400`}>Loading audio…</div>
    }
    if (__blobUrl) {
      return (
        <div className={`p-4 ${className}`}>
          <audio src={__blobUrl} controls style={{ width: '100%' }} />
        </div>
      )
    }
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400 mb-2">Unable to preview audio inline.</div>
        {url && (
          <button className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => window.system?.openExternal?.(url)}>
            Open in Browser
          </button>
        )}
      </div>
    )
  }

  if (isVideo) {
    if (bytesQ.isLoading) {
      return <div className={`p-4 ${className} text-slate-500 dark:text-slate-400`}>Loading video…</div>
    }
    if (__blobUrl) {
      return (
        <div className={`p-4 ${className}`}>
          <video src={__blobUrl} controls style={{ width: '100%', maxHeight: 600 }} />
        </div>
      )
    }
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-slate-500 dark:text-slate-400 mb-2">Unable to preview video inline.</div>
        {url && (
          <button className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => window.system?.openExternal?.(url)}>
            Open in Browser
          </button>
        )}
      </div>
    )
  }

  // Office Online primary path
  if ((isDocx || isXlsx || isPptx || isDoc) && url) {
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    return (
      <div className={className}>
        <div className="h-96 overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg" style={{ height: '600px' }}>
          <iframe
            src={viewer}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={name || 'Document viewer'}
          />
        </div>
        {/* Local fallback below if online viewer fails (user can switch by toggling network off) */}
        {(isDocx || isXlsx || isPptx) && (
          <div className="p-3 text-xs text-slate-500">If the embedded viewer fails to load, the app can render a simplified local preview when network is unavailable.</div>
        )}
      </div>
    )
  }

  // Local fallbacks when Office viewer isn't possible
  if (isDocx) {
    return (
      <div className={`p-4 ${className}`}>
        <div ref={containerRef} className="prose prose-slate dark:prose-invert max-w-none" />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    )
  }

  if (isXlsx && xlsxTable) {
    return (
      <div className={`p-4 ${className}`}>
        <div dangerouslySetInnerHTML={{ __html: xlsxTable }} />
      </div>
    )
  }

  if (isPptx && Array.isArray(pptxSlides)) {
    return (
      <div className={`p-4 space-y-4 ${className}`}>
        {pptxSlides.map((s: any, idx: number) => (
          <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded p-3">
            <div className="text-xs text-slate-500">Slide {s.index}</div>
            <div className="mt-1 whitespace-pre-wrap">{s.text || '—'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (isTextLike && bytesQ.data) {
    try {
      const text = new TextDecoder('utf-8').decode(bytesQ.data as ArrayBuffer)
      if (ext === 'md') {
        const html = marked.parse(text)
        return <div className={`p-4 ${className}`} dangerouslySetInnerHTML={{ __html: String(html) }} />
      }
      if (ext === 'json') {
        const pretty = JSON.stringify(JSON.parse(text), null, 2)
        return <pre className={`p-4 overflow-auto ${className}`}>{pretty}</pre>
      }
      return <pre className={`p-4 overflow-auto ${className}`}>{text}</pre>
    } catch {
      // ignore
    }
  }

  // Note: dead code below retained from previous implementation was removed for clarity.
}
