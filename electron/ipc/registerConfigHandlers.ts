import { BrowserWindow, ipcMain } from 'electron'

import { loadConfig, saveConfig, type AppConfig } from '../config'
import type { AIManager } from '../ai/manager'
import type { ThemeConfigChangedPayload } from '../../src/types/ipc'
import {
  sanitizeShowcaseModeConfig,
  SHOWCASE_MODE_DISABLED_ERROR,
} from '../showcaseMode/runtime'

export type ConfigIpcDeps = {
  getAppConfig: () => AppConfig
  setAppConfig: (next: AppConfig) => void
  isShowcaseModeAllowed: () => boolean
  aiManager: AIManager
}

export function registerConfigHandlers(deps: ConfigIpcDeps) {
  const appConfigRef = {
    get current() {
      return deps.getAppConfig()
    },
    set current(next: AppConfig) {
      deps.setAppConfig(next)
    },
  }

  const { aiManager } = deps

  const broadcastThemeConfig = (config: AppConfig) => {
    const payload: ThemeConfigChangedPayload = {
      themeConfig: config.themeConfig,
      theme: config.theme,
      accent: config.accent,
    }
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue
      win.webContents.send('config:themeChanged', payload)
    }
  }

  ipcMain.handle('config:get', async () => {
    try {
      const loaded = await loadConfig()
      appConfigRef.current = sanitizeShowcaseModeConfig(loaded, deps.isShowcaseModeAllowed())
      return { ok: true, data: appConfigRef.current }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
  ipcMain.handle('config:set', async (_evt, partial: Partial<AppConfig>) => {
    try {
      if (partial?.showcaseModeEnabled === true && !deps.isShowcaseModeAllowed()) {
        return { ok: false, error: SHOWCASE_MODE_DISABLED_ERROR }
      }
      const oldConfig = appConfigRef.current
      const normalizedPartial = deps.isShowcaseModeAllowed()
        ? partial
        : { ...partial, showcaseModeEnabled: false }
      const saved = await saveConfig(normalizedPartial)
      appConfigRef.current = sanitizeShowcaseModeConfig(saved, deps.isShowcaseModeAllowed())
  
      // Handle AI toggle
      if (partial.aiEnabled !== undefined && partial.aiEnabled !== oldConfig.aiEnabled) {
        if (partial.aiEnabled) {
          void aiManager.start(true)
        } else {
          aiManager.stop()
        }
      }

      if (
        partial.themeConfig !== undefined ||
        partial.theme !== undefined ||
        partial.accent !== undefined
      ) {
        broadcastThemeConfig(appConfigRef.current)
      }
  
      return { ok: true, data: appConfigRef.current }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
}
