import React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

/** Small pill-style badge for metadata like file type, item kind, etc. */
export const MetadataBadge: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 text-[10px] font-medium ${className}`}>
      {children}
    </span>
  )
}
