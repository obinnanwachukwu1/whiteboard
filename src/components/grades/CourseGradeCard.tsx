import React from 'react'
import { Badge } from '../ui/Badge'

type Props = {
  course: any
  courseLabel: string
  currentPercent: number | null
  targetPercent: string
  credits: number
  viewMode: 'real' | 'whatIf'
  planOpen: boolean
  imageUrl?: string
  hue: number
  toGpa: (pct: number) => number
  onNavigate: () => void
  onTogglePlan: () => void
  onTargetChange: (val: string) => void
  onCreditsChange: (val: number) => void
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
  hue,
  toGpa,
  onNavigate,
  onTogglePlan,
  onTargetChange,
  onCreditsChange,
}) => {
  const fallbackGradient = `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 24) % 360} 85% 50%))`
  
  // Parse target
  const targ = targetPercent && targetPercent.trim() !== '' ? parseFloat(targetPercent) : undefined
  const displayPercent = viewMode === 'whatIf' 
    ? (Number.isFinite(targ!) ? targ! : currentPercent) 
    : currentPercent

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

  // Slider value for target
  const sliderVal = Number.isFinite(parseFloat(targetPercent || '')) 
    ? Math.max(0, Math.min(100, parseFloat(targetPercent!))) 
    : (currentPercent ?? 90)
  const sliderGpa = Number.isFinite(sliderVal) ? toGpa(sliderVal) : null

  return (
    <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3 transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-sm hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)]">
      {/* Clickable header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate() } }}
      >
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Avatar with radial gauge */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <div 
              className="absolute inset-0 rounded-full" 
              style={{
                background: currentPercent != null 
                  ? `conic-gradient(var(--app-accent-hover) ${Math.max(0, Math.min(100, currentPercent)) * 3.6}deg, rgba(0,0,0,0.08) 0deg)` 
                  : 'rgba(0,0,0,0.08)'
              }} 
            />
            <div 
              className="absolute inset-1 rounded-full ring-1 ring-black/10 dark:ring-white/10 overflow-hidden bg-center bg-cover" 
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : { background: fallbackGradient }} 
            />
          </div>
          
          {/* Course info */}
          <div className="min-w-0">
            <div className="font-medium truncate">{courseLabel}</div>
            {(courseLabel !== (course.name || '') && course.name) ? (
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{course.name}</div>
            ) : (course.course_code && course.course_code !== courseLabel) ? (
              <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{course.course_code}</div>
            ) : null}
          </div>
          
          {/* Grade display */}
          <div className="text-right ml-auto">
            <div className="text-2xl md:text-3xl font-semibold leading-none">
              {displayPercent != null ? `${displayPercent}%` : '—'}
            </div>
            {displayPercent != null ? (
              <Badge className="mt-0.5 text-[11px] font-semibold text-white" style={{ background: 'var(--app-accent-hover)' }}>
                {toGpa(displayPercent).toFixed(2)}
              </Badge>
            ) : (
              <span className="block h-[1.375rem]" />
            )}
          </div>
        </div>
      </div>

      {/* Status pill */}
      {status && (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
            status.onTrack
              ? 'bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-200'
              : status.close
              ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
              : 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
          }`}>
            {status.onTrack ? 'On track' : `Need +${status.diff}%`}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {displayPercent != null && (
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
          <div 
            className="h-full rounded-full" 
            style={{ width: `${Math.max(0, Math.min(100, displayPercent))}%`, background: 'var(--app-accent-hover)' }} 
          />
        </div>
      )}

      {/* Plan toggle */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/80 hover:opacity-95"
          onClick={onTogglePlan}
        >
          {planOpen ? 'Hide plan' : 'Plan'}
        </button>
        {!planOpen && <div className="text-xs text-slate-500 dark:text-neutral-400">Targets and credits hidden</div>}
      </div>

      {/* Plan editor */}
      {planOpen && (
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
    </div>
  )
}
