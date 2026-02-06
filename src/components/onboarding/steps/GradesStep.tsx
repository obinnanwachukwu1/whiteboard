import { useCallback } from 'react'
import type { StepProps } from '../OnboardingWizard'
import { useAppPreferences } from '../../../context/AppContext'

type GpaRow = { min: number; gpa: number }

type ScaleType = 'standard' | 'plusMinus'
type ScaleOption = {
  value: ScaleType
  label: string
  detail: string
  sample: string
}

const PRESETS: Record<ScaleType, GpaRow[]> = {
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

const SCALE_OPTIONS: ScaleOption[] = [
  {
    value: 'standard',
    label: 'Standard',
    detail: 'A / B / C / D scale',
    sample: 'A = 4.0, B = 3.0, C = 2.0',
  },
  {
    value: 'plusMinus',
    label: 'Plus/Minus',
    detail: 'A+, A, A-, B+ ...',
    sample: 'A- = 3.7, B+ = 3.3, B- = 2.7',
  },
]

function detectScaleType(mapping: GpaRow[]): ScaleType {
  const sorted = [...mapping].sort((a, b) => b.min - a.min)
  const standardSorted = [...PRESETS.standard].sort((a, b) => b.min - a.min)
  if (
    sorted.length === standardSorted.length &&
    sorted.every((r, i) => r.min === standardSorted[i].min && r.gpa === standardSorted[i].gpa)
  ) {
    return 'standard'
  }
  return 'plusMinus'
}

export function GradesStep(_props: StepProps) {
  const { gpaSettings, setGpaSettings } = useAppPreferences()
  const scaleType = detectScaleType(gpaSettings.mapping)

  const handleScaleChange = useCallback(
    (type: ScaleType) => {
      setGpaSettings({ mapping: PRESETS[type] }).catch(() => {})
    },
    [setGpaSettings],
  )

  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="text-center mb-8">
        <h2 className="animate-oobe-fade-up text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          GPA settings
        </h2>
        <p className="animate-oobe-fade-up-1 mt-2 text-sm md:text-base text-slate-500 dark:text-neutral-400">
          Choose the grading scale your school uses.
        </p>
      </div>

      <div className="max-w-3xl mx-auto w-full animate-oobe-fade-up-1">
        <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
          GPA Scale
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SCALE_OPTIONS.map((option) => {
            const active = scaleType === option.value
            return (
              <button
                key={option.value}
                onClick={() => handleScaleChange(option.value)}
                className={`rounded-2xl p-5 text-left ring-1 transition-all duration-150 ${
                  active
                    ? 'ring-2 ring-[var(--accent-primary)] bg-white dark:bg-neutral-800 shadow-sm'
                    : 'ring-gray-200 dark:ring-neutral-700 bg-white/60 dark:bg-neutral-800/60 hover:ring-gray-300 dark:hover:ring-neutral-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">{option.detail}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">{option.sample}</p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      active
                        ? 'text-white'
                        : 'bg-slate-200 dark:bg-neutral-700 text-slate-500 dark:text-neutral-300'
                    }`}
                    style={active ? { backgroundColor: 'var(--accent-primary)' } : undefined}
                  >
                    {active ? '✓' : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
