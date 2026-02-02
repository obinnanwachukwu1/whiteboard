import React from 'react'

type Props = {
  name: string
  avatar?: string
  isWin: boolean
  menuOpen: boolean
  onToggle: () => void
  nameBtnRef: React.RefObject<HTMLButtonElement>
}

export const AccountButton: React.FC<Props> = ({
  name,
  avatar,
  isWin,
  menuOpen,
  onToggle,
  nameBtnRef,
}) => {
  return (
    <button
      ref={nameBtnRef}
      className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:[background-color:var(--app-accent-hover)] ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      onClick={onToggle}
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
      <div
        className={`flex flex-col leading-tight ${isWin ? 'items-start text-left' : 'items-end text-right'}`}
      >
        <div className="font-medium text-sm">{name}</div>
      </div>
    </button>
  )
}
