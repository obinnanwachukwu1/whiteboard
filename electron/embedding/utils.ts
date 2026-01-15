// electron/embedding/utils.ts
import { createHash } from 'crypto'

/**
 * Strip HTML tags and decode entities from a string.
 * Used to prepare content for embedding.
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * Create a content hash for change detection.
 * Used to determine if content needs re-indexing.
 */
export function hashContent(text: string): string {
  return createHash('md5').update(text).digest('hex')
}

/**
 * Truncate text to a maximum length while preserving word boundaries.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  
  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

/**
 * Normalize text for embedding (lowercase, remove extra whitespace).
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Estimate token count (rough approximation: ~4 chars per token for English).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0
  
  return dotProduct / magnitude
}

/**
 * Mean pooling for transformer outputs.
 * Takes token embeddings and attention mask, returns sentence embedding.
 */
export function meanPooling(
  tokenEmbeddings: Float32Array,
  attentionMask: BigInt64Array | Int32Array,
  hiddenSize: number
): Float32Array {
  const seqLength = attentionMask.length
  const result = new Float32Array(hiddenSize)
  let maskSum = 0
  
  for (let i = 0; i < seqLength; i++) {
    const mask = Number(attentionMask[i])
    if (mask === 0) continue
    
    maskSum += mask
    for (let j = 0; j < hiddenSize; j++) {
      result[j] += tokenEmbeddings[i * hiddenSize + j] * mask
    }
  }
  
  if (maskSum > 0) {
    for (let j = 0; j < hiddenSize; j++) {
      result[j] /= maskSum
    }
  }
  
  return result
}

/**
 * Normalize a vector to unit length (L2 normalization).
 */
export function normalizeVector(vec: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i]
  }
  norm = Math.sqrt(norm)
  
  if (norm === 0) return vec
  
  const result = new Float32Array(vec.length)
  for (let i = 0; i < vec.length; i++) {
    result[i] = vec[i] / norm
  }
  
  return result
}
