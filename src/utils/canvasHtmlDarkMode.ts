type RGBA = { r: number; g: number; b: number; a: number }
type Oklab = { L: number; a: number; b: number }
type Oklch = { L: number; C: number; h: number }

type NormalizeOptions = {
  surface?: string
  text?: string
}

const DEFAULT_SURFACE_DARK: RGBA = { r: 18 / 255, g: 18 / 255, b: 18 / 255, a: 1 }
const DEFAULT_TEXT_DARK: RGBA = { r: 229 / 255, g: 231 / 255, b: 235 / 255, a: 1 }

const LARGE_TEXT_PX = 24
const LARGE_TEXT_BOLD_PX = 18.66

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function srgbToLinear(c: number): number {
  if (c <= 0.04045) return c / 12.92
  return Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  if (c <= 0.0031308) return 12.92 * c
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

function rgbToOklab({ r, g, b }: RGBA): Oklab {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.0329845436 * lr + 0.9293118715 * lg + 0.0361456387 * lb
  const s = 0.0482003018 * lr + 0.2643662691 * lg + 0.633851707 * lb

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

function oklabToRgb({ L, a, b }: Oklab): { rgb: RGBA; inGamut: boolean } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const inGamut = lr >= 0 && lr <= 1 && lg >= 0 && lg <= 1 && lb >= 0 && lb <= 1
  return {
    rgb: {
      r: clamp01(linearToSrgb(lr)),
      g: clamp01(linearToSrgb(lg)),
      b: clamp01(linearToSrgb(lb)),
      a: 1,
    },
    inGamut,
  }
}

function oklabToOklch(oklab: Oklab): Oklch {
  const C = Math.hypot(oklab.a, oklab.b)
  let h = Math.atan2(oklab.b, oklab.a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { L: oklab.L, C, h }
}

function oklchToOklab(oklch: Oklch): Oklab {
  const hRad = (oklch.h * Math.PI) / 180
  return {
    L: oklch.L,
    a: oklch.C * Math.cos(hRad),
    b: oklch.C * Math.sin(hRad),
  }
}

function relativeLuminance({ r, g, b }: RGBA): number {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function composite(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a)
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  }
}

function contrastRatio(fg: RGBA, bg: RGBA): number {
  const fgEff = fg.a < 1 ? composite(fg, bg) : fg
  const L1 = relativeLuminance(fgEff)
  const L2 = relativeLuminance(bg)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseHexColor(value: string): RGBA | null {
  const hex = value.replace('#', '').trim()
  if (![3, 4, 6, 8].includes(hex.length)) return null
  const expand = (s: string) => s.split('').map((c) => c + c).join('')
  const normalized = hex.length <= 4 ? expand(hex) : hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const a = normalized.length >= 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1
  if ([r, g, b].some((v) => Number.isNaN(v))) return null
  return { r: r / 255, g: g / 255, b: b / 255, a: clamp01(a) }
}

function parseChannel(value: string): number | null {
  const v = value.trim()
  if (v.endsWith('%')) {
    const pct = parseFloat(v.slice(0, -1))
    if (!Number.isFinite(pct)) return null
    return clamp01(pct / 100)
  }
  const num = parseFloat(v)
  if (!Number.isFinite(num)) return null
  return clamp01(num / 255)
}

function parseAlpha(value: string): number | null {
  const v = value.trim()
  if (v.endsWith('%')) {
    const pct = parseFloat(v.slice(0, -1))
    if (!Number.isFinite(pct)) return null
    return clamp01(pct / 100)
  }
  const num = parseFloat(v)
  if (!Number.isFinite(num)) return null
  return clamp01(num)
}

function parseRgbColor(value: string): RGBA | null {
  const match = value.match(/^rgba?\((.*)\)$/i)
  if (!match) return null
  const inner = match[1].trim()
  let colorPart = inner
  let alphaPart = ''
  if (inner.includes('/')) {
    const parts = inner.split('/')
    colorPart = parts[0].trim()
    alphaPart = parts[1]?.trim() || ''
  }

  const tokens = colorPart.includes(',')
    ? colorPart.split(',').map((t) => t.trim()).filter(Boolean)
    : colorPart.split(/\s+/).map((t) => t.trim()).filter(Boolean)

  if (tokens.length < 3) return null
  const r = parseChannel(tokens[0])
  const g = parseChannel(tokens[1])
  const b = parseChannel(tokens[2])
  if (r === null || g === null || b === null) return null

  let a = 1
  if (tokens.length >= 4) {
    const parsed = parseAlpha(tokens[3])
    if (parsed === null) return null
    a = parsed
  } else if (alphaPart) {
    const parsed = parseAlpha(alphaPart)
    if (parsed === null) return null
    a = parsed
  }

  return { r, g, b, a }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const C = (1 - Math.abs(2 * l - 1)) * s
  const hPrime = h / 60
  const x = C * (1 - Math.abs((hPrime % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hPrime >= 0 && hPrime < 1) [r1, g1, b1] = [C, x, 0]
  else if (hPrime < 2) [r1, g1, b1] = [x, C, 0]
  else if (hPrime < 3) [r1, g1, b1] = [0, C, x]
  else if (hPrime < 4) [r1, g1, b1] = [0, x, C]
  else if (hPrime < 5) [r1, g1, b1] = [x, 0, C]
  else [r1, g1, b1] = [C, 0, x]
  const m = l - C / 2
  return { r: r1 + m, g: g1 + m, b: b1 + m }
}

function parseHslColor(value: string): RGBA | null {
  const match = value.match(/^hsla?\((.*)\)$/i)
  if (!match) return null
  const inner = match[1].trim()
  let colorPart = inner
  let alphaPart = ''
  if (inner.includes('/')) {
    const parts = inner.split('/')
    colorPart = parts[0].trim()
    alphaPart = parts[1]?.trim() || ''
  }
  const tokens = colorPart.includes(',')
    ? colorPart.split(',').map((t) => t.trim()).filter(Boolean)
    : colorPart.split(/\s+/).map((t) => t.trim()).filter(Boolean)
  if (tokens.length < 3) return null

  const h = parseFloat(tokens[0])
  const sRaw = tokens[1]
  const lRaw = tokens[2]
  if (!Number.isFinite(h)) return null
  if (!sRaw.endsWith('%') || !lRaw.endsWith('%')) return null
  const s = parseFloat(sRaw) / 100
  const l = parseFloat(lRaw) / 100
  if (!Number.isFinite(s) || !Number.isFinite(l)) return null

  const rgb = hslToRgb(((h % 360) + 360) % 360, clamp01(s), clamp01(l))
  let a = 1
  if (tokens.length >= 4) {
    const parsed = parseAlpha(tokens[3])
    if (parsed === null) return null
    a = parsed
  } else if (alphaPart) {
    const parsed = parseAlpha(alphaPart)
    if (parsed === null) return null
    a = parsed
  }
  return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a }
}

function parseColor(value: string): RGBA | null {
  const raw = value.trim()
  if (!raw) return null
  const normalized = raw.replace(/!important/gi, '').trim().toLowerCase()
  if (normalized.startsWith('var(')) return null
  if (normalized === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (normalized === 'black') return { r: 0, g: 0, b: 0, a: 1 }
  if (normalized === 'white') return { r: 1, g: 1, b: 1, a: 1 }
  if (normalized === 'currentcolor') return null
  if (normalized.startsWith('#')) return parseHexColor(normalized)
  if (normalized.startsWith('rgb')) return parseRgbColor(normalized)
  if (normalized.startsWith('hsl')) return parseHslColor(normalized)
  return null
}

function isVarColor(value: string): boolean {
  return value.trim().toLowerCase().startsWith('var(')
}

function rgbaToCss({ r, g, b, a }: RGBA): string {
  const r255 = Math.round(clamp01(r) * 255)
  const g255 = Math.round(clamp01(g) * 255)
  const b255 = Math.round(clamp01(b) * 255)
  if (a >= 0.999) return `rgb(${r255} ${g255} ${b255})`
  const alpha = Math.round(clamp01(a) * 1000) / 1000
  return `rgb(${r255} ${g255} ${b255} / ${alpha})`
}

function parseFontSize(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^([0-9.]+)(px|pt|rem|em)$/)
  if (!match) return null
  const num = parseFloat(match[1])
  if (!Number.isFinite(num)) return null
  const unit = match[2]
  if (unit === 'px') return num
  if (unit === 'pt') return num * (96 / 72)
  return num * 16
}

function parseFontWeight(value: string): number | null {
  const v = value.trim().toLowerCase()
  if (v === 'bold' || v === 'bolder') return 700
  const num = parseFloat(v)
  if (!Number.isFinite(num)) return null
  return num
}

type StyleDecl = {
  prop: string
  value: string
  important: boolean
}

function parseStyleDeclarations(styleText: string): StyleDecl[] {
  const parts = styleText.split(';')
  const decls: StyleDecl[] = []
  for (const part of parts) {
    const decl = part.trim()
    if (!decl) continue
    const idx = decl.indexOf(':')
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    let value = decl.slice(idx + 1).trim()
    if (!prop || !value) continue
    let important = false
    if (/!important/i.test(value)) {
      important = true
      value = value.replace(/!important/gi, '').trim()
    }
    decls.push({ prop, value, important })
  }
  return decls
}

function styleDeclsToString(decls: StyleDecl[]): string {
  return decls
    .map((d) => `${d.prop}: ${d.value}${d.important ? ' !important' : ''}`)
    .join('; ')
}

function oklchFromRgba(color: RGBA): Oklch {
  return oklabToOklch(rgbToOklab(color))
}

function oklchToRgba(oklch: Oklch): { color: RGBA; inGamut: boolean } {
  const { rgb, inGamut } = oklabToRgb(oklchToOklab(oklch))
  return { color: rgb, inGamut }
}

function isNearNeutral(oklch: Oklch, maxC = 0.04): boolean {
  return oklch.C < maxC
}

function solveLightnessForContrast(
  base: Oklch,
  bg: RGBA,
  target: number,
): { color: RGBA; inGamut: boolean } | null {
  let low = 0.6
  let high = 0.95
  let best: { color: RGBA; inGamut: boolean } | null = null
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const candidate = oklchToRgba({ L: mid, C: base.C, h: base.h })
    if (!candidate.inGamut) {
      high = mid
      continue
    }
    const ratio = contrastRatio(candidate.color, bg)
    if (ratio >= target) {
      best = candidate
      high = mid
    } else {
      low = mid
    }
  }
  return best
}

function normalizeForegroundColor(
  fg: RGBA,
  bg: RGBA,
  target: number,
  fallback: RGBA,
): RGBA | null {
  if (contrastRatio(fg, bg) >= target) return fg
  const oklch = oklchFromRgba(fg)
  if (oklch.L < 0.35 && isNearNeutral(oklch, 0.06)) return null

  let working = { ...oklch }
  for (let i = 0; i < 8; i++) {
    const solved = solveLightnessForContrast(working, bg, target)
    if (solved?.inGamut) return solved.color
    working = { ...working, C: working.C * 0.85 }
    if (working.C < 0.02) break
  }
  return fallback
}

function normalizeBackgroundColor(bg: RGBA, text: RGBA, surface: RGBA, target: number): RGBA | null {
  const oklch = oklchFromRgba(bg)
  if (oklch.L <= 0.35 && contrastRatio(text, bg) >= target) return bg

  if (oklch.L > 0.88) {
    const surfaceO = oklchFromRgba(surface)
    const highlight: Oklch = {
      L: clamp(surfaceO.L + 0.06, 0.1, 0.25),
      C: clamp(oklch.C, 0.03, 0.1),
      h: oklch.h,
    }
    const out = oklchToRgba(highlight).color
    if (contrastRatio(text, out) >= target) return out
    return null
  }

  const remapped: Oklch = {
    L: clamp(oklch.L, 0.12, 0.25),
    C: Math.min(oklch.C, 0.08),
    h: oklch.h,
  }
  const out = oklchToRgba(remapped).color
  if (contrastRatio(text, out) >= target) return out
  return null
}

function normalizeBorderColor(border: RGBA, fill: RGBA): RGBA {
  const ratio = contrastRatio(border, fill)
  const fillO = oklchFromRgba(fill)
  if (ratio >= 3 && ratio <= 8 && !isNearNeutral(oklchFromRgba(border), 0.05)) return border
  const stroke: Oklch = {
    L: clamp(fillO.L + 0.18, 0.2, 0.7),
    C: 0.02,
    h: fillO.h,
  }
  return oklchToRgba(stroke).color
}

function normalizeStyleText(styleText: string, surface: RGBA, text: RGBA): string {
  const decls = parseStyleDeclarations(styleText)
  if (!decls.length) return ''

  let fontSizePx: number | null = null
  let fontWeight: number | null = null

  let inlineColor: RGBA | null = null
  let inlineBackground: RGBA | null = null

  for (const decl of decls) {
    if (decl.prop === 'font-size') {
      fontSizePx = parseFontSize(decl.value) ?? fontSizePx
    }
    if (decl.prop === 'font-weight') {
      fontWeight = parseFontWeight(decl.value) ?? fontWeight
    }
    if (decl.prop === 'color') {
      const parsed = parseColor(decl.value)
      if (parsed) inlineColor = parsed
    }
    if (decl.prop === 'background-color' || decl.prop === 'background') {
      const parsed = parseColor(decl.value)
      if (parsed) inlineBackground = parsed
    }
  }

  const isBold = (fontWeight ?? 400) >= 600
  const isLargeText =
    (fontSizePx ?? 0) >= LARGE_TEXT_PX || (isBold && (fontSizePx ?? 0) >= LARGE_TEXT_BOLD_PX)
  const target = isLargeText ? 3 : 4.5

  const inlineBgOklch = inlineBackground ? oklchFromRgba(inlineBackground) : null
  const baseBg =
    inlineBackground && inlineBgOklch && inlineBgOklch.L <= 0.88 ? inlineBackground : surface
  const baseText = inlineColor ?? text

  const nextDecls: StyleDecl[] = []
  for (const decl of decls) {
    if (decl.prop === 'color' || decl.prop === 'fill' || decl.prop === 'stroke') {
      const parsed = parseColor(decl.value)
      if (!parsed) {
        if (isVarColor(decl.value)) continue
        nextDecls.push(decl)
        continue
      }
      const normalized = normalizeForegroundColor(parsed, baseBg, target, baseText)
      if (!normalized) continue
      nextDecls.push({ ...decl, value: rgbaToCss(normalized) })
      continue
    }

    if (decl.prop === 'background-color' || decl.prop === 'background') {
      const parsed = parseColor(decl.value)
      if (!parsed) {
        if (isVarColor(decl.value)) continue
        nextDecls.push(decl)
        continue
      }
      const normalized = normalizeBackgroundColor(parsed, baseText, surface, target)
      if (!normalized) continue
      nextDecls.push({ ...decl, value: rgbaToCss(normalized) })
      continue
    }

    if (decl.prop === 'border-color' || decl.prop === 'outline-color') {
      const parsed = parseColor(decl.value)
      if (!parsed) {
        nextDecls.push(decl)
        continue
      }
      const normalized = normalizeBorderColor(parsed, baseBg)
      nextDecls.push({ ...decl, value: rgbaToCss(normalized) })
      continue
    }

    nextDecls.push(decl)
  }

  return styleDeclsToString(nextDecls)
}

function resolveSurface(options?: NormalizeOptions): RGBA {
  if (options?.surface) {
    const parsed = parseColor(options.surface)
    if (parsed) return parsed
  }
  return DEFAULT_SURFACE_DARK
}

function resolveText(options?: NormalizeOptions): RGBA {
  if (options?.text) {
    const parsed = parseColor(options.text)
    if (parsed) return parsed
  }
  return DEFAULT_TEXT_DARK
}

/**
 * OKLCH-based dark-mode normalizer for Canvas HTML.
 * Strips or remaps inline colors/backgrounds that are light-mode biased,
 * while preserving intended hue where possible.
 */
export function normalizeCanvasHtmlForDarkMode(html: string, options?: NormalizeOptions): string {
  if (!html) return html
  const surface = resolveSurface(options)
  const text = resolveText(options)

  const replace = (_full: string, quote: string, rawStyle: string) => {
    const next = normalizeStyleText(rawStyle, surface, text)
    if (!next) return ''
    return ` style=${quote}${next}${quote}`
  }

  return html
    .replace(/\sstyle\s*=\s*(")([^"]*)"/gi, (m, q, s) => replace(m, q, s))
    .replace(/\sstyle\s*=\s*(')([^']*)'/gi, (m, q, s) => replace(m, q, s))
}
