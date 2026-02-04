const ENC_PREFIX = 'enc:'
const ENCRYPTION_FLAG_KEY = 'wb-encryption'
const PRIVATE_MODE_KEY = 'wb-private-mode'

// Keys that should stay plaintext for bootstrapping / non-sensitive UI.
const PLAIN_KEYS = new Set<string>(['wb-theme-cache-v1', 'app-theme'])

type SecureStorageBridge = {
  isAvailable?: () => boolean
  isEncryptionAvailable?: () => boolean
  encrypt?: (value: string) => string | null
  decrypt?: (payload: string) => string | null
}

function getBridge(): SecureStorageBridge | null {
  try {
    return (window as any).secureStorage || null
  } catch {
    return null
  }
}

export function isPrivateModeActive(): boolean {
  try {
    return localStorage.getItem(PRIVATE_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function isEncryptionEnabled(): boolean {
  try {
    return localStorage.getItem(ENCRYPTION_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function setEncryptionEnabledFlag(enabled: boolean): void {
  try {
    localStorage.setItem(ENCRYPTION_FLAG_KEY, enabled ? '1' : '0')
  } catch {}
}

let encryptionSupportCache: true | null = null

export function isEncryptionSupported(): boolean {
  if (encryptionSupportCache === true) return true
  const bridge = getBridge()
  if (!bridge) {
    return false
  }

  const availability = bridge.isAvailable ?? bridge.isEncryptionAvailable
  if (typeof availability === 'function') {
    try {
      const ok = !!availability()
      if (ok) encryptionSupportCache = true
      return ok
    } catch {
      // fall through
    }
  }

  // Last resort: attempt a roundtrip only if no availability hook exists.
  if (bridge.encrypt && bridge.decrypt) {
    try {
      const probe = bridge.encrypt('__wb_probe__')
      if (probe) {
        const decoded = bridge.decrypt(probe)
        const ok = decoded === '__wb_probe__'
        if (ok) encryptionSupportCache = true
        return ok
      }
    } catch {
      // Ignore
    }
  }

  return false
}

function canEncrypt(): boolean {
  return isEncryptionSupported()
}

function encryptValue(value: string): string | null {
  const bridge = getBridge()
  if (!bridge?.encrypt) return null
  try {
    return bridge.encrypt(value)
  } catch {
    return null
  }
}

function decryptValue(payload: string): string | null {
  const bridge = getBridge()
  if (!bridge?.decrypt) return null
  try {
    return bridge.decrypt(payload)
  } catch {
    return null
  }
}

function shouldEncryptKey(key: string): boolean {
  if (PLAIN_KEYS.has(key)) return false
  return isEncryptionEnabled()
}

export function getItem(key: string): string | null {
  if (isPrivateModeActive()) return null
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    if (!shouldEncryptKey(key)) return raw
    if (!raw.startsWith(ENC_PREFIX)) return null
    const payload = raw.slice(ENC_PREFIX.length)
    if (!payload) return null
    return decryptValue(payload)
  } catch {
    return null
  }
}

export function setItem(key: string, value: string): void {
  if (isPrivateModeActive()) return
  try {
    if (!shouldEncryptKey(key)) {
      localStorage.setItem(key, value)
      return
    }
    if (!canEncrypt()) return
    const encrypted = encryptValue(value)
    if (!encrypted) return
    localStorage.setItem(key, `${ENC_PREFIX}${encrypted}`)
  } catch {
    // Ignore storage errors
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore
  }
}

export function getJson<T>(key: string, fallback: T): T {
  const raw = getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setJson(key: string, value: unknown): void {
  try {
    setItem(key, JSON.stringify(value))
  } catch {
    // Ignore
  }
}
