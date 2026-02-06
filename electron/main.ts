import { app, BrowserWindow, protocol, session, shell, Tray } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { loadConfig, DEFAULT_CONFIG, type AppConfig } from './config'
import { AIManager } from './ai/manager'
import { EmbeddingManager } from './embedding/manager'
import { FileMetaStore } from './embedding/fileMetaStore'
import { cleanupTempFiles } from './embedding/tempCleaner'
import { registerIndexingIPC } from './embedding/indexingService'
import { registerIpcHandlers } from './ipc'
import { createAppMenu } from './bootstrap/menu'
import {
  getThemeBackgroundsDir,
  getThemeBackgroundsLegacyDir,
  isPathInDir,
  registerContentProtocols,
} from './bootstrap/protocols'
import {
  createContentWindow as createContentWindowImpl,
  createMainWindow,
  getIconPath,
  getTrayIconPath,
  safeContentType,
} from './bootstrap/window'
import { createSystemTray, setMacDockIcon } from './bootstrap/tray'
import { fileUrlToPathSafe } from './pathUtils'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'

const aiManager = new AIManager()
const embeddingManager = new EmbeddingManager()
const fileMetaStore = new FileMetaStore()
let fileMetaStoreReady: Promise<void> | null = null

async function ensureFileMetaStoreLoaded(): Promise<void> {
  await app.whenReady()
  if (!fileMetaStoreReady) {
    fileMetaStoreReady = fileMetaStore.load().catch((error) => {
      console.error('[FileMetaStore] Failed to load (ensure):', error)
    })
  }
  await fileMetaStoreReady
}

// Secure file upload handling: Map<handle, absolutePath>
const uploadFileMap = new Map<string, string>()

// Load file metadata on startup
app.whenReady().then(() => {
  void ensureFileMetaStoreLoaded()

  // Clean up old temp files (fire and forget)
  cleanupTempFiles().catch(console.error)
})

// Register indexing IPC handlers
registerIndexingIPC()

// SECURITY: Global WebContents hardening
app.on('web-contents-created', (_event, contents) => {
  // 1. Deny new windows by default, route to external browser
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // 2. Block navigation to non-app origins (defense in depth)
  // Note: BrowserWindow instances usually have their own listeners, but this covers webviews too
  contents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url)
      let isAllowed = false

      if (
        parsed.protocol === 'pdf-viewer:' ||
        parsed.protocol === 'docx-viewer:' ||
        parsed.protocol === 'canvas-file:'
      ) {
        isAllowed = true
      } else if (parsed.protocol === 'file:') {
        // Restrict file:// to app bundle
        const targetPath = path.resolve(fileUrlToPathSafe(url))
        if (targetPath.startsWith(RENDERER_DIST)) {
          isAllowed = true
        }
      } else if (VITE_DEV_SERVER_URL) {
        // Dev server check
        if (parsed.origin === new URL(VITE_DEV_SERVER_URL).origin) {
          isAllowed = true
        }
      }

      if (!isAllowed) {
        event.preventDefault()
        console.warn(`[Security] Blocked navigation in contents: ${url}`)
        if (url.startsWith('http')) shell.openExternal(url)
      }
    } catch {
      event.preventDefault()
    }
  })
})

// Set application name for dev mode
if (process.env.NODE_ENV === 'development') {
  app.setName('Whiteboard')
}

// Windows notifications require a valid App User Model ID matching appId in electron-builder
if (process.platform === 'win32') {
  app.setAppUserModelId('com.obinnanwachukwu.whiteboard')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js / preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Register custom schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'pdf-viewer',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'docx-viewer',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'canvas-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

let win: BrowserWindow | null
let tray: Tray | null = null
let isQuitting = false
let appConfig: AppConfig = { ...DEFAULT_CONFIG }

function devToolsEnabled(): boolean {
  // Allow devtools in packaged builds only when explicitly requested.
  // Useful for debugging production-only issues without shipping devtools by default.
  return !app.isPackaged || process.env.WB_DEVTOOLS === '1'
}

function quitApp() {
  isQuitting = true
  app.quit()
}

function createWindow() {
  win = createMainWindow({
    appConfig,
    dirname: __dirname,
    rendererDist: RENDERER_DIST,
    viteDevServerUrl: VITE_DEV_SERVER_URL,
    isQuitting: () => isQuitting,
    devToolsEnabled,
  })

  return win
}

function createContentWindow(params: {
  courseId: string
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
  contentId: string
  title?: string
}) {
  return createContentWindowImpl(params, {
    appConfig,
    dirname: __dirname,
    rendererDist: RENDERER_DIST,
    viteDevServerUrl: VITE_DEV_SERVER_URL,
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
//
// NOTE: With tray integration, we don't quit on window close for any platform.
// We only quit if isQuitting is true.
app.on('window-all-closed', () => {
  if (isQuitting) {
    aiManager.stop()
    embeddingManager.shutdown().catch(console.error)
    app.quit()
    win = null
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  aiManager.stop()
  embeddingManager.shutdown().catch(console.error)
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    // If window exists but hidden/minimized, show it
    if (win) {
      if (process.platform === 'darwin') app.dock?.show()
      win.show()
    }
  }
})

app.whenReady().then(async () => {
  const buildContentSecurityPolicy = () => {
    const isDev = !!VITE_DEV_SERVER_URL
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self'"
    const connectSrc = isDev
      ? "connect-src 'self' ws: http: https: canvas-file:"
      : "connect-src 'self' canvas-file:"
    return [
      "default-src 'self'",
      "base-uri 'none'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: canvas-file: https: blob:",
      "media-src 'self' canvas-file: https: blob:",
      "font-src 'self' data:",
      connectSrc,
      "frame-src 'self' https: pdf-viewer: docx-viewer:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",
    ].join('; ')
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    try {
      if (details.resourceType !== 'mainFrame') {
        callback({ responseHeaders: details.responseHeaders })
        return
      }
      const url = details.url || ''
      const devOrigin = VITE_DEV_SERVER_URL ? new URL(VITE_DEV_SERVER_URL).origin : null
      const isAppDocument = url.startsWith('file://') || (devOrigin && url.startsWith(devOrigin))
      if (!isAppDocument) {
        callback({ responseHeaders: details.responseHeaders })
        return
      }
      const headers = details.responseHeaders || {}
      headers['Content-Security-Policy'] = [buildContentSecurityPolicy()]
      callback({ responseHeaders: headers })
    } catch {
      callback({ responseHeaders: details.responseHeaders })
    }
  })

  // SECURITY: Deny all permission requests except notifications
  session.defaultSession.setPermissionRequestHandler(
    (_webContents: any, permission: any, callback: any) => {
      if (permission === 'notifications') {
        callback(true)
      } else {
        callback(false)
      }
    },
  )

  // Also deny permission checks except notifications
  session.defaultSession.setPermissionCheckHandler((_webContents: any, permission: any) => {
    if (permission === 'notifications') {
      return true
    }
    return false
  })

  // Install React DevTools in development
  if (VITE_DEV_SERVER_URL) {
    try {
      await installExtension(REACT_DEVELOPER_TOOLS)
      console.log('React DevTools installed')
    } catch (err) {
      console.error('Failed to install React DevTools:', err)
    }
  }

  createAppMenu({
    getMainWindow: () => win,
    devToolsEnabled,
    onQuit: quitApp,
  })

  // load config and create window
  appConfig = await loadConfig()

  // Initialize AI Manager
  void aiManager.start(!!appConfig.aiEnabled)

  registerContentProtocols({
    viteDevServerUrl: VITE_DEV_SERVER_URL,
    rendererDist: RENDERER_DIST,
  })

  setMacDockIcon({
    rendererDist: RENDERER_DIST,
    getIconPath: () => getIconPath(RENDERER_DIST),
  })

  if (!tray) {
    tray = createSystemTray({
      getMainWindow: () => win,
      getTrayIconPath: () => getTrayIconPath(RENDERER_DIST),
      onQuit: quitApp,
    })
  }

  createWindow()
})

registerIpcHandlers({
  getAppConfig: () => appConfig,
  setAppConfig: (next) => {
    appConfig = next
  },
  getMainWindow: () => win,
  aiManager,
  embeddingManager,
  fileMetaStore,
  ensureFileMetaStoreLoaded,
  uploadFileMap,
  safeContentType,
  createContentWindow,
  getThemeBackgroundsDir,
  getThemeBackgroundsLegacyDir,
  isPathInDir,
})
