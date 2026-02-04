import React from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, Select, TextInput, ActionButton } from './SettingsRow'
import { useAppData, useAppPreferences } from '../../context/AppContext'

type GpaRow = { min: number; gpa: number }

const PRESETS: Record<string, GpaRow[]> = {
  standard: [
    { min: 90, gpa: 4.0 },
    { min: 80, gpa: 3.0 },
    { min: 70, gpa: 2.0 },
    { min: 60, gpa: 1.0 },
    { min: 0, gpa: 0.0 },
  ],
  plusMinus: [
    { min: 93, gpa: 4.0 },
    { min: 90, gpa: 3.7 },
    { min: 87, gpa: 3.3 },
    { min: 83, gpa: 3.0 },
    { min: 80, gpa: 2.7 },
    { min: 77, gpa: 2.3 },
    { min: 73, gpa: 2.0 },
    { min: 70, gpa: 1.7 },
    { min: 67, gpa: 1.3 },
    { min: 60, gpa: 1.0 },
    { min: 0, gpa: 0.0 },
  ],
}

type ScaleType = 'standard' | 'plusMinus' | 'custom'

function detectScaleType(mapping: GpaRow[]): ScaleType {
  const sorted = [...mapping].sort((a, b) => b.min - a.min)

  // Check if matches standard
  const standardSorted = [...PRESETS.standard].sort((a, b) => b.min - a.min)
  if (sorted.length === standardSorted.length &&
      sorted.every((r, i) => r.min === standardSorted[i].min && r.gpa === standardSorted[i].gpa)) {
    return 'standard'
  }

  // Check if matches plus/minus
  const plusMinusSorted = [...PRESETS.plusMinus].sort((a, b) => b.min - a.min)
  if (sorted.length === plusMinusSorted.length &&
      sorted.every((r, i) => r.min === plusMinusSorted[i].min && r.gpa === plusMinusSorted[i].gpa)) {
    return 'plusMinus'
  }

  return 'custom'
}

export function GradesSettings() {
  const data = useAppData()
  const { gpaSettings, setGpaSettings } = useAppPreferences()
  const userKey = React.useMemo(() => {
    const uid = (data?.profile as any)?.id
    return data?.baseUrl && uid ? `${data.baseUrl}|${uid}` : null
  }, [data?.baseUrl, (data?.profile as any)?.id])

  const [customOverride, setCustomOverride] = React.useState(false)

  const prior = gpaSettings.priorTotals
  const gpaMap = gpaSettings.mapping

  const detectedScale = React.useMemo(() => detectScaleType(gpaMap), [gpaMap])
  const scaleType: ScaleType = customOverride ? 'custom' : detectedScale
  const showCustom = customOverride || detectedScale === 'custom'

  React.useEffect(() => {
    setCustomOverride(false)
  }, [userKey])

  const persist = React.useCallback(
    (partial: { priorTotals?: { credits: string; gpa: string }; mapping?: GpaRow[] }) => {
      setGpaSettings(partial).catch(() => {})
    },
    [setGpaSettings],
  )

  const handleScaleChange = (type: ScaleType) => {
    if (type === 'custom') {
      setCustomOverride(true)
      return
    }
    setCustomOverride(false)
    const newMapping = PRESETS[type]
    persist({ mapping: newMapping })
  }

  const updatePrior = (field: 'credits' | 'gpa', value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const next = { ...prior, [field]: cleaned }
    persist({ priorTotals: next })
  }

  const updateRow = (index: number, field: 'min' | 'gpa', value: string) => {
    const v = Number(value.replace(/[^0-9.]/g, ''))
    const next = [...gpaMap]
    next[index] = { ...next[index], [field]: Number.isFinite(v) ? v : 0 }
    next.sort((a, b) => b.min - a.min)
    persist({ mapping: next })
  }

  const addRow = () => {
    const next = [...gpaMap, { min: 85, gpa: 3.5 }].sort((a, b) => b.min - a.min)
    persist({ mapping: next })
  }

  const removeRow = (index: number) => {
    const next = gpaMap.filter((_, i) => i !== index)
    persist({ mapping: next })
  }

  const resetToPreset = () => {
    const newMapping = PRESETS.plusMinus
    setCustomOverride(false)
    persist({ mapping: newMapping })
  }

  return (
    <SettingsSection title="Grades">
      <SettingsRow
        label="GPA Scale"
        description="Grade-to-GPA conversion"
      >
        <Select
          value={scaleType}
          onChange={handleScaleChange}
          options={[
            { value: 'standard', label: 'Standard (A/B/C/D)' },
            { value: 'plusMinus', label: 'Plus/Minus (A+, A, A-...)' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </SettingsRow>

      {showCustom && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-neutral-200">Custom Mapping</span>
            <div className="flex gap-2">
              <ActionButton onClick={resetToPreset}>Reset</ActionButton>
              <ActionButton onClick={addRow}>Add Row</ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {gpaMap.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-neutral-400 w-6">≥</span>
                <input
                  type="text"
                  value={row.min}
                  onChange={(e) => updateRow(idx, 'min', e.target.value)}
                  className="w-12 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-center text-sm"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="text"
                  value={row.gpa}
                  onChange={(e) => updateRow(idx, 'gpa', e.target.value)}
                  className="w-12 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-center text-sm"
                />
                <button
                  onClick={() => removeRow(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <SettingsRow
        label="Prior Credits"
        description="Credits before this term"
      >
        <TextInput
          value={prior.credits}
          onChange={(v) => updatePrior('credits', v)}
          placeholder="e.g. 45"
        />
      </SettingsRow>

      <SettingsRow
        label="Prior GPA"
        description="Cumulative GPA before this term"
      >
        <TextInput
          value={prior.gpa}
          onChange={(v) => updatePrior('gpa', v)}
          placeholder="e.g. 3.65"
        />
      </SettingsRow>
    </SettingsSection>
  )
}
