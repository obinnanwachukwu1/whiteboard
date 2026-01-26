import { BrowserWindow, WebContentsView, type WebContents, type Event, shell } from 'electron'

export type ViewerKind = string

export type ViewerBounds = {
  x: number
  y: number
  width: number
  height: number
}

type ViewerRecord = {
  id: string
  kind: ViewerKind
  ownerWindowId: number
  view: WebContentsView
}

type CreateOpts = {
  kind: ViewerKind
  entryUrl: string
  preloadPath?: string
  devOrigin?: string
  allowedProtocols?: string[]
}

export class ViewHost {
  private byId = new Map<string, ViewerRecord>()
  private byWebContentsId = new Map<number, string>()
  private nextId = 1

  create(win: BrowserWindow, opts: CreateOpts): string {
    const id = `view_${this.nextId++}`

    const view = new WebContentsView({
      webPreferences: {
        preload: opts.preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    // Tighten zoom in embedded viewer
    try {
      view.webContents.setVisualZoomLevelLimits(1, 1)
    } catch {}
    try {
      view.webContents.setZoomFactor(1)
      view.webContents.setZoomLevel(0)
    } catch {}

    // Block window.open; allow http(s) via external browser.
    view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          shell.openExternal(url)
        }
      } catch {}
      return { action: 'deny' }
    })

    const allowedProtocols = new Set<string>(opts.allowedProtocols || [])
    try {
      allowedProtocols.add(new URL(opts.entryUrl).protocol)
    } catch {}
    // Most viewers will load file bytes via this internal scheme.
    allowedProtocols.add('canvas-file:')

    const isAllowedNavigation = (url: string) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'about:') return true
        if (allowedProtocols.has(parsed.protocol)) return true
        if (opts.devOrigin && parsed.origin === opts.devOrigin) return true
        return false
      } catch {
        return false
      }
    }

    const blockIfNotAllowed = (event: Event, url: string) => {
      if (!isAllowedNavigation(url)) {
        event.preventDefault()
        try {
          if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url)
        } catch {}
      }
    }

    view.webContents.on('will-navigate', (event, url) => blockIfNotAllowed(event, url))
    view.webContents.on('will-redirect', (event, url) => blockIfNotAllowed(event, url))

    // Attach to the window
    win.contentView.addChildView(view)
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })

    // Load entry
    void view.webContents.loadURL(opts.entryUrl)

    const rec: ViewerRecord = { id, kind: opts.kind, ownerWindowId: win.id, view }
    this.byId.set(id, rec)
    this.byWebContentsId.set(view.webContents.id, id)

    return id
  }

  setBounds(id: string, bounds: ViewerBounds) {
    const rec = this.byId.get(id)
    if (!rec) return
    const b = {
      x: Math.max(0, Math.floor(bounds.x)),
      y: Math.max(0, Math.floor(bounds.y)),
      width: Math.max(0, Math.floor(bounds.width)),
      height: Math.max(0, Math.floor(bounds.height)),
    }
    try {
      rec.view.setBounds(b)
    } catch {}
  }

  send(id: string, channel: string, payload: any) {
    const rec = this.byId.get(id)
    if (!rec) return
    try {
      rec.view.webContents.send(channel, payload)
    } catch {}
  }

  destroy(id: string) {
    const rec = this.byId.get(id)
    if (!rec) return

    const win = BrowserWindow.fromId(rec.ownerWindowId)
    try {
      win?.contentView.removeChildView(rec.view)
    } catch {}
    try {
      rec.view.webContents.close()
    } catch {}
    try {
      ;(rec.view.webContents as any).destroy?.()
    } catch {}

    this.byWebContentsId.delete(rec.view.webContents.id)
    this.byId.delete(id)
  }

  destroyAllForWindow(windowId: number) {
    for (const [id, rec] of this.byId.entries()) {
      if (rec.ownerWindowId === windowId) this.destroy(id)
    }
  }

  listForWindow(windowId: number): Array<{ id: string; kind: ViewerKind }> {
    const out: Array<{ id: string; kind: ViewerKind }> = []
    for (const rec of this.byId.values()) {
      if (rec.ownerWindowId === windowId) out.push({ id: rec.id, kind: rec.kind })
    }
    return out
  }

  openDevTools(id: string) {
    const rec = this.byId.get(id)
    if (!rec) return
    try {
      rec.view.webContents.openDevTools({ mode: 'detach' })
    } catch {}
  }

  getIdForSender(sender: WebContents): string | null {
    const id = this.byWebContentsId.get(sender.id)
    return id || null
  }

  getOwnerWindowId(viewId: string): number | null {
    return this.byId.get(viewId)?.ownerWindowId ?? null
  }
}
