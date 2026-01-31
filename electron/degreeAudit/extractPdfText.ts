// Degree-audit PDF text extraction (main process)
// Keeps heavy PDF parsing off the renderer.

import { extractText } from 'unpdf'

export type DegreeAuditPdfExtractOptions = {
  maxPages?: number
  maxFileSizeBytes?: number
  maxChars?: number
}

export type DegreeAuditPdfExtractResult = {
  text: string
  pageCount: number
  truncated: boolean
  extractedChars: number
}

const DEFAULT_MAX_PAGES = 50
const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
const DEFAULT_MAX_CHARS = 2_000_000

function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }

  throw new Error('invalid_pdf_bytes')
}

export async function extractDegreeAuditPdfTextFromBytes(
  pdfBytes: unknown,
  options: DegreeAuditPdfExtractOptions = {},
): Promise<DegreeAuditPdfExtractResult> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS

  const data = toUint8Array(pdfBytes)
  if (data.byteLength > maxFileSizeBytes) {
    throw new Error(
      `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB > ${Math.round(
        maxFileSizeBytes / 1024 / 1024,
      )}MB limit)`,
    )
  }

  // Use per-page output so we can limit pages.
  const result = await extractText(data, { mergePages: false })

  const pageCount = Number(result.totalPages || 0) || 1

  let pages: string[] = []
  if (Array.isArray(result.text)) {
    pages = result.text.filter((t: unknown): t is string => typeof t === 'string')
  } else if (typeof result.text === 'string') {
    pages = [result.text]
  }

  const usedPages = pages.slice(0, Math.max(0, maxPages))
  let text = usedPages.join('\n\n')
  let truncated = pageCount > maxPages

  if (text.length > maxChars) {
    text = text.slice(0, maxChars)
    truncated = true
  }

  return {
    text,
    pageCount,
    truncated,
    extractedChars: text.length,
  }
}
