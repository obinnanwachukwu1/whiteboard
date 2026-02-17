import { useState, useCallback } from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, SegmentedControl } from './SettingsRow'
import { ImageDropZone } from './ImageDropZone'
import { PatternPicker } from './PatternPicker'
import {
  applyThemeTokens,
  getPresetSwatchColor,
  ACCENT_PRESETS,
  type ThemeSettings,
  type AccentPreset,
  type PatternId,
} from '../../utils/theme'
import { extractAccentColor } from '../../utils/colorExtraction'
import { useAppData, useAppPreferences } from '../../context/AppContext'

// Group presets by color family for better organization
const PRESET_GROUPS: { label: string; presets: AccentPreset[] }[] = [
  { label: 'Neutral', presets: ['neutral'] },
  { label: 'Warm', presets: ['red', 'orange', 'amber', 'yellow'] },
  { label: 'Nature', presets: ['green', 'teal'] },
  { label: 'Cool', presets: ['cyan', 'blue', 'indigo'] },
  { label: 'Vibrant', presets: ['violet', 'pink'] },
]

export function AppearanceSettings() {
  const data = useAppData()
  const { themeSettings: settings } = useAppPreferences()
  const [isExtracting, setIsExtracting] = useState(false)
  const DEFAULT_IMAGE_BLUR = 12

  // Save and apply settings
  const saveSettings = useCallback(
    async (newSettings: ThemeSettings) => {
      applyThemeTokens(newSettings)

      // Dispatch event so other components (like BackgroundLayer) can update
      window.dispatchEvent(new CustomEvent('theme-settings-changed', { detail: newSettings }))

      try {
        // Save to global config
        await window.settings.set?.({ themeConfig: newSettings } as any)

        // Also save to per-user settings if we have a user
        const userKey = data?.profile?.id ? `${data.baseUrl}|${data.profile.id}` : null
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
    },
    [data],
  )

  // Theme toggle
  const handleThemeChange = useCallback(
    (theme: 'light' | 'dark') => {
      saveSettings({ ...settings, theme })
    },
    [settings, saveSettings],
  )

  // Accent preset change
  const handleAccentChange = useCallback(
    (preset: AccentPreset) => {
      saveSettings({
        ...settings,
        accentPreset: preset,
        // When changing accent in background mode, clear extracted color
        background: {
          ...settings.background,
          extractedAccent: undefined,
        },
      })
    },
    [settings, saveSettings],
  )

  const handleBackgroundTypeChange = useCallback(
    (type: 'color' | 'image') => {
      if (type === 'image') {
        const blur = settings.background.blur > 0 ? settings.background.blur : DEFAULT_IMAGE_BLUR
        saveSettings({
          ...settings,
          backgroundMode: 'background',
          background: {
            ...settings.background,
            type: 'image',
            imageUrl: settings.background.imageUrl,
            extractedAccent: settings.background.extractedAccent,
            blur,
            opacity: 100,
            overlay: 0,
          },
        })
        return
      }

      const nextPattern = settings.background.patternId || 'solid'
      saveSettings({
        ...settings,
        backgroundMode: 'accent',
        background: {
          ...settings.background,
          type: 'pattern',
          patternId: nextPattern,
          imageUrl: undefined,
          extractedAccent: undefined,
          blur: 0,
          opacity: 100,
          overlay: 0,
        },
      })
    },
    [settings, saveSettings],
  )

  // Pattern selection
  const handlePatternSelect = useCallback(
    (patternId: PatternId) => {
      saveSettings({
        ...settings,
        background: {
          ...settings.background,
          type: 'pattern',
          patternId,
        },
      })
    },
    [settings, saveSettings],
  )

  // Image selection
  const handleImageSelect = useCallback(
    async (imageUrl: string) => {
      setIsExtracting(true)

      try {
        // Extract accent color from the image
        const extractedAccent = await extractAccentColor(imageUrl)

        saveSettings({
          ...settings,
          background: {
            ...settings.background,
            type: 'image',
            imageUrl,
            extractedAccent,
            blur: settings.background.blur > 0 ? settings.background.blur : DEFAULT_IMAGE_BLUR,
            opacity: 100,
            overlay: 0,
          },
        })
      } catch (e) {
        console.error('Failed to extract color:', e)
        // Still save the image even if extraction fails
        saveSettings({
          ...settings,
          background: {
            ...settings.background,
            type: 'image',
            imageUrl,
            blur: settings.background.blur > 0 ? settings.background.blur : DEFAULT_IMAGE_BLUR,
            opacity: 100,
            overlay: 0,
          },
        })
      } finally {
        setIsExtracting(false)
      }
    },
    [settings, saveSettings],
  )

  // Image removal
  const handleImageRemove = useCallback(() => {
    saveSettings({
      ...settings,
      background: {
        ...settings.background,
        type: 'pattern',
        patternId: settings.background.patternId || 'solid',
        imageUrl: undefined,
        extractedAccent: undefined,
        blur: 0,
        opacity: 100,
        overlay: 0,
      },
    })
  }, [settings, saveSettings])

  // Image controls
  const BLUR_OPTIONS = [
    { value: 'none', label: 'None', amount: 0 },
    { value: 'light', label: 'Light', amount: 6 },
    { value: 'moderate', label: 'Moderate', amount: 12 },
    { value: 'heavy', label: 'Heavy', amount: 20 },
  ] as const

  const blurChoice = (() => {
    const blur = settings.background.blur
    if (blur <= 0) return 'none'
    if (blur <= 8) return 'light'
    if (blur <= 16) return 'moderate'
    return 'heavy'
  })()

  const handleBlurChoiceChange = useCallback(
    (value: (typeof BLUR_OPTIONS)[number]['value']) => {
      const option = BLUR_OPTIONS.find((o) => o.value === value)
      if (!option) return
      saveSettings({
        ...settings,
        background: { ...settings.background, blur: option.amount },
      })
    },
    [settings, saveSettings],
  )

  const dark = settings.theme === 'dark'
  const isImageBackground = settings.background.type === 'image'
  const backgroundChoice = isImageBackground ? 'image' : 'color'

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
          value={backgroundChoice}
          onChange={handleBackgroundTypeChange}
          options={[
            { value: 'color', label: 'Color' },
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
                    ${
                      settings.accentPreset === preset
                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
                        : ''
                    }
                  `}
                  style={{
                    backgroundColor: getPresetSwatchColor(preset, dark),
                    ...(preset === 'neutral' && !dark
                      ? { boxShadow: 'inset 0 0 0 1px rgb(148 163 184 / 0.55)' }
                      : undefined),
                  }}
                />
              )),
            )}
          </div>
        </SettingsRow>
      )}

      {/* Pattern Picker */}
      {backgroundChoice === 'color' && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <PatternPicker
            selected={settings.background.patternId || 'solid'}
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
              <SettingsRow label="Blur" indent>
                <SegmentedControl
                  value={blurChoice}
                  onChange={handleBlurChoiceChange}
                  options={BLUR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </SettingsRow>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  )
}
