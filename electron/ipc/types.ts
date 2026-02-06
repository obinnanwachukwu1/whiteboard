import type { BrowserWindow } from 'electron'
import type { AIManager } from '../ai/manager'
import type { AppConfig } from '../config'
import type { EmbeddingManager } from '../embedding/manager'
import type { FileMetaStore } from '../embedding/fileMetaStore'

export type ContentWindowType =
  | 'page'
  | 'assignment'
  | 'announcement'
  | 'discussion'
  | 'file'
  | 'quiz'

export type SafeContentTypeFn = (input: unknown) => ContentWindowType | null

export type CreateContentWindowFn = (params: {
  courseId: string
  type: ContentWindowType
  contentId: string
  title?: string
}) => unknown

export type AppConfigAccess = {
  getAppConfig: () => AppConfig
  setAppConfig: (next: AppConfig) => void
}

export type MainWindowAccess = {
  getMainWindow: () => BrowserWindow | null
}

export type SharedIpcDeps = AppConfigAccess & MainWindowAccess & {
  aiManager: AIManager
  embeddingManager: EmbeddingManager
  fileMetaStore: FileMetaStore
  ensureFileMetaStoreLoaded: () => Promise<void>
  uploadFileMap: Map<string, string>
  safeContentType: SafeContentTypeFn
  createContentWindow: CreateContentWindowFn
  getThemeBackgroundsDir: () => string
  getThemeBackgroundsLegacyDir: () => string
  isPathInDir: (baseDir: string, targetPath: string) => boolean
}
