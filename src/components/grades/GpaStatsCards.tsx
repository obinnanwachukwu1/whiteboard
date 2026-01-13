import React from 'react'

type Props = {
  cumulativeGpa: number | null
  semesterGpa: number | null
}

export const GpaStatsCards: React.FC<Props> = ({ cumulativeGpa, semesterGpa }) => {
  return (
    <div className="md:col-span-2 grid grid-cols-2 gap-3">
      <div 
        className="rounded-card p-4 ring-1 ring-gray-200 dark:ring-neutral-800 shadow-card overflow-hidden" 
        style={{ 
          background: 'radial-gradient(80% 120% at 0% 0%, rgba(59,130,246,0.25), transparent), radial-gradient(80% 120% at 100% 100%, rgba(168,85,247,0.25), transparent)' 
        }}
      >
        <div className="text-[11px] text-slate-600 dark:text-neutral-400 mb-1">Cumulative GPA</div>
        <div className="text-4xl md:text-5xl font-semibold tracking-tight">
          {cumulativeGpa != null ? cumulativeGpa.toFixed(2) : '—'}
        </div>
      </div>
      <div 
        className="rounded-card p-4 ring-1 ring-gray-200 dark:ring-neutral-800 shadow-card overflow-hidden" 
        style={{ 
          background: 'radial-gradient(80% 120% at 0% 0%, rgba(16,185,129,0.25), transparent), radial-gradient(80% 120% at 100% 100%, rgba(234,179,8,0.25), transparent)' 
        }}
      >
        <div className="text-[11px] text-slate-600 dark:text-neutral-400 mb-1">Current Semester</div>
        <div className="text-4xl md:text-5xl font-semibold tracking-tight">
          {semesterGpa != null ? semesterGpa.toFixed(2) : '—'}
        </div>
      </div>
    </div>
  )
}
