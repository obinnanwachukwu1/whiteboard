import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  nativeImage,
  protocol,
  net,
  Tray,
  Menu,
  dialog,
  clipboard,
  session,
  safeStorage,
} from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { canvasFileUrlToPath, fileUrlToPathSafe, normalizeWin32Path } from './pathUtils'

import {
  initCanvas,
  clearToken,
  getProfile as canvasGetProfile,
  listCourses as canvasListCourses,
  listDueAssignments as canvasListDue,
  listCourseAssignments as canvasListCourseAssignments,
  CanvasError,
  getRateLimitSnapshot as canvasGetRateLimitSnapshot,
} from './canvasClient'
import { loadConfig, saveConfig, DEFAULT_CONFIG, type AppConfig } from './config'
import { AIManager } from './ai/manager'
import { EmbeddingManager, IndexableItem, EmbeddingStatus } from './embedding/manager'
import type { SearchResult } from './embedding/vectorStore'
import { FileMetaStore } from './embedding/fileMetaStore'
import { cleanupTempFiles } from './embedding/tempCleaner'
import { registerIndexingIPC } from './embedding/indexingService'
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

import {
  listCourseModulesGql as svcListCourseModulesGql,
  getCourseModuleItem as svcGetCourseModuleItem,
  listUpcoming as svcListUpcoming,
  listTodo as svcListTodo,
  getMySubmission as svcGetMySubmission,
  submitAssignment as svcSubmitAssignment,
  submitAssignmentUpload as svcSubmitAssignmentUpload,
  listCoursePages as svcListCoursePages,
  getCoursePage as svcGetCoursePage,
  getAssignmentRest as svcGetAssignmentRest,
  getFile as svcGetFile,
  downloadFile as svcDownloadFile,
  downloadCourseImage as svcDownloadCourseImage,
  listAssignmentsWithSubmission as svcListAssignmentsWithSubmission,
  listAssignmentGroups as svcListAssignmentGroups,
  listMyEnrollmentsForCourse as svcListMyEnrollmentsForCourse,
  listCourseTabs as svcListCourseTabs,
  listCourseQuizzes as svcListCourseQuizzes,
  getCourseQuiz as svcGetCourseQuiz,
  listActivityStream as svcListActivityStream,
  listCourseAnnouncements as svcListCourseAnnouncements,
  listCourseAnnouncementsPage as svcListCourseAnnouncementsPage,
  getAnnouncement as svcGetAnnouncement,
  // Discussions
  listCourseDiscussions as svcListCourseDiscussions,
  getDiscussion as svcGetDiscussion,
  getDiscussionView as svcGetDiscussionView,
  postDiscussionEntry as svcPostDiscussionEntry,
  postDiscussionReply as svcPostDiscussionReply,
  markDiscussionEntriesRead as svcMarkDiscussionEntriesRead,
  getCourseInfo as svcGetCourseInfo,
  getCourseFrontPage as svcGetCourseFrontPage,
  listCourseFiles as svcListCourseFiles,
  listCourseFolders as svcListCourseFolders,
  listFolderFiles as svcListFolderFiles,
  listCourseUsers as svcListCourseUsers,
  listCourseGroups as svcListCourseGroups,
  listMyGroups as svcListMyGroups,
  listGroupUsers as svcListGroupUsers,
  // Conversations
  listConversations as svcListConversations,
  getConversation as svcGetConversation,
  getUnreadCount as svcGetUnreadCount,
  createConversation as svcCreateConversation,
  addMessage as svcAddMessage,
  updateConversation as svcUpdateConversation,
  deleteConversation as svcDeleteConversation,
  searchRecipients as svcSearchRecipients,
  resolveUrl as svcResolveUrl,
} from './canvasClient'

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

// Windows: allow renderer to update caption button color when theme changes.
ipcMain.handle(
  'window:setTitleBarOverlayTheme',
  async (event, opts: { isDark: boolean }): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (process.platform !== 'win32') return { ok: false, error: 'Unsupported platform' }
      const senderWin = BrowserWindow.fromWebContents(event.sender)
      if (!senderWin) return { ok: false, error: 'No window' }

      senderWin.setTitleBarOverlay({
        color: '#00000000',
        symbolColor: opts?.isDark ? '#ffffff' : '#000000',
        height: 56,
      })
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  },
)

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
  aiManager.start(!!appConfig.aiEnabled)

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

// IPC handlers for secure storage (sync, backed by OS keychain)
ipcMain.on('secureStorage:isAvailable', (event) => {
  try {
    event.returnValue = Boolean(safeStorage?.isEncryptionAvailable?.())
  } catch {
    event.returnValue = false
  }
})

ipcMain.on('secureStorage:encrypt', (event, value: string) => {
  try {
    if (!safeStorage?.isEncryptionAvailable?.()) {
      event.returnValue = null
      return
    }
    const buf = safeStorage.encryptString(String(value))
    event.returnValue = buf.toString('base64')
  } catch {
    event.returnValue = null
  }
})

ipcMain.on('secureStorage:decrypt', (event, payload: string) => {
  try {
    if (!safeStorage?.isEncryptionAvailable?.()) {
      event.returnValue = null
      return
    }
    const buf = Buffer.from(String(payload), 'base64')
    event.returnValue = safeStorage.decryptString(buf)
  } catch {
    event.returnValue = null
  }
})

// IPC handlers for Canvas actions
ipcMain.handle(
  'canvas:init',
  async (_evt, cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => {
    try {
      const baseUrl = cfg?.baseUrl || appConfig.baseUrl
      const verbose = cfg?.verbose ?? appConfig.verbose
      const res = await initCanvas({ token: cfg?.token, baseUrl, verbose })
      // persist baseUrl / verbose if provided
      appConfig = await saveConfig({ baseUrl, verbose })
      return { ok: true, insecure: !!res?.insecure }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:clearToken', async (_evt, baseUrl?: string) => {
  try {
    await clearToken(baseUrl)
    return { ok: true }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getProfile', async () => {
  try {
    const data = await canvasGetProfile()
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getRateLimit', async () => {
  try {
    const data = await canvasGetRateLimitSnapshot()
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourses', async (_evt, opts?: { enrollment_state?: string }) => {
  try {
    const data = await canvasListCourses(opts)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:listDueAssignments',
  async (_evt, opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) => {
    try {
      const data = await canvasListDue(opts)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseAssignments',
  async (_evt, courseId: string | number, first = 200) => {
    try {
      const data = await canvasListCourseAssignments(courseId, first)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseModulesGql',
  async (_evt, courseId: string | number, first = 20, itemsFirst = 50) => {
    try {
      const data = await svcListCourseModulesGql(courseId, first, itemsFirst)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:getCourseModuleItem',
  async (_evt, courseId: string | number, itemId: string | number) => {
    try {
      const data = await svcGetCourseModuleItem(courseId, itemId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:listUpcoming', async (_evt, opts?: { onlyActiveCourses?: boolean }) => {
  try {
    const data = await svcListUpcoming(opts)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listTodo', async () => {
  try {
    const data = await svcListTodo()
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:getMySubmission',
  async (
    _evt,
    courseId: string | number,
    assignmentRestId: string | number,
    include?: string[],
  ) => {
    try {
      const data = await svcGetMySubmission(courseId, assignmentRestId, include)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:submitAssignment',
  async (
    _evt,
    courseId: string | number,
    assignmentRestId: string | number,
    params: {
      submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
      body?: string
      url?: string
      fileIds?: Array<string | number>
    },
  ) => {
    try {
      const data = await svcSubmitAssignment(courseId, assignmentRestId, params)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:submitAssignmentUpload',
  async (
    _evt,
    courseId: string | number,
    assignmentRestId: string | number,
    fileHandles: string[],
  ) => {
    try {
      // Security: Fetch assignment details from Canvas to get authoritative allowed_extensions
      // Do NOT trust the renderer to provide the allowlist.
      const assignment = await svcGetAssignmentRest(courseId, assignmentRestId)
      const allowedRaw = assignment?.allowed_extensions || []

      // Normalize allowed extensions: strip dots, lowercase, trim
      const allowedSet = new Set<string>()
      if (Array.isArray(allowedRaw) && allowedRaw.length > 0) {
        for (const ext of allowedRaw) {
          if (typeof ext === 'string') {
            allowedSet.add(ext.trim().toLowerCase().replace(/^\./, ''))
          }
        }
      }

      // Resolve handles to paths
      const filePaths: string[] = []
      for (const handle of fileHandles) {
        if (uploadFileMap.has(handle)) {
          const p = uploadFileMap.get(handle)!

          // Enforce allowed extensions if restriction exists
          if (allowedSet.size > 0) {
            // Check full extension (e.g. .tar.gz) and simple extension
            const filename = path.basename(p).toLowerCase()

            // Check if any allowed extension matches the end of the filename
            // This handles "tar.gz" vs "gz" ambiguity safely
            let matched = false
            for (const allowed of allowedSet) {
              if (filename.endsWith(`.${allowed}`)) {
                matched = true
                break
              }
            }

            if (!matched) {
              return { ok: false, error: `File type not allowed: ${path.basename(p)}` }
            }
          }

          filePaths.push(p)
        } else {
          console.warn(`[Security] Blocked upload of invalid/expired handle: ${handle}`)
          return { ok: false, error: 'File selection expired. Please pick files again.' }
        }
      }

      const data = await svcSubmitAssignmentUpload(courseId, assignmentRestId, filePaths)

      // Cleanup handles on success
      for (const handle of fileHandles) {
        uploadFileMap.delete(handle)
      }

      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:listCoursePages', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListCoursePages(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:getCoursePage',
  async (_evt, courseId: string | number, slugOrUrl: string) => {
    try {
      const data = await svcGetCoursePage(courseId, slugOrUrl)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:getAssignmentRest',
  async (
    _evt,
    courseId: string | number,
    assignmentRestId: string | number,
    include?: string[],
  ) => {
    try {
      const data = await svcGetAssignmentRest(courseId, assignmentRestId, include)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:getFile', async (_evt, fileId: string | number) => {
  try {
    const data = await svcGetFile(fileId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:listAssignmentsWithSubmission',
  async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListAssignmentsWithSubmission(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listAssignmentGroups',
  async (_evt, courseId: string | number, includeAssignments = false) => {
    try {
      const data = await svcListAssignmentGroups(courseId, includeAssignments)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:listMyEnrollmentsForCourse', async (_evt, courseId: string | number) => {
  try {
    const data = await svcListMyEnrollmentsForCourse(courseId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:listCourseTabs',
  async (_evt, courseId: string | number, includeExternal = true) => {
    try {
      const data = await svcListCourseTabs(courseId, includeExternal)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseQuizzes',
  async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListCourseQuizzes(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:getCourseQuiz',
  async (_evt, courseId: string | number, quizId: string | number) => {
    try {
      const data = await svcGetCourseQuiz(courseId, quizId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listActivityStream',
  async (_evt, opts?: { onlyActiveCourses?: boolean; perPage?: number }) => {
    try {
      const data = await svcListActivityStream(opts)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseAnnouncements',
  async (_evt, courseId: string | number, perPage = 50) => {
    try {
      const data = await svcListCourseAnnouncements(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseAnnouncementsPage',
  async (_evt, courseId: string | number, page = 1, perPage = 10) => {
    try {
      const data = await svcListCourseAnnouncementsPage(courseId, page, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:getCourseInfo', async (_evt, courseId: string | number) => {
  try {
    const data = await svcGetCourseInfo(courseId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getCourseFrontPage', async (_evt, courseId: string | number) => {
  try {
    const data = await svcGetCourseFrontPage(courseId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:listCourseFiles',
  async (
    _evt,
    courseId: string | number,
    perPage = 100,
    sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at',
    order: 'asc' | 'desc' = 'desc',
  ) => {
    try {
      const data = await svcListCourseFiles(courseId, perPage, sort, order)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:listCourseFolders',
  async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListCourseFolders(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:listFolderFiles', async (_evt, folderId: string | number, perPage = 100) => {
  try {
    const data = await svcListFolderFiles(folderId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseUsers', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListCourseUsers(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:listCourseGroups',
  async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListCourseGroups(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:listMyGroups', async (_evt, contextType?: 'Account' | 'Course') => {
  try {
    const data = await svcListMyGroups(contextType)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listGroupUsers', async (_evt, groupId: string | number, perPage = 100) => {
  try {
    const data = await svcListGroupUsers(groupId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:getAnnouncement',
  async (_evt, courseId: string | number, topicId: string | number) => {
    try {
      const data = await svcGetAnnouncement(courseId, topicId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

// Discussions
ipcMain.handle(
  'canvas:listCourseDiscussions',
  async (
    _evt,
    courseId: string | number,
    params?: {
      perPage?: number
      searchTerm?: string
      filterBy?: 'all' | 'unread'
      scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
      orderBy?: 'position' | 'recent_activity' | 'title'
      maxPages?: number
    },
  ) => {
    try {
      // Validate inputs
      const safeParams = { ...params }

      // Clamp perPage
      if (safeParams.perPage !== undefined) {
        const p = Number(safeParams.perPage)
        if (!Number.isFinite(p) || p < 1 || p > 100) {
          safeParams.perPage = 50
        } else {
          safeParams.perPage = p
        }
      }

      // Validate maxPages
      if (safeParams.maxPages !== undefined) {
        const m = Number(safeParams.maxPages)
        if (!Number.isFinite(m) || m < 1) {
          delete safeParams.maxPages
        } else {
          // Cap maxPages to prevent abuse (e.g. 10 pages max)
          safeParams.maxPages = Math.min(m, 10)
        }
      }

      // Validate filterBy
      if (
        safeParams.filterBy &&
        safeParams.filterBy !== 'all' &&
        safeParams.filterBy !== 'unread'
      ) {
        delete safeParams.filterBy
      }

      // Validate scope
      const allowedScopes = ['locked', 'unlocked', 'pinned', 'unpinned']
      if (safeParams.scope && !allowedScopes.includes(safeParams.scope)) {
        delete safeParams.scope
      }

      // Validate orderBy
      const allowedOrder = ['position', 'recent_activity', 'title']
      if (safeParams.orderBy && !allowedOrder.includes(safeParams.orderBy)) {
        delete safeParams.orderBy
      }

      // Trim searchTerm and treat empty/whitespace as undefined
      if (safeParams.searchTerm) {
        safeParams.searchTerm = String(safeParams.searchTerm).trim()
        if (!safeParams.searchTerm) delete safeParams.searchTerm
      }

      const data = await svcListCourseDiscussions(courseId, safeParams)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:getDiscussion',
  async (_evt, courseId: string | number, topicId: string | number) => {
    try {
      const data = await svcGetDiscussion(courseId, topicId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:getDiscussionView',
  async (_evt, courseId: string | number, topicId: string | number) => {
    try {
      const data = await svcGetDiscussionView(courseId, topicId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:postDiscussionEntry',
  async (_evt, courseId: string | number, topicId: string | number, message: string) => {
    try {
      const data = await svcPostDiscussionEntry(courseId, topicId, message)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:postDiscussionReply',
  async (
    _evt,
    courseId: string | number,
    topicId: string | number,
    entryId: string | number,
    message: string,
  ) => {
    try {
      const data = await svcPostDiscussionReply(courseId, topicId, entryId, message)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:markDiscussionEntriesRead',
  async (
    _evt,
    courseId: string | number,
    topicId: string | number,
    entryIds: (string | number)[],
  ) => {
    try {
      const data = await svcMarkDiscussionEntriesRead(courseId, topicId, entryIds)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:getFileBytes', async (_evt, fileId: string | number) => {
  try {
    // Return path instead of bytes, prefixed with custom protocol
    const path = await svcDownloadFile(fileId)
    // Encode the path for the URL using pathToFileURL to handle special chars and platform specific syntax
    const url = pathToFileURL(path)
      .toString()
      .replace(/^file:/, 'canvas-file:')
    return { ok: true, data: url }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:cacheCourseImage', async (_evt, courseId: string | number, url: string) => {
  try {
    if (appConfig?.privateModeEnabled) {
      return { ok: false, error: 'Private Mode is enabled' }
    }
    const normalizeHosts = (list: string[]) =>
      list.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    const hostAllowed = (host: string, allowHosts: string[]) =>
      allowHosts.some((entry) => host === entry || host.endsWith(`.${entry}`))

    const isPrivateHost = (host: string) => {
      if (host === 'localhost' || host === '::1') return true
      if (/^127\./.test(host)) return true
      if (/^10\./.test(host)) return true
      if (/^192\.168\./.test(host)) return true
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
      if (/^169\.254\./.test(host)) return true
      if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:'))
        return true
      return false
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { ok: false, error: 'Invalid URL' }
    }
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'Only https URLs are allowed' }
    }
    if (isPrivateHost(parsed.hostname)) {
      return { ok: false, error: 'Private network URLs are not allowed' }
    }
    const defaults = ['inscloudgate.net']
    const cfgList = Array.isArray(appConfig?.courseImageAllowlist)
      ? appConfig.courseImageAllowlist
      : []
    const envList =
      process.env.WB_COURSE_IMAGE_ALLOWLIST?.split(',').map((v) => v.trim()).filter(Boolean) || []
    let baseHost = ''
    try {
      baseHost = new URL(appConfig?.baseUrl || DEFAULT_CONFIG.baseUrl).hostname
    } catch {}
    const allowHosts = Array.from(
      new Set(normalizeHosts([...defaults, ...cfgList, ...envList, baseHost].filter(Boolean))),
    )
    if (!allowHosts.length) {
      return { ok: false, error: 'No allowed hosts configured for course images' }
    }
    if (!hostAllowed(parsed.hostname.toLowerCase(), allowHosts)) {
      return { ok: false, error: 'Image host is not in allowlist' }
    }
    const path = await svcDownloadCourseImage(courseId, url, { allowHosts })
    const fileUrl = pathToFileURL(path)
      .toString()
      .replace(/^file:/, 'canvas-file:')
    return { ok: true, data: fileUrl }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

// Conversations (Inbox)
ipcMain.handle(
  'canvas:listConversations',
  async (
    _evt,
    params?: { scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'; perPage?: number },
  ) => {
    try {
      const data = await svcListConversations(params)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:getConversation', async (_evt, conversationId: string | number) => {
  try {
    const data = await svcGetConversation(conversationId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getUnreadCount', async () => {
  try {
    const data = await svcGetUnreadCount()
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:createConversation',
  async (
    _evt,
    params: {
      recipients: string[]
      subject?: string
      body: string
      groupConversation?: boolean
      contextCode?: string
    },
  ) => {
    try {
      const data = await svcCreateConversation(params)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:addMessage',
  async (_evt, conversationId: string | number, body: string, includedMessages?: string[]) => {
    try {
      const data = await svcAddMessage(conversationId, body, includedMessages)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle(
  'canvas:updateConversation',
  async (
    _evt,
    conversationId: string | number,
    params: {
      workflowState?: 'read' | 'unread' | 'archived'
      starred?: boolean
      subscribed?: boolean
    },
  ) => {
    try {
      const data = await svcUpdateConversation(conversationId, params)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:deleteConversation', async (_evt, conversationId: string | number) => {
  try {
    const data = await svcDeleteConversation(conversationId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle(
  'canvas:searchRecipients',
  async (
    _evt,
    params: {
      search: string
      context?: string
      type?: 'user' | 'context'
      perPage?: number
    },
  ) => {
    try {
      const data = await svcSearchRecipients(params)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  },
)

ipcMain.handle('canvas:resolveUrl', async (_evt, url: string) => {
  try {
    if (!url.startsWith('http')) return { ok: false, error: 'Invalid URL' }
    const target = new URL(url)
    const base = new URL((appConfig?.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/$/, ''))
    if (target.origin !== base.origin) {
      // Never resolve non-Canvas origins in main; avoid leaking auth on redirects.
      return { ok: true, data: url }
    }

    const data = await svcResolveUrl(url)
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

// System helpers
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
      const { extractDegreeAuditPdfTextFromBytes } = await import('./degreeAudit/extractPdfText')
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

// Config IPC
ipcMain.handle('config:get', async () => {
  try {
    appConfig = await loadConfig()
    return { ok: true, data: appConfig }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('config:set', async (_evt, partial: Partial<AppConfig>) => {
  try {
    const oldConfig = appConfig
    appConfig = await saveConfig(partial)

    // Handle AI toggle
    if (partial.aiEnabled !== undefined && partial.aiEnabled !== oldConfig.aiEnabled) {
      if (partial.aiEnabled) {
        aiManager.start(true)
      } else {
        aiManager.stop()
      }
    }

    return { ok: true, data: appConfig }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

// ============ Embedding IPC Handlers ============

// Forward download progress events to renderer
embeddingManager.on('download-progress', (progress) => {
  if (win) {
    win.webContents.send('embedding:download-progress', progress)
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
      const { prepareFileForIndexing } = await import('./embedding/fileIndexer')

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
      const chunksForIndexing = result.chunks.map((c) => ({
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

// ============ Theme Background Image IPC Handlers ============

const THEME_BACKGROUNDS_DIR = 'theme-backgrounds'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp']

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
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

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
      // Validate file exists and size
      const stat = await fs.promises.stat(sourcePath)
      if (stat.size > MAX_IMAGE_SIZE) {
        return { ok: false, error: 'Image file is too large (max 10MB)' }
      }

      const ext = path.extname(sourcePath).toLowerCase()
      if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
        return { ok: false, error: 'Invalid image type. Allowed: JPG, PNG, WebP' }
      }

      // Generate unique filename
      const bgDir = getThemeBackgroundsDir()
      const uniqueName = `bg-${randomUUID()}${ext}`
      const destPath = path.join(bgDir, uniqueName)

      // Copy file to theme backgrounds directory
      await fs.promises.copyFile(sourcePath, destPath)

      // Return canvas-file:// URL for serving
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
      // Convert canvas-file:// URL back to file path
      if (!imageUrl.startsWith('canvas-file://')) {
        return { ok: false, error: 'Invalid image URL' }
      }

      const fileUrl = imageUrl.replace(/^canvas-file:/, 'file:')
      const filePath = fileUrlToPathSafe(fileUrl)

      // Security: ensure file is in theme backgrounds directory (current or legacy)
      const bgDir = getThemeBackgroundsDir()
      const legacyDir = getThemeBackgroundsLegacyDir()
      const resolvedPath = path.resolve(filePath)
      const allowed = isPathInDir(bgDir, resolvedPath) || isPathInDir(legacyDir, resolvedPath)
      if (!allowed) {
        return { ok: false, error: 'Cannot delete file outside theme backgrounds directory' }
      }

      // Delete the file
      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath)
      }

      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  },
)
