import { app, Menu, Tray, nativeImage, type BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export function setMacDockIcon(deps: {
  rendererDist: string
  getIconPath: () => string | undefined
}) {
  if (process.platform !== 'darwin') return

  const pub = process.env.VITE_PUBLIC || deps.rendererDist
  let iconPath = path.join(pub, 'icon.icns')

  if (!fs.existsSync(iconPath)) {
    iconPath =
      deps.getIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')
  }

  if (!iconPath) return

  try {
    app.dock?.setIcon(nativeImage.createFromPath(iconPath))
  } catch {
    // ignore errors setting dock icon in dev
  }
}

export function createSystemTray(deps: {
  getMainWindow: () => BrowserWindow | null
  getTrayIconPath: () => string | undefined
  onQuit: () => void
}): Tray | null {
  const iconPath =
    deps.getTrayIconPath() || path.join(process.env.APP_ROOT, 'build', 'icons', 'mac', 'icon.icns')

  if (!iconPath) return null

  let trayIcon = nativeImage.createFromPath(iconPath)

  if (iconPath.endsWith('Template.png')) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
    trayIcon.setTemplateImage(true)
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  }

  const tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Whiteboard',
      click: () => {
        if (process.platform === 'darwin') app.dock?.show()
        deps.getMainWindow()?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => deps.onQuit(),
    },
  ])

  tray.setToolTip('Whiteboard')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    tray.popUpContextMenu()
  })

  return tray
}
