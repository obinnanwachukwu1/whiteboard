import { registerCanvasHandlers } from './registerCanvasHandlers'
import { registerConfigHandlers } from './registerConfigHandlers'
import { registerEmbeddingHandlers } from './registerEmbeddingHandlers'
import { registerSecureStorageHandlers } from './registerSecureStorageHandlers'
import { registerSystemHandlers } from './registerSystemHandlers'
import { registerThemeHandlers } from './registerThemeHandlers'
import { registerWindowHandlers } from './registerWindowHandlers'
import type { SharedIpcDeps } from './types'

export function registerIpcHandlers(deps: SharedIpcDeps) {
  registerWindowHandlers()
  registerSecureStorageHandlers()

  registerCanvasHandlers({
    getAppConfig: deps.getAppConfig,
    setAppConfig: deps.setAppConfig,
    uploadFileMap: deps.uploadFileMap,
  })

  registerSystemHandlers({
    uploadFileMap: deps.uploadFileMap,
    safeContentType: deps.safeContentType,
    createContentWindow: deps.createContentWindow,
  })

  registerConfigHandlers({
    getAppConfig: deps.getAppConfig,
    setAppConfig: deps.setAppConfig,
    aiManager: deps.aiManager,
  })

  registerEmbeddingHandlers({
    getMainWindow: deps.getMainWindow,
    embeddingManager: deps.embeddingManager,
    fileMetaStore: deps.fileMetaStore,
    ensureFileMetaStoreLoaded: deps.ensureFileMetaStoreLoaded,
  })

  registerThemeHandlers({
    getThemeBackgroundsDir: deps.getThemeBackgroundsDir,
    getThemeBackgroundsLegacyDir: deps.getThemeBackgroundsLegacyDir,
    isPathInDir: deps.isPathInDir,
  })
}
