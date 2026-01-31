import { useState, useEffect, useCallback } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, SegmentedControl } from './SettingsRow'
import { Slider } from './Slider'
import { ImageDropZone } from './ImageDropZone'
import { PatternPicker } from './PatternPicker'
import {
  applyThemeTokens,
  normalizeThemeSettings,
  getPresetSwatchColor,
  ACCENT_PRESETS,
  DEFAULT_THEME_SETTINGS,
  type ThemeSettings,
  type AccentPreset,
  type BackgroundType,
  type PatternId,
} from '../../utils/theme'
import { extractAccentColor } from '../../utils/colorExtraction'
import { useAppContext } from '../../context/AppContext'

// Group presets by color family for better organization
const PRESET_GROUPS: { label: string; presets: AccentPreset[] }[] = [
  { label: 'Neutral', presets: ['slate'] },
  { label: 'Warm', presets: ['red', 'orange', 'amber', 'yellow'] },
  { label: 'Nature', presets: ['lime', 'green', 'emerald', 'teal'] },
  { label: 'Cool', presets: ['cyan', 'sky', 'blue', 'indigo'] },
  { label: 'Vibrant', presets: ['violet', 'purple', 'fuchsia', 'pink', 'rose'] },
]

export function AppearanceSettings() {
  const ctx = useAppContext()
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  const [isExtracting, setIsExtracting] = useState(false)

  // Load saved settings on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        if (!mounted || !cfg?.ok) return

        const data = cfg.data as any

        if (data?.themeConfig) {
          // Use new theme config
          const normalized = normalizeThemeSettings(data.themeConfig)
          if (normalized) {
            setSettings(normalized)
            // Keep cache/tokens in sync with the durable config.
            // (No-op if already applied during bootstrap.)
            applyThemeTokens(normalized)
          } else {
            // If the file has stale/invalid data, fall back to defaults to keep the UI usable.
            setSettings(DEFAULT_THEME_SETTINGS)
          }
        } else {
          // Migrate from legacy settings
          const theme = data?.theme || 'light'
          const legacyAccent = data?.accent || 'default'

          // Map legacy accent to preset
          const legacyMap: Record<string, AccentPreset> = {
            default: 'slate',
            red: 'red',
            orange: 'orange',
            yellow: 'yellow',
            green: 'green',
            blue: 'blue',
            indigo: 'indigo',
            violet: 'violet',
          }

          const newSettings: ThemeSettings = {
            theme,
            accentPreset: legacyMap[legacyAccent] || 'slate',
            backgroundMode: 'accent',
            background: {
              type: 'solid',
              blur: 0,
              opacity: 100,
              overlay: 0,
            },
          }

          setSettings(newSettings)
          // Apply and save the migrated settings
          applyThemeTokens(newSettings)
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // Save and apply settings
  const saveSettings = useCallback(async (newSettings: ThemeSettings) => {
    setSettings(newSettings)
    applyThemeTokens(newSettings)

    // Dispatch event so other components (like BackgroundLayer) can update
    window.dispatchEvent(new CustomEvent('theme-settings-changed', { detail: newSettings }))

    try {
      // Save to global config
      await window.settings.set?.({ themeConfig: newSettings } as any)

      // Also save to per-user settings if we have a user
      const userKey = ctx?.profile?.id ? `${ctx.baseUrl}|${ctx.profile.id}` : null
      if (userKey) {
        const cfg = await window.settings.get?.()
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, themeConfig: newSettings }
        await window.settings.set?.({ userSettings: map })
      }
    } catch (e) {
      console.error('Failed to save theme settings:', e)
    }
  }, [ctx])

  // Theme toggle
  const handleThemeChange = useCallback((theme: 'light' | 'dark') => {
    saveSettings({ ...settings, theme })
  }, [settings, saveSettings])

  // Accent preset change
  const handleAccentChange = useCallback((preset: AccentPreset) => {
    saveSettings({
      ...settings,
      accentPreset: preset,
      // When changing accent in background mode, clear extracted color
      background: {
        ...settings.background,
        extractedAccent: undefined,
      },
    })
  }, [settings, saveSettings])

  // Background type change (solid, pattern, image)
  const handleBackgroundTypeChange = useCallback((type: BackgroundType) => {
    saveSettings({
      ...settings,
      // Set backgroundMode based on type: solid = accent mode, pattern/image = background mode
      backgroundMode: type === 'solid' ? 'accent' : 'background',
      background: {
        ...settings.background,
        type,
        // Clear type-specific settings
        patternId: type === 'pattern' ? (settings.background.patternId || 'dots') : undefined,
        imageUrl: type === 'image' ? settings.background.imageUrl : undefined,
        extractedAccent: type === 'image' ? settings.background.extractedAccent : undefined,
        // Reset image controls for non-image types
        blur: type === 'image' ? settings.background.blur : 0,
        opacity: type === 'image' ? settings.background.opacity : 100,
        overlay: type === 'image' ? settings.background.overlay : 0,
      },
    })
  }, [settings, saveSettings])

  // Pattern selection
  const handlePatternSelect = useCallback((patternId: PatternId) => {
    saveSettings({
      ...settings,
      background: {
        ...settings.background,
        patternId,
      },
    })
  }, [settings, saveSettings])

  // Image selection
  const handleImageSelect = useCallback(async (imageUrl: string) => {
    setIsExtracting(true)

    try {
      // Extract accent color from the image
      const extractedAccent = await extractAccentColor(imageUrl)

      saveSettings({
        ...settings,
        background: {
          ...settings.background,
          imageUrl,
          extractedAccent,
        },
      })
    } catch (e) {
      console.error('Failed to extract color:', e)
      // Still save the image even if extraction fails
      saveSettings({
        ...settings,
        background: {
          ...settings.background,
          imageUrl,
        },
      })
    } finally {
      setIsExtracting(false)
    }
  }, [settings, saveSettings])

  // Image removal
  const handleImageRemove = useCallback(() => {
    saveSettings({
      ...settings,
      background: {
        ...settings.background,
        type: 'solid',
        imageUrl: undefined,
        extractedAccent: undefined,
        blur: 0,
        opacity: 100,
        overlay: 0,
      },
    })
  }, [settings, saveSettings])

  // Image controls
  const handleBlurChange = useCallback((blur: number) => {
    saveSettings({
      ...settings,
      background: { ...settings.background, blur },
    })
  }, [settings, saveSettings])

  const handleOpacityChange = useCallback((opacity: number) => {
    saveSettings({
      ...settings,
      background: { ...settings.background, opacity },
    })
  }, [settings, saveSettings])

  const handleOverlayChange = useCallback((overlay: number) => {
    saveSettings({
      ...settings,
      background: { ...settings.background, overlay },
    })
  }, [settings, saveSettings])

  const dark = settings.theme === 'dark'
  const isImageBackground = settings.background.type === 'image'

  return (
    <SettingsSection title="Appearance">
      {/* Theme Toggle */}
      <SettingsRow label="Theme">
        <SegmentedControl
          value={settings.theme}
          onChange={handleThemeChange}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </SettingsRow>

      {/* Background Type Selection */}
      <SettingsRow label="Background">
        <SegmentedControl
          value={settings.background.type}
          onChange={handleBackgroundTypeChange}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'pattern', label: 'Pattern' },
            { value: 'image', label: 'Image' },
          ]}
        />
      </SettingsRow>

      {/* Accent Color Picker (hidden when image background is selected) */}
      {!isImageBackground && (
        <SettingsRow label="Accent Color">
          <div className="flex flex-wrap items-center gap-1.5 max-w-[200px] justify-end">
            {PRESET_GROUPS.map((group) =>
              group.presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAccentChange(preset)}
                  title={ACCENT_PRESETS[preset].name}
                  className={`
                    w-5 h-5 rounded-full transition-all duration-150
                    ring-1 ring-black/10 dark:ring-white/10
                    hover:scale-110
                    ${settings.accentPreset === preset
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
                      : ''
                    }
                  `}
                  style={{ backgroundColor: getPresetSwatchColor(preset, dark) }}
                />
              ))
            )}
          </div>
        </SettingsRow>
      )}

      {/* Pattern Picker */}
      {settings.background.type === 'pattern' && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <PatternPicker
            selected={settings.background.patternId}
            onSelect={handlePatternSelect}
            accentPreset={settings.accentPreset}
            dark={dark}
          />
        </div>
      )}

      {/* Image Upload */}
      {settings.background.type === 'image' && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 space-y-4">
          <ImageDropZone
            imageUrl={settings.background.imageUrl}
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
            disabled={isExtracting}
          />

          {isExtracting && (
            <p className="text-xs text-slate-500 dark:text-neutral-400 text-center">
              Extracting accent color...
            </p>
          )}

          {/* Image Controls */}
          {settings.background.imageUrl && (
            <div className="space-y-3 pt-2">
              <Slider
                label="Blur"
                value={settings.background.blur}
                onChange={handleBlurChange}
                min={0}
                max={30}
                unit="px"
              />
              <Slider
                label="Opacity"
                value={settings.background.opacity}
                onChange={handleOpacityChange}
                min={10}
                max={100}
                unit="%"
              />
              <Slider
                label="Overlay"
                value={settings.background.overlay}
                onChange={handleOverlayChange}
                min={0}
                max={50}
                unit="%"
              />
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  )
}
