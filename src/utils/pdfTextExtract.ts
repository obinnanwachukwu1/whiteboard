/**
 * PDF Text Extraction Utility
 * Used for extracting text from degree audit PDFs
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

try {
  ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker
} catch {}

interface TextItem {
  str: string
  hasEOL?: boolean
}

function collapseItemsToLines(items: Array<{ str: string; hasEOL?: boolean }>): string {
  const lines: string[] = []
  let buffer = ''

  items.forEach(({ str, hasEOL }) => {
    const trimmed = str.replace(/\s+/g, ' ').trim()
    if (trimmed.length === 0) {
      if (hasEOL && buffer.length > 0) {
        lines.push(buffer)
        buffer = ''
      }
      return
    }

    buffer = buffer.length > 0 ? `${buffer} ${trimmed}` : trimmed

    if (hasEOL) {
      lines.push(buffer)
      buffer = ''
    }
  })

  if (buffer.length > 0) {
    lines.push(buffer)
  }

  return lines.join('\n')
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    })
    const textItems = textContent.items.filter((item: any): item is TextItem => 'str' in item)
    const lines = textItems.map((item: any) => ({ str: item.str, hasEOL: Boolean(item.hasEOL) }))
    pages.push(collapseItemsToLines(lines))
  }

  pdf.destroy()
  return pages.join('\n')
}

export async function extractTextFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    })
    const textItems = textContent.items.filter((item: any): item is TextItem => 'str' in item)
    const lines = textItems.map((item: any) => ({ str: item.str, hasEOL: Boolean(item.hasEOL) }))
    pages.push(collapseItemsToLines(lines))
  }

  pdf.destroy()
  return pages.join('\n')
}
