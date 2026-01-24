import React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  padding?: 'none' | 'default' | 'doc'
  toolbar?: React.ReactNode
  contentRef?: React.Ref<HTMLDivElement>
}

/**
 * Shared viewer frame for non-PDF renderers.
 * Enforces a flex/overflow contract so scrollbars appear reliably.
 */
export const ViewerFrame: React.FC<Props> = ({
  children,
  className = '',
  contentClassName = '',
  padding = 'default',
  toolbar,
  contentRef,
}) => {
  const paddingClass =
    padding === 'none'
      ? ''
      : padding === 'doc'
        ? 'px-8 py-10 lg:px-12'
        : 'p-4'

  const toolbarPadClass = toolbar ? 'pb-28' : ''

  return (
    <div className={`relative flex flex-col h-full min-h-0 overflow-hidden bg-gray-100 dark:bg-neutral-800 ${className}`}>
      <div
        ref={contentRef}
        className={`flex-1 min-h-0 overflow-auto ${paddingClass} ${toolbarPadClass} ${contentClassName}`}
      >
        {children}
      </div>

      {toolbar ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          {toolbar}
        </div>
      ) : null}
    </div>
  )
}

export default ViewerFrame
