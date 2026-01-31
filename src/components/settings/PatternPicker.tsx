import React from 'react'
import { PATTERNS } from '../../utils/patterns'
import { ACCENT_PRESETS, type PatternId, type AccentPreset } from '../../utils/theme'

interface PatternPickerProps {
  selected: PatternId | undefined
  onSelect: (patternId: PatternId) => void
  accentPreset: AccentPreset
  dark: boolean
  disabled?: boolean
}

export function PatternPicker({
  selected,
  onSelect,
  accentPreset,
  dark,
  disabled = false,
}: PatternPickerProps) {
  const accent = ACCENT_PRESETS[accentPreset] || ACCENT_PRESETS.slate

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {PATTERNS.map((pattern) => {
          const isSelected = selected === pattern.id
          const previewCSS = pattern.generate(accent.h, accent.s, accent.l, dark)

          // Parse CSS string to style object
          const previewStyle: React.CSSProperties = {}
          const declarations = previewCSS.split(';').filter(Boolean)
          for (const decl of declarations) {
            const [prop, value] = decl.split(':').map(s => s.trim())
            if (prop && value) {
              const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
              ;(previewStyle as any)[camelProp] = value
            }
          }

          // Scale down pattern for preview
          if (previewStyle.backgroundSize) {
            const [w, h] = (previewStyle.backgroundSize as string).split(' ')
            const newW = parseInt(w) / 2
            const newH = parseInt(h) / 2
            previewStyle.backgroundSize = `${newW}px ${newH}px`
          }

          return (
            <button
              key={pattern.id}
              onClick={() => onSelect(pattern.id)}
              disabled={disabled}
              className={`
                relative aspect-square rounded-lg overflow-hidden
                ring-1 transition-all
                ${isSelected
                  ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
                  : 'ring-gray-200 dark:ring-neutral-700 hover:ring-gray-300 dark:hover:ring-neutral-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={pattern.name}
            >
              <div
                className="absolute inset-0"
                style={previewStyle}
              />
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                <span className="text-[10px] font-medium text-white">
                  {pattern.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-neutral-400 text-center">
        Patterns adapt to your accent color
      </p>
    </div>
  )
}
