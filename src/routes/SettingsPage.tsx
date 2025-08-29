import React from 'react'
import { useAppContext } from '../context/AppContext'
import { applyThemeAndAccent, computeAccentBg, type Accent } from '../utils/theme'

export default function SettingsPage() {
  const ctx = useAppContext()
  const [baseUrl, setBaseUrl] = React.useState(ctx.baseUrl)
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState<string | null>(null)
  const [accent, setAccent] = React.useState<Accent>('default')

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try { const cfg = await window.settings.get?.(); if (mounted && cfg?.ok) { const a = (cfg.data as any)?.accent as Accent | undefined; if (a) setAccent(a) } } catch {}
    })()
    return () => { mounted = false }
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
      const cfg = await window.settings.get?.()
      const userKey = ctx?.profile?.id ? `${ctx.baseUrl}|${ctx.profile.id}` : null
      if (userKey) {
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, theme: t }
        await window.settings.set?.({ userSettings: map })
      } else {
        await window.settings.set?.({ theme: t })
      }
    } catch {}
    setSaved('Theme updated')
    setTimeout(() => setSaved(null), 1200)
  }

  const saveAccent = async (a: Accent) => {
    setAccent(a)
    applyThemeAndAccent(theme, a)
    try {
      const cfg = await window.settings.get?.()
      const userKey = ctx?.profile?.id ? `${ctx.baseUrl}|${ctx.profile.id}` : null
      if (userKey) {
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, accent: a }
        await window.settings.set?.({ userSettings: map })
      } else {
        await window.settings.set?.({ accent: a })
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
              {saved && <span className="text-xs text-slate-500 dark:text-slate-400">{saved}</span>}
            </div>
          </label>

          <div className="text-sm">
            <div className="mb-1">Theme</div>
            <div className="inline-flex rounded-md overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-800">
              <button
                className={`px-3 py-1 ${theme === 'light' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-200'}`}
                onClick={() => saveTheme('light')}
              >
                Light
              </button>
              <button
                className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-200'}`}
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
        </div>
      </section>

      {/* Performance */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">Performance</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl">
          <div className="text-sm">
            <div className="mb-0.5">Speed up navigation</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Prefetch course data while browsing</div>
          </div>
          <input className="self-start sm:self-auto" type="checkbox" checked={ctx.prefetchEnabled} onChange={(e) => ctx.setPrefetchEnabled(e.target.checked)} />
        </div>
      </section>

      {/* Account */}
      <section className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-card">
        <h2 className="mt-0 mb-3 text-lg font-semibold">Account</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-3xl">
          <div className="text-sm">
            <div className="font-medium">{ctx.profile?.name || 'Signed in'}</div>
            {ctx.profile?.primary_email && (
              <div className="text-xs text-slate-600 dark:text-slate-400">{ctx.profile.primary_email}</div>
            )}
          </div>
          <button className="self-start sm:self-auto px-3 py-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
    </div>
  )
}
