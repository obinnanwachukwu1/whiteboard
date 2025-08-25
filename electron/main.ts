import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  initCanvas,
  clearToken,
  getProfile as canvasGetProfile,
  listCourses as canvasListCourses,
  listDueAssignments as canvasListDue,
  listCourseAssignments as canvasListCourseAssignments,
  CanvasError,
} from './canvasClient'
import { loadConfig, saveConfig, type AppConfig } from './config'
import {
  listCourseModulesGql as svcListCourseModulesGql,
  listUpcoming as svcListUpcoming,
  listTodo as svcListTodo,
  getMySubmission as svcGetMySubmission,
  listCoursePages as svcListCoursePages,
  getCoursePage as svcGetCoursePage,
  getAssignmentRest as svcGetAssignmentRest,
  getFile as svcGetFile,
  getFileBytes as svcGetFileBytes,
  listAssignmentsWithSubmission as svcListAssignmentsWithSubmission,
  listAssignmentGroups as svcListAssignmentGroups,
  listMyEnrollmentsForCourse as svcListMyEnrollmentsForCourse,
  listCourseTabs as svcListCourseTabs,
  listActivityStream as svcListActivityStream,
  listCourseAnnouncements as svcListCourseAnnouncements,
  listCourseAnnouncementsPage as svcListCourseAnnouncementsPage,
  getAnnouncement as svcGetAnnouncement,
  getCourseInfo as svcGetCourseInfo,
  getCourseFrontPage as svcGetCourseFrontPage,
  listCourseFiles as svcListCourseFiles,
  listCourseFolders as svcListCourseFolders,
  listFolderFiles as svcListFolderFiles,
} from './canvasClient'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let appConfig: AppConfig = loadConfig()

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    // Make the titlebar blend with renderer UI on macOS
    // - hiddenInset keeps native traffic lights but removes the opaque title bar
    // - titleBarOverlay lets our content extend into the titlebar area
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 20, y: 20 }, // add some padding around the traffic lights
          titleBarOverlay: {
            color: '#00000000', // transparent so the Header background shows through
            symbolColor: '#ffffff', // good contrast on both light & dark headers
            height: 56, // match Header height (h-14)
          },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // load config and create window
  appConfig = loadConfig()
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

ipcMain.handle('canvas:getAnnouncement', async (_evt, courseId: string | number, topicId: string | number) => {
  try {
    const data = await svcGetAnnouncement(courseId, topicId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

ipcMain.handle('canvas:getFileBytes', async (_evt, fileId: string | number) => {
  try {
    const data = await svcGetFileBytes(fileId)
    return { ok: true, data }
  } catch (e: any) {
    const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
    return { ok: false, error: msg }
  }
})

// System helpers
ipcMain.handle('app:openExternal', async (_evt, url: string) => {
  try {
    await shell.openExternal(url)
    return { ok: true }
  } catch (e: any) {
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
    appConfig = saveConfig(partial)
    return { ok: true, data: appConfig }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
})
