// electron/embedding/extractionWorker.ts
// Text extraction for PDF and DOCX files
// Designed to run in the main process but yield frequently to avoid blocking

import fs from 'fs'
import path from 'path'

// unpdf is designed for Node.js/serverless - no DOM dependencies
import { extractText } from 'unpdf'
// For DOCX, we use mammoth
import mammoth from 'mammoth'

export interface ExtractionResult {
  text: string
  pageCount: number
  truncated: boolean
  extractedChars: number
  error?: string
}

export interface ExtractionOptions {
  maxPages?: number           // Default: 50
  maxFileSizeBytes?: number   // Default: 50MB
}

const DEFAULT_MAX_PAGES = 50
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * Extract text from a PDF file using unpdf (Node.js compatible)
 */
async function extractPdfText(filePath: string, options: ExtractionOptions): Promise<ExtractionResult> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES

  try {
    // Read file into buffer, then convert to Uint8Array (required by unpdf)
    const nodeBuffer = fs.readFileSync(filePath)
    const dataBuffer = new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.byteLength)
    
    // Parse PDF with unpdf - returns { text, totalPages }
    const result = await extractText(dataBuffer, {
      mergePages: true, // Merge all pages into a single string
    })
    
    const totalPages = result.totalPages || 1
    const truncated = totalPages > maxPages
    
    // If we have more pages than max, we need to re-extract with page limit
    // unpdf doesn't support page limit directly, so we truncate the text
    let text = ''
    if (typeof result.text === 'string') {
      text = result.text
    } else if (Array.isArray(result.text)) {
      // If mergePages is false, result.text is an array
      const textArray = result.text as string[]
      const pagesToUse = Math.min(textArray.length, maxPages)
      text = textArray.slice(0, pagesToUse).join('\n\n')
    }
    
    return {
      text,
      pageCount: totalPages,
      truncated,
      extractedChars: text.length,
    }
  } catch (error) {
    console.error('[ExtractionWorker] PDF extraction failed:', error)
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      extractedChars: 0,
      error: error instanceof Error ? error.message : 'PDF extraction failed',
    }
  }
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractDocxText(filePath: string): Promise<ExtractionResult> {
  try {
    const buffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer })
    
    const text = result.value
    
    return {
      text,
      pageCount: 1, // DOCX doesn't have clear page boundaries
      truncated: false,
      extractedChars: text.length,
    }
  } catch (error) {
    console.error('[ExtractionWorker] DOCX extraction failed:', error)
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      extractedChars: 0,
      error: error instanceof Error ? error.message : 'DOCX extraction failed',
    }
  }
}

/**
 * Extract text from a plain text file
 */
async function extractTextFile(filePath: string): Promise<ExtractionResult> {
  try {
    // Read as UTF-8, fallback to latin1 if it fails
    let text: string
    try {
      text = fs.readFileSync(filePath, 'utf-8')
    } catch {
      text = fs.readFileSync(filePath, 'latin1')
    }
    
    return {
      text,
      pageCount: 1,
      truncated: false,
      extractedChars: text.length,
    }
  } catch (error) {
    console.error('[ExtractionWorker] Text extraction failed:', error)
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      extractedChars: 0,
      error: error instanceof Error ? error.message : 'Text extraction failed',
    }
  }
}

/**
 * Determine file type from extension
 */
function getFileType(filePath: string): 'pdf' | 'docx' | 'txt' | 'unsupported' {
  const ext = path.extname(filePath).toLowerCase()
  
  switch (ext) {
    case '.pdf':
      return 'pdf'
    case '.docx':
      return 'docx'
    case '.doc':
      // .doc (legacy Word) is not supported by mammoth
      return 'unsupported'
    case '.txt':
    case '.md':
    case '.markdown':
    case '.text':
      return 'txt'
    default:
      return 'unsupported'
  }
}

/**
 * Extract text from a file based on its type
 */
export async function extractFileContent(
  filePath: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      extractedChars: 0,
      error: 'File not found',
    }
  }

  // Check file size
  const stats = fs.statSync(filePath)
  const maxSize = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE
  if (stats.size > maxSize) {
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      extractedChars: 0,
      error: `File too large (${Math.round(stats.size / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB limit)`,
    }
  }

  const fileType = getFileType(filePath)
  
  switch (fileType) {
    case 'pdf':
      return extractPdfText(filePath, options)
    case 'docx':
      return extractDocxText(filePath)
    case 'txt':
      return extractTextFile(filePath)
    case 'unsupported':
      return {
        text: '',
        pageCount: 0,
        truncated: false,
        extractedChars: 0,
        error: `Unsupported file type: ${path.extname(filePath)}`,
      }
  }
}

/**
 * Chunk text into smaller segments for embedding
 * Uses sentence-aware splitting with overlap
 */
export function chunkText(
  text: string,
  chunkSize: number = 800,
  overlap: number = 200
): string[] {
  if (!text || text.length === 0) {
    return []
  }

  // If text is smaller than chunk size, return as single chunk
  if (text.length <= chunkSize) {
    return [text.trim()]
  }

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + chunkSize

    // If we're not at the end, try to find a sentence boundary
    if (end < text.length) {
      // Look for sentence-ending punctuation near the end of the chunk
      const searchStart = Math.max(start + chunkSize - 100, start)
      const searchText = text.substring(searchStart, end + 50)
      
      // Find the last sentence boundary in the search window
      const sentenceEnders = ['. ', '? ', '! ', '.\n', '?\n', '!\n']
      let bestBoundary = -1
      
      for (const ender of sentenceEnders) {
        const idx = searchText.lastIndexOf(ender)
        if (idx > bestBoundary) {
          bestBoundary = idx
        }
      }
      
      if (bestBoundary > 0) {
        end = searchStart + bestBoundary + 2 // Include the punctuation and space
      }
    }

    // Extract chunk and clean it
    const chunk = text.substring(start, Math.min(end, text.length)).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // Move start position, accounting for overlap
    start = end - overlap
    if (start >= text.length) break
    
    // Make sure we're making progress
    const prevChunkStart = chunks.length > 0 ? text.indexOf(chunks[chunks.length - 1]) : 0
    if (start <= prevChunkStart) {
      start = end
    }
  }

  return chunks
}

/**
 * Check if a file should be auto-indexed (Tier 1)
 * Based on file type and size
 */
export function shouldAutoIndex(
  filename: string,
  sizeBytes: number
): boolean {
  const ext = path.extname(filename).toLowerCase()
  const sizeKB = sizeBytes / 1024

  // Text files: always auto-index
  if (['.txt', '.md', '.markdown', '.text'].includes(ext)) {
    return true
  }

  // PDF: auto-index if <=500KB (~10 pages)
  if (ext === '.pdf' && sizeKB <= 500) {
    return true
  }

  // DOCX: auto-index if <=50KB
  if (ext === '.docx' && sizeKB <= 50) {
    return true
  }

  return false
}

/**
 * Check if a file should be skipped entirely
 */
export function shouldSkipFile(
  filename: string,
  sizeBytes: number
): boolean {
  const ext = path.extname(filename).toLowerCase()
  const sizeMB = sizeBytes / 1024 / 1024

  // Skip files >50MB
  if (sizeMB > 50) {
    return true
  }

  // Skip unsupported file types
  const supportedExts = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.text']
  if (!supportedExts.includes(ext)) {
    return true
  }

  return false
}
