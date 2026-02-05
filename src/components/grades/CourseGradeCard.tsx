import React from 'react'
import { Card } from '../ui/Card'
import { CourseAvatar } from '../CourseAvatar'

type Props = {
  course: any
  courseLabel: string
  currentPercent: number | null
  targetPercent: string
  credits: number
  viewMode: 'real' | 'whatIf'
  planOpen: boolean
  imageUrl?: string
  toGpa: (pct: number) => number
  onNavigate: () => void
  onTogglePlan: () => void
  onTargetChange: (val: string) => void
  onCreditsChange: (val: number) => void
  variant?: 'overview' | 'plan'
}

export const CourseGradeCard: React.FC<Props> = ({
  course,
  courseLabel,
  currentPercent,
  targetPercent,
  credits,
  viewMode,
  planOpen,
  imageUrl,
  toGpa,
  onNavigate,
  onTogglePlan,
  onTargetChange,
  onCreditsChange,
  variant = 'plan',
}) => {
  // Parse target
  const targ = targetPercent && targetPercent.trim() !== '' ? parseFloat(targetPercent) : undefined
  const displayPercent = viewMode === 'whatIf' 
    ? (Number.isFinite(targ!) ? targ! : currentPercent) 
    : currentPercent
  const showPlan = variant === 'plan'
  const displayLabel = displayPercent != null ? `${Math.round(displayPercent * 10) / 10}%` : '—'
  const gpaLabel = displayPercent != null ? `${toGpa(displayPercent).toFixed(2)} GPA` : 'No grade yet'

  // Calculate status
  const getStatus = () => {
    const t = targ
    if (currentPercent == null || t == null || !Number.isFinite(t)) return null
    const diff = Math.round((t - currentPercent) * 10) / 10
    const onTrack = diff <= 0
    const close = diff > 0 && diff <= 5
    return { diff, onTrack, close }
  }
  const status = getStatus()
  const statusLabel = status ? (status.onTrack ? 'On track' : `Need +${status.diff}%`) : null

  // Slider value for target
  const sliderVal = Number.isFinite(parseFloat(targetPercent || '')) 
    ? Math.max(0, Math.min(100, parseFloat(targetPercent!))) 
    : (currentPercent ?? 90)
  const sliderGpa = Number.isFinite(sliderVal) ? toGpa(sliderVal) : null

  return (
    <Card
      variant="glass"
      className="p-4 transition-colors duration-150 ease-out hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate() } }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <CourseAvatar
            courseId={course.id}
            courseName={course.name}
            src={imageUrl}
            className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10"
          />

          <div className="min-w-0">
            <div className="font-semibold truncate">{courseLabel}</div>
            {(courseLabel !== (course.name || '') && course.name) ? (
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{course.name}</div>
            ) : (course.course_code && course.course_code !== courseLabel) ? (
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{course.course_code}</div>
            ) : null}
          </div>

          <div className="text-right ml-auto">
            <div className="text-2xl md:text-3xl font-semibold leading-none">{displayLabel}</div>
            <div className="text-xs text-slate-500 dark:text-neutral-400">{gpaLabel}</div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="text-slate-500 dark:text-neutral-400">
          {targ != null && Number.isFinite(targ) ? `Target ${Math.round(targ * 10) / 10}%` : 'Target not set'}
        </div>
        {statusLabel && showPlan && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
              status.onTrack
                ? 'bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-200'
                : status.close
                ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
            }`}
          >
            {statusLabel}
          </span>
        )}
        {statusLabel && !showPlan && (
          <span className="text-slate-500 dark:text-neutral-400">{statusLabel}</span>
        )}
      </div>

      {/* Plan toggle */}
      {showPlan && (
        <div
          className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
            onClick={onTogglePlan}
          >
            {planOpen ? 'Hide plan' : 'Plan'}
          </button>
          {!planOpen && (
            <div className="text-xs text-slate-500 dark:text-neutral-400">
              Targets and credits hidden
            </div>
          )}
        </div>
      )}

      {/* Plan editor */}
      {showPlan && planOpen && (
        <div className="mt-2 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Target slider */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={sliderVal}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full accent-[var(--app-accent-hover)]"
            />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 whitespace-nowrap">
              Target {sliderVal}%{sliderGpa != null && <span className="opacity-70">→ {sliderGpa.toFixed(2)}</span>}
            </span>
          </div>
          
          {/* Credits control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-neutral-400">Credits</span>
            <div className="inline-flex items-center overflow-hidden rounded-control ring-1 ring-black/10 dark:ring-white/10">
              <button className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]" onClick={() => onCreditsChange(Math.max(1, credits - 1))}>-</button>
              <div className="px-2 py-1 w-10 text-center text-sm bg-white/80 dark:bg-neutral-900/80">{credits}</div>
              <button className="px-2 py-1 text-sm hover:bg-[var(--app-accent-bg)]" onClick={() => onCreditsChange(credits + 1)}>+</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
