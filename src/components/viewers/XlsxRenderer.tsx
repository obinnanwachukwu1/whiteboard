import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import DOMPurify from 'dompurify'
import ViewerFrame from './ViewerFrame'
import ViewerToolbar from './ViewerToolbar'

type Props = {
  url: string
  className?: string
  onDownload?: () => void
}

const XlsxRenderer: React.FC<Props> = ({ url, className = '', onDownload }) => {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed')
        const buf = await resp.arrayBuffer()
        if (cancelled) return

        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const rawHtml = XLSX.utils.sheet_to_html(sheet, { editable: false })
        setHtml(DOMPurify.sanitize(rawHtml))
      } catch {
        if (!cancelled) setHtml(null)
      }
    })()
    return () => { cancelled = true }
  }, [url])

  if (!html) return null

  return (
    <ViewerFrame
      className={className}
      padding="default"
      contentClassName="min-w-max"
      toolbar={
        <ViewerToolbar onDownload={onDownload} disableDownload={!onDownload} />
      }
    >
      <div className="inline-block" dangerouslySetInnerHTML={{ __html: html }} />
    </ViewerFrame>
  )
}

export default XlsxRenderer
