import React from 'react'
import { useAppContext } from '../context/AppContext'
import { applyThemeAndAccent, computeAccentBg, type Accent } from '../utils/theme'
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

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try { const cfg = await window.settings.get?.(); if (mounted && cfg?.ok) { const a = (cfg.data as any)?.accent as Accent | undefined; if (a) setAccent(a) } } catch {}
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
      } catch {}
    })()
    return () => { mounted = false }
  }, [userKey])

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
        </div>
      </section>

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
