import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { applyThemeAndAccent, computeAccentBg, type Accent } from '../utils/theme'
import { Loader2, RefreshCw, HardDrive, Database, Cpu, Bell } from 'lucide-react'

type GpaRow = { min: number; gpa: number }
const defaultGpaMap: GpaRow[] = [
  { min: 93, gpa: 4.0 },
  { min: 90, gpa: 3.7 },
  { min: 87, gpa: 3.3 },
  { min: 83, gpa: 3.0 },
  { min: 80, gpa: 2.7 },
  { min: 77, gpa: 2.3 },
  { min: 73, gpa: 2.0 },
  { min: 70, gpa: 1.7 },
  { min: 67, gpa: 1.3 },
  { min: 60, gpa: 1.0 },
  { min: 0, gpa: 0.0 },
]

export default function SettingsPage() {
  const ctx = useAppContext()
  const { embeddingsEnabled, setEmbeddingsEnabled, aiEnabled, setAiEnabled } = ctx
  const [baseUrl, setBaseUrl] = React.useState(ctx.baseUrl)
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState<string | null>(null)
  const [accent, setAccent] = React.useState<Accent>('default')
  const userKey = React.useMemo(() => {
    const uid = (ctx?.profile as any)?.id
    return ctx?.baseUrl && uid ? `${ctx.baseUrl}|${uid}` : null
  }, [ctx?.baseUrl, (ctx?.profile as any)?.id])

  const [prior, setPrior] = React.useState<{ credits: string; gpa: string }>({ credits: '', gpa: '' })
  const [gpaMap, setGpaMap] = React.useState<GpaRow[]>(defaultGpaMap)
  const [notifSettings, setNotifSettings] = React.useState({
    enabled: true,
    notifyDueAssignments: true,
    notifyNewGrades: true,
    notifyNewAnnouncements: true,
  })

  // AI Status State
  const [aiStatus, setAiStatus] = React.useState<{
    ready: boolean
    modelDownloaded: boolean
    itemCount: number
    memoryUsedMB: number
    memoryLimitMB: number
  } | null>(null)
  const [downloadProgress, setDownloadProgress] = React.useState<{ file: string; percent: number } | null>(null)
  const [storageStats, setStorageStats] = React.useState<{
    totalEntries: number
    totalBytes: number
    byCourse: Record<string, { entries: number; bytes: number }>
    byType: Record<string, { entries: number; bytes: number }>
  } | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try { 
        const cfg = await window.settings.get?.(); 
        if (mounted && cfg?.ok) { 
          const a = (cfg.data as any)?.accent as Accent | undefined; 
          if (a) setAccent(a) 
        } 
      } catch {}
    })()
    return () => { mounted = false }
  }, [])


  // Load per-user GPA settings
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const per = userKey ? (data.userSettings?.[userKey] || {}) : {}
        const gpa = (per?.gpa || data.gpa || {}) as any
        if (!mounted) return
        if (gpa.priorTotals) setPrior({ credits: String(gpa.priorTotals.credits ?? ''), gpa: String(gpa.priorTotals.gpa ?? '') })
        if (Array.isArray(gpa.mapping) && gpa.mapping.length) setGpaMap(
          gpa.mapping
            .map((r: any) => ({ min: Number(r.min ?? 0), gpa: Number(r.gpa ?? 0) }))
            .filter((r: any) => Number.isFinite(r.min) && Number.isFinite(r.gpa))
            .sort((a: any, b: any) => b.min - a.min),
        )

        // Load notifications
        const notif = (data.userSettings?.notifications || {})
        setNotifSettings({
          enabled: notif.enabled ?? true,
          notifyDueAssignments: notif.notifyDueAssignments ?? true,
          notifyNewGrades: notif.notifyNewGrades ?? true,
          notifyNewAnnouncements: notif.notifyNewAnnouncements ?? true,
        })
      } catch {}
    })()
    return () => { mounted = false }
  }, [userKey])

  // AI Status Polling
  React.useEffect(() => {
    if (!window.embedding || !embeddingsEnabled) return

    const fetchStatus = async () => {
      try {
        const res = await window.embedding.getStatus()
        if (res.ok && res.data) {
          setAiStatus(res.data)
        }
        // Also fetch storage stats
        const statsRes = await window.embedding.getStorageStats?.()
        if (statsRes?.ok && statsRes.data) {
          setStorageStats(statsRes.data)
        }
      } catch {}
    }
    
    fetchStatus()
    const timer = setInterval(fetchStatus, 3000)
    
    // Subscribe to download progress
    const cleanup = window.embedding.onDownloadProgress((p: any) => {
      setDownloadProgress({ file: p.file, percent: p.percent })
      // If complete, clear progress after delay
      if (p.percent >= 100) {
        setTimeout(() => setDownloadProgress(null), 1000)
      }
    })

    return () => {
      clearInterval(timer)
      cleanup?.()
    }
  }, [embeddingsEnabled])

  const queryClient = useQueryClient()

  const onClearCache = async () => {
    if (!window.confirm('This will clear all offline data and force a full reload. Continue?')) return
    try {
      await window.settings.set?.({ queryCache: undefined, cachedCourses: undefined, cachedDue: undefined, courseImages: undefined })
      queryClient.clear()
      window.location.reload()
    } catch {}
  }

  const [rebuildingEmbeddings, setRebuildingEmbeddings] = React.useState(false)
  const onRebuildEmbeddings = async () => {
    if (!window.embedding) {
      window.alert('Deep Search is not available in this build.')
      return
    }
    if (!window.confirm('This will clear and rebuild the Deep Search index. Continue?')) return
    setRebuildingEmbeddings(true)
    try {
      await window.embedding.clear()
      // Re-index runs automatically on reload via useGlobalSearch
      window.location.reload()
    } catch {
      setRebuildingEmbeddings(false)
    }
  }

  const persistGpa = React.useCallback(async (partial: Partial<{ priorTotals: { credits: string; gpa: string }; mapping: GpaRow[] }>) => {
    try {
      const cfg = await window.settings.get?.()
      const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
      const map = (data.userSettings || {}) as Record<string, any>
      if (userKey) {
        const cur = map[userKey] || {}
        const nextGpa = { ...(cur.gpa || {}), ...partial }
        map[userKey] = { ...cur, gpa: nextGpa }
        await window.settings.set?.({ userSettings: map })
      } else {
        const nextGpa = { ...(data.gpa || {}), ...partial }
        await window.settings.set?.({ gpa: nextGpa } as any)
      }
    } catch {}
  }, [userKey])

  const persistNotifications = React.useCallback(async (partial: Partial<typeof notifSettings>) => {
    try {
      const cfg = await window.settings.get?.()
      const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
      const currentAll = data.userSettings || {}
      const currentNotif = currentAll.notifications || {}
      const next = { ...currentNotif, ...partial }
      
      await window.settings.set?.({
        userSettings: {
          ...currentAll,
          notifications: next
        }
      })
    } catch {}
  }, [])

  const saveBaseUrl = async () => {
    setSaving(true)
    try {
      await window.settings.set?.({ baseUrl })
      setSaved('Base URL saved')
      setTimeout(() => setSaved(null), 1500)
    } finally {
      setSaving(false)
    }
  }

  const saveTheme = async (t: 'light' | 'dark') => {
    setTheme(t)
    applyThemeAndAccent(t, accent)
    try {
      // Always save to global theme for startup consistency
      await window.settings.set?.({ theme: t })
      
      const cfg = await window.settings.get?.()
      const userKey = ctx?.profile?.id ? `${ctx.baseUrl}|${ctx.profile.id}` : null
      if (userKey) {
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, theme: t }
        await window.settings.set?.({ userSettings: map })
      }
    } catch {}
    setSaved('Theme updated')
    setTimeout(() => setSaved(null), 1200)
  }

  const saveAccent = async (a: Accent) => {
    setAccent(a)
    applyThemeAndAccent(theme, a)
    try {
      // Always save to global accent for startup consistency
      await window.settings.set?.({ accent: a })

      const cfg = await window.settings.get?.()
      const userKey = ctx?.profile?.id ? `${ctx.baseUrl}|${ctx.profile.id}` : null
      if (userKey) {
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, accent: a }
        await window.settings.set?.({ userSettings: map })
      }
    } catch {}
    setSaved('Accent updated')
    setTimeout(() => setSaved(null), 1200)
  }

  const onSignOut = async () => { await ctx.onSignOut() }

  return (
    <div className="space-y-6">
      <h1 className="mt-0 mb-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>

      {/* General */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">General</h2>
        <div className="grid gap-4 w-full max-w-3xl">
          <label className="text-sm">
            <div className="mb-1">Base URL</div>
            <input
              className="w-full rounded border px-2 py-1 bg-white/90 dark:bg-neutral-900"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-50"
                onClick={saveBaseUrl}
                disabled={saving || !baseUrl.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <span className="text-xs text-slate-500 dark:text-neutral-400">{saved}</span>}
            </div>
          </label>

          <div className="text-sm">
            <div className="mb-1">Theme</div>
            <div className="inline-flex rounded-md overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-800">
              <button
                className={`px-3 py-1 ${theme === 'light' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`}
                onClick={() => saveTheme('light')}
              >
                Light
              </button>
              <button
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200'}`}
                onClick={() => saveTheme('dark')}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="text-sm">
            <div className="mb-1">Accent Color</div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'default', label: 'Default' },
                { key: 'red', label: 'Red' },
                { key: 'orange', label: 'Orange' },
                { key: 'yellow', label: 'Yellow' },
                { key: 'green', label: 'Green' },
                { key: 'blue', label: 'Blue' },
                { key: 'indigo', label: 'Indigo' },
                { key: 'violet', label: 'Violet' },
              ] as { key: Accent; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md ring-1 ring-black/10 dark:ring-white/10 hover:opacity-95 transition ${accent === opt.key ? 'outline outline-2 outline-offset-2 outline-black/20 dark:outline-white/20' : ''}`}
                  onClick={() => saveAccent(opt.key)}
                  title={opt.label}
                >
                  <span
                    className="inline-block w-6 h-6 rounded backdrop-blur"
                    style={{ backgroundColor: computeAccentBg(opt.key, theme === 'dark') }}
                  ></span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
            <div className="text-sm">
              <div className="mb-0.5 font-medium text-slate-900 dark:text-slate-100">Deep Search</div>
              <div className="text-xs text-slate-600 dark:text-neutral-400">
                Enables semantic search and embeddings. Required for AI features.
              </div>
            </div>
            <input
              className="self-start sm:self-auto"
              type="checkbox"
              checked={embeddingsEnabled}
              onChange={(e) => { setEmbeddingsEnabled(e.target.checked).catch(() => {}) }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
            <div className="text-sm">
              <div className="mb-0.5 font-medium text-indigo-600 dark:text-indigo-400">Apple Intelligence</div>
              <div className="text-xs text-slate-600 dark:text-neutral-400">
                Enable local AI features (Requires macOS 26.1+). Runs entirely on-device.
              </div>
            </div>
            <input
              className="self-start sm:self-auto toggle"
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => { setAiEnabled(e.target.checked).catch(() => {}) }}
              title={!embeddingsEnabled ? 'Enable Deep Search first' : undefined}
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Notifications
        </h2>
        <div className="grid gap-4 w-full max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm">
              <div className="mb-0.5 font-medium text-slate-900 dark:text-slate-100">Enable Desktop Notifications</div>
              <div className="text-xs text-slate-600 dark:text-neutral-400">
                Receive alerts for important updates.
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifSettings.enabled}
              onChange={(e) => {
                const v = e.target.checked
                setNotifSettings(p => ({ ...p, enabled: v }))
                persistNotifications({ enabled: v })
                if (v && Notification.permission === 'default') Notification.requestPermission()
              }}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-neutral-800 pt-4 grid gap-4 pl-4 opacity-90">
             <div className="flex items-center justify-between gap-2">
               <div className="text-sm text-slate-700 dark:text-slate-300">Due Assignments (24h before)</div>
               <input
                 type="checkbox"
                 checked={notifSettings.notifyDueAssignments}
                 disabled={!notifSettings.enabled}
                 onChange={(e) => {
                   const v = e.target.checked
                   setNotifSettings(p => ({ ...p, notifyDueAssignments: v }))
                   persistNotifications({ notifyDueAssignments: v })
                 }}
               />
             </div>
             <div className="flex items-center justify-between gap-2">
               <div className="text-sm text-slate-700 dark:text-slate-300">New Grades</div>
               <input
                 type="checkbox"
                 checked={notifSettings.notifyNewGrades}
                 disabled={!notifSettings.enabled}
                 onChange={(e) => {
                   const v = e.target.checked
                   setNotifSettings(p => ({ ...p, notifyNewGrades: v }))
                   persistNotifications({ notifyNewGrades: v })
                 }}
               />
             </div>
             <div className="flex items-center justify-between gap-2">
               <div className="text-sm text-slate-700 dark:text-slate-300">New Announcements</div>
               <input
                 type="checkbox"
                 checked={notifSettings.notifyNewAnnouncements}
                 disabled={!notifSettings.enabled}
                 onChange={(e) => {
                   const v = e.target.checked
                   setNotifSettings(p => ({ ...p, notifyNewAnnouncements: v }))
                   persistNotifications({ notifyNewAnnouncements: v })
                 }}
               />
             </div>
          </div>
        </div>
      </section>

      {/* AI Status (if enabled) */}
      {embeddingsEnabled && aiStatus && (
        <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
          <h2 className="mt-0 mb-3 text-lg font-semibold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500" />
            Intelligence Status
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
              <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wide font-medium mb-1">Index Stats</div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-2xl font-semibold text-slate-700 dark:text-slate-200">{aiStatus.itemCount}</span>
                <span className="text-sm text-slate-500">items</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
              <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wide font-medium mb-1">Memory Usage</div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span className="text-2xl font-semibold text-slate-700 dark:text-slate-200">{Math.round(aiStatus.memoryUsedMB)}</span>
                <span className="text-sm text-slate-500">MB / {aiStatus.memoryLimitMB} MB</span>
              </div>
            </div>
          </div>

          {/* Storage Budget */}
          {storageStats && storageStats.totalBytes > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
              <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wide font-medium mb-2">Storage Budget</div>
              
              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (storageStats.totalBytes / (100 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-3">
                <span>{(storageStats.totalBytes / 1024 / 1024).toFixed(1)} MB used</span>
                <span>100 MB limit</span>
              </div>
              
              {/* By type breakdown */}
              {Object.keys(storageStats.byType).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(storageStats.byType).map(([type, { entries }]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        type === 'file' ? 'bg-indigo-500' :
                        type === 'page' ? 'bg-emerald-500' :
                        type === 'assignment' ? 'bg-amber-500' :
                        type === 'announcement' ? 'bg-rose-500' :
                        'bg-slate-400'
                      }`} />
                      <span className="capitalize text-slate-600 dark:text-slate-400">{type}: {entries}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Model Download Progress */}
          {downloadProgress && (
            <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Downloading AI Model...</span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">{Math.round(downloadProgress.percent)}%</span>
              </div>
              <div className="h-1.5 w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 truncate">
                {downloadProgress.file}
              </div>
            </div>
          )}

          {/* Rebuild Action */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">Rebuild Index</div>
              <div className="text-xs text-slate-500">Fixes missing or stale search results</div>
            </div>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-white dark:bg-neutral-800 ring-1 ring-gray-200 dark:ring-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm transition-colors disabled:opacity-50"
              onClick={onRebuildEmbeddings}
              disabled={rebuildingEmbeddings}
            >
              {rebuildingEmbeddings ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {rebuildingEmbeddings ? 'Rebuilding...' : 'Rebuild'}
            </button>
          </div>
        </section>
      )}

      {/* Performance */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">Performance</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl">
          <div className="text-sm">
            <div className="mb-0.5">Speed up navigation</div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Prefetch course data while browsing</div>
          </div>
          <input className="self-start sm:self-auto" type="checkbox" checked={ctx.prefetchEnabled} onChange={(e) => ctx.setPrefetchEnabled(e.target.checked)} />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
          <div className="text-sm">
            <div className="mb-0.5 text-red-600 dark:text-red-400">Clear Cache</div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Fixes sync issues by removing all offline data</div>
          </div>
          <button 
            className="self-start sm:self-auto px-3 py-1.5 rounded bg-white dark:bg-neutral-800 ring-1 ring-gray-200 dark:ring-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm transition-colors"
            onClick={onClearCache}
          >
            Clear Data
          </button>
        </div>
      </section>

      {/* Grades */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">Grades</h2>
        <div className="grid gap-4 w-full max-w-3xl">
          {/* Prior totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="mb-1">Prior Credits</div>
              <input
                className="w-full rounded-control border px-3 py-2 bg-white/90 dark:bg-neutral-900"
                value={prior.credits}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, '')
                  setPrior((p) => { const next = { ...p, credits: v }; persistGpa({ priorTotals: next }); return next })
                }}
                placeholder="e.g. 45"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1">Prior Cumulative GPA</div>
              <input
                className="w-full rounded-control border px-3 py-2 bg-white/90 dark:bg-neutral-900"
                value={prior.gpa}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, '')
                  setPrior((p) => { const next = { ...p, gpa: v }; persistGpa({ priorTotals: next }); return next })
                }}
                placeholder="e.g. 3.65"
              />
            </label>
          </div>

          {/* GPA Mapping */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">GPA Mapping</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80"
                  onClick={() => { setGpaMap(defaultGpaMap); persistGpa({ mapping: defaultGpaMap }) }}
                >Reset</button>
                <button
                  className="px-2 py-1 text-xs rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80"
                  onClick={() => {
                    setGpaMap((prev) => { const next = [...prev, { min: 85, gpa: 3.5 }].sort((a, b) => b.min - a.min); persistGpa({ mapping: next }); return next })
                  }}
                >Add Row</button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 text-[11px] text-slate-600 dark:text-neutral-300 mb-1">
              <div className="col-span-3">≥ Percent</div>
              <div className="col-span-2">GPA</div>
              <div></div>
            </div>
            <div className="space-y-1">
              {gpaMap.slice().sort((a, b) => b.min - a.min).map((row, idx) => (
                <div key={`${idx}-${row.min}-${row.gpa}`} className="grid grid-cols-6 gap-2 items-center">
                  <input
                    className="col-span-3 rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900"
                    value={String(row.min)}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(/[^0-9.]/g, ''))
                      setGpaMap((prev) => {
                        const next = prev.slice(); next[idx] = { ...next[idx], min: Number.isFinite(v) ? v : 0 }; next.sort((a, b) => b.min - a.min)
                        persistGpa({ mapping: next }); return next
                      })
                    }}
                  />
                  <input
                    className="col-span-2 rounded-control border px-2 py-1 text-sm bg-white/90 dark:bg-neutral-900"
                    value={String(row.gpa)}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(/[^0-9.]/g, ''))
                      setGpaMap((prev) => { const next = prev.slice(); next[idx] = { ...next[idx], gpa: Number.isFinite(v) ? v : 0 }; persistGpa({ mapping: next }); return next })
                    }}
                  />
                  <button
                    className="text-xs px-2 py-1 rounded-control ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80"
                    onClick={() => { setGpaMap((prev) => { const next = prev.slice(0, idx).concat(prev.slice(idx + 1)); persistGpa({ mapping: next }); return next }) }}
                  >Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400">These settings drive the Current/Predicted GPA shown on the Grades page.</div>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">Account</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl">
          <div className="text-sm">
            <div className="font-medium">{ctx.profile?.name || 'Signed in'}</div>
            {ctx.profile?.primary_email && (
              <div className="text-xs text-slate-600 dark:text-neutral-400">{ctx.profile.primary_email}</div>
            )}
          </div>
          <button className="self-start sm:self-auto px-3 py-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
    </div>
  )
}
