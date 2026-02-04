// electron/embedding/fileMetaStore.ts
// Persist file indexing metadata to track versions and avoid re-indexing

import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface FileIndexMeta {
  fileId: string
  updatedAt: string       // from Canvas API
  indexedAt: number       // timestamp
  contentHash?: string    // MD5 of extracted content
  chunks: number          // Number of chunks created
  truncated: boolean      // Was it truncated?
  error?: string          // Last error if failed
}

interface MetaStoreData {
  version: number
  files: Record<string, FileIndexMeta>
}

const STORE_VERSION = 1

export class FileMetaStore {
  private files: Record<string, FileIndexMeta> = {}
  private persistPath: string

  constructor() {
    this.persistPath = path.join(app.getPath('userData'), 'file-index-meta.json')
  }

  /**
   * Load metadata from disk
   */
  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistPath)) {
        console.log('[FileMetaStore] No persisted metadata found', this.persistPath)
        return
      }

      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8')) as MetaStoreData

      if (data.version !== STORE_VERSION) {
        console.log('[FileMetaStore] Version mismatch, starting fresh')
        return
      }

      this.files = data.files || {}
      console.log(
        `[FileMetaStore] Loaded metadata for ${Object.keys(this.files).length} files`,
        this.persistPath,
      )
    } catch (error) {
      console.error('[FileMetaStore] Failed to load:', error)
      this.files = {}
    }
  }

  /**
   * Save metadata to disk
   */
  async save(): Promise<void> {
    const data: MetaStoreData = {
      version: STORE_VERSION,
      files: this.files,
    }

    try {
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[FileMetaStore] Failed to save:', error)
    }
  }

  /**
   * Check if a file needs indexing
   * Returns true if:
   * 1. File is not in store
   * 2. stored updatedAt != current updatedAt
   * 3. Previous attempt failed (has error)
   */
  needsIndexing(fileId: string, updatedAt?: string): boolean {
    const meta = this.files[fileId]
    
    // If never indexed, yes
    if (!meta) return true

    // If we don't know the current version, assume yes (safer)
    // Or strictly: if we don't know update time, maybe skip? 
    // Canvas always provides updated_at.
    if (!updatedAt) return true

    // If versions differ, yes
    if (meta.updatedAt !== updatedAt) return true

    // If last attempt failed, yes (retry)
    if (meta.error) return true

    // Otherwise, it's up to date
    return false
  }

  /**
   * Record a successful indexing
   */
  recordSuccess(fileId: string, updatedAt: string, chunks: number, truncated: boolean, contentHash?: string): void {
    this.files[fileId] = {
      fileId,
      updatedAt,
      indexedAt: Date.now(),
      chunks,
      truncated,
      contentHash,
      error: undefined,
    }
    this.save() // Auto-save on update
  }

  /**
   * Record a failed indexing
   */
  recordFailure(fileId: string, updatedAt: string, error: string): void {
    const existing = this.files[fileId]
    this.files[fileId] = {
      fileId,
      updatedAt,
      indexedAt: Date.now(),
      chunks: existing?.chunks || 0,
      truncated: existing?.truncated || false,
      contentHash: existing?.contentHash,
      error,
    }
    this.save()
  }

  /**
   * Remove metadata for a file
   */
  remove(fileId: string): void {
    if (this.files[fileId]) {
      delete this.files[fileId]
      this.save()
    }
  }

  /**
   * Get metadata for a file
   */
  get(fileId: string): FileIndexMeta | undefined {
    return this.files[fileId]
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    this.files = {}
    this.save()
  }
}
