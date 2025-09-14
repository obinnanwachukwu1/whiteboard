import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type Toast = {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

type ToastContextValue = {
  add: (t: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, any>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const tm = timers.current.get(id)
    if (tm) clearTimeout(tm)
    timers.current.delete(id)
  }, [])

  const add = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, duration: 4000, ...t }
    setToasts((prev) => [...prev, toast])
    const tm = setTimeout(() => remove(id), toast.duration)
    timers.current.set(id, tm)
  }, [remove])

  const value = useMemo(() => ({ add, remove }), [add, remove])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md shadow-md ring-1 px-4 py-3 text-sm max-w-sm bg-white/90 dark:bg-neutral-900/90 ring-gray-200 dark:ring-neutral-700 ${
              t.variant === 'destructive' ? 'text-red-700 dark:text-red-300' : t.variant === 'success' ? 'text-green-700 dark:text-green-300' : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
            {t.description && <div className="opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
