import { ipcMain } from 'electron'

import { loadConfig, saveConfig, type AppConfig } from '../config'
import type { AIManager } from '../ai/manager'

export type ConfigIpcDeps = {
  getAppConfig: () => AppConfig
  setAppConfig: (next: AppConfig) => void
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
  ipcMain.handle('config:get', async () => {
    try {
      appConfigRef.current = await loadConfig()
      return { ok: true, data: appConfigRef.current }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
  ipcMain.handle('config:set', async (_evt, partial: Partial<AppConfig>) => {
    try {
      const oldConfig = appConfigRef.current
      appConfigRef.current = await saveConfig(partial)
  
      // Handle AI toggle
      if (partial.aiEnabled !== undefined && partial.aiEnabled !== oldConfig.aiEnabled) {
        if (partial.aiEnabled) {
          void aiManager.start(true)
        } else {
          aiManager.stop()
        }
      }
  
      return { ok: true, data: appConfigRef.current }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
}
