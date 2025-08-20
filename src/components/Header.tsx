import React, { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Sun, Moon } from 'lucide-react'

type Props = {
  profile?: any | null
}

export const Header: React.FC<Props> = ({ profile }) => {
  const name = profile?.short_name || profile?.name || 'Canvas Desk'
  const avatar = profile?.avatar_url
  const [dark, setDark] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      const cfg = await window.settings.get?.()
      const isDark = cfg?.ok && cfg.data?.theme === 'dark'
      const hasSystemDarkPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
      const shouldBeDark = isDark || (!cfg?.ok && hasSystemDarkPreference)
      
      document.documentElement.classList.toggle('dark', shouldBeDark)
      setDark(shouldBeDark)
    })()
  }, [])

  const toggleTheme = async () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    await window.settings.set?.({ theme: next ? 'dark' : 'light' })
  }

  // Update CSS custom property based on dark mode
  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.style.setProperty('--app-accent-bg', 'rgb(15 23 42 / 0.8)')
    } else {
      root.style.setProperty('--app-accent-bg', 'rgb(255 255 255 / 0.8)')
    }
  }, [dark])

  return (
    <header
      className="h-14 backdrop-blur text-slate-900 dark:text-slate-100 flex items-center justify-between px-5 select-none app-drag titlebar-left-inset"
      style={{
        backgroundColor: 'var(--app-accent-bg)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand/10 text-brand">CD</div>
        <div className="font-semibold tracking-tight">Canvas Desk</div> */}
      </div>
      <div className="flex items-center gap-3 app-no-drag">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-pressed={dark} title="Toggle theme">
          {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </Button>
        {avatar && (
          <img
            className="w-8 h-8 rounded-full ring-2 ring-black/5 dark:ring-white/10 transition-transform duration-200 hover:scale-[1.03]"
            src={avatar}
            alt={name}
          />
        )}
        <div className="flex flex-col leading-tight items-end">
          <div className="font-medium text-sm">{name}</div>
          {profile?.primary_email && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{profile.primary_email}</div>
          )}
        </div>
      </div>
    </header>
  )
}
