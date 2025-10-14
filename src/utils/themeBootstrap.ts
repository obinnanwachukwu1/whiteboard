import { applyThemeAndAccent, type Accent } from './theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export async function bootstrapTheme() {
  if (typeof window === 'undefined') return

  let theme: 'light' | 'dark' = getSystemTheme()
  let accent: Accent = 'default'

  const settingsApi = (window as any).settings

  if (settingsApi?.get) {
    try {
      const cfg = await settingsApi.get()
      if (cfg?.ok) {
        const data = cfg.data as any
        if (data?.theme === 'light' || data?.theme === 'dark') theme = data.theme
        if (typeof data?.accent === 'string') accent = data.accent as Accent
      }
    } catch {
      // noop: fall back to system theme
    }
  }

  try {
    applyThemeAndAccent(theme, accent)
  } catch {
    // If applyThemeAndAccent fails, fall back to toggling the dark class directly.
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }

  // Ensure the UA respects the chosen color scheme for native UI (scrollbars, form controls, etc.)
  document.documentElement.style.setProperty('color-scheme', theme)
}
