export const THEME_CACHE_KEY = 'wb-theme-cache-v1'

export type ThemeCacheV1 = {
  v: 1
  theme: 'light' | 'dark'
  // Precomputed CSS variables to apply synchronously at bootstrap.
  // Keys should include leading `--` for CSS custom properties.
  tokens: Record<string, string>
  dataset?: {
    backgroundMode?: string
    backgroundType?: string
    patternId?: string
  }
  // Optional: include settings for React to render BackgroundLayer consistently.
  settings?: unknown
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object'
}

export function readThemeCache(): ThemeCacheV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null
    if (parsed.v !== 1) return null
    if (parsed.theme !== 'light' && parsed.theme !== 'dark') return null
    if (!isRecord(parsed.tokens)) return null
    return parsed as ThemeCacheV1
  } catch {
    return null
  }
}

export function applyThemeCacheToDocument(cache: ThemeCacheV1) {
  const root = document.documentElement
  root.classList.toggle('dark', cache.theme === 'dark')
  root.style.setProperty('color-scheme', cache.theme)

  for (const [prop, value] of Object.entries(cache.tokens || {})) {
    if (typeof prop === 'string' && prop.startsWith('--') && typeof value === 'string') {
      root.style.setProperty(prop, value)
    }
  }

  const ds = cache.dataset
  if (ds) {
    if (typeof ds.backgroundMode === 'string') root.dataset.backgroundMode = ds.backgroundMode
    if (typeof ds.backgroundType === 'string') root.dataset.backgroundType = ds.backgroundType
    if (typeof ds.patternId === 'string') root.dataset.patternId = ds.patternId
  }
}
