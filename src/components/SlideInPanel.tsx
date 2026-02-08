import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ANIMATION_MS = 260

type Props = {
  isOpen: boolean
  onClose: () => void
  labelledBy: string
  children: React.ReactNode
  panelClassName?: string
  zIndexClassName?: string
  closeOnEscape?: boolean
  initialFocusDelayMs?: number
  panelRef?: React.MutableRefObject<HTMLDivElement | null>
}

export const SlideInPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  labelledBy,
  children,
  panelClassName = 'max-w-[420px]',
  zIndexClassName = 'z-[200]',
  closeOnEscape = true,
  initialFocusDelayMs = 80,
  panelRef,
}) => {
  const localPanelRef = useRef<HTMLDivElement | null>(null)
  const focusRef = panelRef ?? localPanelRef
  const [rendered, setRendered] = useState(isOpen)
  const [entering, setEntering] = useState(false)
  const [closing, setClosing] = useState(false)

  const setPanelNode = (node: HTMLDivElement | null) => {
    localPanelRef.current = node
    if (panelRef) panelRef.current = node
  }

  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      setClosing(false)
      setEntering(true)
      const t = window.setTimeout(() => setEntering(false), ANIMATION_MS)
      return () => window.clearTimeout(t)
    }

    if (rendered) {
      setClosing(true)
      const t = window.setTimeout(() => {
        setRendered(false)
        setClosing(false)
        setEntering(false)
      }, ANIMATION_MS)
      return () => window.clearTimeout(t)
    }
  }, [isOpen, rendered])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  useEffect(() => {
    if (rendered) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [rendered])

  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => {
      focusRef.current?.focus()
    }, initialFocusDelayMs)
    return () => window.clearTimeout(t)
  }, [isOpen, focusRef, initialFocusDelayMs])

  if (!rendered) return null

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className={
          `absolute inset-0 bg-black/20 dark:bg-black/40 transition-opacity ` +
          (closing ? 'animate-fade-out pointer-events-none' : entering ? 'animate-fade-in' : '')
        }
        onClick={onClose}
        aria-hidden
      />

      <div className="relative h-full w-full flex items-stretch justify-end p-4 pointer-events-none">
        <div
          ref={setPanelNode}
          tabIndex={-1}
          className={
            `pointer-events-auto w-full h-full bg-white dark:bg-neutral-900 rounded-2xl shadow-lg ring-1 ring-black/10 dark:ring-white/10 overflow-hidden flex flex-col ` +
            panelClassName +
            ' ' +
            (closing ? 'animate-slide-out-right' : entering ? 'animate-slide-in-right' : '')
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
