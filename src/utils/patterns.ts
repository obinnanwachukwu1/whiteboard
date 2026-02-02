// CSS Pattern Generators
// Each pattern takes accent HSL values and dark mode flag to generate tinted patterns

import type { PatternId } from './theme'

export interface PatternDefinition {
  id: PatternId
  name: string
  description: string
  generate: (h: number, s: number, l: number, dark: boolean) => string
}

// Dots pattern - polka dot grid
function generateDotsPattern(h: number, s: number, _l: number, dark: boolean): string {
  const dotColor = dark
    ? `hsla(${h}, ${Math.max(s - 20, 30)}%, 45%, 0.6)`
    : `hsla(${h}, ${Math.max(s, 40)}%, 55%, 0.4)`

  const bgColor = dark
    ? `hsl(${h}, ${Math.max(s - 50, 5)}%, 8%)`
    : `hsl(${h}, ${Math.max(s - 40, 10)}%, 98%)`

  return `
    background-color: ${bgColor};
    background-image: radial-gradient(${dotColor} 1.5px, transparent 1.5px);
    background-size: 24px 24px;
  `
}

// Grid pattern - clean line grid
function generateGridPattern(h: number, s: number, _l: number, dark: boolean): string {
  const lineColor = dark
    ? `hsla(${h}, ${Math.max(s - 20, 30)}%, 40%, 0.4)`
    : `hsla(${h}, ${Math.max(s, 40)}%, 60%, 0.45)`

  const bgColor = dark
    ? `hsl(${h}, ${Math.max(s - 50, 5)}%, 8%)`
    : `hsl(${h}, ${Math.max(s - 40, 10)}%, 98%)`

  return `
    background-color: ${bgColor};
    background-image:
      linear-gradient(${lineColor} 1px, transparent 1px),
      linear-gradient(90deg, ${lineColor} 1px, transparent 1px);
    background-size: 32px 32px;
  `
}

// Mesh gradient - multi-point color mesh with complementary hues
function generateMeshPattern(h: number, s: number, _l: number, dark: boolean): string {
  // Generate complementary and analogous hues
  const h2 = (h + 60) % 360 // Analogous
  const h3 = (h + 180) % 360 // Complementary
  const h4 = (h + 240) % 360 // Split-complementary

  const alpha = dark ? 0.25 : 0.2
  const baseLightness = dark ? 8 : 98
  const accentLightness = dark ? 45 : 60

  const bgColor = dark
    ? `hsl(${h}, ${Math.max(s - 50, 5)}%, ${baseLightness}%)`
    : `hsl(${h}, ${Math.max(s - 40, 10)}%, ${baseLightness}%)`

  // Create soft gradient blobs
  const color1 = `hsla(${h}, ${s}%, ${accentLightness}%, ${alpha})`
  const color2 = `hsla(${h2}, ${Math.max(s - 10, 40)}%, ${accentLightness}%, ${alpha * 0.85})`
  const color3 = `hsla(${h3}, ${Math.max(s - 20, 30)}%, ${accentLightness}%, ${alpha * 0.7})`
  const color4 = `hsla(${h4}, ${Math.max(s - 15, 35)}%, ${accentLightness}%, ${alpha * 0.8})`

  return `
    background-color: ${bgColor};
    background-image:
      radial-gradient(at 0% 0%, ${color1} 0px, transparent 50%),
      radial-gradient(at 100% 0%, ${color2} 0px, transparent 50%),
      radial-gradient(at 100% 100%, ${color3} 0px, transparent 50%),
      radial-gradient(at 0% 100%, ${color4} 0px, transparent 50%);
  `
}

// Pattern definitions
export const PATTERNS: PatternDefinition[] = [
  {
    id: 'solid',
    name: 'Solid',
    description: 'Clean accent tint',
    generate: generateSolidPattern,
  },
  {
    id: 'dots',
    name: 'Dots',
    description: 'Subtle polka dot grid',
    generate: generateDotsPattern,
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Clean line grid',
    generate: generateGridPattern,
  },
  {
    id: 'mesh',
    name: 'Mesh',
    description: 'Multi-point color mesh',
    generate: generateMeshPattern,
  },
]

// Get pattern by ID
export function getPattern(id: PatternId): PatternDefinition | undefined {
  return PATTERNS.find((p) => p.id === id)
}

// Generate CSS for a pattern
export function generatePatternCSS(
  patternId: PatternId,
  h: number,
  s: number,
  l: number,
  dark: boolean,
): string {
  const pattern = getPattern(patternId)
  if (!pattern) return ''
  return pattern.generate(h, s, l, dark)
}

// Generate pattern preview (smaller scale for thumbnails)
export function generatePatternPreview(
  patternId: PatternId,
  h: number,
  s: number,
  l: number,
  dark: boolean,
): string {
  const css = generatePatternCSS(patternId, h, s, l, dark)
  // Scale down the background-size for previews
  return css.replace(/background-size:\s*(\d+)px\s+(\d+)px/g, (_, w, h) => {
    return `background-size: ${Math.round(parseInt(w) / 2)}px ${Math.round(parseInt(h) / 2)}px`
  })
}
// Solid pattern - plain accent-tinted background
function generateSolidPattern(h: number, s: number, _l: number, dark: boolean): string {
  const bgColor = dark
    ? `hsl(${h}, ${Math.max(s - 50, 5)}%, 8%)`
    : `hsl(${h}, ${Math.max(s - 40, 10)}%, 98%)`

  return `
    background-color: ${bgColor};
  `
}
