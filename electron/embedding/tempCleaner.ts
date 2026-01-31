// electron/embedding/tempCleaner.ts
// Cleans up old downloaded files to save disk space

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { normalizeWin32Path } from '../pathUtils'

const CANVAS_FILE_PREFIX = 'canvas-'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Clean up Canvas files older than MAX_AGE_MS from the temp directory.
 * Runs non-blocking in the background.
 *
 * @returns Promise<{ deleted: number; errors: number; totalBytes: number }>
 */
export async function cleanupTempFiles(): Promise<{
  deleted: number
  errors: number
  totalBytes: number
}> {
  const tempDir = normalizeWin32Path(app.getPath('temp'))
  const now = Date.now()
  let deleted = 0
  let errors = 0
  let totalBytes = 0

  try {
    const files = await fs.promises.readdir(tempDir)

    for (const file of files) {
      // Only clean up Canvas-related files
      if (!file.startsWith(CANVAS_FILE_PREFIX)) continue

      const filePath = path.join(tempDir, file)

      try {
        const stats = await fs.promises.stat(filePath)

        // Skip directories
        if (stats.isDirectory()) continue

        const age = now - stats.mtimeMs

        if (age > MAX_AGE_MS) {
          const fileSize = stats.size
          await fs.promises.unlink(filePath)
          deleted++
          totalBytes += fileSize
          console.log(
            `[TempCleaner] Deleted ${file} (${(fileSize / 1024).toFixed(1)}KB, ${Math.floor(age / (1000 * 60 * 60 * 24))} days old)`,
          )
        }
      } catch (_err) {
        // File might have been deleted by another process
        errors++
      }
    }

    if (deleted > 0) {
      console.log(
        `[TempCleaner] Cleaned up ${deleted} files, freed ${(totalBytes / 1024 / 1024).toFixed(2)}MB`,
      )
    }
  } catch (err) {
    console.error('[TempCleaner] Failed to read temp directory:', err)
    errors++
  }

  return { deleted, errors, totalBytes }
}

/**
 * Get stats about Canvas temp files
 */
export async function getTempFileStats(): Promise<{
  count: number
  totalBytes: number
  oldestMs: number | null
  newestMs: number | null
}> {
  const tempDir = normalizeWin32Path(app.getPath('temp'))
  const now = Date.now()
  let count = 0
  let totalBytes = 0
  let oldestMs: number | null = null
  let newestMs: number | null = null

  try {
    const files = await fs.promises.readdir(tempDir)

    for (const file of files) {
      if (!file.startsWith(CANVAS_FILE_PREFIX)) continue

      const filePath = path.join(tempDir, file)

      try {
        const stats = await fs.promises.stat(filePath)
        if (stats.isDirectory()) continue

        count++
        totalBytes += stats.size

        const age = now - stats.mtimeMs
        if (oldestMs === null || age > oldestMs) oldestMs = age
        if (newestMs === null || age < newestMs) newestMs = age
      } catch {
        // File might have been deleted
      }
    }
  } catch (err) {
    console.error('[TempCleaner] Failed to get temp stats:', err)
  }

  return { count, totalBytes, oldestMs, newestMs }
}
