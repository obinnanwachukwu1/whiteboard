import { dialog, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { fileUrlToPathSafe } from '../pathUtils'

export type ThemeIpcDeps = {
  getThemeBackgroundsDir: () => string
  getThemeBackgroundsLegacyDir: () => string
  isPathInDir: (baseDir: string, targetPath: string) => boolean
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp']

export function registerThemeHandlers(deps: ThemeIpcDeps) {
  ipcMain.handle(
    'theme:pickBackgroundImage',
    async (): Promise<{
      ok: boolean
      data?: { path: string; name: string; size: number }
      error?: string
    }> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
        })

        if (result.canceled || !result.filePaths.length) {
          return { ok: true, data: undefined }
        }

        const filePath = result.filePaths[0]
        const stat = await fs.promises.stat(filePath)

        if (stat.size > MAX_IMAGE_SIZE) {
          return { ok: false, error: 'Image file is too large (max 10MB)' }
        }

        const ext = path.extname(filePath).toLowerCase()
        if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
          return { ok: false, error: 'Invalid image type. Allowed: JPG, PNG, WebP' }
        }

        return {
          ok: true,
          data: {
            path: filePath,
            name: path.basename(filePath),
            size: stat.size,
          },
        }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )

  ipcMain.handle(
    'theme:uploadBackgroundImage',
    async (
      _evt,
      sourcePath: string,
    ): Promise<{
      ok: boolean
      data?: { url: string }
      error?: string
    }> => {
      try {
        const stat = await fs.promises.stat(sourcePath)
        if (stat.size > MAX_IMAGE_SIZE) {
          return { ok: false, error: 'Image file is too large (max 10MB)' }
        }

        const ext = path.extname(sourcePath).toLowerCase()
        if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
          return { ok: false, error: 'Invalid image type. Allowed: JPG, PNG, WebP' }
        }

        const bgDir = deps.getThemeBackgroundsDir()
        const uniqueName = `bg-${randomUUID()}${ext}`
        const destPath = path.join(bgDir, uniqueName)

        await fs.promises.copyFile(sourcePath, destPath)

        const url = pathToFileURL(destPath)
          .toString()
          .replace(/^file:/, 'canvas-file:')

        return { ok: true, data: { url } }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )

  ipcMain.handle(
    'theme:deleteBackgroundImage',
    async (
      _evt,
      imageUrl: string,
    ): Promise<{
      ok: boolean
      error?: string
    }> => {
      try {
        if (!imageUrl.startsWith('canvas-file://')) {
          return { ok: false, error: 'Invalid image URL' }
        }

        const fileUrl = imageUrl.replace(/^canvas-file:/, 'file:')
        const filePath = fileUrlToPathSafe(fileUrl)

        const bgDir = deps.getThemeBackgroundsDir()
        const legacyDir = deps.getThemeBackgroundsLegacyDir()
        const resolvedPath = path.resolve(filePath)
        const allowed =
          deps.isPathInDir(bgDir, resolvedPath) || deps.isPathInDir(legacyDir, resolvedPath)
        if (!allowed) {
          return { ok: false, error: 'Cannot delete file outside theme backgrounds directory' }
        }

        if (fs.existsSync(resolvedPath)) {
          await fs.promises.unlink(resolvedPath)
        }

        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
}
