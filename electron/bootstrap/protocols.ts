import { app, net, protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

import { canvasFileUrlToPath, normalizeWin32Path } from '../pathUtils'

const THEME_BACKGROUNDS_DIR = 'theme-backgrounds'

export function getThemeBackgroundsDir(): string {
  const userDir = normalizeWin32Path(app.getPath('userData'))
  const bgDir = path.join(userDir, THEME_BACKGROUNDS_DIR)
  if (!fs.existsSync(bgDir)) {
    fs.mkdirSync(bgDir, { recursive: true })
  }
  return bgDir
}

export function getThemeBackgroundsLegacyDir(): string {
  const tempDir = normalizeWin32Path(app.getPath('temp'))
  return path.join(tempDir, THEME_BACKGROUNDS_DIR)
}

export function isPathInDir(baseDir: string, targetPath: string): boolean {
  const rel = path.relative(baseDir, targetPath)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function registerContentProtocols(deps: { viteDevServerUrl?: string; rendererDist: string }) {
  protocol.handle('canvas-file', async (req) => {
    try {
      let normalized = req.url
      if (normalized.startsWith('canvas-file://') && !normalized.startsWith('canvas-file:///')) {
        normalized = normalized.replace(/^canvas-file:\/\/+/, 'canvas-file:///')
      }

      const filePath = canvasFileUrlToPath(normalized)

      const resolvedPath = path.resolve(filePath)
      if (!fs.existsSync(resolvedPath)) {
        return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
      }

      const resolvedReal = await fs.promises.realpath(resolvedPath)
      const tempDir = await fs.promises.realpath(normalizeWin32Path(app.getPath('temp')))
      const themeDir = await fs.promises.realpath(getThemeBackgroundsDir())
      const legacyDir = getThemeBackgroundsLegacyDir()
      const legacyReal = fs.existsSync(legacyDir) ? await fs.promises.realpath(legacyDir) : null

      const allowed =
        isPathInDir(tempDir, resolvedReal) ||
        isPathInDir(themeDir, resolvedReal) ||
        (legacyReal ? isPathInDir(legacyReal, resolvedReal) : false)

      if (!allowed) {
        console.warn(`[Security] Blocked access to file outside allowed dirs: ${resolvedReal}`)
        return new Response('Forbidden: Access denied to files outside allowed directories', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      const stat = await fs.promises.stat(resolvedReal)
      const size = stat.size

      const ext = path.extname(resolvedReal).toLowerCase()
      const contentType = (() => {
        switch (ext) {
          case '.pdf':
            return 'application/pdf'
          case '.mp4':
            return 'video/mp4'
          case '.m4v':
            return 'video/x-m4v'
          case '.mov':
            return 'video/quicktime'
          case '.webm':
            return 'video/webm'
          case '.ogv':
          case '.ogg':
            return 'video/ogg'
          case '.mp3':
            return 'audio/mpeg'
          case '.m4a':
            return 'audio/mp4'
          case '.aac':
            return 'audio/aac'
          case '.wav':
            return 'audio/wav'
          case '.png':
            return 'image/png'
          case '.jpg':
          case '.jpeg':
            return 'image/jpeg'
          case '.gif':
            return 'image/gif'
          case '.webp':
            return 'image/webp'
          case '.svg':
            return 'image/svg+xml'
          case '.txt':
            return 'text/plain; charset=utf-8'
          case '.html':
            return 'text/html; charset=utf-8'
          case '.json':
            return 'application/json; charset=utf-8'
          default:
            return 'application/octet-stream'
        }
      })()

      const headers = new Headers()
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Content-Type', contentType)
      headers.set('Cache-Control', 'no-store')

      const range = req.headers.get('range')
      const method = (req.method || 'GET').toUpperCase()

      if (range) {
        const m = /^bytes=(\d+)-(\d+)?$/i.exec(range)
        if (!m) {
          headers.set('Content-Range', `bytes */${size}`)
          return new Response('Invalid Range', { status: 416, headers })
        }
        const start = Number(m[1])
        const end = m[2] != null ? Math.min(Number(m[2]), size - 1) : size - 1
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          end < start ||
          start >= size
        ) {
          headers.set('Content-Range', `bytes */${size}`)
          return new Response('Range Not Satisfiable', { status: 416, headers })
        }

        headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
        headers.set('Content-Length', String(end - start + 1))

        if (method === 'HEAD') {
          return new Response(null, { status: 206, headers })
        }

        const stream = fs.createReadStream(resolvedReal, { start, end })
        return new Response(Readable.toWeb(stream) as any, { status: 206, headers })
      }

      headers.set('Content-Length', String(size))

      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers })
      }

      const stream = fs.createReadStream(resolvedReal)
      return new Response(Readable.toWeb(stream) as any, { status: 200, headers })
    } catch (e) {
      console.error(`[canvas-file] Error handling request: ${req.url}`, e)
      return new Response('Bad Request', { status: 400 })
    }
  })

  protocol.handle('pdf-viewer', (req) => {
    const url = req.url.replace(/^pdf-viewer:\/\//, '')
    const withoutQuery = url.split('?')[0].split('#')[0]
    let filePath = decodeURIComponent(withoutQuery)

    filePath = filePath.replace(/\/+$/, '')
    filePath = filePath.replace(/^pdfviewer\.html\//i, '')

    if (filePath.toLowerCase() === 'pdfviewer.html') {
      filePath = 'pdfViewer.html'
    }

    console.log(`[pdf-viewer] Request: ${url} -> ${filePath}`)

    const allowedExtensions = ['.html', '.js', '.mjs', '.css', '.bcmap', '.svg', '.gif', '.png', '.map']
    const ext = path.extname(filePath).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[pdf-viewer] Blocked disallowed file type: ${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    let resolvedPath: string
    if (deps.viteDevServerUrl) {
      if (filePath === 'pdfViewer.html' || filePath === 'bridge.js') {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'pdfviewer', filePath)
      } else if (filePath.startsWith('cmaps/')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', filePath)
      } else if (filePath === 'pdf.mjs' || filePath === 'pdf.worker.mjs') {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', 'build', filePath)
      } else if (filePath === 'pdf_viewer.mjs' || filePath === 'pdf_viewer.css') {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', 'web', filePath)
      } else if (filePath.startsWith('images/')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'pdfjs-dist', 'web', filePath)
      } else {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'pdfviewer', filePath)
      }
    } else {
      resolvedPath = path.join(deps.rendererDist, 'pdfviewer', filePath)
    }

    const allowedBase = deps.viteDevServerUrl ? process.env.APP_ROOT : deps.rendererDist
    if (!resolvedPath.startsWith(allowedBase)) {
      console.warn(`[pdf-viewer] Blocked request outside allowed dir: ${resolvedPath}`)
      return new Response('Forbidden', { status: 403 })
    }

    if (!fs.existsSync(resolvedPath)) {
      console.error(`[pdf-viewer] File not found: ${resolvedPath}`)
      return new Response('Not Found', { status: 404 })
    }

    console.log(`[pdf-viewer] Serving: ${resolvedPath}`)
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })

  protocol.handle('docx-viewer', (req) => {
    const url = req.url.replace(/^docx-viewer:\/\//, '')
    let filePath = decodeURIComponent(url)

    filePath = filePath.replace(/\/+$/, '')
    filePath = filePath.replace(/^docxviewer\.html\//i, '')

    if (filePath.toLowerCase() === 'docxviewer.html') {
      filePath = 'docxViewer.html'
    }

    console.log(`[docx-viewer] Request: ${url} -> ${filePath}`)

    const allowedExtensions = ['.html', '.js', '.css', '.svg', '.gif', '.png', '.map']
    const ext = path.extname(filePath).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[docx-viewer] Blocked disallowed file type: ${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    let resolvedPath: string
    if (deps.viteDevServerUrl) {
      if (filePath.startsWith('docx-preview.')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'docx-preview', 'dist', filePath)
      } else if (filePath.startsWith('jszip.')) {
        resolvedPath = path.join(process.env.APP_ROOT, 'node_modules', 'jszip', 'dist', filePath)
      } else {
        resolvedPath = path.join(process.env.APP_ROOT, 'public', 'docxviewer', filePath)
      }
    } else {
      resolvedPath = path.join(deps.rendererDist, 'docxviewer', filePath)
    }

    const allowedBase = deps.viteDevServerUrl ? process.env.APP_ROOT : deps.rendererDist
    if (!resolvedPath.startsWith(allowedBase)) {
      console.warn(`[docx-viewer] Blocked request outside allowed dir: ${resolvedPath}`)
      return new Response('Forbidden', { status: 403 })
    }

    if (!fs.existsSync(resolvedPath)) {
      console.error(`[docx-viewer] File not found: ${resolvedPath}`)
      return new Response('Not Found', { status: 404 })
    }

    console.log(`[docx-viewer] Serving: ${resolvedPath}`)
    return net.fetch(pathToFileURL(resolvedPath).toString())
  })
}
