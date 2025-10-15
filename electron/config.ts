import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export type AppConfig = {
  baseUrl: string
  verbose?: boolean
  theme?: 'light' | 'dark'
  accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'
  prefetchEnabled?: boolean
  cachedCourses?: any[]
  cachedDue?: any[]
  // Optional dehydrated React Query cache snapshot
  queryCache?: any
  // Persisted course images by baseUrl → { courseId: imageUrl }
  courseImages?: Record<string, Record<string, string>>
  sidebar?: {
    hiddenCourseIds?: Array<string | number>
    customNames?: Record<string, string>
    order?: Array<string | number>
  }
  userSettings?: Record<string, any>
  userSidebars?: Record<string, any>
  pdfGestureZoomEnabled?: boolean
  pdfZoom?: Record<string, number>
}

const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'https://gatech.instructure.com',
  verbose: false,
  theme: 'light',
  accent: 'default',
  prefetchEnabled: true,
  cachedCourses: [],
  cachedDue: [],
  queryCache: undefined,
  courseImages: {},
  sidebar: {
    hiddenCourseIds: [],
    customNames: {},
    order: [],
  },
  userSettings: {},
  userSidebars: {},
  pdfGestureZoomEnabled: true,
  pdfZoom: {},
}

function configPath() {
  const dir = app.getPath('userData')
  return path.join(dir, 'canvas-desk.json')
}

export function loadConfig(): AppConfig {
  try {
    const p = configPath()
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG }
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(partial: Partial<AppConfig>): AppConfig {
  const current = loadConfig()
  const next = { ...current, ...partial }
  const p = configPath()
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(next, null, 2))
  } catch {
    // ignore write errors for now
  }
  return next
}
