import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle, ActionButton } from './SettingsRow'
import { useAppFlags, useAppSettings } from '../../context/AppContext'
import { Loader2, Database, HardDrive } from 'lucide-react'

export function AdvancedSettings() {
  const queryClient = useQueryClient()
  const {
    embeddingsEnabled,
    prefetchEnabled,
    reduceEffectsEnabled,
    externalEmbedsEnabled,
    externalMediaEnabled,
    privateModeEnabled,
    verbose,
  } = useAppFlags()
  const {
    setPrefetchEnabled,
    setReduceEffectsEnabled,
    setExternalEmbedsEnabled,
    setExternalMediaEnabled,
    setVerbose,
  } = useAppSettings()

  const privateDisabledReason = privateModeEnabled
    ? 'Disabled because Private Mode is on.'
    : undefined

  const [rebuildingEmbeddings, setRebuildingEmbeddings] = React.useState(false)
  const [aiStatus, setAiStatus] = React.useState<{
    itemCount: number
    memoryUsedMB: number
    memoryLimitMB: number
  } | null>(null)
  const [storageStats, setStorageStats] = React.useState<{
    totalEntries: number
    totalBytes: number
  } | null>(null)

  // Poll AI status when enabled
  React.useEffect(() => {
    if (!window.embedding || !embeddingsEnabled) return

    const fetchStatus = async () => {
      try {
        const res = await window.embedding.getStatus()
        if (res.ok && res.data) {
          setAiStatus(res.data)
        }
        const statsRes = await window.embedding.getStorageStats?.()
        if (statsRes?.ok && statsRes.data) {
          setStorageStats(statsRes.data)
        }
      } catch {}
    }

    fetchStatus()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [embeddingsEnabled])

  const onClearCache = async () => {
    if (
      !window.confirm(
        'This will clear local cached data (including drafts, offline cache, and Deep Search index) and force a full reload. Continue?',
      )
    )
      return
    try {
      try {
        await window.embedding?.clear?.()
      } catch {}

      try {
        await window.system?.clearTempCache?.()
      } catch {}

      try {
        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k) keys.push(k)
        }
        for (const k of keys) {
          if (
            k === 'kanbanStatusByAssignment' ||
            k === 'whiteboard:read-announcements' ||
            k === 'whiteboard:dashboard-settings' ||
            k === 'whiteboard_tab_usage' ||
            k === 'wb-theme-cache-v1' ||
            k === 'app-theme' ||
            k.startsWith('whiteboard-draft-')
          ) {
            localStorage.removeItem(k)
          }
        }
      } catch {}

      await window.settings.set?.({
        queryCache: undefined,
        cachedCourses: undefined,
        cachedDue: undefined,
        courseImages: undefined,
      })
      queryClient.clear()
      window.location.reload()
    } catch {}
  }

  const onRebuildEmbeddings = async () => {
    if (!window.embedding) {
      window.alert('Deep Search is not available in this build.')
      return
    }
    if (!window.confirm('This will clear and rebuild the Deep Search index. Continue?')) return
    setRebuildingEmbeddings(true)
    try {
      await window.embedding.clear()
      window.location.reload()
    } catch {
      setRebuildingEmbeddings(false)
    }
  }

  return (
    <SettingsSection title="Advanced">
      <SettingsRow
        label="Prefetch Data"
        description="Speed up navigation by preloading courses"
        disabled={privateModeEnabled}
        disabledReason={privateDisabledReason}
      >
        <Toggle
          checked={prefetchEnabled}
          onChange={setPrefetchEnabled}
          disabled={privateModeEnabled}
        />
      </SettingsRow>

      <SettingsRow
        label="Reduce Effects"
        description="Disable translucency, shadows, and most transitions for smoother UI"
      >
        <Toggle
          checked={reduceEffectsEnabled}
          onChange={setReduceEffectsEnabled}
        />
      </SettingsRow>

      <SettingsRow
        label="Allow External Embeds"
        description="Enable embedded iframes from non-Canvas sites inside rich content (less private)"
      >
        <Toggle checked={externalEmbedsEnabled} onChange={setExternalEmbedsEnabled} />
      </SettingsRow>

      <SettingsRow
        label="Allow External Media"
        description="Show images/audio/video from non-Canvas sites inside rich content (may allow tracking)"
      >
        <Toggle checked={externalMediaEnabled} onChange={setExternalMediaEnabled} />
      </SettingsRow>

      <SettingsRow
        label="Verbose Logging"
        description="Log Canvas API rate headers to console"
      >
        <Toggle
          checked={verbose}
          onChange={setVerbose}
        />
      </SettingsRow>

      {/* Index Status (only when Deep Search enabled) */}
      {embeddingsEnabled && aiStatus && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Index Status
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{aiStatus.itemCount}</span>
              <span className="text-slate-500">items</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(aiStatus.memoryUsedMB)}</span>
              <span className="text-slate-500">MB</span>
            </div>
            {storageStats && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>{(storageStats.totalBytes / 1024 / 1024).toFixed(1)} / 100 MB</span>
              </div>
            )}
          </div>
        </div>
      )}

      {embeddingsEnabled && (
        <SettingsRow
          label="Rebuild Index"
          description="Fixes missing or stale search results"
        >
          <ActionButton onClick={onRebuildEmbeddings} disabled={rebuildingEmbeddings}>
            {rebuildingEmbeddings ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Rebuilding...
              </span>
            ) : (
              'Rebuild'
            )}
          </ActionButton>
        </SettingsRow>
      )}

      <SettingsRow
        label="Clear Cache"
        description="Remove offline data to fix sync issues"
      >
        <ActionButton variant="danger" onClick={onClearCache}>
          Clear Data
        </ActionButton>
      </SettingsRow>
    </SettingsSection>
  )
}
