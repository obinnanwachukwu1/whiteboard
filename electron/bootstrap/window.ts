import { app, BrowserWindow, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { AccentPreset, AppConfig } from '../config'

export type ContentWindowType =
  | 'page'
  | 'assignment'
  | 'announcement'
  | 'discussion'
  | 'file'
  | 'quiz'

export type ContentWindowParams = {
  courseId: string
  type: ContentWindowType
  contentId: string
  title?: string
}

type AccentHsl = {
  h: number
  s: number
  l: number
}

const ACCENT_PRESET_HSL: Record<AccentPreset, AccentHsl> = {
  slate: { h: 215, s: 16, l: 47 },
  red: { h: 0, s: 72, l: 51 },
  orange: { h: 25, s: 95, l: 53 },
  amber: { h: 38, s: 92, l: 50 },
  yellow: { h: 48, s: 96, l: 53 },
  lime: { h: 84, s: 81, l: 44 },
  green: { h: 142, s: 71, l: 45 },
  emerald: { h: 160, s: 84, l: 39 },
  teal: { h: 173, s: 80, l: 40 },
  cyan: { h: 189, s: 94, l: 43 },
  sky: { h: 199, s: 89, l: 48 },
  blue: { h: 217, s: 91, l: 60 },
  indigo: { h: 239, s: 84, l: 67 },
  violet: { h: 258, s: 90, l: 66 },
  purple: { h: 271, s: 81, l: 56 },
  fuchsia: { h: 292, s: 84, l: 61 },
  pink: { h: 330, s: 81, l: 60 },
  rose: { h: 350, s: 89, l: 60 },
}

const LEGACY_ACCENT_MAP: Record<NonNullable<AppConfig['accent']>, AccentPreset> = {
  default: 'slate',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  indigo: 'indigo',
  violet: 'violet',
}

function getInitialWindowBackgroundColor(appConfig: AppConfig, isDark: boolean): string {
  const fallback = isDark ? '#020617' : '#ffffff'
  const themeConfig = appConfig?.themeConfig
  const legacyAccent = appConfig?.accent

  if (!themeConfig && !legacyAccent) return fallback

  const extractedAccent =
    themeConfig?.backgroundMode === 'background' ? themeConfig.background?.extractedAccent : undefined
  const preset =
    themeConfig?.accentPreset || (legacyAccent ? LEGACY_ACCENT_MAP[legacyAccent] : 'slate')
  const presetHsl = ACCENT_PRESET_HSL[preset] || ACCENT_PRESET_HSL.slate
  const accent = extractedAccent || presetHsl

  const saturation = isDark ? Math.max(accent.s - 50, 5) : Math.max(accent.s, 35)
  const lightness = isDark ? 8 : 98

  return `hsl(${accent.h}, ${saturation}%, ${lightness}%)`
}

export function safeContentType(value: unknown): ContentWindowType | null {
  return value === 'page' ||
    value === 'assignment' ||
    value === 'announcement' ||
    value === 'discussion' ||
    value === 'file' ||
    value === 'quiz'
    ? value
    : null
}

function buildContentHash(params: {
  courseId: string
  type: ContentWindowType
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

export function getIconPath(rendererDist: string): string | undefined {
  const pub = process.env.VITE_PUBLIC || rendererDist
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

export function getTrayIconPath(rendererDist: string): string | undefined {
  const pub = process.env.VITE_PUBLIC || rendererDist
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

export function getPreloadPath(dirname: string): string {
  const candidates = [path.join(dirname, 'preload.cjs'), path.join(dirname, 'preload.js')]
  const resolved = candidates.find((p) => fs.existsSync(p))
  if (!resolved) {
    console.warn('[preload] No preload script found, defaulting to preload.js')
    return path.join(dirname, 'preload.js')
  }
  return resolved
}

export function createContentWindow(
  params: ContentWindowParams,
  deps: {
    appConfig: AppConfig
    dirname: string
    rendererDist: string
    viteDevServerUrl?: string
  },
): BrowserWindow {
  const icon = getIconPath(deps.rendererDist)
  const savedTheme = deps.appConfig?.themeConfig?.theme ?? deps.appConfig?.theme
  const isDark = savedTheme === 'dark' || (!savedTheme && process.platform === 'darwin')
  const bgColor = getInitialWindowBackgroundColor(deps.appConfig, isDark)

  const child = new BrowserWindow({
    ...(icon ? { icon } : {}),
    show: false,
    backgroundColor: bgColor,
    width: 980,
    height: 720,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 20, y: 20 },
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
      preload: getPreloadPath(deps.dirname),
      webviewTag: false,
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

  if (deps.viteDevServerUrl) {
    child.loadURL(`${deps.viteDevServerUrl}${hash}`)
  } else {
    const fileUrl = pathToFileURL(path.join(deps.rendererDist, 'index.html')).toString()
    child.loadURL(`${fileUrl}${hash}`)
  }

  return child
}

export function createMainWindow(deps: {
  appConfig: AppConfig
  dirname: string
  rendererDist: string
  viteDevServerUrl?: string
  isQuitting: () => boolean
  devToolsEnabled: () => boolean
}): BrowserWindow {
  const icon = getIconPath(deps.rendererDist)
  const savedTheme = deps.appConfig?.themeConfig?.theme ?? deps.appConfig?.theme
  const isDark = savedTheme === 'dark' || (!savedTheme && process.platform === 'darwin')
  const bgColor = getInitialWindowBackgroundColor(deps.appConfig, isDark)

  const win = new BrowserWindow({
    ...(icon ? { icon } : {}),
    show: false,
    backgroundColor: bgColor,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 20, y: 20 },
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
      preload: getPreloadPath(deps.dirname),
      webviewTag: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: deps.devToolsEnabled(),
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.on('close', (e) => {
    if (!deps.isQuitting()) {
      e.preventDefault()
      win.hide()
      if (process.platform === 'darwin') {
        app.dock?.hide()
      }
    }
  })

  try {
    win.webContents.setVisualZoomLevelLimits(1, 1)
  } catch {}
  try {
    win.webContents.setZoomFactor(1)
    win.webContents.setZoomLevel(0)
  } catch {}

  const allowedOrigins = new Set<string>()
  if (deps.viteDevServerUrl) {
    try {
      const devUrl = new URL(deps.viteDevServerUrl)
      allowedOrigins.add(devUrl.origin)
    } catch {}
  }

  const isAllowedNavigation = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'file:') return true
      if (allowedOrigins.has(parsed.origin)) return true
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

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (app.isPackaged && !deps.devToolsEnabled()) {
    win.webContents.on('before-input-event', (event, input) => {
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

  if (deps.devToolsEnabled() && app.isPackaged) {
    win.webContents.once('did-finish-load', () => {
      try {
        win.webContents.openDevTools({ mode: 'detach' })
      } catch {
        // ignore
      }
    })
  }

  if (deps.viteDevServerUrl) {
    win.loadURL(deps.viteDevServerUrl)
  } else {
    win.loadFile(path.join(deps.rendererDist, 'index.html'), { hash: '/dashboard' })
  }

  return win
}
