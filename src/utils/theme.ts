export type Accent = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'

export function computeAccentBg(accent: Accent, dark: boolean): string {
  if (accent === 'default') return dark ? 'rgb(18 18 18 / 0.85)' : 'rgb(255 255 255 / 0.8)'
  if (!dark) {
    // Light mode: complementary light pastels (200s) for a soft glass accent
    switch (accent) {
      case 'red': return 'rgb(254 202 202 / 0.8)' // red-200
      case 'orange': return 'rgb(254 215 170 / 0.8)' // orange-200
      case 'yellow': return 'rgb(254 240 138 / 0.8)' // yellow-200
      case 'green': return 'rgb(187 247 208 / 0.8)' // green-200
      case 'blue': return 'rgb(191 219 254 / 0.8)' // blue-200
      case 'indigo': return 'rgb(199 210 254 / 0.8)' // indigo-200
      case 'violet': return 'rgb(221 214 254 / 0.8)' // violet-200
    }
  } else {
    // Dark mode: darker overlays using 800 tones (deeper, less glow)
    switch (accent) {
      case 'red': return 'rgb(153 27 27 / 0.60)' // red-800
      case 'orange': return 'rgb(154 52 18 / 0.60)' // orange-800
      case 'yellow': return 'rgb(202 138 4 / 0.45)' // yellow-600 (keep yellow hue)
      case 'green': return 'rgb(22 101 52 / 0.60)' // green-800
      case 'blue': return 'rgb(30 64 175 / 0.60)' // blue-800
      case 'indigo': return 'rgb(55 48 163 / 0.60)' // indigo-800
      case 'violet': return 'rgb(91 33 182 / 0.60)' // violet-800
    }
  }
  return dark ? 'rgb(18 18 18 / 0.85)' : 'rgb(255 255 255 / 0.8)'
}

// Solid base background for the app/window surface
export function computeAccentBase(accent: Accent, dark: boolean): string {
  if (accent === 'default') return dark ? 'rgb(18 18 18)' : 'rgb(255 255 255)'
  if (!dark) {
    // Light mode: subtle solid base to complement neutral page (100s)
    switch (accent) {
      case 'red': return 'rgb(254 226 226)' // red-100
      case 'orange': return 'rgb(255 237 213)' // orange-100
      case 'yellow': return 'rgb(254 249 195)' // yellow-100
      case 'green': return 'rgb(220 252 231)' // green-100
      case 'blue': return 'rgb(219 234 254)' // blue-100
      case 'indigo': return 'rgb(224 231 255)' // indigo-100
      case 'violet': return 'rgb(237 233 254)' // violet-100
    }
  } else {
    // Darker solids for dark mode base (800s). Yellow uses 600 to stay yellow.
    switch (accent) {
      case 'red': return 'rgb(153 27 27)' // red-800
      case 'orange': return 'rgb(154 52 18)' // orange-800
      case 'yellow': return 'rgb(202 138 4)' // yellow-600
      case 'green': return 'rgb(22 101 52)' // green-800
      case 'blue': return 'rgb(30 64 175)' // blue-800
      case 'indigo': return 'rgb(55 48 163)' // indigo-800
      case 'violet': return 'rgb(91 33 182)' // violet-800
    }
  }
  return dark ? 'rgb(18 18 18)' : 'rgb(255 255 255)'
}

// Hover shade for sidebar/menu items derived from accent
export function computeAccentHover(accent: Accent, dark: boolean): string {
  if (accent === 'default') return dark ? 'rgb(38 38 38 / 0.9)' : 'rgb(241 245 249 / 0.95)'
  if (!dark) {
    // Light mode: hover slightly darker than pastel base (300s)
    switch (accent) {
      case 'red': return 'rgb(252 165 165 / 0.9)' // red-300
      case 'orange': return 'rgb(253 186 116 / 0.9)' // orange-300
      case 'yellow': return 'rgb(253 224 71 / 0.9)' // yellow-300
      case 'green': return 'rgb(134 239 172 / 0.9)' // green-300
      case 'blue': return 'rgb(147 197 253 / 0.9)' // blue-300
      case 'indigo': return 'rgb(165 180 252 / 0.9)' // indigo-300
      case 'violet': return 'rgb(196 181 253 / 0.9)' // violet-300
    }
  } else {
    // Slightly lighter than base for dark mode (700s vs. 800 base)
    switch (accent) {
      case 'red': return 'rgb(185 28 28 / 0.55)' // red-700
      case 'orange': return 'rgb(194 65 12 / 0.55)' // orange-700
      case 'yellow': return 'rgb(234 179 8 / 0.40)' // yellow-600 (lighter than base)
      case 'green': return 'rgb(21 128 61 / 0.55)' // green-700
      case 'blue': return 'rgb(29 78 216 / 0.55)' // blue-700
      case 'indigo': return 'rgb(67 56 202 / 0.55)' // indigo-700
      case 'violet': return 'rgb(109 40 217 / 0.55)' // violet-700
    }
  }
  return dark ? 'rgb(38 38 38 / 0.9)' : 'rgb(241 245 249 / 0.95)'
}

export function applyThemeAndAccent(theme: 'light' | 'dark', accent: Accent) {
  const dark = theme === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.setProperty('--app-accent-bg', computeAccentBg(accent, dark))
  root.style.setProperty('--app-accent-root', computeAccentBase(accent, dark))
  root.style.setProperty('--app-accent-hover', computeAccentHover(accent, dark))
}
