import { memo, useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import { HtmlContent } from '../HtmlContent'
import { normalizeMarkdownFinal, normalizeMarkdownStreaming } from '../../utils/markdownNormalize'

type Props = {
  markdown: string
  streaming: boolean
  className?: string
}

export const MarkdownMessage = memo(function MarkdownMessage({
  markdown,
  streaming,
  className = '',
}: Props) {
  const [html, setHtml] = useState('')
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedTextLength = useRef(0)

  useEffect(() => {
    if (!markdown) {
      setHtml('')
      lastRenderedTextLength.current = 0
      return
    }

    const normalize = (text: string) =>
      streaming ? normalizeMarkdownStreaming(text) : normalizeMarkdownFinal(text)

    const renderMarkdown = async (markdownToRender: string) => {
      try {
        const rawHtml = await marked.parse(normalize(markdownToRender), { async: true })
        setHtml(String(rawHtml || ''))
      } catch (e) {
        // Fallback: render as plain text in a <pre>-like block.
        const escaped = normalize(markdownToRender)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        setHtml(`<pre>${escaped}</pre>`)
      }
    }

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)

    // Streaming-smooth: render up to last newline immediately.
    const lastNewlineIndex = markdown.lastIndexOf('\n')
    if (lastNewlineIndex !== -1 && lastNewlineIndex + 1 > lastRenderedTextLength.current) {
      const safeText = markdown.slice(0, lastNewlineIndex + 1)
      renderMarkdown(safeText)
      lastRenderedTextLength.current = safeText.length
    }

    // Debounced flush for the partial line / end-of-stream.
    flushTimeoutRef.current = setTimeout(() => {
      renderMarkdown(markdown)
      lastRenderedTextLength.current = markdown.length
    }, 120)

    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
    }
  }, [markdown, streaming])

  return <HtmlContent html={html} className={className} />
})
