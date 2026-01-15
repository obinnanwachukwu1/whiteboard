// electron/embedding/budgetManager.ts
// Manages storage budget for embeddings with LRU eviction

import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

export interface StorageEntry {
  courseId: string
  fileId?: string  // For file chunks
  bytes: number
  lastAccessed: number
  createdAt: number
}

export interface StorageStats {
  used: number
  max: number
  percent: number
  byCourse: Record<string, { entries: number; bytes: number }>
  byType: Record<string, { entries: number; bytes: number }>
}

export interface FileIndexMeta {
  contentHash: string
  updatedAt: string
  indexedAt: number
  chunkCount: number
  truncated: boolean
}

interface BudgetPersistence {
  version: number
  entries: Record<string, StorageEntry>
  fileMeta: Record<string, FileIndexMeta>
}

const BUDGET_VERSION = 1
// const DEFAULT_MAX_BYTES = 100 * 1024 * 1024 // 100MB (used in constructor default)

export class BudgetManager extends EventEmitter {
  private entries: Map<string, StorageEntry> = new Map()
  private fileMeta: Map<string, FileIndexMeta> = new Map()
  private maxBytes: number
  private persistPath: string
  private dirty = false

  constructor(maxMB: number = 100) {
    super()
    this.maxBytes = maxMB * 1024 * 1024
    this.persistPath = path.join(app.getPath('userData'), 'embedding-budget.json')
  }

  /**
   * Record a new entry in the budget
   */
  recordEntry(
    entryId: string,
    courseId: string,
    bytes: number,
    fileId?: string
  ): void {
    const now = Date.now()
    
    // If entry exists, update it
    const existing = this.entries.get(entryId)
    if (existing) {
      existing.bytes = bytes
      existing.lastAccessed = now
      existing.fileId = fileId
    } else {
      this.entries.set(entryId, {
        courseId,
        fileId,
        bytes,
        lastAccessed: now,
        createdAt: now,
      })
    }
    
    this.dirty = true
  }

  /**
   * Remove an entry from the budget
   */
  removeEntry(entryId: string): boolean {
    const existed = this.entries.delete(entryId)
    if (existed) {
      this.dirty = true
    }
    return existed
  }

  /**
   * Update last accessed time for an entry (for LRU tracking)
   */
  touchEntry(entryId: string): void {
    const entry = this.entries.get(entryId)
    if (entry) {
      entry.lastAccessed = Date.now()
      this.dirty = true
    }
  }

  /**
   * Record file indexing metadata
   */
  recordFileMeta(fileId: string, meta: FileIndexMeta): void {
    this.fileMeta.set(fileId, meta)
    this.dirty = true
  }

  /**
   * Get file indexing metadata
   */
  getFileMeta(fileId: string): FileIndexMeta | undefined {
    return this.fileMeta.get(fileId)
  }

  /**
   * Remove file metadata
   */
  removeFileMeta(fileId: string): boolean {
    const existed = this.fileMeta.delete(fileId)
    if (existed) {
      this.dirty = true
    }
    return existed
  }

  /**
   * Check if a file needs re-indexing based on its updated_at timestamp
   */
  needsReindex(fileId: string, updatedAt: string): boolean {
    const meta = this.fileMeta.get(fileId)
    if (!meta) return true
    return meta.updatedAt !== updatedAt
  }

  /**
   * Get current storage usage
   */
  getUsedBytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      total += entry.bytes
    }
    return total
  }

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    const byCourse: Record<string, { entries: number; bytes: number }> = {}
    const byType: Record<string, { entries: number; bytes: number }> = {}
    let totalBytes = 0

    for (const [entryId, entry] of this.entries) {
      totalBytes += entry.bytes

      // By course
      if (!byCourse[entry.courseId]) {
        byCourse[entry.courseId] = { entries: 0, bytes: 0 }
      }
      byCourse[entry.courseId].entries++
      byCourse[entry.courseId].bytes += entry.bytes

      // By type (extract from entry ID format: "type:id" or "file:id:chunk:n")
      const type = entryId.split(':')[0]
      if (!byType[type]) {
        byType[type] = { entries: 0, bytes: 0 }
      }
      byType[type].entries++
      byType[type].bytes += entry.bytes
    }

    return {
      used: totalBytes,
      max: this.maxBytes,
      percent: Math.round((totalBytes / this.maxBytes) * 100),
      byCourse,
      byType,
    }
  }

  /**
   * Get storage used by a specific course
   */
  getCourseUsage(courseId: string): number {
    let total = 0
    for (const entry of this.entries.values()) {
      if (entry.courseId === courseId) {
        total += entry.bytes
      }
    }
    return total
  }

  /**
   * Remove all entries for a course
   * Returns list of removed entry IDs
   */
  pruneCourse(courseId: string): string[] {
    const removed: string[] = []
    
    for (const [entryId, entry] of this.entries) {
      if (entry.courseId === courseId) {
        this.entries.delete(entryId)
        removed.push(entryId)
      }
    }

    // Also remove file metadata for this course's files
    // Note: File meta cleanup is handled separately when files are removed from entries
    // since file IDs don't directly contain course ID

    if (removed.length > 0) {
      this.dirty = true
      this.emit('course-pruned', courseId, removed.length)
    }

    return removed
  }

  /**
   * Remove all entries for a specific file
   * Returns list of removed entry IDs
   */
  pruneFile(fileId: string): string[] {
    const removed: string[] = []
    
    for (const [entryId, entry] of this.entries) {
      if (entry.fileId === fileId) {
        this.entries.delete(entryId)
        removed.push(entryId)
      }
    }

    // Also remove file metadata
    this.fileMeta.delete(fileId)

    if (removed.length > 0) {
      this.dirty = true
    }

    return removed
  }

  /**
   * Evict entries using LRU strategy to free up space
   * Returns list of evicted entry IDs
   */
  pruneToFit(bytesNeeded: number): string[] {
    const currentUsage = this.getUsedBytes()
    const targetUsage = this.maxBytes - bytesNeeded
    
    if (currentUsage <= targetUsage) {
      return []
    }

    const bytesToFree = currentUsage - targetUsage
    let freedBytes = 0
    const evicted: string[] = []

    // Sort entries by last accessed (oldest first)
    const sortedEntries = [...this.entries.entries()]
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    for (const [entryId, entry] of sortedEntries) {
      if (freedBytes >= bytesToFree) break

      this.entries.delete(entryId)
      evicted.push(entryId)
      freedBytes += entry.bytes

      // If this was a file chunk, track the file for metadata cleanup
      if (entry.fileId) {
        // Check if all chunks for this file are now gone
        const hasRemainingChunks = [...this.entries.values()]
          .some(e => e.fileId === entry.fileId)
        
        if (!hasRemainingChunks) {
          this.fileMeta.delete(entry.fileId)
        }
      }
    }

    if (evicted.length > 0) {
      this.dirty = true
      this.emit('evicted', evicted, freedBytes)
      console.log(`[BudgetManager] Evicted ${evicted.length} entries (${Math.round(freedBytes / 1024)}KB)`)
    }

    return evicted
  }

  /**
   * Check if adding bytes would exceed budget
   */
  wouldExceedBudget(bytes: number): boolean {
    return this.getUsedBytes() + bytes > this.maxBytes
  }

  /**
   * Load budget data from disk
   */
  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistPath)) {
        console.log('[BudgetManager] No persisted budget found')
        return
      }

      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8')) as BudgetPersistence

      if (data.version !== BUDGET_VERSION) {
        console.log('[BudgetManager] Budget version mismatch, starting fresh')
        return
      }

      this.entries = new Map(Object.entries(data.entries || {}))
      this.fileMeta = new Map(Object.entries(data.fileMeta || {}))

      console.log(`[BudgetManager] Loaded ${this.entries.size} entries, ${this.fileMeta.size} file metas`)
    } catch (error) {
      console.error('[BudgetManager] Failed to load:', error)
      this.entries = new Map()
      this.fileMeta = new Map()
    }
  }

  /**
   * Save budget data to disk
   */
  async save(): Promise<void> {
    if (!this.dirty) {
      return
    }

    const data: BudgetPersistence = {
      version: BUDGET_VERSION,
      entries: Object.fromEntries(this.entries),
      fileMeta: Object.fromEntries(this.fileMeta),
    }

    try {
      const tempPath = this.persistPath + '.tmp'
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2))
      fs.renameSync(tempPath, this.persistPath)
      this.dirty = false
      console.log(`[BudgetManager] Saved ${this.entries.size} entries`)
    } catch (error) {
      console.error('[BudgetManager] Failed to save:', error)
    }
  }

  /**
   * Clear all budget data
   */
  clear(): void {
    this.entries.clear()
    this.fileMeta.clear()
    this.dirty = true
  }
}
