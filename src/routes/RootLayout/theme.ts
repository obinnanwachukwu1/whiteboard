import type { ThemeSettings } from '../../utils/theme'

export const isSameThemeSettings = (a: ThemeSettings, b: ThemeSettings) => {
  if (a.theme !== b.theme) return false
  if (a.accentPreset !== b.accentPreset) return false
  if (a.backgroundMode !== b.backgroundMode) return false
  if (a.background.type !== b.background.type) return false
  if (a.background.patternId !== b.background.patternId) return false
  if (a.background.imageUrl !== b.background.imageUrl) return false
  if (a.background.blur !== b.background.blur) return false
  if (a.background.opacity !== b.background.opacity) return false
  if (a.background.overlay !== b.background.overlay) return false

  const ae = a.background.extractedAccent
  const be = b.background.extractedAccent
  if (!ae && !be) return true
  if (!ae || !be) return false
  return ae.h === be.h && ae.s === be.s && ae.l === be.l
}
