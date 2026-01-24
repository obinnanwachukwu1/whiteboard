import React, { useEffect, useState } from 'react'
import JSZip from 'jszip'
import ViewerFrame from './ViewerFrame'
import ViewerToolbar from './ViewerToolbar'

type Props = {
  url: string
  className?: string
  onDownload?: () => void
}

const PptxRenderer: React.FC<Props> = ({ url, className = '', onDownload }) => {
  const [slides, setSlides] = useState<{ index: number; text: string }[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Failed')
        const buf = await resp.arrayBuffer()
        if (cancelled) return

        const zip = new JSZip()
        const z = await zip.loadAsync(buf)
        const files = Object.keys(z.files).filter((p) => p.startsWith('ppt/slides/slide') && p.endsWith('.xml'))
        files.sort((a,b) => {
          const pa = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
          const pb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
          return pa - pb
        })
        const s: { index: number; text: string }[] = []
        for (const p of files) {
          const xml = await z.file(p)!.async('text')
          const dom = new DOMParser().parseFromString(xml, 'application/xml')
          const texts = Array.from(dom.getElementsByTagName('a:t')).map((t) => t.textContent || '')
          s.push({ index: s.length + 1, text: texts.join(' ') })
        }
        if (!cancelled) setSlides(s)
      } catch {
        if (!cancelled) setSlides([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [url])

  if (!slides.length) return null

  return (
    <ViewerFrame
      className={className}
      padding="default"
      toolbar={
        <ViewerToolbar onDownload={onDownload} disableDownload={!onDownload} />
      }
    >
      <div className="space-y-4">
        {slides.map((s, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-neutral-700 rounded p-3 bg-white dark:bg-neutral-900">
            <div className="text-xs text-slate-500 dark:text-neutral-400">Slide {s.index}</div>
            <div className="mt-1 whitespace-pre-wrap">{s.text || '—'}</div>
          </div>
        ))}
      </div>
    </ViewerFrame>
  )
}

export default PptxRenderer
