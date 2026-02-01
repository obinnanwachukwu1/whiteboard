import React from 'react'
import { Dropdown } from '../ui/Dropdown'

type Props = {
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  anchorEl: HTMLButtonElement | null
  menuRef: React.RefObject<HTMLDivElement>
  name: string
  email?: string
  onOpenSettings: () => void
  onCopyEmail: () => void
  onSignOut: () => void
}

export const AccountMenu: React.FC<Props> = ({
  menuOpen,
  setMenuOpen,
  anchorEl,
  menuRef,
  name,
  email,
  onOpenSettings,
  onCopyEmail,
  onSignOut,
}) => {
  return (
    <div ref={menuRef}>
      <Dropdown open={menuOpen} onOpenChange={setMenuOpen} align="right" offsetY={48} anchorEl={anchorEl}>
        <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-neutral-400 border-b border-black/5 dark:border-white/10">
          Signed in as
          <div className="truncate text-slate-800 dark:text-slate-200 text-[11px]">{email || name}</div>
        </div>
        <button
          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => {
            setMenuOpen(false)
            onOpenSettings()
          }}
        >
          Settings
        </button>
        <button
          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          onClick={onCopyEmail}
          disabled={!email}
        >
          Copy email
        </button>
        <button
          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  )
}
