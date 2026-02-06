// electron/embedding/vectorStore.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { cosineSimilarity } from './utils'

export type ContentType = 'announcement' | 'assignment' | 'page' | 'module' | 'file'

export type SearchOptions = {
  courseIds?: string[]
  types?: ContentType[]
  minScore?: number
  dedupe?: boolean
}

export interface VectorMetadata {
  type: ContentType
  courseId: string
  courseName: string
  title: string
  snippet: string        // First ~200 chars of content
  url?: string
  contentHash: string    // MD5 for change detection
  // File-specific fields (for file chunks)
  fileId?: string        // For removing all chunks of a file
  chunkIndex?: number    // 0, 1, 2... for ordering
  totalChunks?: number   // Total chunks in this file
  pageRange?: [number, number]  // e.g., [1, 5] for pages covered
}

export interface VectorEntry {
  id: string             // e.g., "announcement:12345"
  embedding: Float32Array
  metadata: VectorMetadata
}

export interface SearchResult {
  id: string
  score: number
  metadata: VectorMetadata
}

// Binary format for persistence:
// [4 bytes: version][4 bytes: entry count]
// For each entry:
//   [4 bytes: id length][id bytes]
//   [4 bytes: embedding length][embedding floats]
//   [4 bytes: metadata length][metadata JSON bytes]

const STORE_VERSION = 1
const EMBEDDING_DIM = 384 // MiniLM output dimension
const YIELD_EVERY = 200
const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve))

export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map()
  private dirty = false
  private revision = 0
  private saveInFlight: Promise<void> | null = null
  private saveQueued = false
  private storePath: string
  private maxMemoryBytes: number

  constructor(maxMemoryMB = 300) {
    const userDataPath = app.getPath('userData')
    this.storePath = path.join(userDataPath, 'embeddings.bin')
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024
  }

  /**
   * Add or update an entry in the vector store.
   */
  add(entry: VectorEntry): void {
    // Validate embedding dimension
    if (entry.embedding.length !== EMBEDDING_DIM) {
      throw new Error(`Invalid embedding dimension: ${entry.embedding.length}, expected ${EMBEDDING_DIM}`)
    }

    this.entries.set(entry.id, entry)
    this.markDirty()
  }

  /**
   * Remove an entry from the vector store.
   */
  remove(id: string): boolean {
    const existed = this.entries.delete(id)
    if (existed) {
      this.markDirty()
    }
    return existed
  }

  /**
   * Check if an entry exists.
   */
  has(id: string): boolean {
    return this.entries.has(id)
  }

  /**
   * Get an entry by ID.
   */
  get(id: string): VectorEntry | undefined {
    return this.entries.get(id)
  }

  /**
   * Get the content hash for an entry (for change detection).
   */
  getContentHash(id: string): string | undefined {
    return this.entries.get(id)?.metadata.contentHash
  }

  /**
   * Search for the k most similar entries to a query embedding.
   */
  search(queryEmbedding: Float32Array, k = 10, opts: SearchOptions = {}): SearchResult[] {
    if (queryEmbedding.length !== EMBEDDING_DIM) {
      throw new Error(`Invalid query embedding dimension: ${queryEmbedding.length}, expected ${EMBEDDING_DIM}`)
    }

    const results: { id: string; score: number; metadata: VectorMetadata }[] = []

    const courseIdSet = opts.courseIds?.length ? new Set(opts.courseIds.map(String)) : null
    const typeSet = opts.types?.length ? new Set(opts.types) : null

    for (const [id, entry] of this.entries) {
      if (courseIdSet && !courseIdSet.has(String(entry.metadata.courseId))) continue
      if (typeSet && !typeSet.has(entry.metadata.type)) continue

      const score = cosineSimilarity(queryEmbedding, entry.embedding)
      if (typeof opts.minScore === 'number' && score < opts.minScore) continue

      results.push({ id, score, metadata: entry.metadata })
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Optional dedupe (avoid repeated titles)
    if (opts.dedupe) {
      const seen = new Set<string>()
      const deduped: typeof results = []
      for (const r of results) {
        const key = `${r.metadata.type}|${r.metadata.courseId}|${r.metadata.title}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(r)
        if (deduped.length >= k) break
      }
      return deduped
    }

    return results.slice(0, k)
  }

  /**
   * Get the number of entries in the store.
   */
  get size(): number {
    return this.entries.size
  }

  /**
   * Get estimated memory usage in bytes.
   */
  getMemoryUsage(): number {
    let size = 0
    for (const entry of this.entries.values()) {
      // Embedding: 384 floats * 4 bytes
      size += entry.embedding.length * 4
      // ID: string length * 2 (UTF-16)
      size += entry.id.length * 2
      // Metadata: rough estimate based on JSON size
      size += JSON.stringify(entry.metadata).length * 2
      // Object overhead
      size += 100
    }
    return size
  }

  /**
   * Check if memory usage is within limits.
   */
  isWithinMemoryLimit(): boolean {
    return this.getMemoryUsage() < this.maxMemoryBytes
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.clear()
    this.markDirty()
  }

  /**
   * Save the store to disk.
   */
  async save(): Promise<void> {
    if (this.saveInFlight) {
      if (this.dirty) this.saveQueued = true
      await this.saveInFlight
      return
    }
    if (!this.dirty) {
      console.log('[VectorStore] No changes to save')
      return
    }

    this.saveInFlight = this.flushSaves().finally(() => {
      this.saveInFlight = null
    })
    await this.saveInFlight
  }

  private async flushSaves(): Promise<void> {
    while (this.dirty) {
      this.saveQueued = false
      const snapshotRevision = this.revision

      console.log(`[VectorStore] Saving ${this.entries.size} entries...`, this.storePath)

      const chunks: Buffer[] = []
      const entries = Array.from(this.entries)

      // Header: version + entry count
      const header = Buffer.alloc(8)
      header.writeUInt32LE(STORE_VERSION, 0)
      header.writeUInt32LE(entries.length, 4)
      chunks.push(header)

      // Entries
      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && i % YIELD_EVERY === 0) {
          await yieldToEventLoop()
        }
        const [id, entry] = entries[i]
        // ID
        const idBuffer = Buffer.from(id, 'utf-8')
        const idLength = Buffer.alloc(4)
        idLength.writeUInt32LE(idBuffer.length, 0)
        chunks.push(idLength, idBuffer)

        // Embedding
        const embeddingBuffer = Buffer.from(entry.embedding.buffer)
        const embeddingLength = Buffer.alloc(4)
        embeddingLength.writeUInt32LE(embeddingBuffer.length, 0)
        chunks.push(embeddingLength, embeddingBuffer)

        // Metadata
        const metadataBuffer = Buffer.from(JSON.stringify(entry.metadata), 'utf-8')
        const metadataLength = Buffer.alloc(4)
        metadataLength.writeUInt32LE(metadataBuffer.length, 0)
        chunks.push(metadataLength, metadataBuffer)
      }

      const data = Buffer.concat(chunks)

      // Ensure directory exists
      const dir = path.dirname(this.storePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write atomically (write to temp, then rename)
      const tempPath = `${this.storePath}.${process.pid}.${Date.now()}.${Math.random()
        .toString(16)
        .slice(2)}.tmp`
      await fs.promises.writeFile(tempPath, data)
      await fs.promises.rename(tempPath, this.storePath)

      if (this.revision === snapshotRevision) {
        this.dirty = false
      }

      console.log(`[VectorStore] Saved ${this.entries.size} entries (${Math.round(data.length / 1024)}KB)`)
      if (!this.dirty && !this.saveQueued) {
        return
      }
    }
  }

  /**
   * Load the store from disk.
   */
  async load(): Promise<void> {
    if (!fs.existsSync(this.storePath)) {
      console.log('[VectorStore] No saved store found', this.storePath)
      return
    }

    console.log('[VectorStore] Loading from disk...', this.storePath)

    try {
      const data = await fs.promises.readFile(this.storePath)
      let offset = 0

      // Header
      const version = data.readUInt32LE(offset)
      offset += 4
      if (version !== STORE_VERSION) {
        console.log(`[VectorStore] Version mismatch (${version} vs ${STORE_VERSION}), starting fresh`)
        return
      }

      const entryCount = data.readUInt32LE(offset)
      offset += 4

      // Entries
      this.entries.clear()
      for (let i = 0; i < entryCount; i++) {
        if (i > 0 && i % YIELD_EVERY === 0) {
          await yieldToEventLoop()
        }
        // ID
        const idLength = data.readUInt32LE(offset)
        offset += 4
        const id = data.toString('utf-8', offset, offset + idLength)
        offset += idLength

        // Embedding
        const embeddingLength = data.readUInt32LE(offset)
        offset += 4
        const embeddingData = data.subarray(offset, offset + embeddingLength)
        // Copy to aligned buffer to avoid Float32Array alignment issues
        const alignedBuffer = Buffer.alloc(embeddingLength)
        embeddingData.copy(alignedBuffer)
        const embedding = new Float32Array(alignedBuffer.buffer, alignedBuffer.byteOffset, embeddingLength / 4)
        offset += embeddingLength

        // Metadata
        const metadataLength = data.readUInt32LE(offset)
        offset += 4
        const metadataJson = data.toString('utf-8', offset, offset + metadataLength)
        const metadata = JSON.parse(metadataJson) as VectorMetadata
        offset += metadataLength

        // Copy embedding to new buffer (to ensure it's independent)
        const embeddingCopy = new Float32Array(embedding.length)
        embeddingCopy.set(embedding)

        this.entries.set(id, { id, embedding: embeddingCopy, metadata })
      }

      this.dirty = false
      console.log(`[VectorStore] Loaded ${this.entries.size} entries`)
    } catch (error) {
      console.error('[VectorStore] Failed to load:', error)
      // Start fresh on error
      this.entries.clear()
    }
  }

  /**
   * Get all entry IDs.
   */
  getIds(): string[] {
    return Array.from(this.entries.keys())
  }

  /**
   * Prune oldest entries if over memory limit.
   * Note: This is a simple implementation; a real one might track access times.
   */
  prune(maxEntries: number): number {
    if (this.entries.size <= maxEntries) {
      return 0
    }

    const toRemove = this.entries.size - maxEntries
    const ids = this.getIds()
    
    for (let i = 0; i < toRemove; i++) {
      this.entries.delete(ids[i])
    }

    this.dirty = true
    console.log(`[VectorStore] Pruned ${toRemove} entries`)
    return toRemove
  }

  /**
   * Remove all entries for a specific course.
   * Used when a course is unpinned.
   */
  removeByCourseId(courseId: string): number {
    let removed = 0
    for (const [id, entry] of this.entries) {
      if (entry.metadata.courseId === courseId) {
        this.entries.delete(id)
        removed++
      }
    }
    if (removed > 0) {
      this.markDirty()
      console.log(`[VectorStore] Removed ${removed} entries for course ${courseId}`)
    }
    return removed
  }

  /**
   * Remove all entries for a specific file (all chunks).
   * Used when re-indexing a file.
   */
  removeByFileId(fileId: string): number {
    let removed = 0
    for (const [id, entry] of this.entries) {
      if (entry.metadata.fileId === fileId) {
        this.entries.delete(id)
        removed++
      }
    }
    if (removed > 0) {
      this.markDirty()
      console.log(`[VectorStore] Removed ${removed} chunks for file ${fileId}`)
    }
    return removed
  }

  /**
   * Get storage breakdown by course and type.
   */
  getStorageStats(): {
    totalEntries: number
    totalBytes: number
    byCourse: Record<string, { entries: number; bytes: number }>
    byType: Record<string, { entries: number; bytes: number }>
  } {
    const byCourse: Record<string, { entries: number; bytes: number }> = {}
    const byType: Record<string, { entries: number; bytes: number }> = {}
    let totalBytes = 0

    for (const entry of this.entries.values()) {
      // Estimate bytes: embedding (384 * 4) + metadata JSON + overhead
      const bytes = entry.embedding.length * 4 + JSON.stringify(entry.metadata).length * 2 + 100
      totalBytes += bytes

      // By course
      const courseId = entry.metadata.courseId
      if (!byCourse[courseId]) {
        byCourse[courseId] = { entries: 0, bytes: 0 }
      }
      byCourse[courseId].entries++
      byCourse[courseId].bytes += bytes

      // By type
      const type = entry.metadata.type
      if (!byType[type]) {
        byType[type] = { entries: 0, bytes: 0 }
      }
      byType[type].entries++
      byType[type].bytes += bytes
    }

    return { totalEntries: this.entries.size, totalBytes, byCourse, byType }
  }

  /**
   * Add multiple entries at once (for file chunks).
   * Does NOT prune other entries - use for incremental indexing.
   */
  addBatch(entries: VectorEntry[]): number {
    let added = 0
    for (const entry of entries) {
      if (entry.embedding.length !== EMBEDDING_DIM) {
        console.warn(`[VectorStore] Skipping entry with invalid dimension: ${entry.embedding.length}`)
        continue
      }
      this.entries.set(entry.id, entry)
      added++
    }
    if (added > 0) {
      this.markDirty()
    }
    return added
  }

  private markDirty(): void {
    this.dirty = true
    this.revision++
  }
}
