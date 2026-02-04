// electron/embedding/fileIndexer.ts
// Orchestrates file content extraction, chunking, and embedding

import { downloadFile } from '../canvasClient'
import { extractFileContent, chunkText, shouldAutoIndex, shouldSkipFile } from './extractionWorker'
import { hashContent, stripHtml, truncateText } from './utils'
import type { VectorMetadata } from './vectorStore'

export interface FileIndexRequest {
  fileId: string
  courseId: string
  courseName: string
  fileName: string
  fileSize: number
  updatedAt?: string
  url?: string
}

export interface FileIndexResult {
  success: boolean
  fileId: string
  chunks: number
  pageCount: number
  truncated: boolean
  extractedChars: number
  error?: string
}

export interface FileChunkData {
  id: string
  text: string
  chunkIndex: number
  totalChunks: number
  pageRange?: [number, number]
  metadata: VectorMetadata
}

const CHUNK_SIZE = 800      // ~200 tokens for MAX_SEQ_LENGTH=256
const CHUNK_OVERLAP = 200   // Good context preservation
const SNIPPET_LENGTH = 300  // For display

/**
 * Classify a file for indexing tier
 */
export function classifyFileForIndexing(
  fileName: string,
  fileSize: number
): 'auto' | 'on-open' | 'skip' {
  if (shouldSkipFile(fileName, fileSize)) {
    return 'skip'
  }
  if (shouldAutoIndex(fileName, fileSize)) {
    return 'auto'
  }
  return 'on-open'
}

/**
 * Download and extract text from a Canvas file
 */
export async function extractFileText(
  fileId: string,
  maxPages: number = 50,
  gate?: () => Promise<void>
): Promise<{
  text: string
  pageCount: number
  truncated: boolean
  error?: string
}> {
  try {
    if (gate) await gate()
    // Download file to temp location
    console.log(`[FileIndexer] Downloading file ${fileId}...`)
    const filePath = await downloadFile(fileId)
    console.log(`[FileIndexer] Downloaded to ${filePath}`)

    // Extract text content
    if (gate) await gate()
    console.log(`[FileIndexer] Extracting text from ${filePath}...`)
    const result = await extractFileContent(filePath, { maxPages })

    if (result.error) {
      return {
        text: '',
        pageCount: 0,
        truncated: false,
        error: result.error,
      }
    }

    console.log(`[FileIndexer] Extracted ${result.extractedChars} chars from ${result.pageCount} pages`)
    return {
      text: result.text,
      pageCount: result.pageCount,
      truncated: result.truncated,
    }
  } catch (error) {
    console.error(`[FileIndexer] Failed to extract file ${fileId}:`, error)
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    }
  }
}

/**
 * Prepare file chunks for embedding
 * Does NOT generate embeddings - that's done by the EmbeddingManager
 */
export function prepareFileChunks(
  request: FileIndexRequest,
  text: string,
  pageCount: number,
  _truncated: boolean  // Reserved for future use (e.g., marking chunks from truncated files)
): FileChunkData[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // Clean the text
  const cleanText = stripHtml(text).trim()
  
  if (cleanText.length === 0) {
    return []
  }

  // Chunk the text
  const textChunks = chunkText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP)
  const totalChunks = textChunks.length

  // Calculate approximate page ranges per chunk
  const charsPerPage = pageCount > 0 ? cleanText.length / pageCount : cleanText.length
  
  const chunks: FileChunkData[] = []

  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i]
    const chunkId = `file:${request.fileId}:chunk:${i}`
    
    // Estimate page range for this chunk
    const chunkStart = cleanText.indexOf(chunkText)
    const startPage = Math.floor(chunkStart / charsPerPage) + 1
    const endPage = Math.min(
      Math.floor((chunkStart + chunkText.length) / charsPerPage) + 1,
      pageCount
    )

    const metadata: VectorMetadata = {
      type: 'file',
      courseId: request.courseId,
      courseName: request.courseName,
      title: request.fileName,
      snippet: truncateText(chunkText, SNIPPET_LENGTH),
      url: request.url,
      contentHash: hashContent(chunkText),
      fileId: request.fileId,
      chunkIndex: i,
      totalChunks,
      pageRange: pageCount > 0 ? [startPage, endPage] : undefined,
    }

    chunks.push({
      id: chunkId,
      text: chunkText,
      chunkIndex: i,
      totalChunks,
      pageRange: pageCount > 0 ? [startPage, endPage] : undefined,
      metadata,
    })
  }

  console.log(`[FileIndexer] Prepared ${chunks.length} chunks for ${request.fileName}`)
  return chunks
}

/**
 * Full file indexing pipeline:
 * 1. Download file
 * 2. Extract text
 * 3. Chunk text
 * 4. Return chunks ready for embedding
 * 
 * Note: This does NOT generate embeddings - the caller (EmbeddingManager) does that
 */
export async function prepareFileForIndexing(
  request: FileIndexRequest,
  maxPages: number = 50,
  gate?: () => Promise<void>
): Promise<{
  chunks: FileChunkData[]
  pageCount: number
  truncated: boolean
  error?: string
}> {
  // Extract text
  const extraction = await extractFileText(request.fileId, maxPages, gate)
  
  if (extraction.error) {
    return {
      chunks: [],
      pageCount: 0,
      truncated: false,
      error: extraction.error,
    }
  }

  // Prepare chunks
  const chunks = prepareFileChunks(
    request,
    extraction.text,
    extraction.pageCount,
    extraction.truncated
  )

  return {
    chunks,
    pageCount: extraction.pageCount,
    truncated: extraction.truncated,
  }
}

/**
 * Estimate storage size for a set of chunks
 * Used for budget checking before embedding
 */
export function estimateChunkStorageBytes(chunkCount: number): number {
  // Each entry: 384 floats * 4 bytes + ~500 bytes metadata + overhead
  const bytesPerChunk = (384 * 4) + 500 + 100
  return chunkCount * bytesPerChunk
}
