import { app, clipboard, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { CanvasError, downloadFile as svcDownloadFile } from '../canvasClient'
import type { AppConfig } from '../config'
import { normalizeWin32Path } from '../pathUtils'
import { SHOWCASE_UNAVAILABLE_ERROR } from '../showcaseMode/canvasShowcaseService'
import { isShowcaseModeActive } from '../showcaseMode/runtime'
import type { CreateContentWindowFn, SafeContentTypeFn } from './types'

export type SystemIpcDeps = {
  getAppConfig: () => AppConfig
  isShowcaseModeAllowed: () => boolean
  uploadFileMap: Map<string, string>
  safeContentType: SafeContentTypeFn
  createContentWindow: CreateContentWindowFn
}

export function registerSystemHandlers(deps: SystemIpcDeps) {
  const showcaseModeActive = () =>
    isShowcaseModeActive(deps.getAppConfig(), deps.isShowcaseModeAllowed())

  const { uploadFileMap, safeContentType, createContentWindow } = deps
  ipcMain.handle('app:openExternal', async (_evt, url: string) => {
    try {
      const parsed = new URL(url)
      if (
        parsed.protocol === 'http:' ||
        parsed.protocol === 'https:' ||
        parsed.protocol === 'mailto:'
      ) {
        await shell.openExternal(url)
        return { ok: true }
      }
      return { ok: false, error: 'Invalid protocol' }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
  // Degree audit PDF extraction (runs in main process)
  ipcMain.handle(
    'degreeAudit:extractPdfText',
    async (
      _evt,
      pdfBytes: unknown,
      options?: { maxPages?: number; maxFileSizeBytes?: number; maxChars?: number },
    ): Promise<{
      ok: boolean
      data?: { text: string; pageCount: number; truncated: boolean; extractedChars: number }
      error?: string
    }> => {
      try {
        const { extractDegreeAuditPdfTextFromBytes } = await import('../degreeAudit/extractPdfText')
        const data = await extractDegreeAuditPdfTextFromBytes(pdfBytes, options || {})
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'app:openContentWindow',
    async (_evt, raw: { courseId?: string; type?: string; contentId?: string; title?: string }) => {
      try {
        const courseId = String(raw?.courseId || '').trim()
        const contentId = String(raw?.contentId || '').trim()
        const type = safeContentType(raw?.type)
        const title = raw?.title ? String(raw.title) : undefined
  
        if (!courseId || !contentId || !type) return { ok: false, error: 'Invalid params' }
  
        createContentWindow({ courseId, contentId, type, title })
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'app:pickFiles',
    async (
      _evt,
      opts?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] },
    ) => {
      try {
        if (showcaseModeActive()) {
          return { ok: false, error: SHOWCASE_UNAVAILABLE_ERROR }
        }
        const result = await dialog.showOpenDialog({
          properties: ['openFile', ...(opts?.multiple === false ? [] : ['multiSelections' as const])],
          filters: opts?.filters,
        })
        if (result.canceled) return { ok: true, data: [] }
        const files = await Promise.all(
          (result.filePaths || []).map(async (p) => {
            const st = await fs.promises.stat(p)
            // Generate secure handle
            const handle = randomUUID()
            uploadFileMap.set(handle, p)
  
            // Expire handle after 1 hour
            setTimeout(() => uploadFileMap.delete(handle), 60 * 60 * 1000)
  
            return { path: handle, name: path.basename(p), size: st.size }
          }),
        )
        return { ok: true, data: files }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
  
  ipcMain.handle(
    'app:downloadFile',
    async (_evt, fileId: string | number, suggestedName?: string) => {
      try {
        if (showcaseModeActive()) {
          return { ok: false, error: SHOWCASE_UNAVAILABLE_ERROR }
        }
        const downloadedPath = await svcDownloadFile(fileId)
        const defaultName = suggestedName || path.basename(downloadedPath)
  
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName,
        })
  
        if (result.canceled || !result.filePath) {
          return { ok: false, error: 'cancelled' }
        }
  
        await fs.promises.copyFile(downloadedPath, result.filePath)
        return { ok: true, data: result.filePath }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('app:clearTempCache', async () => {
    try {
      const tempDir = normalizeWin32Path(app.getPath('temp'))
      const entries = await fs.promises.readdir(tempDir)
      const targets = entries.filter(
        (name) => name.startsWith('canvas-') || name.startsWith('course-image-'),
      )
      await Promise.all(
        targets.map((name) => fs.promises.unlink(path.join(tempDir, name)).catch(() => {})),
      )
      return { ok: true, data: { removed: targets.length } }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
  ipcMain.handle('app:copyText', async (_evt, text: string) => {
    try {
      if (typeof text !== 'string') {
        return { ok: false, error: 'invalid_text' }
      }
      clipboard.clear()
      clipboard.writeText(text)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
}
