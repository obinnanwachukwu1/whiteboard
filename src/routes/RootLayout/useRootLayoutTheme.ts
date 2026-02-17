import { useEffect, useState } from 'react'
import {
  applyThemeTokens,
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings,
  type ThemeSettings,
} from '../../utils/theme'
import { readThemeCache } from '../../utils/themeCache'
import { isSameThemeSettings } from './theme'
import type { ThemeConfigChangedPayload } from '../../types/ipc'

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
    const applyIncomingTheme = (next: ThemeSettings) => {
      applyThemeTokens(next)
      setThemeSettings((prev) => (isSameThemeSettings(prev, next) ? prev : next))
      if (window.platform?.isWindows) {
        window.platform.setTitleBarOverlayTheme({ isDark: next.theme === 'dark' }).catch(() => {})
      }
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ThemeSettings>).detail
      if (detail) {
        applyIncomingTheme(detail)
      }
    }
    window.addEventListener('theme-settings-changed', handler)

    const offThemeConfigChanged = window.electron?.onThemeConfigChanged?.(
      (payload: ThemeConfigChangedPayload) => {
        const next =
          normalizeThemeSettings(payload?.themeConfig) ||
          normalizeThemeSettings({ theme: payload?.theme, accent: payload?.accent })
        if (next) applyIncomingTheme(next)
      },
    )

    return () => {
      window.removeEventListener('theme-settings-changed', handler)
      offThemeConfigChanged?.()
    }
  }, [])

  useEffect(() => {
    if (!window.platform?.isWindows) return
    window.platform.setTitleBarOverlayTheme({ isDark: themeSettings.theme === 'dark' }).catch(() => {})
  }, [themeSettings.theme])

  return { themeSettings, setThemeSettings }
}
