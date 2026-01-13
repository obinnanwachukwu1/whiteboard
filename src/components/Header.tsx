import React, { useEffect, useRef, useState } from 'react'
import { Dropdown } from './ui/Dropdown'
import { useNavigate } from '@tanstack/react-router'
// removed theme toggle button
import { applyThemeAndAccent, type Accent } from '../utils/theme'
import { useAppContext } from '../context/AppContext'
import { Search, Command } from 'lucide-react'
import { InboxButton } from './InboxButton'

type Props = {
  profile?: any | null
  onOpenSearch?: () => void
  onOpenInbox?: () => void
}

export const Header: React.FC<Props> = ({ profile, onOpenSearch, onOpenInbox }) => {
  const navigate = useNavigate()
  const app = useAppContext()
  const name = profile?.short_name || profile?.name || 'Whiteboard'
  const avatar = profile?.avatar_url
  const [dark, setDark] = useState<boolean>(false)
  const [accent, setAccent] = useState<Accent>('default')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const nameBtnRef = useRef<HTMLButtonElement | null>(null)
  // Legacy visibility handler is a no-op now that Dropdown controls animation
  const setMenuVisible = (_visible?: boolean) => {}

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
        {/* Search button */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="group inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:[background-color:var(--app-accent-hover)] ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50 transition-all"
            title="Search (⌘K)"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
        )}
        
        {/* Inbox button */}
        {onOpenInbox && <InboxButton onClick={onOpenInbox} />}
        
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
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">{profile.primary_email}</div>
            )}
          </div>
        </button>

        <Dropdown open={menuOpen} onOpenChange={setMenuOpen} align="right" offsetY={48} anchorEl={nameBtnRef.current}>
          <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-neutral-400 border-b border-black/5 dark:border-white/10">
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
        </Dropdown>
      </div>
    </header>
  )
}
