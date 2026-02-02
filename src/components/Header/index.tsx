import React, { useEffect, useRef, useState } from 'react'
import { useAppActions } from '../../context/AppContext'
import { InboxButton } from '../InboxButton'
import { SearchButton } from './SearchButton'
import { AccountButton } from './AccountButton'
import { AccountMenu } from './AccountMenu'

type Props = {
  profile?: any | null
  onOpenSearch?: () => void
  onOpenInbox?: () => void
}

export const Header: React.FC<Props> = ({ profile, onOpenSearch, onOpenInbox }) => {
  const actions = useAppActions()
  const name = profile?.short_name || profile?.name || 'Whiteboard'
  const avatar = profile?.avatar_url
  const isWin =
    (typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)) ||
    (typeof navigator !== 'undefined' &&
      typeof (navigator as any).platform === 'string' &&
      /^win/i.test((navigator as any).platform))
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const nameBtnRef = useRef<HTMLButtonElement | null>(null)
  const setMenuVisible = (_visible?: boolean) => {}

  useEffect(() => {
    if (!menuOpen) return
    const raf = requestAnimationFrame(() => setMenuVisible(true))
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        nameBtnRef.current &&
        !nameBtnRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      setMenuVisible(false)
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onSignOut = async () => {
    const ok = window.confirm(
      'Sign out of Canvas? You can reconnect later. Your local layout and preferences remain saved.',
    )
    if (!ok) return
    setMenuOpen(false)
    await actions.onSignOut()
  }

  return (
    <header
      className={`h-14 text-slate-900 dark:text-slate-100 flex items-center justify-between select-none app-drag relative z-[100] ${isWin ? 'flex-row-reverse pl-4 titlebar-right-inset' : 'px-5 titlebar-left-inset'}`}
    >
      <div className="flex items-center gap-3" />
      <div className={`flex items-center ${isWin ? 'gap-2' : 'gap-3'} app-no-drag relative`}>
        {!isWin && onOpenSearch && <SearchButton isWin={false} onClick={onOpenSearch} />}
        {!isWin && onOpenInbox && <InboxButton onClick={onOpenInbox} />}
        <AccountButton
          name={name}
          avatar={avatar}
          isWin={isWin}
          menuOpen={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
          nameBtnRef={nameBtnRef}
        />
        {isWin && onOpenInbox && <InboxButton onClick={onOpenInbox} />}
        {isWin && onOpenSearch && <SearchButton isWin onClick={onOpenSearch} />}
        <AccountMenu
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          anchorEl={nameBtnRef.current}
          menuRef={menuRef}
          name={name}
          onOpenSettings={actions.onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}
