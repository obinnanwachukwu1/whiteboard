import { useEffect, useState } from 'react'
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type ThemeSettings } from '../../utils/theme'
import { readThemeCache } from '../../utils/themeCache'
import { isSameThemeSettings } from './theme'

export function useRootLayoutTheme() {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    try {
      const cache = readThemeCache()
      const normalized = cache?.settings ? normalizeThemeSettings(cache.settings) : null
      if (normalized) return normalized
    } catch {}
    return DEFAULT_THEME_SETTINGS
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ThemeSettings>).detail
      if (detail) {
        setThemeSettings((prev) => (isSameThemeSettings(prev, detail) ? prev : detail))
        if (window.platform?.isWindows) {
          window.platform
            .setTitleBarOverlayTheme({ isDark: detail.theme === 'dark' })
            .catch(() => {})
        }
      }
    }
    window.addEventListener('theme-settings-changed', handler)
    return () => window.removeEventListener('theme-settings-changed', handler)
  }, [])

  useEffect(() => {
    if (!window.platform?.isWindows) return
    window.platform.setTitleBarOverlayTheme({ isDark: themeSettings.theme === 'dark' }).catch(() => {})
  }, [themeSettings.theme])

  return { themeSettings, setThemeSettings }
}
