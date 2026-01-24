import React, { Suspense, useEffect, useRef } from 'react'
import { useFileMeta, useFileBytes } from '../hooks/useCanvasQueries'
import { PdfViewer } from './pdf'
import { Skeleton } from './Skeleton'

// Lazy load heavy dependencies
const DocxRenderer = React.lazy(() => import('./viewers/DocxRenderer'))
const XlsxRenderer = React.lazy(() => import('./viewers/XlsxRenderer'))
const PptxRenderer = React.lazy(() => import('./viewers/PptxRenderer'))
const TextRenderer = React.lazy(() => import('./viewers/TextRenderer'))

type Props = {
  fileId: string | number
  className?: string
  isFullscreen?: boolean
  // Optional course context for Tier 2 on-open indexing
  courseId?: string | number
  courseName?: string
}

function extFromName(name?: string): string | null {
  if (!name) return null
  const i = name.lastIndexOf('.')
  if (i < 0) return null
  return name.slice(i + 1).toLowerCase()
}

export const FileViewer: React.FC<Props> = ({ fileId, className = '', isFullscreen = false, courseId, courseName }) => {
  const metaQ = useFileMeta(fileId)
  const fileUrlQ = useFileBytes(fileId) // Returns canvas-file:// URL
  const hasTriggeredIndexing = useRef(false)
  
  const name = (metaQ.data as any)?.display_name || (metaQ.data as any)?.filename || (metaQ.data as any)?.name
  const remoteUrl = (metaQ.data as any)?.url as string | undefined
  const contentType = (metaQ.data as any)?.content_type as string | undefined
  const fileSize = (metaQ.data as any)?.size as number | undefined
  const updatedAt = (metaQ.data as any)?.updated_at as string | undefined
  const ext = (extFromName(name || '') || '').toLowerCase()

  // Tier 2: On-open indexing - trigger indexing when user opens a file
  useEffect(() => {
    if (!metaQ.data || !courseId || hasTriggeredIndexing.current) return
    
    // Only index PDF and DOCX files (other formats not supported yet)
    const isIndexable = ext === 'pdf' || ext === 'docx'
    if (!isIndexable) return
    
    hasTriggeredIndexing.current = true
    
    // Fire and forget - don't block the UI
    window.embedding?.indexFile?.(
      String(fileId),
      String(courseId),
      courseName || 'Unknown Course',
      name || 'Unknown File',
      fileSize || 0,
      updatedAt,
      remoteUrl
    ).then(result => {
      if (result?.ok && result.data) {
        if (result.data.skipped) {
          console.log(`[FileViewer] Tier 2: ${name} already indexed`)
        } else {
          console.log(`[FileViewer] Tier 2 indexed ${name}: ${result.data.chunks} chunks`)
        }
      } else if (result?.error) {
        console.warn(`[FileViewer] Tier 2 indexing failed for ${name}:`, result.error)
      }
    }).catch(err => {
      console.warn(`[FileViewer] Tier 2 indexing error:`, err)
    })
  }, [metaQ.data, courseId, courseName, fileId, name, fileSize, updatedAt, remoteUrl, ext])

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
  // Removed 'txt' and 'text/' start check to prevent .py/.tex from auto-opening
  const isTextLike = ['json','xml','html','md','csv'].includes(ext)
  const isSupported = isPdf || isImage || isAudio || isVideo || isDocx || isDoc || isXlsx || isPptx || isTextLike

  const LoadingSkeleton = () => (
    <div className="flex flex-col h-full w-full bg-gray-50/50 dark:bg-neutral-950/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between shrink-0 h-10 mx-4 mt-4 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 px-4 shadow-sm">
         <Skeleton width="w-32" height="h-4" />
         <div className="flex gap-2">
           <Skeleton width="w-8" height="h-8" variant="rounded" />
           <Skeleton width="w-8" height="h-8" variant="rounded" />
         </div>
      </div>
      
      {/* Document Area */}
      <div className="flex-1 flex justify-center p-4 overflow-hidden">
        {/* Paper Page */}
        <div className="w-full max-w-3xl h-full bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-12 space-y-8 relative overflow-hidden">
            <Skeleton height="h-10" width="w-2/3" className="mb-8" />
            <div className="space-y-4">
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-4" width="w-5/6" />
            </div>
            <div className="space-y-4 pt-4">
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-4" width="w-11/12" />
              <Skeleton height="h-4" width="w-full" />
              <Skeleton height="h-4" width="w-4/5" />
            </div>
            
             {/* Center Loading Indicator */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[2px]">
               <span className="text-sm font-medium text-slate-500 dark:text-neutral-400">Loading preview...</span>
            </div>
        </div>
      </div>
    </div>
  )

  let body: React.ReactNode = null

  if (metaQ.isLoading || fileUrlQ.isLoading) {
    body = <LoadingSkeleton />
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
      <Suspense fallback={<div className="h-full p-4"><LoadingSkeleton /></div>}>
        <DocxRenderer url={localUrl} className={className} isFullscreen={isFullscreen} />
      </Suspense>
    )
  } else if (isXlsx && localUrl) {
    body = (
      <Suspense fallback={<div className="h-full p-4"><LoadingSkeleton /></div>}>
        <XlsxRenderer url={localUrl} className={className} />
      </Suspense>
    )
  } else if (isPptx && localUrl) {
    body = (
      <Suspense fallback={<div className="h-full p-4"><LoadingSkeleton /></div>}>
        <PptxRenderer url={localUrl} className={className} />
      </Suspense>
    )
  } else if (isTextLike && localUrl) {
    body = (
      <Suspense fallback={<div className="h-full p-4"><LoadingSkeleton /></div>}>
        <TextRenderer url={localUrl} ext={ext} className={className} isFullscreen={isFullscreen} />
      </Suspense>
    )
  } else if (!isSupported) {
    body = (
      <div className={`flex flex-col items-center justify-center p-8 h-full text-center ${className}`}>
        <div className="mb-4 text-slate-500 dark:text-neutral-400">
          <p className="text-lg font-medium mb-2">File preview not available</p>
          <p className="text-sm opacity-80">
            This file type (.{ext}) cannot be viewed directly.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
          onClick={() => window.system.downloadFile(fileId, name)}
        >
          Download File
        </button>
      </div>
    )
  } else if (remoteUrl) {
    // Fallback if local file load fails but remote URL exists AND isSupported is technically true (should be rare)
    // Or for types we missed in isSupported check but still want to try embedding
    // Actually, given strict requirements, maybe we should force download even here if !isSupported?
    // But the above !isSupported block catches everything not whitelisted.
    // So this block handles supported types that failed local download.
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
