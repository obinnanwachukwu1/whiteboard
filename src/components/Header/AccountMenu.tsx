import React from 'react'
import { Dropdown, DropdownItem, DropdownLabel } from '../ui/Dropdown'

type Props = {
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  anchorEl: HTMLButtonElement | null
  menuRef: React.RefObject<HTMLDivElement>
  name: string
  onOpenSettings: () => void
  onSignOut: () => void
}

export const AccountMenu: React.FC<Props> = ({
  menuOpen,
  setMenuOpen,
  anchorEl,
  menuRef,
  name,
  onOpenSettings,
  onSignOut,
}) => {
  return (
    <div ref={menuRef}>
      <Dropdown
        open={menuOpen}
        onOpenChange={setMenuOpen}
        align="right"
        offsetY={48}
        anchorEl={anchorEl}
      >
        <DropdownLabel>
          Signed in as
          <div className="truncate text-slate-800 dark:text-slate-200 text-[11px]">{name}</div>
        </DropdownLabel>
        <DropdownItem
          onClick={() => {
            setMenuOpen(false)
            onOpenSettings()
          }}
        >
          Settings
        </DropdownItem>
        <DropdownItem onClick={onSignOut} variant="danger">
          Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  )
}
