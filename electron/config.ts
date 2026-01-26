
import { app } from 'electron'
import crypto from 'node:crypto'
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

export const DEFAULT_CONFIG: AppConfig = {
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

const CONFIG_FILE = 'canvas-desk.v2.enc'
const MASTER_KEY_SERVICE = 'whiteboard'
const MASTER_KEY_ACCOUNT = 'config-master-key-v1'

let _keytar: any | null = null
async function getKeytar(): Promise<any> {
  if (_keytar) return _keytar
  const mod: any = await import('keytar')
  _keytar = mod.default ?? mod
  return _keytar
}

let cachedMasterKey: Buffer | null = null
async function getOrCreateMasterKey(): Promise<Buffer> {
  if (cachedMasterKey) return cachedMasterKey
  const keytar = await getKeytar()
  const existing = await keytar.getPassword(MASTER_KEY_SERVICE, MASTER_KEY_ACCOUNT)
  if (typeof existing === 'string' && existing.length > 0) {
    const buf = Buffer.from(existing, 'base64')
    if (buf.length === 32) {
      cachedMasterKey = buf
      return buf
    }
  }

  const created = crypto.randomBytes(32)
  await keytar.setPassword(MASTER_KEY_SERVICE, MASTER_KEY_ACCOUNT, created.toString('base64'))
  cachedMasterKey = created
  return created
}

function configPathV2() {
  const dir = app.getPath('userData')
  return path.join(dir, CONFIG_FILE)
}

const MAGIC = Buffer.from('WBX1', 'ascii')
function encryptString(key: Buffer, plaintext: string): Buffer {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, iv, tag, ciphertext])
}

function decryptToString(key: Buffer, blob: Buffer): string {
  if (blob.length < MAGIC.length + 12 + 16) {
    throw new Error('Encrypted config is too small')
  }
  const magic = blob.subarray(0, MAGIC.length)
  if (!magic.equals(MAGIC)) {
    throw new Error('Encrypted config has invalid header')
  }
  const ivStart = MAGIC.length
  const tagStart = ivStart + 12
  const dataStart = tagStart + 16
  const iv = blob.subarray(ivStart, tagStart)
  const tag = blob.subarray(tagStart, dataStart)
  const ciphertext = blob.subarray(dataStart)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

export async function loadConfig(): Promise<AppConfig> {
  const p = configPathV2()
  try {
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG }
    const buffer = fs.readFileSync(p)
    const key = await getOrCreateMasterKey()
    const decrypted = decryptToString(key, buffer)
    return { ...DEFAULT_CONFIG, ...JSON.parse(decrypted) }
  } catch (e) {
    console.error('[Config] Failed to load config:', e)
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
  const current = await loadConfig()
  const next = { ...current, ...partial }
  const p = configPathV2()
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    const json = JSON.stringify(next, null, 2)
    const key = await getOrCreateMasterKey()
    const encrypted = encryptString(key, json)
    fs.writeFileSync(p, encrypted)
  } catch (e) {
    console.error('[Config] Failed to save config:', e)
  }
  return next
}
