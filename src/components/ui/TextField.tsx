import React from 'react'

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
}

export function TextField({ label, hint, className = '', id, ...props }: TextFieldProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  return (
    <label className="block">
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      )}
      <input
        id={inputId}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-control text-sm text-slate-900 placeholder-slate-400 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none dark:bg-neutral-900 dark:text-slate-100 dark:border-neutral-600 dark:focus:border-brand ${className}`}
        {...props}
      />
      {hint && (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      )}
    </label>
  )
}
