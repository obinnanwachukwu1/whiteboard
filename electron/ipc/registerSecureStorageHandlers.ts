import { ipcMain, safeStorage } from 'electron'

export function registerSecureStorageHandlers() {
  ipcMain.on('secureStorage:isAvailable', (event) => {
    try {
      event.returnValue = Boolean(safeStorage?.isEncryptionAvailable?.())
    } catch {
      event.returnValue = false
    }
  })

  ipcMain.on('secureStorage:encrypt', (event, value: string) => {
    try {
      if (!safeStorage?.isEncryptionAvailable?.()) {
        event.returnValue = null
        return
      }
      const buf = safeStorage.encryptString(String(value))
      event.returnValue = buf.toString('base64')
    } catch {
      event.returnValue = null
    }
  })

  ipcMain.on('secureStorage:decrypt', (event, payload: string) => {
    try {
      if (!safeStorage?.isEncryptionAvailable?.()) {
        event.returnValue = null
        return
      }
      const buf = Buffer.from(String(payload), 'base64')
      event.returnValue = safeStorage.decryptString(buf)
    } catch {
      event.returnValue = null
    }
  })
}
