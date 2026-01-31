import React from 'react'

type Props = {
  label: string
  description?: string
  children: React.ReactNode
  indent?: boolean
  disabled?: boolean
  className?: string
}

export function SettingsRow({ label, description, children, indent, disabled, className = '' }: Props) {
  return (
    <div
      className={`
        flex items-center justify-between gap-4 px-4 py-3
        border-b border-gray-100 dark:border-neutral-800 last:border-b-0
        transition-colors duration-150
        ${indent ? 'pl-8 bg-slate-50/50 dark:bg-neutral-800/30' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${disabled ? 'text-slate-400 dark:text-neutral-500' : 'text-slate-900 dark:text-slate-100'}`}>
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  )
}

// Segmented control for 2-3 options
type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}

export function SegmentedControl<T extends string>({ value, onChange, options, disabled }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          className={`
            px-3 py-1.5 text-sm font-medium transition-colors
            ${value === opt.value
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-700'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Toggle switch (styled checkbox)
type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-neutral-700'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white dark:bg-neutral-900 shadow-lg ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

// Dropdown select
type SelectProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
  className?: string
}

export function Select<T extends string>({ value, onChange, options, disabled, className = '' }: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className={`
        rounded-lg border border-gray-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm
        text-slate-700 dark:text-neutral-200
        focus:outline-none focus:ring-2 focus:ring-slate-500/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// Text input
type TextInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TextInput({ value, onChange, placeholder, disabled, className = '' }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        rounded-lg border border-gray-200 dark:border-neutral-700
        bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm text-right
        text-slate-700 dark:text-neutral-200 w-24
        focus:outline-none focus:ring-2 focus:ring-slate-500/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  )
}

// Action button
type ActionButtonProps = {
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'danger'
  disabled?: boolean
  loading?: boolean
}

export function ActionButton({ onClick, children, variant = 'default', disabled, loading }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        ring-1 disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'danger'
          ? 'text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'text-slate-700 dark:text-neutral-200 ring-gray-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700'
        }
      `}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
