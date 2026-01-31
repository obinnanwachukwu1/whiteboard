import { fileURLToPath } from 'url'

/**
 * Normalize Windows paths that may come in MSYS/Git-Bash style.
 *
 * We occasionally see temp paths like "/c/Users/<user>/AppData/Local/Temp"
 * (no ":" after drive letter). Node/Electron APIs on Windows won't treat that
 * as a valid absolute path, and fileURLToPath() will reject file:///c/... URLs.
 */
export function normalizeWin32Path(inputPath: string): string {
  if (process.platform !== 'win32') return inputPath

  if (!inputPath) return inputPath

  // Preserve UNC and already-normal drive paths.
  if (inputPath.startsWith('\\\\') || /^[a-zA-Z]:\\/.test(inputPath)) {
    return inputPath
  }

  // Normalize forward slashes so the patterns below behave consistently.
  const p = inputPath.replace(/\\/g, '/')

  // Handle "/C:/Users/..." (leading slash) -> "C:\Users\..."
  const slashDrive = /^\/([a-zA-Z]):\/(.*)$/.exec(p)
  if (slashDrive) {
    const drive = slashDrive[1].toUpperCase()
    const rest = slashDrive[2]
    return `${drive}:\\${rest.replace(/\//g, '\\')}`
  }

  // Handle MSYS "/c/Users/..." -> "C:\Users\..."
  const msys = /^\/([a-zA-Z])\/(.*)$/.exec(p)
  if (msys) {
    const drive = msys[1].toUpperCase()
    const rest = msys[2]
    return `${drive}:\\${rest.replace(/\//g, '\\')}`
  }

  // Handle "C:/Users/..." -> "C:\Users\..."
  const fwd = /^([a-zA-Z]):\/(.*)$/.exec(p)
  if (fwd) {
    const drive = fwd[1].toUpperCase()
    const rest = fwd[2]
    return `${drive}:\\${rest.replace(/\//g, '\\')}`
  }

  return inputPath
}

function coerceWin32FileUrl(u: URL): URL {
  if (process.platform !== 'win32') return u

  // If we normalized a "canvas-file://c/Users/..." into "canvas-file:///c/Users/...",
  // we may end up with file:///c/Users/... which is not a valid Windows file URL.
  // Coerce it into file:///C:/Users/...
  const isProperDrive = /^\/[a-zA-Z]:\//.test(u.pathname)
  const msysDrive = /^\/[a-zA-Z]\//.test(u.pathname)

  if (!isProperDrive && msysDrive) {
    const drive = u.pathname[1].toUpperCase()
    const rest = u.pathname.slice(2) // includes leading "/"
    // URL expects pathname with forward slashes.
    u.pathname = `/${drive}:${rest}`
  }

  // Some code paths can still yield file://c/Users/... (hostname="c").
  // That's not a UNC share; treat it as a drive-letter shorthand.
  if (/^[a-zA-Z]$/.test(u.hostname) && u.pathname.startsWith('/')) {
    const drive = u.hostname.toUpperCase()
    const rest = u.pathname // includes leading "/"
    u.hostname = ''
    u.host = ''
    u.pathname = `/${drive}:${rest}`
  }

  return u
}

/**
 * Convert a canvas-file:// URL to a local file path, tolerating MSYS/Git-Bash
 * drive-letter URLs on Windows.
 */
export function canvasFileUrlToPath(canvasFileUrl: string): string {
  const fileUrl = canvasFileUrl.replace(/^canvas-file:/, 'file:')
  return fileUrlToPathSafe(fileUrl)
}

export function fileUrlToPathSafe(fileUrl: string): string {
  try {
    return normalizeWin32Path(fileURLToPath(fileUrl))
  } catch (e) {
    if (process.platform !== 'win32') throw e

    const u = coerceWin32FileUrl(new URL(fileUrl))
    try {
      return normalizeWin32Path(fileURLToPath(u))
    } catch {
      // Last resort: manual conversion of pathname. Keep this narrow to avoid
      // silently accepting non-file URLs or malformed inputs.
      const decodedPath = decodeURIComponent(u.pathname || '')

      // file:///C:/Users/... -> C:\Users\...
      const proper = /^\/([a-zA-Z]):\/(.*)$/.exec(decodedPath)
      if (proper) {
        const drive = proper[1].toUpperCase()
        const rest = proper[2]
        return `${drive}:\\${rest.replace(/\//g, '\\')}`
      }

      // file:///c/Users/... -> C:\Users\...
      const msys = /^\/([a-zA-Z])\/(.*)$/.exec(decodedPath)
      if (msys) {
        const drive = msys[1].toUpperCase()
        const rest = msys[2]
        return `${drive}:\\${rest.replace(/\//g, '\\')}`
      }

      throw e
    }
  }
}
