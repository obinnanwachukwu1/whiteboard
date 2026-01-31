/**
 * Degree-audit PDF text extraction (renderer wrapper)
 *
 * Extraction runs in the main process via IPC to keep the renderer responsive
 * and to avoid bundling heavy PDF parsing deps into the UI.
 */

export type DegreeAuditPdfExtractOptions = {
  maxPages?: number
  maxFileSizeBytes?: number
  maxChars?: number
}

function requireDegreeAuditApi(): NonNullable<typeof window.degreeAudit> {
  if (!window.degreeAudit || typeof window.degreeAudit.extractPdfText !== 'function') {
    throw new Error('Degree audit extraction is unavailable in this environment')
  }
  return window.degreeAudit
}

export async function extractTextFromPdf(
  file: File,
  options: DegreeAuditPdfExtractOptions = {},
): Promise<string> {
  const buffer = await file.arrayBuffer()
  return extractTextFromArrayBuffer(buffer, options)
}

export async function extractTextFromArrayBuffer(
  buffer: ArrayBuffer,
  options: DegreeAuditPdfExtractOptions = {},
): Promise<string> {
  const api = requireDegreeAuditApi()
  const res = await api.extractPdfText(buffer, options)
  if (!res.ok) {
    throw new Error(res.error || 'Failed to extract PDF text')
  }
  return res.data?.text || ''
}
