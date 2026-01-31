// HSL-based accent color system
// Each preset defines hue, saturation, and lightness values that generate a full palette

import { THEME_CACHE_KEY } from './themeCache'

export type AccentPreset =
  | 'slate' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
  | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue'
  | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

// Legacy type for backward compatibility
export type Accent = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'

export type BackgroundMode = 'accent' | 'background'
export type BackgroundType = 'solid' | 'pattern' | 'image'
export type PatternId = 'dots' | 'grid' | 'mesh'

export interface BackgroundSettings {
  type: BackgroundType
  patternId?: PatternId
  imageUrl?: string
  blur: number // 0-30px
  opacity: number // 10-100%
  overlay: number // 0-50%
  extractedAccent?: { h: number; s: number; l: number }
}

export interface ThemeSettings {
  theme: 'light' | 'dark'
  accentPreset: AccentPreset
  backgroundMode: BackgroundMode
  background: BackgroundSettings
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, n))
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object'
}

function isAccentPreset(value: unknown): value is AccentPreset {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACCENT_PRESETS, value)
}

function isBackgroundType(value: unknown): value is BackgroundType {
  return value === 'solid' || value === 'pattern' || value === 'image'
}

function isBackgroundMode(value: unknown): value is BackgroundMode {
  return value === 'accent' || value === 'background'
}

function isPatternId(value: unknown): value is PatternId {
  return value === 'dots' || value === 'grid' || value === 'mesh'
}

function normalizeExtractedAccent(value: unknown): BackgroundSettings['extractedAccent'] | undefined {
  if (!isRecord(value)) return undefined
  const h = clampNumber(value.h, 0, 360, NaN)
  const s = clampNumber(value.s, 0, 100, NaN)
  const l = clampNumber(value.l, 0, 100, NaN)
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return undefined
  return { h, s, l }
}

// Best-effort runtime normalization so stale/partial persisted settings don't break boot.
export function normalizeThemeSettings(input: unknown): ThemeSettings | null {
  if (!isRecord(input)) return null

  const theme: ThemeSettings['theme'] =
    input.theme === 'dark' || input.theme === 'light'
      ? input.theme
      : DEFAULT_THEME_SETTINGS.theme

  // Accept both new and legacy shapes.
  const accentPreset: AccentPreset =
    isAccentPreset(input.accentPreset)
      ? input.accentPreset
      : (typeof (input as any).accent === 'string'
          ? legacyAccentToPreset((input as any).accent as any)
          : DEFAULT_THEME_SETTINGS.accentPreset)

  const backgroundRaw = isRecord(input.background) ? input.background : {}
  const type: BackgroundType = isBackgroundType(backgroundRaw.type) ? backgroundRaw.type : 'solid'

  const background: BackgroundSettings = {
    type,
    blur: clampNumber(backgroundRaw.blur, 0, 30, DEFAULT_THEME_SETTINGS.background.blur),
    opacity: clampNumber(backgroundRaw.opacity, 10, 100, DEFAULT_THEME_SETTINGS.background.opacity),
    overlay: clampNumber(backgroundRaw.overlay, 0, 50, DEFAULT_THEME_SETTINGS.background.overlay),
  }

  if (type === 'pattern') {
    background.patternId = isPatternId(backgroundRaw.patternId) ? backgroundRaw.patternId : 'dots'
  }

  if (type === 'image') {
    if (typeof backgroundRaw.imageUrl === 'string' && backgroundRaw.imageUrl.length > 0) {
      background.imageUrl = backgroundRaw.imageUrl
    }
    const extractedAccent = normalizeExtractedAccent(backgroundRaw.extractedAccent)
    if (extractedAccent) background.extractedAccent = extractedAccent
  }

  // If background mode is missing, infer it from background type.
  const backgroundMode: BackgroundMode =
    isBackgroundMode(input.backgroundMode)
      ? input.backgroundMode
      : (type === 'solid' ? 'accent' : 'background')

  return { theme, accentPreset, backgroundMode, background }
}

// HSL values for each accent preset (base hue, saturation, lightness for the primary shade)
export const ACCENT_PRESETS: Record<AccentPreset, { h: number; s: number; l: number; name: string }> = {
  slate:   { h: 215, s: 16, l: 47, name: 'Slate' },
  red:     { h: 0,   s: 72, l: 51, name: 'Red' },
  orange:  { h: 25,  s: 95, l: 53, name: 'Orange' },
  amber:   { h: 38,  s: 92, l: 50, name: 'Amber' },
  yellow:  { h: 48,  s: 96, l: 53, name: 'Yellow' },
  lime:    { h: 84,  s: 81, l: 44, name: 'Lime' },
  green:   { h: 142, s: 71, l: 45, name: 'Green' },
  emerald: { h: 160, s: 84, l: 39, name: 'Emerald' },
  teal:    { h: 173, s: 80, l: 40, name: 'Teal' },
  cyan:    { h: 189, s: 94, l: 43, name: 'Cyan' },
  sky:     { h: 199, s: 89, l: 48, name: 'Sky' },
  blue:    { h: 217, s: 91, l: 60, name: 'Blue' },
  indigo:  { h: 239, s: 84, l: 67, name: 'Indigo' },
  violet:  { h: 258, s: 90, l: 66, name: 'Violet' },
  purple:  { h: 271, s: 81, l: 56, name: 'Purple' },
  fuchsia: { h: 292, s: 84, l: 61, name: 'Fuchsia' },
  pink:    { h: 330, s: 81, l: 60, name: 'Pink' },
  rose:    { h: 350, s: 89, l: 60, name: 'Rose' },
}

// Map legacy accent names to new presets
const LEGACY_ACCENT_MAP: Record<Accent, AccentPreset> = {
  default: 'slate',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  indigo: 'indigo',
  violet: 'violet',
}

export function legacyAccentToPreset(accent: Accent): AccentPreset {
  return LEGACY_ACCENT_MAP[accent] || 'slate'
}

// Generate a full shade scale from HSL values
function generateShadeScale(h: number, s: number, _l: number, dark: boolean): Record<string, string> {
  // Shade scale with adjusted lightness for each step
  // In light mode: higher numbers = darker
  // In dark mode: we invert the logic for better contrast
  const shades: Record<string, { s: number; l: number }> = {
    '50':  { s: Math.max(s - 20, 10), l: dark ? 10 : 97 },
    '100': { s: Math.max(s - 15, 15), l: dark ? 15 : 94 },
    '200': { s: Math.max(s - 10, 20), l: dark ? 20 : 88 },
    '300': { s: Math.max(s - 5, 30), l: dark ? 30 : 78 },
    '400': { s: s, l: dark ? 40 : 65 },
    '500': { s: s, l: dark ? 50 : 55 },
    '600': { s: s, l: dark ? 60 : 45 },
    '700': { s: Math.min(s + 5, 100), l: dark ? 70 : 38 },
    '800': { s: Math.min(s + 10, 100), l: dark ? 80 : 30 },
    '900': { s: Math.min(s + 15, 100), l: dark ? 88 : 22 },
    '950': { s: Math.min(s + 20, 100), l: dark ? 94 : 12 },
  }

  const result: Record<string, string> = {}
  for (const [shade, { s: saturation, l: lightness }] of Object.entries(shades)) {
    result[shade] = `hsl(${h}, ${saturation}%, ${lightness}%)`
  }
  return result
}

// Generate all CSS tokens from accent HSL values
export function generateAccentTokens(h: number, s: number, l: number, dark: boolean): Record<string, string> {
  const shades = generateShadeScale(h, s, l, dark)

  // Semantic tokens mapped to shade scale
  const tokens: Record<string, string> = {
    // Base HSL values (for custom usage)
    '--accent-h': String(h),
    '--accent-s': `${s}%`,
    '--accent-l': `${l}%`,

    // Full shade scale
    '--accent-50': shades['50'],
    '--accent-100': shades['100'],
    '--accent-200': shades['200'],
    '--accent-300': shades['300'],
    '--accent-400': shades['400'],
    '--accent-500': shades['500'],
    '--accent-600': shades['600'],
    '--accent-700': shades['700'],
    '--accent-800': shades['800'],
    '--accent-900': shades['900'],
    '--accent-950': shades['950'],

    // Semantic tokens
    '--accent-primary': dark ? shades['400'] : shades['600'],
    '--accent-hover': dark ? shades['300'] : shades['700'],
    '--accent-active': dark ? shades['200'] : shades['800'],
    '--accent-ring': dark ? `hsla(${h}, ${s}%, 50%, 0.4)` : `hsla(${h}, ${s}%, 50%, 0.3)`,
    '--accent-border': dark ? shades['700'] : shades['300'],
    '--accent-shadow': `hsla(${h}, ${s}%, ${dark ? 20 : 40}%, ${dark ? 0.3 : 0.15})`,

    // Glass surface tokens (with alpha) - semi-transparent to show background
    '--glass-bg': dark
      ? `hsla(${h}, ${Math.max(s - 40, 10)}%, 12%, 0.7)`
      : `hsla(${h}, ${Math.max(s, 40)}%, 96%, 0.65)`,
    '--glass-hover': dark
      ? `hsla(${h}, ${Math.max(s - 35, 15)}%, 18%, 0.75)`
      : `hsla(${h}, ${Math.max(s, 45)}%, 94%, 0.75)`,
    '--glass-active': dark
      ? `hsla(${h}, ${Math.max(s - 30, 20)}%, 22%, 0.8)`
      : `hsla(${h}, ${Math.max(s, 50)}%, 92%, 0.85)`,
    '--glass-border': dark
      ? `hsla(${h}, ${Math.max(s - 40, 10)}%, 35%, 0.4)`
      : `hsla(${h}, ${Math.max(s, 40)}%, 70%, 0.5)`,

    // Legacy compatibility tokens - semi-transparent for background visibility
    '--app-accent-bg': dark
      ? `hsla(${h}, ${Math.max(s - 40, 10)}%, 12%, 0.7)`
      : `hsla(${h}, ${Math.max(s, 40)}%, 96%, 0.65)`,
    '--app-accent-root': dark
      ? `hsl(${h}, ${Math.max(s - 50, 5)}%, 8%)`
      : `hsl(${h}, ${Math.max(s, 35)}%, 98%)`,
    '--app-accent-hover': dark
      ? `hsla(${h}, ${Math.max(s - 35, 15)}%, 18%, 0.75)`
      : `hsla(${h}, ${Math.max(s, 45)}%, 94%, 0.75)`,
    '--app-accent-active': dark
      ? `hsla(${h}, ${s}%, 50%, 0.2)`
      : `hsla(${h}, ${s}%, 55%, 0.25)`,
  }

  return tokens
}

// Generate background layer tokens
export function generateBackgroundTokens(settings: BackgroundSettings): Record<string, string> {
  const tokens: Record<string, string> = {
    '--bg-blur': `${settings.blur}px`,
    '--bg-opacity': String(settings.opacity / 100),
    '--bg-overlay': String(settings.overlay / 100),
  }

  if (settings.type === 'image' && settings.imageUrl) {
    tokens['--bg-image'] = `url(${settings.imageUrl})`
  } else {
    tokens['--bg-image'] = 'none'
  }

  return tokens
}

// Apply all theme tokens to the document
export function applyThemeTokens(settings: ThemeSettings) {
  const { theme, accentPreset, backgroundMode, background } = settings
  const dark = theme === 'dark'
  const root = document.documentElement

  // Apply dark mode class
  root.classList.toggle('dark', dark)

  // Get accent HSL (either from preset or extracted from background image)
  let h: number, s: number, l: number

  if (backgroundMode === 'background' && background.extractedAccent) {
    ({ h, s, l } = background.extractedAccent)
  } else {
    const preset = ACCENT_PRESETS[accentPreset] || ACCENT_PRESETS.slate
    ;({ h, s, l } = preset)
  }

  // Generate and apply accent tokens
  const accentTokens = generateAccentTokens(h, s, l, dark)
  for (const [prop, value] of Object.entries(accentTokens)) {
    root.style.setProperty(prop, value)
  }

  // Generate and apply background tokens
  const bgTokens = generateBackgroundTokens(background)
  for (const [prop, value] of Object.entries(bgTokens)) {
    root.style.setProperty(prop, value)
  }

  // Store background mode
  root.dataset.backgroundMode = backgroundMode
  root.dataset.backgroundType = background.type
  if (background.patternId) {
    root.dataset.patternId = background.patternId
  }

  // Mirror to a single versioned localStorage cache for instant boot (index.html reads this).
  try {
    const cache = {
      v: 1 as const,
      theme,
      tokens: { ...accentTokens, ...bgTokens },
      dataset: {
        backgroundMode,
        backgroundType: background.type,
        patternId: background.patternId,
      },
      settings,
    }
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cache))

    // Minimal legacy key retained for OS/UA scheme + fallback bootstrap.
    localStorage.setItem('app-theme', theme)

    // Clean up old keys to avoid multiple competing sources of truth.
    localStorage.removeItem('app-theme-settings')
    localStorage.removeItem('app-accent-preset')
    localStorage.removeItem('app-accent-bg')
    localStorage.removeItem('app-accent-root')
    localStorage.removeItem('app-accent-active')
  } catch {}
}

// ============ Legacy API (for backward compatibility) ============

export function computeAccentBg(accent: Accent, dark: boolean): string {
  const preset = ACCENT_PRESETS[legacyAccentToPreset(accent)]
  const { h, s } = preset

  if (accent === 'default') {
    return dark ? 'rgb(18 18 18 / 0.85)' : 'rgb(255 255 255 / 0.8)'
  }

  // More visible tinting in light mode
  return dark
    ? `hsla(${h}, ${Math.max(s - 20, 20)}%, 25%, 0.6)`
    : `hsla(${h}, ${Math.max(s, 40)}%, 90%, 0.85)`
}

export function computeAccentBase(accent: Accent, dark: boolean): string {
  const preset = ACCENT_PRESETS[legacyAccentToPreset(accent)]
  const { h, s } = preset

  if (accent === 'default') {
    return dark ? 'rgb(18 18 18)' : 'rgb(255 255 255)'
  }

  // More visible base color in light mode
  return dark
    ? `hsl(${h}, ${Math.max(s - 30, 15)}%, 20%)`
    : `hsl(${h}, ${Math.max(s, 35)}%, 94%)`
}

export function computeAccentHover(accent: Accent, dark: boolean): string {
  const preset = ACCENT_PRESETS[legacyAccentToPreset(accent)]
  const { h, s } = preset

  if (accent === 'default') {
    return dark ? 'rgb(38 38 38 / 0.9)' : 'rgb(241 245 249 / 0.95)'
  }

  // More visible hover in light mode
  return dark
    ? `hsla(${h}, ${Math.max(s - 15, 25)}%, 30%, 0.55)`
    : `hsla(${h}, ${Math.max(s, 45)}%, 85%, 0.95)`
}

export function computeAccentActive(accent: Accent, dark: boolean): string {
  const preset = ACCENT_PRESETS[legacyAccentToPreset(accent)]
  const { h, s } = preset

  if (accent === 'default') {
    return dark ? 'rgb(255 255 255 / 0.1)' : 'rgb(0 0 0 / 0.06)'
  }

  // More visible active state in light mode
  return dark
    ? `hsla(${h}, ${s}%, 50%, 0.5)`
    : `hsla(${h}, ${s}%, 50%, 0.25)`
}

// Legacy function - wraps new system
export function applyThemeAndAccent(theme: 'light' | 'dark', accent: Accent) {
  const accentPreset = legacyAccentToPreset(accent)

  applyThemeTokens({
    theme,
    accentPreset,
    backgroundMode: 'accent',
    background: {
      type: 'solid',
      blur: 0,
      opacity: 100,
      overlay: 0,
    },
  })
}

// Get swatch color for UI display
export function getPresetSwatchColor(preset: AccentPreset, dark: boolean): string {
  const { h, s } = ACCENT_PRESETS[preset]
  // Return a visible color for the swatch
  return `hsl(${h}, ${s}%, ${dark ? 60 : 50}%)`
}

// Default theme settings
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'light',
  accentPreset: 'slate',
  backgroundMode: 'accent',
  background: {
    type: 'solid',
    blur: 0,
    opacity: 100,
    overlay: 0,
  },
}
