import { applyThemeAndAccent, applyThemeTokens, DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type Accent, type ThemeSettings } from './theme'
import { applyThemeCacheToDocument, readThemeCache } from './themeCache'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export async function bootstrapTheme() {
  if (typeof window === 'undefined') return

  const settingsApi = (window as any).settings

  // 1) Synchronously apply cached tokens (best UX; index.html uses this cache too).
  const cache = readThemeCache()
  if (cache) {
    try { applyThemeCacheToDocument(cache) } catch {}
  } else {
    // Fallback: apply just the dark class quickly.
    let theme: 'light' | 'dark' = 'light'
    try {
      const stored = localStorage.getItem('app-theme')
      if (stored === 'light' || stored === 'dark') theme = stored
      else theme = getSystemTheme()
    } catch {
      theme = getSystemTheme()
    }
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.setProperty('color-scheme', theme)
  }

  // 2) Load durable settings from encrypted config and apply them (source of truth).
  if (settingsApi?.get) {
    try {
      const cfg = await settingsApi.get()
      if (cfg?.ok) {
        const data = cfg.data as any
        const fileTheme = data?.themeConfig ? normalizeThemeSettings(data.themeConfig) : null
        if (fileTheme) {
          applyThemeTokens(fileTheme)
          return
        }

        // Legacy fallback (older installs).
        let theme: 'light' | 'dark' = getSystemTheme()
        let accent: Accent = 'default'
        if (data?.theme === 'light' || data?.theme === 'dark') theme = data.theme
        if (typeof data?.accent === 'string') accent = data.accent as Accent
        applyThemeAndAccent(theme, accent)
        return
      }
    } catch {
      // noop: keep whatever we applied from localStorage/system
    }
  }

  // 3) If nothing else ran, ensure we have a coherent token set (defaults).
  try {
    applyThemeTokens(DEFAULT_THEME_SETTINGS)
  } catch {}
}
