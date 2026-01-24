import { app, BrowserWindow, ipcMain, shell, nativeImage, protocol, net, Tray, Menu, dialog } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
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
import { loadConfig, saveConfig, type AppConfig } from './config'
import { AIManager } from './ai/manager'
import { EmbeddingManager, IndexableItem, EmbeddingStatus } from './embedding/manager'
import type { SearchResult } from './embedding/vectorStore'
import { FileMetaStore } from './embedding/fileMetaStore'
import { cleanupTempFiles } from './embedding/tempCleaner'
import { registerIndexingIPC } from './embedding/indexingService'

const aiManager = new AIManager()
const embeddingManager = new EmbeddingManager()
const fileMetaStore = new FileMetaStore()

// Load file metadata on startup
app.whenReady().then(() => {
  fileMetaStore.load().catch(console.error)
  
  // Clean up old temp files (fire and forget)
  cleanupTempFiles().catch(console.error)
})

// Register indexing IPC handlers
registerIndexingIPC()

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

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

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
])

let win: BrowserWindow | null
let tray: Tray | null = null
let isQuitting = false
let appConfig: AppConfig = loadConfig()

function safeContentType(t: any): 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | null {
  if (t === 'page' || t === 'assignment' || t === 'announcement' || t === 'discussion' || t === 'file') return t
  return null
}

function buildContentHash(params: {
  courseId: string
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file'
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
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file'
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
          trafficLightPosition: { x: 20, y: 13 }, // Vertically center in h-10 (40px) header
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
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  child.once('ready-to-show', () => child.show())

  child.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

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
  const candidates = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
  ]
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
  const savedTheme = appConfig?.theme
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
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  
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
        app.dock.hide()
      }
    }
    // If isQuitting is true, let the window close normally
  })

  // WORKAROUND: Force a repaint of native window controls (traffic lights) on blur.
  // This fixes the issue where traffic lights disappear when the window loses focus
  // in 'hiddenInset' mode.
  win.on('blur', () => {
    if (process.platform === 'darwin') {
      try {
        // Toggle visibility to force a redraw
        win?.setWindowButtonVisibility(false)
        // Immediate timeout to bring them back
        setTimeout(() => {
          try {
            win?.setWindowButtonVisibility(true)
          } catch {}
        }, 0)
      } catch {}
    }
  })

  // Ensure they are visible on focus
  win.on('focus', () => {
    if (process.platform === 'darwin') {
      try {
        win?.setWindowButtonVisibility(true)
      } catch {}
    }
  })

  try {
    win.webContents.setVisualZoomLevelLimits(1, 1)
  } catch {}
  try {
    win.webContents.setZoomFactor(1)
    win.webContents.setZoomLevel(0)
  } catch {}

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

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
      if (process.platform === 'darwin') app.dock.show()
      win.show()
    }
  }
})

// Menu configuration
function createAppMenu() {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // { role: 'appMenu' }
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { 
              label: 'Settings...', 
              accelerator: 'CmdOrCtrl+,', 
              click: () => {
                win?.webContents.send('menu:action', 'settings')
                if (isMac) app.dock.show()
                win?.show()
              } 
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
              } 
            }
          ]
        } as Electron.MenuItemConstructorOptions]
      : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
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
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ])
      ] as Electron.MenuItemConstructorOptions[]
    },
    // { role: 'viewMenu' } - Custom to remove Reload
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [
              { role: 'close' }
            ])
      ] as Electron.MenuItemConstructorOptions[]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = await import('electron')
            await shell.openExternal('https://github.com/obinnanwachukwu/whiteboard')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createAppMenu()
  // load config and create window
  appConfig = loadConfig()
  
  // Initialize AI Manager
  aiManager.start(!!appConfig.aiEnabled)
  
  // Register custom protocol for secure file serving
  // SECURITY: Only allow access to files in the temp directory
  protocol.handle('canvas-file', (req) => {
    const url = req.url.replace(/^canvas-file:\/\//, '')
    // Decode URL-encoded characters (e.g. %20 -> space)
    const filePath = decodeURIComponent(url)
    
    // Security check: resolve to absolute path and verify it's in temp directory
    const tempDir = app.getPath('temp')
    const resolvedPath = path.resolve(filePath)
    
    if (!resolvedPath.startsWith(tempDir)) {
      console.warn(`[Security] Blocked access to file outside temp dir: ${resolvedPath}`)
      return new Response('Forbidden: Access denied to files outside temp directory', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })
  
  // Register custom protocol for PDF viewer assets
  // Serves files from public/pdfviewer (dev) or dist/pdfviewer (production)
  protocol.handle('pdf-viewer', (req) => {
    const url = req.url.replace(/^pdf-viewer:\/\//, '')
    let filePath = decodeURIComponent(url)
    
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
    const allowedExtensions = ['.html', '.js', '.css', '.bcmap', '.svg', '.gif', '.png']
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
      } else if (filePath === 'pdf.js' || filePath === 'pdf.worker.js') {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', 'build', filePath)
      } else if (filePath === 'pdf_viewer.js' || filePath === 'pdf_viewer.css') {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', 'web', filePath)
      } else {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'pdfviewer', filePath)
      }
    } else {
      // Production: serve from dist/pdfviewer
      resolvedPath = path.join(RENDERER_DIST, 'pdfviewer', filePath)
    }
    
    // Security: ensure resolved path is within allowed directory
    const allowedBase = VITE_DEV_SERVER_URL 
      ? process.env.APP_ROOT 
      : RENDERER_DIST
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

  // Set dock icon on macOS during dev so it shows immediately
  if (process.platform === 'darwin') {
    const iconPath = getIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')
    try {
      if (iconPath) app.dock.setIcon(nativeImage.createFromPath(iconPath))
    } catch {
      // ignore errors setting dock icon in dev
    }
  }
  
  // Create system tray
  if (!tray) {
    const iconPath = getTrayIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')
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
            if (process.platform === 'darwin') app.dock.show()
            win?.show()
          } 
        },
        { type: 'separator' },
        { 
          label: 'Quit', 
          click: () => {
            isQuitting = true
            app.quit()
          } 
        }
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

// IPC handlers for Canvas actions
ipcMain.handle('canvas:init', async (_evt, cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => {
  try {
  const baseUrl = (cfg?.baseUrl || appConfig.baseUrl)
  const verbose = cfg?.verbose ?? appConfig.verbose
  const res = await initCanvas({ token: cfg?.token, baseUrl, verbose })
  // persist baseUrl / verbose if provided
  appConfig = saveConfig({ baseUrl, verbose })
    return { ok: true, insecure: !!res?.insecure }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:listDueAssignments', async (_evt, opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) => {
  try {
    const data = await canvasListDue(opts)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseAssignments', async (_evt, courseId: string | number, first = 200) => {
  try {
    const data = await canvasListCourseAssignments(courseId, first)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseModulesGql', async (_evt, courseId: string | number, first = 20, itemsFirst = 50) => {
  try {
    const data = await svcListCourseModulesGql(courseId, first, itemsFirst)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getCourseModuleItem', async (_evt, courseId: string | number, itemId: string | number) => {
  try {
    const data = await svcGetCourseModuleItem(courseId, itemId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:getMySubmission', async (_evt, courseId: string | number, assignmentRestId: string | number) => {
  try {
    const data = await svcGetMySubmission(courseId, assignmentRestId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCoursePages', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListCoursePages(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getCoursePage', async (_evt, courseId: string | number, slugOrUrl: string) => {
  try {
    const data = await svcGetCoursePage(courseId, slugOrUrl)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getAssignmentRest', async (_evt, courseId: string | number, assignmentRestId: string | number) => {
  try {
    const data = await svcGetAssignmentRest(courseId, assignmentRestId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getFile', async (_evt, fileId: string | number) => {
  try {
    const data = await svcGetFile(fileId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listAssignmentsWithSubmission', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListAssignmentsWithSubmission(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listAssignmentGroups', async (_evt, courseId: string | number, includeAssignments = false) => {
  try {
    const data = await svcListAssignmentGroups(courseId, includeAssignments)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listMyEnrollmentsForCourse', async (_evt, courseId: string | number) => {
  try {
    const data = await svcListMyEnrollmentsForCourse(courseId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseTabs', async (_evt, courseId: string | number, includeExternal = true) => {
  try {
    const data = await svcListCourseTabs(courseId, includeExternal)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listActivityStream', async (_evt, opts?: { onlyActiveCourses?: boolean; perPage?: number }) => {
  try {
    const data = await svcListActivityStream(opts)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseAnnouncements', async (_evt, courseId: string | number, perPage = 50) => {
  try {
    const data = await svcListCourseAnnouncements(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseAnnouncementsPage', async (_evt, courseId: string | number, page = 1, perPage = 10) => {
  try {
    const data = await svcListCourseAnnouncementsPage(courseId, page, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:listCourseFiles', async (_evt, courseId: string | number, perPage = 100, sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at', order: 'asc' | 'desc' = 'desc') => {
  try {
    const data = await svcListCourseFiles(courseId, perPage, sort, order)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:listCourseFolders', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListCourseFolders(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:listCourseGroups', async (_evt, courseId: string | number, perPage = 100) => {
  try {
    const data = await svcListCourseGroups(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:getAnnouncement', async (_evt, courseId: string | number, topicId: string | number) => {
  try {
    const data = await svcGetAnnouncement(courseId, topicId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

// Discussions
ipcMain.handle('canvas:listCourseDiscussions', async (_evt, courseId: string | number, perPage?: number) => {
  try {
    const data = await svcListCourseDiscussions(courseId, perPage)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getDiscussion', async (_evt, courseId: string | number, topicId: string | number) => {
  try {
    const data = await svcGetDiscussion(courseId, topicId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getDiscussionView', async (_evt, courseId: string | number, topicId: string | number) => {
  try {
    const data = await svcGetDiscussionView(courseId, topicId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:postDiscussionEntry', async (_evt, courseId: string | number, topicId: string | number, message: string) => {
  try {
    const data = await svcPostDiscussionEntry(courseId, topicId, message)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:postDiscussionReply', async (_evt, courseId: string | number, topicId: string | number, entryId: string | number, message: string) => {
  try {
    const data = await svcPostDiscussionReply(courseId, topicId, entryId, message)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getFileBytes', async (_evt, fileId: string | number) => {
  try {
    // Return path instead of bytes, prefixed with custom protocol
    const path = await svcDownloadFile(fileId)
    // Encode the path for the URL
    return { ok: true, data: `canvas-file://${encodeURIComponent(path)}` }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:cacheCourseImage', async (_evt, courseId: string | number, url: string) => {
  try {
    const path = await svcDownloadCourseImage(courseId, url)
    return { ok: true, data: `canvas-file://${encodeURIComponent(path)}` }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

// Conversations (Inbox)
ipcMain.handle('canvas:listConversations', async (_evt, params?: { scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'; perPage?: number }) => {
  try {
    const data = await svcListConversations(params)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

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

ipcMain.handle('canvas:createConversation', async (_evt, params: {
  recipients: string[]
  subject?: string
  body: string
  groupConversation?: boolean
  contextCode?: string
}) => {
  try {
    const data = await svcCreateConversation(params)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:addMessage', async (_evt, conversationId: string | number, body: string, includedMessages?: string[]) => {
  try {
    const data = await svcAddMessage(conversationId, body, includedMessages)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:updateConversation', async (_evt, conversationId: string | number, params: {
  workflowState?: 'read' | 'unread' | 'archived'
  starred?: boolean
  subscribed?: boolean
}) => {
  try {
    const data = await svcUpdateConversation(conversationId, params)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:deleteConversation', async (_evt, conversationId: string | number) => {
  try {
    const data = await svcDeleteConversation(conversationId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:searchRecipients', async (_evt, params: {
  search: string
  context?: string
  type?: 'user' | 'context'
  perPage?: number
}) => {
  try {
    const data = await svcSearchRecipients(params)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:resolveUrl', async (_evt, url: string) => {
  try {
    // Security check: only allow base URL or http(s)
    if (!url.startsWith('http')) return { ok: false, error: 'Invalid URL' }
    
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
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      await shell.openExternal(url)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid protocol' }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('app:openContentWindow', async (_evt, raw: { courseId?: string; type?: string; contentId?: string; title?: string }) => {
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
})

ipcMain.handle('app:downloadFile', async (_evt, fileId: string | number, suggestedName?: string) => {
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
})

ipcMain.handle('app:getPdfPreloadPath', async () => {
  try {
    // Return the absolute path to the PDF preload script
    const candidates = [
      path.join(__dirname, 'pdfPreload.js'),
      path.join(__dirname, 'pdfPreload.mjs'),
    ]
    console.log('[getPdfPreloadPath] Looking for preload in:', __dirname)
    console.log('[getPdfPreloadPath] Candidates:', candidates)
    const preloadPath = candidates.find((p) => fs.existsSync(p))
    if (!preloadPath) {
      console.error('[getPdfPreloadPath] No preload script found!')
      return { ok: false, error: 'pdfPreload script not found' }
    }
    const fileUrl = pathToFileURL(preloadPath).toString()
    console.log('[getPdfPreloadPath] Found:', fileUrl)
    return { ok: true, data: fileUrl }
  } catch (e: any) {
    console.error('[getPdfPreloadPath] Error:', e)
    return { ok: false, error: String(e?.message || e) }
  }
})

// Config IPC
ipcMain.handle('config:get', async () => {
  try {
    appConfig = loadConfig()
    return { ok: true, data: appConfig }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('config:set', async (_evt, partial: Partial<AppConfig>) => {
  try {
    const oldConfig = appConfig
    appConfig = saveConfig(partial)

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

ipcMain.handle('embedding:status', async (): Promise<{ ok: boolean; data?: EmbeddingStatus; error?: string }> => {
  try {
    const status = embeddingManager.getStatus()
    return { ok: true, data: status }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('embedding:search', async (_evt, query: string, k = 10, opts?: any): Promise<{ ok: boolean; data?: SearchResult[]; error?: string }> => {
  try {
    const results = await embeddingManager.search(query, k, opts || {})
    return { ok: true, data: results }
  } catch (e: any) {
    console.error('[Embedding] Search error:', e)
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('embedding:index', async (_evt, items: IndexableItem[]): Promise<{ ok: boolean; data?: { indexed: number; skipped: number }; error?: string }> => {
  try {
    const result = await embeddingManager.index(items)
    return { ok: true, data: result }
  } catch (e: any) {
    console.error('[Embedding] Index error:', e)
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('embedding:clear', async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    await embeddingManager.clear()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

// File indexing handlers
ipcMain.handle('embedding:indexFile', async (
  _evt,
  fileId: string,
  courseId: string,
  courseName: string,
  fileName: string,
  fileSize: number,
  updatedAt?: string,
  url?: string
): Promise<{ ok: boolean; data?: { chunks: number; pageCount: number; truncated: boolean; skipped?: boolean }; error?: string }> => {
  try {
    // Check if file needs indexing (version check)
    if (!fileMetaStore.needsIndexing(fileId, updatedAt)) {
      console.log(`[embedding:indexFile] Skipping ${fileName} (up to date)`)
      return { 
        ok: true, 
        data: { 
          chunks: 0, 
          pageCount: 0, 
          truncated: false, 
          skipped: true 
        } 
      }
    }

    // Import dynamically to avoid circular dependencies
    const { prepareFileForIndexing } = await import('./embedding/fileIndexer')
    
    // Prepare the file (download, extract, chunk)
    const result = await prepareFileForIndexing({
      fileId,
      courseId,
      courseName,
      fileName,
      fileSize,
      updatedAt,
      url,
    })

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
      return { ok: true, data: { chunks: 0, pageCount: result.pageCount, truncated: result.truncated } }
    }

    // Remove any existing chunks for this file
    embeddingManager.removeByFileId(fileId)

    // Index the chunks
    const chunksForIndexing = result.chunks.map(c => ({
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
})

ipcMain.handle('embedding:pruneCourse', async (
  _evt,
  courseId: string
): Promise<{ ok: boolean; data?: number; error?: string }> => {
  try {
    const removed = await embeddingManager.removeByCourseId(courseId)
    return { ok: true, data: removed }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('embedding:getStorageStats', async (): Promise<{
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
})
