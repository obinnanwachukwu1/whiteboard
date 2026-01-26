
import { app, safeStorage } from 'electron'
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
  lastUserId?: string
  aiEnabled?: boolean
}

const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'https://gatech.instructure.com',
  verbose: false,
  theme: 'light',
  accent: 'default',
  prefetchEnabled: true,
  aiEnabled: false, // Default to disabled to be safe, user must opt-in
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
  // Use encrypted path if available, otherwise legacy
  if (safeStorage.isEncryptionAvailable()) {
    return path.join(dir, 'canvas-desk.enc')
  }
  return path.join(dir, 'canvas-desk.json')
}

function legacyConfigPath() {
  const dir = app.getPath('userData')
  return path.join(dir, 'canvas-desk.json')
}

export function loadConfig(): AppConfig {
  try {
    // 1. Migration: If encryption is available, check for legacy plaintext file
    if (safeStorage.isEncryptionAvailable()) {
      const legacy = legacyConfigPath()
      if (fs.existsSync(legacy)) {
        try {
          console.log('[Config] Migrating plaintext config to encrypted storage...')
          const raw = fs.readFileSync(legacy, 'utf-8')
          const parsed = JSON.parse(raw)
          
          // Encrypt and save to new path
          const encPath = configPath() // returns .enc
          const encrypted = safeStorage.encryptString(raw)
          fs.writeFileSync(encPath, encrypted)
          
          // Delete legacy
          fs.unlinkSync(legacy)
          console.log('[Config] Migration complete.')
          
          return { ...DEFAULT_CONFIG, ...parsed }
        } catch (e) {
          console.error('[Config] Migration failed, keeping legacy file:', e)
          // Fallback to reading legacy file directly this time
          const raw = fs.readFileSync(legacy, 'utf-8')
          return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
        }
      }
    }

    const p = configPath()
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG }
    
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = fs.readFileSync(p)
        const decrypted = safeStorage.decryptString(buffer)
        return { ...DEFAULT_CONFIG, ...JSON.parse(decrypted) }
      } catch (e) {
        console.error('[Config] Failed to decrypt config:', e)
        // If decryption fails, maybe it wasn't encrypted? Or key changed?
        // Fallback or return default?
        return { ...DEFAULT_CONFIG }
      }
    } else {
      const raw = fs.readFileSync(p, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.error('[Config] Failed to load config:', e)
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(partial: Partial<AppConfig>): AppConfig {
  const current = loadConfig()
  const next = { ...current, ...partial }
  
  // Ensure we use the correct path logic
  const p = configPath()
  
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    const json = JSON.stringify(next, null, 2)
    
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(json)
      fs.writeFileSync(p, encrypted)
    } else {
      fs.writeFileSync(p, json)
    }
  } catch (e) {
    console.error('[Config] Failed to save config:', e)
  }
  return next
}
