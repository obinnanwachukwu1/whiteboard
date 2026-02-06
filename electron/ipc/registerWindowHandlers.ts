import { BrowserWindow, ipcMain } from 'electron'

export function registerWindowHandlers() {
  ipcMain.handle(
    'window:setTitleBarOverlayTheme',
    async (event, opts: { isDark: boolean }): Promise<{ ok: boolean; error?: string }> => {
      try {
        if (process.platform !== 'win32') return { ok: false, error: 'Unsupported platform' }
        const senderWin = BrowserWindow.fromWebContents(event.sender)
        if (!senderWin) return { ok: false, error: 'No window' }

        senderWin.setTitleBarOverlay({
          color: '#00000000',
          symbolColor: opts?.isDark ? '#ffffff' : '#000000',
          height: 56,
        })
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) }
      }
    },
  )
}
