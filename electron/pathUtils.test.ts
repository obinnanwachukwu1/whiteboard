import { describe, expect, it } from 'vitest'
import { canvasFileUrlToPath, fileUrlToPathSafe, normalizeWin32Path } from './pathUtils'

describe('pathUtils (Windows coercions)', () => {
  it('no-ops on non-Windows', () => {
    if (process.platform === 'win32') return
    expect(normalizeWin32Path('/c/Users/USER')).toBe('/c/Users/USER')
  })

  it('normalizes MSYS-style absolute paths on Windows', () => {
    if (process.platform !== 'win32') return
    expect(normalizeWin32Path('/c/Users/USER/AppData/Local/Temp')).toBe(
      'C:\\Users\\USER\\AppData\\Local\\Temp',
    )
  })

  it('normalizes forward-slashed drive paths on Windows', () => {
    if (process.platform !== 'win32') return
    expect(normalizeWin32Path('c:/Users/USER/AppData/Local/Temp')).toBe(
      'C:\\Users\\USER\\AppData\\Local\\Temp',
    )
  })

  it('converts file:///c/... URLs to a Win32 path', () => {
    if (process.platform !== 'win32') return
    expect(fileUrlToPathSafe('file:///c/Users/USER/AppData/Local/Temp/x.jpg')).toBe(
      'C:\\Users\\USER\\AppData\\Local\\Temp\\x.jpg',
    )
  })

  it('converts canvas-file:///c/... URLs to a Win32 path', () => {
    if (process.platform !== 'win32') return
    expect(canvasFileUrlToPath('canvas-file:///c/Users/USER/AppData/Local/Temp/x.jpg')).toBe(
      'C:\\Users\\USER\\AppData\\Local\\Temp\\x.jpg',
    )
  })
})
