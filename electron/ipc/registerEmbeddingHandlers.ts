import { ipcMain } from 'electron'

import type { IndexableItem, EmbeddingStatus } from '../embedding/manager'
import type { SearchResult } from '../embedding/vectorStore'
import type { MainWindowAccess } from './types'
import type { AppConfig } from '../config'
import type { EmbeddingManager } from '../embedding/manager'
import type { FileMetaStore } from '../embedding/fileMetaStore'
import { SHOWCASE_UNAVAILABLE_ERROR } from '../showcaseMode/canvasShowcaseService'
import { isShowcaseModeActive } from '../showcaseMode/runtime'

export type EmbeddingIpcDeps = MainWindowAccess & {
  getAppConfig: () => AppConfig
  isShowcaseModeAllowed: () => boolean
  embeddingManager: EmbeddingManager
  fileMetaStore: FileMetaStore
  ensureFileMetaStoreLoaded: () => Promise<void>
}

export function registerEmbeddingHandlers(deps: EmbeddingIpcDeps) {
  const { embeddingManager, fileMetaStore, ensureFileMetaStoreLoaded } = deps
  const rejectIfShowcaseActive = () => {
    if (!isShowcaseModeActive(deps.getAppConfig(), deps.isShowcaseModeAllowed())) return null
    return { ok: false, error: SHOWCASE_UNAVAILABLE_ERROR }
  }
  
  // Forward download progress events to renderer
  embeddingManager.on('download-progress', (progress) => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('embedding:download-progress', progress)
    }
  })
  
  ipcMain.handle(
    'embedding:status',
    async (): Promise<{ ok: boolean; data?: EmbeddingStatus; error?: string }> => {
      try {
        const status = embeddingManager.getStatus()
        return { ok: true, data: status }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'embedding:setPaused',
    async (_evt, paused: boolean): Promise<{ ok: boolean; error?: string }> => {
      try {
        embeddingManager.setPaused(!!paused)
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'embedding:search',
    async (
      _evt,
      query: string,
      k = 10,
      opts?: any,
    ): Promise<{ ok: boolean; data?: SearchResult[]; error?: string }> => {
      try {
        const blocked = rejectIfShowcaseActive()
        if (blocked) return blocked
        const results = await embeddingManager.search(query, k, opts || {})
        return { ok: true, data: results }
      } catch (e: any) {
        console.error('[Embedding] Search error:', e)
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'embedding:index',
    async (
      _evt,
      items: IndexableItem[],
    ): Promise<{ ok: boolean; data?: { indexed: number; skipped: number }; error?: string }> => {
      try {
        const blocked = rejectIfShowcaseActive()
        if (blocked) return blocked
        const result = await embeddingManager.index(items)
        return { ok: true, data: result }
      } catch (e: any) {
        console.error('[Embedding] Index error:', e)
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle('embedding:clear', async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const blocked = rejectIfShowcaseActive()
      if (blocked) return blocked
      await embeddingManager.clear()
      // Also clear file indexing metadata so "rebuild" truly reindexes files.
      fileMetaStore.clear()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
  // File indexing handlers
  const FILE_INDEX_IDLE_GRACE_MS = 1500
  
  ipcMain.handle(
    'embedding:indexFile',
    async (
      _evt,
      fileId: string,
      courseId: string,
      courseName: string,
      fileName: string,
      fileSize: number,
      updatedAt?: string,
      url?: string,
      opts?: { maxPages?: number },
    ): Promise<{
      ok: boolean
      data?: { chunks: number; pageCount: number; truncated: boolean; skipped?: boolean }
      error?: string
    }> => {
      try {
        const blocked = rejectIfShowcaseActive()
        if (blocked) return blocked
        const waitForSustainedIdle = async () => {
          while (true) {
            await embeddingManager.waitUntilResumed()
            if (FILE_INDEX_IDLE_GRACE_MS <= 0) return
            await new Promise((resolve) => setTimeout(resolve, FILE_INDEX_IDLE_GRACE_MS))
            if (!embeddingManager.isPaused()) return
          }
        }
  
        await ensureFileMetaStoreLoaded()
        console.log('[embedding:indexFile] Request', {
          fileId,
          fileName,
          updatedAt: updatedAt || null,
        })
        // Check if file needs indexing (version check)
        const existingMeta = fileMetaStore.get(fileId)
        const needsIndexing = fileMetaStore.needsIndexing(fileId, updatedAt)
        if (existingMeta || updatedAt) {
          console.log('[embedding:indexFile] Meta check', {
            fileId,
            updatedAt: updatedAt || null,
            storedUpdatedAt: existingMeta?.updatedAt || null,
            hasError: Boolean(existingMeta?.error),
            needsIndexing,
          })
        }
  
        if (!needsIndexing) {
          console.log(`[embedding:indexFile] Skipping ${fileName} (up to date)`)
          return {
            ok: true,
            data: {
              chunks: 0,
              pageCount: 0,
              truncated: false,
              skipped: true,
            },
          }
        }
  
        // Pause heavy extraction/indexing until the app is idle for a sustained period.
        await waitForSustainedIdle()
  
        // Import dynamically to avoid circular dependencies
        const { prepareFileForIndexing } = await import('../embedding/fileIndexer')
  
        // Prepare the file (download, extract, chunk)
        const maxPages = typeof opts?.maxPages === 'number' ? opts.maxPages : undefined
        const result = await prepareFileForIndexing(
          {
            fileId,
            courseId,
            courseName,
            fileName,
            fileSize,
            updatedAt,
            url,
          },
          maxPages,
          () => waitForSustainedIdle(),
        )
  
        if (result.error) {
          if (updatedAt) {
            fileMetaStore.recordFailure(fileId, updatedAt, result.error)
          }
          return { ok: false, error: result.error }
        }
  
        if (result.chunks.length === 0) {
          if (updatedAt) {
            // Record success even if 0 chunks (e.g. empty file), so we don't retry forever
            fileMetaStore.recordSuccess(fileId, updatedAt, 0, result.truncated)
          }
          return {
            ok: true,
            data: { chunks: 0, pageCount: result.pageCount, truncated: result.truncated },
          }
        }
  
        // Remove any existing chunks for this file
        embeddingManager.removeByFileId(fileId)
  
        // Index the chunks
        const chunksForIndexing = result.chunks.map((c: any) => ({
          id: c.id,
          text: c.text,
          metadata: c.metadata,
        }))
  
        await embeddingManager.indexFileChunks(chunksForIndexing)
  
        // Record success
        if (updatedAt) {
          // Calculate content hash from all chunks if needed, or just rely on file metadata
          fileMetaStore.recordSuccess(fileId, updatedAt, result.chunks.length, result.truncated)
        }
  
        return {
          ok: true,
          data: {
            chunks: result.chunks.length,
            pageCount: result.pageCount,
            truncated: result.truncated,
          },
        }
      } catch (e: any) {
        console.error('[embedding:indexFile] Error:', e)
        if (updatedAt) {
          fileMetaStore.recordFailure(fileId, updatedAt, String(e?.message || e))
        }
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'embedding:pruneCourse',
    async (_evt, courseId: string): Promise<{ ok: boolean; data?: number; error?: string }> => {
      try {
        const blocked = rejectIfShowcaseActive()
        if (blocked) return blocked
        const removed = await embeddingManager.removeByCourseId(courseId)
        return { ok: true, data: removed }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'embedding:getStorageStats',
    async (): Promise<{
      ok: boolean
      data?: {
        totalEntries: number
        totalBytes: number
        byCourse: Record<string, { entries: number; bytes: number }>
        byType: Record<string, { entries: number; bytes: number }>
      }
      error?: string
    }> => {
      try {
        const stats = embeddingManager.getStorageStats()
        return { ok: true, data: stats }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
}
