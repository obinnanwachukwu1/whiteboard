import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export type AppConfig = {
  baseUrl: string
  verbose?: boolean
  theme?: 'light' | 'dark'
  prefetchEnabled?: boolean
  sidebar?: {
    hiddenCourseIds?: Array<string | number>
    customNames?: Record<string, string>
    order?: Array<string | number>
  }
}

const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'https://gatech.instructure.com',
  verbose: false,
  theme: 'light',
  prefetchEnabled: true,
  sidebar: {
    hiddenCourseIds: [],
    customNames: {},
    order: [],
  },
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
