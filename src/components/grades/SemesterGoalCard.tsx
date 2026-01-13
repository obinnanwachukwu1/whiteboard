import React from 'react'

type Props = {
  semesterGoal: string
  defaultValue: number
  onGoalChange: (value: string) => void
  onNavigateSettings: () => void
}

export const SemesterGoalCard: React.FC<Props> = ({
  semesterGoal,
  defaultValue,
  onGoalChange,
  onNavigateSettings,
}) => {
  const goalValue = Number.isFinite(parseFloat(semesterGoal || '')) 
    ? parseFloat(semesterGoal) 
    : defaultValue

  return (
    <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Set semester goal</div>
        <button 
          className="text-xs px-2 py-0.5 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:opacity-95" 
          onClick={onNavigateSettings}
        >
          Settings
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={goalValue}
            onChange={(e) => onGoalChange(e.target.value)}
            className="w-full accent-[var(--app-accent-hover)]"
          />
        </div>
        <div className="w-16 text-right text-lg font-semibold">
          {Number.isFinite(parseFloat(semesterGoal || '')) ? Number(semesterGoal).toFixed(1) : '—'}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
        Tip: use the Targets menu to see what gets you there.
      </div>
    </div>
  )
}
