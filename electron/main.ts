import {
  app,
  BrowserWindow,
  shell,
  nativeImage,
  protocol,
  net,
  Tray,
  Menu,
  session,
} from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import { canvasFileUrlToPath, fileUrlToPathSafe, normalizeWin32Path } from './pathUtils'

import { loadConfig, DEFAULT_CONFIG, type AppConfig } from './config'
import { AIManager } from './ai/manager'
import { EmbeddingManager } from './embedding/manager'
import { FileMetaStore } from './embedding/fileMetaStore'
import { cleanupTempFiles } from './embedding/tempCleaner'
import { registerIndexingIPC } from './embedding/indexingService'
import { registerIpcHandlers } from './ipc'
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

      if (parsed.protocol === 'pdf-viewer:' || parsed.protocol === 'canvas-file:') {
        isAllowed = true
      } else if (parsed.protocol === 'file:') {
        // Restrict file:// to app bundle
        // Normalize paths for comparison
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

// (PDF viewer is now an iframe + postMessage; no WebContentsView host.)

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

function safeContentType(
  t: any,
): 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz' | null {
  if (
    t === 'page' ||
    t === 'assignment' ||
    t === 'announcement' ||
    t === 'discussion' ||
    t === 'file' ||
    t === 'quiz'
  )
    return t
  return null
}

function buildContentHash(params: {
  courseId: string
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
  contentId: string
  title?: string
  embed?: boolean
}): string {
  const q = new URLSearchParams()
  q.set('courseId', params.courseId)
  q.set('type', params.type)
  q.set('contentId', params.contentId)
  if (params.title) q.set('title', params.title)
  if (params.embed) q.set('embed', '1')
  // IMPORTANT: use a literal hash fragment ("#/...") when loading a file:// URL.
  // BrowserWindow.loadFile() can URL-encode the hash, which breaks hash routing.
  return `#/content?${q.toString()}`
}

function createContentWindow(params: {
  courseId: string
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
  contentId: string
  title?: string
}) {
  const icon = getIconPath()
  const savedTheme = appConfig?.theme
  const isDark = savedTheme === 'dark' || (!savedTheme && process.platform === 'darwin')
  const bgColor = isDark ? '#020617' : '#ffffff'

  const child = new BrowserWindow({
    ...(icon ? { icon } : {}),
    show: false,
    backgroundColor: bgColor,
    width: 980,
    height: 720,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 20, y: 20 }, // Match h-14 (56px) embedded header
        }
      : {}),
    ...(process.platform === 'win32'
      ? {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: isDark ? '#ffffff' : '#000000',
            height: 56,
          },
          autoHideMenuBar: true,
          backgroundMaterial: 'mica' as const,
        }
      : process.platform !== 'darwin'
        ? { autoHideMenuBar: true }
        : {}),
    webPreferences: {
      preload: getPreloadPath(),
      webviewTag: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // (No native embedded views to clean up.)

  child.once('ready-to-show', () => child.show())

  child.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Block DevTools keyboard shortcuts in production
  if (app.isPackaged) {
    child.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        const isMac = process.platform === 'darwin'
        const isDevToolsShortcut =
          (isMac && input.meta && input.alt && input.key.toLowerCase() === 'i') ||
          (!isMac && input.control && input.shift && input.key.toLowerCase() === 'i') ||
          input.key === 'F12'
        if (isDevToolsShortcut) {
          event.preventDefault()
        }
      }
    })
  }

  const hash = buildContentHash({
    courseId: params.courseId,
    type: params.type,
    contentId: params.contentId,
    title: params.title,
    embed: true,
  })

  if (VITE_DEV_SERVER_URL) {
    // VITE_DEV_SERVER_URL already includes the origin; append hash fragment directly.
    child.loadURL(`${VITE_DEV_SERVER_URL}${hash}`)
  } else {
    // Use loadURL with an explicit file:// URL so the hash stays unencoded.
    const fileUrl = pathToFileURL(path.join(RENDERER_DIST, 'index.html')).toString()
    child.loadURL(`${fileUrl}${hash}`)
  }

  return child
}

function getIconPath(): string | undefined {
  const pub = process.env.VITE_PUBLIC || RENDERER_DIST
  const candidates = [
    'icon.png',
    'icon.icns',
    'icon.ico',
    // fallback to the template SVG if no PNG/ICO/ICNS is present
    'electron-vite.svg',
  ].map((name) => path.join(pub, name))
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // ignore fs errors and continue
    }
  }
  return undefined
}

function getTrayIconPath(): string | undefined {
  const pub = process.env.VITE_PUBLIC || RENDERER_DIST
  const candidates = [
    'TrayIconTemplate.png', // macOS automatic light/dark mode
    'tray.png',
    'icon.png',
    'icon.icns',
    'icon.ico',
    'electron-vite.svg',
  ].map((name) => path.join(pub, name))
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // ignore fs errors and continue
    }
  }
  return undefined
}

function getPreloadPath(): string {
  const candidates = [path.join(__dirname, 'preload.cjs'), path.join(__dirname, 'preload.js')]
  const resolved = candidates.find((p) => fs.existsSync(p))
  if (!resolved) {
    console.warn('[preload] No preload script found, defaulting to preload.js')
    return path.join(__dirname, 'preload.js')
  }
  return resolved
}

function createWindow() {
  const icon = getIconPath()
  // Determine initial background color based on saved theme to prevent flash
  const savedTheme = appConfig?.themeConfig?.theme ?? appConfig?.theme
  const isDark = savedTheme === 'dark' || (!savedTheme && process.platform === 'darwin')
  const bgColor = isDark ? '#020617' : '#ffffff' // slate-950 for dark, white for light

  win = new BrowserWindow({
    ...(icon ? { icon } : {}),
    // Start hidden to prevent white flash - will show on ready-to-show
    show: false,
    backgroundColor: bgColor,
    // Make the titlebar blend with renderer UI on macOS
    // - hiddenInset keeps native traffic lights but removes the opaque title bar
    // - titleBarOverlay lets our content extend into the titlebar area
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 20, y: 20 }, // add some padding around the traffic lights
        }
      : {}),
    // Windows: extend content into titlebar while keeping native caption buttons.
    // Also auto-hide the menu bar (the Windows "toolbar") so only our React header shows.
    ...(process.platform === 'win32'
      ? {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            color: '#00000000', // transparent so the Header background shows through
            symbolColor: isDark ? '#ffffff' : '#000000',
            height: 56, // match Header height (h-14)
          },
          autoHideMenuBar: true,
          backgroundMaterial: 'mica' as const,
        }
      : process.platform !== 'darwin'
        ? { autoHideMenuBar: true }
        : {}),
    webPreferences: {
      preload: getPreloadPath(),
      webviewTag: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: devToolsEnabled(),
    },
  })

  // (No native embedded views to clean up.)

  // Show window once content is ready (prevents white flash)
  win.once('ready-to-show', () => {
    win?.show()
  })

  // Prevent new windows from spawning automatically (security best practice)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Close behavior: minimize to tray unless quitting
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win?.hide()
      if (process.platform === 'darwin') {
        app.dock?.hide()
      }
    }
    // If isQuitting is true, let the window close normally
  })

  try {
    win.webContents.setVisualZoomLevelLimits(1, 1)
  } catch {}
  try {
    win.webContents.setZoomFactor(1)
    win.webContents.setZoomLevel(0)
  } catch {}

  // SECURITY: Block navigation to non-app origins
  const allowedOrigins = new Set<string>()
  if (VITE_DEV_SERVER_URL) {
    try {
      const devUrl = new URL(VITE_DEV_SERVER_URL)
      allowedOrigins.add(devUrl.origin)
    } catch {}
  }

  // Helper to check if navigation is allowed
  const isAllowedNavigation = (url: string) => {
    try {
      const parsed = new URL(url)
      // Allow file:// (production)
      if (parsed.protocol === 'file:') return true
      // Allow dev server
      if (allowedOrigins.has(parsed.origin)) return true
      // Allow internal schemes
      if (
        parsed.protocol === 'pdf-viewer:' ||
        parsed.protocol === 'docx-viewer:' ||
        parsed.protocol === 'canvas-file:'
      ) {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
      console.warn(`[Security] Blocked navigation to ${url}`)
    }
  })

  win.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
      console.warn(`[Security] Blocked redirect to ${url}`)
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Block DevTools keyboard shortcuts in production unless explicitly enabled.
  if (app.isPackaged && !devToolsEnabled()) {
    win.webContents.on('before-input-event', (event, input) => {
      // Block Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)
      if (input.type === 'keyDown') {
        const isMac = process.platform === 'darwin'
        const isDevToolsShortcut =
          (isMac && input.meta && input.alt && input.key.toLowerCase() === 'i') ||
          (!isMac && input.control && input.shift && input.key.toLowerCase() === 'i') ||
          input.key === 'F12'
        if (isDevToolsShortcut) {
          event.preventDefault()
        }
      }
    })
  }

  // Open devtools automatically when enabled via env.
  if (devToolsEnabled() && app.isPackaged) {
    win.webContents.once('did-finish-load', () => {
      try {
        win?.webContents.openDevTools({ mode: 'detach' })
      } catch {
        // ignore
      }
    })
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: '/dashboard' })
  }
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

// Menu configuration
function createAppMenu() {
  const isMac = process.platform === 'darwin'
  const allowDevTools = devToolsEnabled()

  const template: Electron.MenuItemConstructorOptions[] = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Settings...',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  win?.webContents.send('menu:action', 'settings')
                  if (isMac) app.dock?.show()
                  win?.show()
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              {
                label: 'Quit Whiteboard',
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                  isQuitting = true
                  app.quit()
                },
              },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ] as Electron.MenuItemConstructorOptions[],
    },
    // { role: 'viewMenu' } - Custom to remove Reload
    {
      label: 'View',
      submenu: [
        // Only show dev tools when enabled
        ...(allowDevTools
          ? [
              { role: 'reload' } as Electron.MenuItemConstructorOptions,
              { role: 'forceReload' } as Electron.MenuItemConstructorOptions,
              { role: 'toggleDevTools' } as Electron.MenuItemConstructorOptions,
              { type: 'separator' } as Electron.MenuItemConstructorOptions,
            ]
          : []),
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ] as Electron.MenuItemConstructorOptions[],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = await import('electron')
            await shell.openExternal('https://github.com/obinnanwachukwu/whiteboard')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

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

  createAppMenu()

  // load config and create window
  appConfig = await loadConfig()

  // Initialize AI Manager
  void aiManager.start(!!appConfig.aiEnabled)

  // Register custom protocol for secure file serving
  // SECURITY: Only allow access to files in temp or theme backgrounds dir
  protocol.handle('canvas-file', async (req) => {
    try {
      // Normalize to ensure we always have canvas-file:///path (no host component)
      let normalized = req.url
      if (normalized.startsWith('canvas-file://') && !normalized.startsWith('canvas-file:///')) {
        normalized = normalized.replace(/^canvas-file:\/\/+/, 'canvas-file:///')
      }

      const filePath = canvasFileUrlToPath(normalized)

      const resolvedPath = path.resolve(filePath)
      if (!fs.existsSync(resolvedPath)) {
        return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
      }

      // Security check: resolve to absolute path and verify it's allowed
      const resolvedReal = await fs.promises.realpath(resolvedPath)
      const tempDir = await fs.promises.realpath(normalizeWin32Path(app.getPath('temp')))
      const themeDir = await fs.promises.realpath(getThemeBackgroundsDir())
      const legacyDir = getThemeBackgroundsLegacyDir()
      const legacyReal = fs.existsSync(legacyDir) ? await fs.promises.realpath(legacyDir) : null

      const allowed =
        isPathInDir(tempDir, resolvedReal) ||
        isPathInDir(themeDir, resolvedReal) ||
        (legacyReal ? isPathInDir(legacyReal, resolvedReal) : false)

      if (!allowed) {
        console.warn(`[Security] Blocked access to file outside allowed dirs: ${resolvedReal}`)
        return new Response('Forbidden: Access denied to files outside allowed directories', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      // Support Range requests (required for video/audio streaming + seeking, and for PDF.js range reads)
      const stat = await fs.promises.stat(resolvedReal)
      const size = stat.size

      const ext = path.extname(resolvedReal).toLowerCase()
      const contentType = (() => {
        switch (ext) {
          case '.pdf':
            return 'application/pdf'
          case '.mp4':
            return 'video/mp4'
          case '.m4v':
            return 'video/x-m4v'
          case '.mov':
            return 'video/quicktime'
          case '.webm':
            return 'video/webm'
          case '.ogv':
          case '.ogg':
            return 'video/ogg'
          case '.mp3':
            return 'audio/mpeg'
          case '.m4a':
            return 'audio/mp4'
          case '.aac':
            return 'audio/aac'
          case '.wav':
            return 'audio/wav'
          case '.png':
            return 'image/png'
          case '.jpg':
          case '.jpeg':
            return 'image/jpeg'
          case '.gif':
            return 'image/gif'
          case '.webp':
            return 'image/webp'
          case '.svg':
            return 'image/svg+xml'
          case '.txt':
            return 'text/plain; charset=utf-8'
          case '.html':
            return 'text/html; charset=utf-8'
          case '.json':
            return 'application/json; charset=utf-8'
          default:
            return 'application/octet-stream'
        }
      })()

      const headers = new Headers()
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Content-Type', contentType)
      headers.set('Cache-Control', 'no-store')

      const range = req.headers.get('range')
      const method = (req.method || 'GET').toUpperCase()

      if (range) {
        const m = /^bytes=(\d+)-(\d+)?$/i.exec(range)
        if (!m) {
          headers.set('Content-Range', `bytes */${size}`)
          return new Response('Invalid Range', { status: 416, headers })
        }
        const start = Number(m[1])
        const end = m[2] != null ? Math.min(Number(m[2]), size - 1) : size - 1
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          end < start ||
          start >= size
        ) {
          headers.set('Content-Range', `bytes */${size}`)
          return new Response('Range Not Satisfiable', { status: 416, headers })
        }

        headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
        headers.set('Content-Length', String(end - start + 1))

        if (method === 'HEAD') {
          return new Response(null, { status: 206, headers })
        }

        const stream = fs.createReadStream(resolvedReal, { start, end })
        return new Response(Readable.toWeb(stream) as any, { status: 206, headers })
      }

      headers.set('Content-Length', String(size))

      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers })
      }

      const stream = fs.createReadStream(resolvedReal)
      return new Response(Readable.toWeb(stream) as any, { status: 200, headers })
    } catch (e) {
      console.error(`[canvas-file] Error handling request: ${req.url}`, e)
      return new Response('Bad Request', { status: 400 })
    }
  })

  // Register custom protocol for PDF viewer assets
  // Serves files from public/pdfviewer (dev) or dist/pdfviewer (production)
  protocol.handle('pdf-viewer', (req) => {
    const url = req.url.replace(/^pdf-viewer:\/\//, '')
    const withoutQuery = url.split('?')[0].split('#')[0]
    let filePath = decodeURIComponent(withoutQuery)

    // Normalize: strip trailing slashes
    filePath = filePath.replace(/\/+$/, '')

    // Strip pdfviewer.html/ prefix from relative resource paths
    // (happens because HTML loads from pdf-viewer://pdfViewer.html/ with trailing slash)
    filePath = filePath.replace(/^pdfviewer\.html\//i, '')

    // Normalize known files to correct case
    if (filePath.toLowerCase() === 'pdfviewer.html') {
      filePath = 'pdfViewer.html'
    }

    console.log(`[pdf-viewer] Request: ${url} -> ${filePath}`)

    // Security: only allow specific file extensions
    const allowedExtensions = ['.html', '.js', '.mjs', '.css', '.bcmap', '.svg', '.gif', '.png', '.map']
    const ext = path.extname(filePath).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[pdf-viewer] Blocked disallowed file type: ${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    // Determine base path based on dev/production mode
    let resolvedPath: string
    if (VITE_DEV_SERVER_URL) {
      // Development: serve from node_modules and public
      if (filePath === 'pdfViewer.html' || filePath === 'bridge.js') {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'pdfviewer', filePath)
      } else if (filePath.startsWith('cmaps/')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', filePath)
      } else if (filePath === 'pdf.mjs' || filePath === 'pdf.worker.mjs') {
        resolvedPath = path.join(
          process.env.APP_ROOT,
          'node_modules',
          'pdfjs-dist',
          'build',
          filePath,
        )
      } else if (filePath === 'pdf_viewer.mjs' || filePath === 'pdf_viewer.css') {
        resolvedPath = path.join(
          process.env.APP_ROOT,
          'node_modules',
          'pdfjs-dist',
          'web',
          filePath,
        )
      } else if (filePath.startsWith('images/')) {
        resolvedPath = path.join(
          process.env.APP_ROOT,
          'node_modules',
          'pdfjs-dist',
          'web',
          filePath,
        )
      } else {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'pdfviewer', filePath)
      }
    } else {
      // Production: serve from dist/pdfviewer
      resolvedPath = path.join(RENDERER_DIST, 'pdfviewer', filePath)
    }

    // Security: ensure resolved path is within allowed directory
    const allowedBase = VITE_DEV_SERVER_URL ? process.env.APP_ROOT : RENDERER_DIST
    if (!resolvedPath.startsWith(allowedBase)) {
      console.warn(`[pdf-viewer] Blocked request outside allowed dir: ${resolvedPath}`)
      return new Response('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`[pdf-viewer] File not found: ${resolvedPath}`)
      return new Response('Not Found', { status: 404 })
    }

    console.log(`[pdf-viewer] Serving: ${resolvedPath}`)
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })

  // Register custom protocol for DOCX viewer assets
  // Serves files from public/docxviewer (dev) or dist/docxviewer (production)
  protocol.handle('docx-viewer', (req) => {
    const url = req.url.replace(/^docx-viewer:\/\//, '')
    let filePath = decodeURIComponent(url)

    // Normalize: strip trailing slashes
    filePath = filePath.replace(/\/+$/, '')

    // Strip docxviewer.html/ prefix from relative resource paths
    filePath = filePath.replace(/^docxviewer\.html\//i, '')

    // Normalize known files to correct case
    if (filePath.toLowerCase() === 'docxviewer.html') {
      filePath = 'docxViewer.html'
    }

    console.log(`[docx-viewer] Request: ${url} -> ${filePath}`)

    // Security: only allow specific file extensions
    const allowedExtensions = ['.html', '.js', '.css', '.svg', '.gif', '.png', '.map']
    const ext = path.extname(filePath).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[docx-viewer] Blocked disallowed file type: ${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    // Determine base path based on dev/production mode
    let resolvedPath: string
    if (VITE_DEV_SERVER_URL) {
      // Development: serve from node_modules and public
      if (filePath.startsWith('docx-preview.')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'docx-preview', 'dist', filePath)
      } else if (filePath.startsWith('jszip.')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'jszip', 'dist', filePath)
      } else {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'docxviewer', filePath)
      }
    } else {
      // Production: serve from dist/docxviewer
      resolvedPath = path.join(RENDERER_DIST, 'docxviewer', filePath)
    }

    // Security: ensure resolved path is within allowed directory
    const allowedBase = VITE_DEV_SERVER_URL ? process.env.APP_ROOT : RENDERER_DIST
    if (!resolvedPath.startsWith(allowedBase)) {
      console.warn(`[docx-viewer] Blocked request outside allowed dir: ${resolvedPath}`)
      return new Response('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`[docx-viewer] File not found: ${resolvedPath}`)
      return new Response('Not Found', { status: 404 })
    }

    console.log(`[docx-viewer] Serving: ${resolvedPath}`)
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })

  // Set dock icon on macOS during dev so it shows immediately
  if (process.platform === 'darwin') {
    // Prefer .icns for macOS Dock to ensure correct sizing/padding
    const pub = process.env.VITE_PUBLIC || RENDERER_DIST
    let iconPath = path.join(pub, 'icon.icns')

    if (!fs.existsSync(iconPath)) {
      iconPath =
        getIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')
    }

    try {
      if (iconPath) app.dock?.setIcon(nativeImage.createFromPath(iconPath))
    } catch {
      // ignore errors setting dock icon in dev
    }
  }

  // Create system tray
  if (!tray) {
    const iconPath =
      getTrayIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')
    if (iconPath) {
      // Resize for tray (usually 16x16 or 22x22)
      // NativeImage handles scaling automatically on macOS
      let trayIcon = nativeImage.createFromPath(iconPath)

      // If it's not a template image (which should be sized correctly by user), resize it
      // Standard macOS tray icon is 22px height (44px @2x)
      // We always resize to ensure consistent display, even for templates
      if (iconPath.endsWith('Template.png')) {
        // User requested 16x16 logical size for this specific icon
        trayIcon = trayIcon.resize({ width: 16, height: 16 })
        trayIcon.setTemplateImage(true)
      } else {
        trayIcon = trayIcon.resize({ width: 16, height: 16 })
      }

      tray = new Tray(trayIcon)

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Open Whiteboard',
          click: () => {
            if (process.platform === 'darwin') app.dock?.show()
            win?.show()
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            isQuitting = true
            app.quit()
          },
        },
      ])

      tray.setToolTip('Whiteboard')
      tray.setContextMenu(contextMenu)

      // On Windows/Linux, left-click should also open the context menu
      // (On macOS, setContextMenu takes over all clicks automatically)
      tray.on('click', () => {
        tray?.popUpContextMenu()
      })
    }
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

// Theme handler helpers

const THEME_BACKGROUNDS_DIR = 'theme-backgrounds'

// Get the theme backgrounds directory (persisted under userData)
function getThemeBackgroundsDir(): string {
  const userDir = normalizeWin32Path(app.getPath('userData'))
  const bgDir = path.join(userDir, THEME_BACKGROUNDS_DIR)
  if (!fs.existsSync(bgDir)) {
    fs.mkdirSync(bgDir, { recursive: true })
  }
  return bgDir
}

// Legacy location (temp) for backward compatibility
function getThemeBackgroundsLegacyDir(): string {
  const tempDir = normalizeWin32Path(app.getPath('temp'))
  return path.join(tempDir, THEME_BACKGROUNDS_DIR)
}

function isPathInDir(baseDir: string, targetPath: string) {
  const rel = path.relative(baseDir, targetPath)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}
