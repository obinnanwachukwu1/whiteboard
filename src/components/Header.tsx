import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './ui/Button'
import { Sun, Moon } from 'lucide-react'
import { applyThemeAndAccent, type Accent } from '../utils/theme'
import { useAppContext } from '../context/AppContext'

type Props = {
  profile?: any | null
}

export const Header: React.FC<Props> = ({ profile }) => {
  const navigate = useNavigate()
  const app = useAppContext()
  const name = profile?.short_name || profile?.name || 'Whiteboard'
  const avatar = profile?.avatar_url
  const [dark, setDark] = useState<boolean>(false)
  const [accent, setAccent] = useState<Accent>('default')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const nameBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    ;(async () => {
      const cfg = await window.settings.get?.()
      const userKey = app?.profile?.id ? `${app.baseUrl}|${app.profile.id}` : null
      const us = (cfg?.ok && userKey) ? (cfg.data as any)?.userSettings?.[userKey] : undefined
      const isDark = (us?.theme || cfg?.data?.theme) === 'dark'
      const hasSystemDarkPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
      const shouldBeDark = (us?.theme || cfg?.data?.theme) ? isDark : hasSystemDarkPreference
      const acc = (us?.accent ?? (cfg?.ok ? (cfg.data as any)?.accent : undefined)) as Accent | undefined
      if (acc) setAccent(acc)
      applyThemeAndAccent(shouldBeDark ? 'dark' : 'light', acc || 'default')
      setDark(shouldBeDark)
    })()
  }, [app?.profile?.id, app?.baseUrl])

  const toggleTheme = async () => {
    const next = !dark
    setDark(next)
    // pull latest accent from settings in case it changed in Settings page
    let acc: Accent = accent
    try {
      const cfg = await window.settings.get?.();
      const userKey = app?.profile?.id ? `${app.baseUrl}|${app.profile.id}` : null
      const us = (cfg?.ok && userKey) ? (cfg.data as any)?.userSettings?.[userKey] : undefined
      if (us?.accent) acc = us.accent as Accent
      else if (cfg?.ok && (cfg.data as any)?.accent) acc = (cfg.data as any).accent as Accent
    } catch {}
    setAccent(acc)
    applyThemeAndAccent(next ? 'dark' : 'light', acc)
    try {
      const cfg = await window.settings.get?.();
      const userKey = app?.profile?.id ? `${app.baseUrl}|${app.profile.id}` : null
      if (userKey) {
        const map = (cfg?.ok ? (cfg.data as any)?.userSettings : undefined) || {}
        const cur = map[userKey] || {}
        map[userKey] = { ...cur, theme: next ? 'dark' : 'light', accent: acc }
        await window.settings.set?.({ userSettings: map })
      } else {
        await window.settings.set?.({ theme: next ? 'dark' : 'light', accent: acc })
      }
    } catch {}
  }
  // Keep CSS var in sync if accent state changes elsewhere
  useEffect(() => {
    applyThemeAndAccent(dark ? 'dark' : 'light', accent)
  }, [accent, dark])

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return
    // defer visible flag to enable enter transition
    const raf = requestAnimationFrame(() => setMenuVisible(true))
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target) && nameBtnRef.current && !nameBtnRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); setMenuVisible(false); document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const onSignOut = async () => {
    const ok = window.confirm('Sign out of Canvas? You can reconnect later. Your local layout and preferences remain saved.')
    if (!ok) return
    setMenuOpen(false)
    await app.onSignOut()
  }

  const onCopyEmail = async () => {
    const email = profile?.primary_email
    if (!email) return
    try { await navigator.clipboard.writeText(email) } catch {}
    setMenuOpen(false)
  }

  return (
    <header
      className="h-14 backdrop-blur text-slate-900 dark:text-slate-100 flex items-center justify-between px-5 select-none app-drag titlebar-left-inset relative z-[100]"
      style={{
        backgroundColor: 'var(--app-accent-bg)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand/10 text-brand">WB</div>
        <div className="font-semibold tracking-tight">Whiteboard</div> */}
      </div>
      <div className="flex items-center gap-3 app-no-drag relative">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-pressed={dark} title="Toggle theme">
          {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </Button>
        <button
          ref={nameBtnRef}
          className="group inline-flex items-center gap-2 rounded-md px-2 py-1 -mr-1 hover:[background-color:var(--app-accent-hover)] ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Account menu"
        >
          {avatar && (
            <img
              className="w-8 h-8 rounded-full ring-2 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:scale-[1.03]"
              src={avatar}
              alt={name}
            />
          )}
          <div className="flex flex-col leading-tight items-end text-right">
            <div className="font-medium text-sm">{name}</div>
            {profile?.primary_email && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{profile.primary_email}</div>
            )}
          </div>
        </button>

        {menuOpen && (
          <>
            {/* click-catcher to ensure layering and easy outside-close */}
            <div className="fixed inset-0 z-[105]" aria-hidden onClick={() => setMenuOpen(false)} />
          </>
        )}
        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className={`absolute right-0 top-12 z-[110] min-w-[200px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md overflow-hidden
              transition-all duration-150 ease-out ${menuVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95'}`}
          >
            <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400 border-b border-black/5 dark:border-white/10">
              Signed in as
              <div className="truncate text-slate-800 dark:text-slate-200 text-[11px]">{profile?.primary_email || name}</div>
            </div>
            <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => { setMenuOpen(false); navigate({ to: '/settings' }) }}>
              Settings
            </button>
            <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50" onClick={onCopyEmail} disabled={!profile?.primary_email}>
              Copy email
            </button>
            <button className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
