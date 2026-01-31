import { describe, expect, it } from 'vitest'
import { normalizeThemeSettings, DEFAULT_THEME_SETTINGS } from './theme'

describe('normalizeThemeSettings', () => {
  it('returns null for non-objects', () => {
    expect(normalizeThemeSettings(null)).toBe(null)
    expect(normalizeThemeSettings('x')).toBe(null)
    expect(normalizeThemeSettings(123)).toBe(null)
  })

  it('fills missing background fields with defaults', () => {
    const normalized = normalizeThemeSettings({ theme: 'dark', accentPreset: 'blue' })
    expect(normalized).not.toBe(null)
    expect(normalized?.theme).toBe('dark')
    expect(normalized?.accentPreset).toBe('blue')
    expect(normalized?.background).toEqual(DEFAULT_THEME_SETTINGS.background)
  })

  it('infers backgroundMode from background type when missing', () => {
    const normalized = normalizeThemeSettings({
      theme: 'light',
      accentPreset: 'slate',
      background: { type: 'pattern', blur: 0, opacity: 100, overlay: 0, patternId: 'grid' },
    })
    expect(normalized?.backgroundMode).toBe('background')
    expect(normalized?.background.type).toBe('pattern')
    expect(normalized?.background.patternId).toBe('grid')
  })

  it('clamps numeric fields to safe bounds', () => {
    const normalized = normalizeThemeSettings({
      theme: 'light',
      accentPreset: 'slate',
      background: { type: 'image', blur: 999, opacity: 1, overlay: -5 },
    })
    expect(normalized?.background.blur).toBe(30)
    expect(normalized?.background.opacity).toBe(10)
    expect(normalized?.background.overlay).toBe(0)
  })
})

