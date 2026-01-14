import { useState, useCallback, useEffect } from 'react'

/**
 * Dashboard settings hook for managing user preferences.
 * Persists settings to localStorage.
 */

const STORAGE_KEY = 'whiteboard:dashboard-settings'

export type TimeHorizon = 3 | 7 | 14 | 30

export type DashboardSettings = {
  /** Number of days to look ahead for priority items */
  timeHorizon: TimeHorizon
  /** Show submitted assignments in priority list */
  showSubmitted: boolean
  /** Maximum priority items to show */
  maxPriorityItems: number
}

const DEFAULT_SETTINGS: DashboardSettings = {
  timeHorizon: 7,
  showSubmitted: false,
  maxPriorityItems: 5,
}

/**
 * Load settings from localStorage.
 */
function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS
    
    const parsed = JSON.parse(stored)
    
    // Validate and merge with defaults
    return {
      timeHorizon: validateTimeHorizon(parsed.timeHorizon) ?? DEFAULT_SETTINGS.timeHorizon,
      showSubmitted: typeof parsed.showSubmitted === 'boolean' 
        ? parsed.showSubmitted 
        : DEFAULT_SETTINGS.showSubmitted,
      maxPriorityItems: typeof parsed.maxPriorityItems === 'number' && parsed.maxPriorityItems > 0
        ? parsed.maxPriorityItems
        : DEFAULT_SETTINGS.maxPriorityItems,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Save settings to localStorage.
 */
function saveSettings(settings: DashboardSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Validate that a value is a valid TimeHorizon.
 */
function validateTimeHorizon(value: unknown): TimeHorizon | null {
  if (value === 3 || value === 7 || value === 14 || value === 30) {
    return value
  }
  return null
}

/**
 * Hook for managing dashboard settings.
 */
export function useDashboardSettings() {
  const [settings, setSettingsState] = useState<DashboardSettings>(loadSettings)
  
  // Sync with localStorage on mount (handles multi-tab scenarios)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSettingsState(loadSettings())
      }
    }
    
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  
  const setSettings = useCallback((updates: Partial<DashboardSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates }
      saveSettings(next)
      return next
    })
  }, [])
  
  const setTimeHorizon = useCallback((horizon: TimeHorizon) => {
    setSettings({ timeHorizon: horizon })
  }, [setSettings])
  
  const setShowSubmitted = useCallback((show: boolean) => {
    setSettings({ showSubmitted: show })
  }, [setSettings])
  
  const setMaxPriorityItems = useCallback((max: number) => {
    setSettings({ maxPriorityItems: Math.max(1, Math.min(20, max)) })
  }, [setSettings])
  
  const resetToDefaults = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
  }, [])
  
  return {
    settings,
    setSettings,
    setTimeHorizon,
    setShowSubmitted,
    setMaxPriorityItems,
    resetToDefaults,
    
    // Convenience accessors
    timeHorizon: settings.timeHorizon,
    showSubmitted: settings.showSubmitted,
    maxPriorityItems: settings.maxPriorityItems,
  }
}

/**
 * Time horizon options for dropdown.
 */
export const TIME_HORIZON_OPTIONS: { value: TimeHorizon; label: string }[] = [
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
]
