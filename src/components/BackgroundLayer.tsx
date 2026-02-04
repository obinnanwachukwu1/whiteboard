import React, { useMemo } from 'react'
import { generatePatternCSS } from '../utils/patterns'
import type { ThemeSettings, PatternId } from '../utils/theme'
import { ACCENT_PRESETS } from '../utils/theme'

interface BackgroundLayerProps {
  settings: ThemeSettings
}

export function BackgroundLayer({ settings }: BackgroundLayerProps) {
  const { theme, accentPreset, backgroundMode, background } = settings
  const dark = theme === 'dark'

  // Get accent HSL values
  const accentHSL = useMemo(() => {
    if (backgroundMode === 'background' && background.extractedAccent) {
      return background.extractedAccent
    }
    return ACCENT_PRESETS[accentPreset] || ACCENT_PRESETS.slate
  }, [backgroundMode, background.extractedAccent, accentPreset])

  // Generate background styles based on type
  const backgroundStyle = useMemo((): React.CSSProperties => {
    // Pattern background
    if (background.type === 'pattern') {
      // CSS pattern background (default to 'dots' if no patternId)
      const patternId = (background.patternId || 'solid') as PatternId
      const patternCSS = generatePatternCSS(patternId, accentHSL.h, accentHSL.s, accentHSL.l, dark)

      // Parse the CSS string into style properties
      // First normalize whitespace (collapse newlines and multiple spaces)
      const normalizedCSS = patternCSS.replace(/\s+/g, ' ').trim()
      const styles: React.CSSProperties = {}
      const declarations = normalizedCSS.split(';').filter(Boolean)

      for (const decl of declarations) {
        const colonIndex = decl.indexOf(':')
        if (colonIndex === -1) continue

        const prop = decl.slice(0, colonIndex).trim()
        const value = decl.slice(colonIndex + 1).trim()

        if (prop && value) {
          // Convert kebab-case to camelCase
          const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          ;(styles as any)[camelProp] = value
        }
      }

      return styles
    }

    if (background.type === 'image' && background.imageUrl) {
      // Image background
      return {
        backgroundImage: `url(${background.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }

    // Solid color background (default/fallback)
    const baseColor = dark
      ? `hsl(${accentHSL.h}, ${Math.max(accentHSL.s - 50, 5)}%, 8%)`
      : `hsl(${accentHSL.h}, ${Math.max(accentHSL.s - 40, 10)}%, 98%)`

    return {
      backgroundColor: baseColor,
    }
  }, [background, accentHSL, dark])

  // Image-specific overlay and blur
  const showImageEffects = background.type === 'image' && background.imageUrl
  const blurAmount = showImageEffects ? background.blur : 0
  const overlayOpacity = showImageEffects ? background.overlay / 100 : 0

  // For images, we also adjust overall opacity
  const imageOpacity = showImageEffects ? background.opacity / 100 : 1

  return (
    <>
      {/* Base background layer - z-0, content will be above at z-10 */}
      <div
        data-bg-layer="base"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          ...backgroundStyle,
          opacity: imageOpacity,
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
          // Keep a slight zoom for images
          transform: showImageEffects ? 'scale(1.05)' : undefined,
        }}
        aria-hidden="true"
      />

      {/* Overlay tint layer (for images) */}
      {showImageEffects && overlayOpacity > 0 && (
        <div
          data-bg-layer="overlay"
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            backgroundColor: dark
              ? `rgba(0, 0, 0, ${overlayOpacity})`
              : `rgba(255, 255, 255, ${overlayOpacity})`,
          }}
          aria-hidden="true"
        />
      )}
    </>
  )
}

// Hook to get current theme settings from context or config
export function useBackgroundSettings(): ThemeSettings | null {
  const [settings, setSettings] = React.useState<ThemeSettings | null>(null)

  React.useEffect(() => {
    let mounted = true

    async function loadSettings() {
      try {
        const cfg = await window.settings.get?.()
        if (!mounted || !cfg?.ok) return

        const data = cfg.data as any
        const themeConfig = data?.themeConfig

        if (themeConfig) {
          setSettings(themeConfig)
        } else {
          // Build from legacy settings
          const theme = data?.theme || 'light'
          const accent = data?.accent || 'default'

          // Map legacy accent to preset
          const legacyMap: Record<string, string> = {
            default: 'slate',
            red: 'red',
            orange: 'orange',
            yellow: 'yellow',
            green: 'green',
            blue: 'blue',
            indigo: 'indigo',
            violet: 'violet',
          }

          setSettings({
            theme,
            accentPreset: (legacyMap[accent] || 'slate') as any,
            backgroundMode: 'accent',
            background: {
              type: 'solid',
              blur: 0,
              opacity: 100,
              overlay: 0,
            },
          })
        }
      } catch (e) {
        console.error('Failed to load theme settings:', e)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [])

  return settings
}
