import React, { Suspense } from 'react'
import { useFileMeta, useFileBytes } from '../hooks/useCanvasQueries'
import { PdfViewer } from './PdfViewer'

// Lazy load heavy dependencies
const DocxRenderer = React.lazy(() => import('./viewers/DocxRenderer'))
const XlsxRenderer = React.lazy(() => import('./viewers/XlsxRenderer'))
const PptxRenderer = React.lazy(() => import('./viewers/PptxRenderer'))
const TextRenderer = React.lazy(() => import('./viewers/TextRenderer'))

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
  const fileUrlQ = useFileBytes(fileId) // Returns canvas-file:// URL
  
  const name = (metaQ.data as any)?.display_name || (metaQ.data as any)?.filename || (metaQ.data as any)?.name
  const remoteUrl = (metaQ.data as any)?.url as string | undefined
  const contentType = (metaQ.data as any)?.content_type as string | undefined
  const ext = (extFromName(name || '') || '').toLowerCase()

  // Use the local downloaded URL if available, otherwise fallback to remote
  const localUrl = fileUrlQ.data
  
  const isPdf = contentType?.includes('pdf') || ext === 'pdf'
  const isImage = ['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(ext)
  const isAudio = ['mp3','wav','ogg','m4a','aac'].includes(ext) || contentType?.startsWith('audio/')
  const isVideo = ['mp4','webm','ogg','mov','m4v'].includes(ext) || contentType?.startsWith('video/')
  const isDocx = ext === 'docx'
  const isDoc = ext === 'doc'
  const isXlsx = ext === 'xlsx' || ext === 'xls' || ext === 'csv'
  const isPptx = ext === 'pptx' || ext === 'ppt'
  const isTextLike = ext === 'txt' || contentType?.startsWith('text/') || ['json','xml','html','md','csv'].includes(ext)

  let body: React.ReactNode = null

  if (metaQ.isLoading || fileUrlQ.isLoading) {
    body = <div className={`p-8 text-slate-500 dark:text-slate-400 ${className}`}>Loading file…</div>
  } else if (!metaQ.data) {
    body = <div className={`p-8 text-slate-500 dark:text-slate-400 ${className}`}>Unable to load file metadata.</div>
  } else if (isPdf) {
    body = <PdfViewer fileId={fileId} className={className} fullscreen={isFullscreen} />
  } else if (isImage) {
    if (localUrl) {
      body = (
        <div className={`p-4 ${className}`} style={{ height: '100%' }}>
          <img src={localUrl} alt={name || 'Image'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )
    } else {
      body = <div className={`p-8 text-slate-500 ${className}`}>Image not available</div>
    }
  } else if (isAudio) {
    if (localUrl) {
      body = (
        <div className={`p-4 ${className}`}>
          <audio src={localUrl} controls style={{ width: '100%' }} />
        </div>
      )
    }
  } else if (isVideo) {
    if (localUrl) {
      body = (
        <div className={`p-4 ${className}`} style={{ height: '100%' }}>
          <video src={localUrl} controls style={{ width: '100%', maxHeight: isFullscreen ? '100%' : 600 }} />
        </div>
      )
    }
  } else if ((isDocx || isXlsx || isPptx || isDoc) && !localUrl && remoteUrl) {
    // Fallback to Office Viewer if local download failed or pending
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(remoteUrl)}`
    body = (
      <div className={className} style={{ height: '100%' }}>
        <div className="overflow-hidden border border-gray-200 dark:border-neutral-700 rounded-lg" style={{ height: '100%' }}>
          <iframe
            src={viewer}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={name || 'Document viewer'}
          />
        </div>
      </div>
    )
  } else if (isDocx && localUrl) {
    body = (
      <Suspense fallback={<div className="p-4">Loading viewer...</div>}>
        <DocxRenderer url={localUrl} className={className} isFullscreen={isFullscreen} />
      </Suspense>
    )
  } else if (isXlsx && localUrl) {
    body = (
      <Suspense fallback={<div className="p-4">Loading viewer...</div>}>
        <XlsxRenderer url={localUrl} className={className} />
      </Suspense>
    )
  } else if (isPptx && localUrl) {
    body = (
      <Suspense fallback={<div className="p-4">Loading viewer...</div>}>
        <PptxRenderer url={localUrl} className={className} />
      </Suspense>
    )
  } else if (isTextLike && localUrl) {
    body = (
      <Suspense fallback={<div className="p-4">Loading viewer...</div>}>
        <TextRenderer url={localUrl} ext={ext} className={className} isFullscreen={isFullscreen} />
      </Suspense>
    )
  } else if (remoteUrl) {
    body = (
      <div className={className} style={{ height: '100%' }}>
        <div className="overflow-hidden border border-gray-200 dark:border-neutral-700 rounded-lg" style={{ height: '100%' }}>
          <iframe
            src={remoteUrl}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts"
            title={name || 'File'}
          />
        </div>
        <div className="p-2 text-right">
          <button
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-neutral-800 rounded hover:bg-slate-200 dark:hover:bg-neutral-700"
            onClick={async () => { (await import('../utils/openExternal')).openExternal(remoteUrl) }}
          >
            Open in Browser
          </button>
        </div>
      </div>
    )
  } else {
    body = <div className={`p-8 text-slate-500 dark:text-neutral-400 ${className}`}>No preview available.</div>
  }

  return <>{body}</>
}
