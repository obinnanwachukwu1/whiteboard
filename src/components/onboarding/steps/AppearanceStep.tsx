import { useCallback, useState } from 'react'
import type { StepProps } from '../OnboardingWizard'
import { useAppPreferences, useAppData } from '../../../context/AppContext'
import {
  applyThemeTokens,
  getPresetSwatchColor,
  ACCENT_PRESETS,
  type AccentPreset,
} from '../../../utils/theme'

const DEFAULT_ACCENTS: AccentPreset[] = [
  'neutral',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'violet',
]
const ALL_ACCENTS: AccentPreset[] = [
  ...DEFAULT_ACCENTS,
  'amber',
  'teal',
  'indigo',
  'pink',
]

const THEME_OPTIONS: Array<{
  value: 'light' | 'dark'
  label: string
}> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function AppearanceStep(_props: StepProps) {
  const data = useAppData()
  const { themeSettings: settings } = useAppPreferences()
  const [showAllAccents, setShowAllAccents] = useState(false)

  const saveSettings = useCallback(
    async (newSettings: typeof settings) => {
      applyThemeTokens(newSettings)
      window.dispatchEvent(new CustomEvent('theme-settings-changed', { detail: newSettings }))
      try {
        await window.settings.set?.({ themeConfig: newSettings } as any)
        const userKey = data?.profile?.id ? `${data.baseUrl}|${data.profile.id}` : null
        if (userKey) {
          const cfg = await window.settings.get?.()
          const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
          const cur = map[userKey] || {}
          map[userKey] = { ...cur, themeConfig: newSettings }
          await window.settings.set?.({ userSettings: map })
        }
      } catch {}
    },
    [data],
  )

  const handleThemeChange = useCallback(
    (theme: 'light' | 'dark') => {
      saveSettings({ ...settings, theme })
    },
    [settings, saveSettings],
  )

  const handleAccentChange = useCallback(
    (preset: AccentPreset) => {
      saveSettings({
        ...settings,
        accentPreset: preset,
        background: { ...settings.background, extractedAccent: undefined },
      })
    },
    [settings, saveSettings],
  )

  const dark = settings.theme === 'dark'
  const selectedAccentPreset = (settings.accentPreset ?? 'neutral') as AccentPreset
  const accentChoices = showAllAccents ? ALL_ACCENTS : DEFAULT_ACCENTS

  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="text-center mb-8">
        <h2 className="animate-oobe-fade-up text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Pick your look
        </h2>
        <p className="animate-oobe-fade-up-1 mt-2 text-sm md:text-base text-slate-500 dark:text-neutral-400">
          Choose a theme and accent. Updates apply immediately.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <section className="animate-oobe-fade-up-1">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Theme
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {THEME_OPTIONS.map((option) => {
                const active = settings.theme === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`rounded-xl p-4 text-left ring-1 transition-all duration-150 ${
                      active
                        ? 'ring-2 ring-[var(--accent-primary)] bg-white/90 dark:bg-neutral-800/90 shadow-sm'
                        : 'ring-gray-200 dark:ring-neutral-700 bg-white/60 dark:bg-neutral-800/60 hover:ring-gray-300 dark:hover:ring-neutral-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {option.value === 'light' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        )}
                        {option.label}
                      </p>
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          active
                            ? 'text-white'
                            : 'bg-slate-200 dark:bg-neutral-700 text-slate-500 dark:text-neutral-400'
                        }`}
                        style={active ? { backgroundColor: 'var(--accent-primary)' } : undefined}
                      >
                        {active ? '✓' : ''}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="animate-oobe-fade-up-2 rounded-2xl bg-white/60 dark:bg-neutral-900/60 ring-1 ring-gray-200/60 dark:ring-neutral-700/60 p-5 md:p-6">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Accent
            </p>

            <div className="mt-4 grid w-full grid-cols-4 sm:grid-cols-8 place-items-center gap-x-2.5 gap-y-3">
              {accentChoices.map((preset) => {
                const active = selectedAccentPreset === preset
                const activeCheckClass = dark ? 'text-white' : 'text-slate-900'
                return (
                  <button
                    key={preset}
                    onClick={() => handleAccentChange(preset)}
                    aria-label={`Use ${ACCENT_PRESETS[preset].name} accent`}
                    className={`relative h-8 w-8 rounded-full transition-all duration-150 ring-1 ring-black/10 dark:ring-white/10 hover:scale-105 ${
                      active
                        ? 'ring-2 ring-offset-2 ring-offset-[var(--glass-bg)] ring-slate-900 dark:ring-white scale-105'
                        : ''
                    }`}
                    style={{
                      backgroundColor: getPresetSwatchColor(preset, dark),
                      ...(preset === 'neutral' && !dark
                        ? { boxShadow: 'inset 0 0 0 1px rgb(148 163 184 / 0.55)' }
                        : undefined),
                    }}
                  >
                    {active && (
                      <span className={`absolute inset-0 grid place-items-center text-[10px] font-semibold ${activeCheckClass}`}>
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAllAccents((value) => !value)}
                className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
              >
                {showAllAccents ? 'Fewer colors' : 'More colors'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
