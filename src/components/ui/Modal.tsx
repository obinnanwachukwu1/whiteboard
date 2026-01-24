import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Width class - defaults to max-w-md */
  width?: string
  /** Show close button in header */
  showCloseButton?: boolean
  /** Click outside to close */
  closeOnBackdrop?: boolean
}

/**
 * Reusable modal/dialog component
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
  showCloseButton = true,
  closeOnBackdrop = true,
}) => {
  const [isVisible, setIsVisible] = React.useState(open)
  const [isClosing, setIsClosing] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsClosing(false)
    } else if (isVisible) {
      setIsClosing(true)
      const t = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 150) // Match CSS animation duration
      return () => clearTimeout(t)
    }
  }, [open, isVisible])

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  // Prevent body scroll when visible
  React.useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isVisible])

  if (!isVisible && !open) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      
      {/* Modal content */}
      <div className={`relative ${width} w-full bg-white dark:bg-neutral-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

type PromptModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Prompt modal - replacement for window.prompt()
 */
export const PromptModal: React.FC<PromptModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) => {
  const [value, setValue] = React.useState(defaultValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue)
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onConfirm(value.trim())
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        {message && (
          <p className="text-sm text-slate-600 dark:text-neutral-400 mb-3">{message}</p>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--app-accent-hover)] focus:border-transparent outline-none transition"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button type="submit" disabled={!value.trim()}>{confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}

type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

/**
 * Confirm modal - replacement for window.confirm()
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600 dark:text-neutral-400 mb-4">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
        <Button 
          onClick={handleConfirm}
          className={variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

type ActionSheetOption = {
  label: string
  value: string
  variant?: 'default' | 'danger'
}

type ActionSheetModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (value: string) => void
  title: string
  message?: string
  options: ActionSheetOption[]
  cancelLabel?: string
}

/**
 * Action sheet modal - for selecting between multiple options
 */
export const ActionSheetModal: React.FC<ActionSheetModalProps> = ({
  open,
  onClose,
  onSelect,
  title,
  message,
  options,
  cancelLabel = 'Cancel',
}) => {
  const handleSelect = (value: string) => {
    onSelect(value)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {message && (
        <p className="text-sm text-slate-600 dark:text-neutral-400 mb-3">{message}</p>
      )}
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`w-full px-4 py-2.5 text-left rounded-lg transition ${
              opt.variant === 'danger'
                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                : 'text-slate-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
        <Button variant="ghost" onClick={onClose} className="w-full">{cancelLabel}</Button>
      </div>
    </Modal>
  )
}
