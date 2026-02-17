import type { AppConfig } from '../config'

export const SHOWCASE_MODE_DISABLED_ERROR =
  'Showcase Mode can only be enabled while running the dev server.'

export function sanitizeShowcaseModeConfig(config: AppConfig, allowed: boolean): AppConfig {
  if (allowed) return config
  if (!config?.showcaseModeEnabled) return config
  return { ...config, showcaseModeEnabled: false }
}

export function isShowcaseModeActive(config: AppConfig | null | undefined, allowed: boolean): boolean {
  if (!allowed) return false
  return Boolean(config?.showcaseModeEnabled)
}
