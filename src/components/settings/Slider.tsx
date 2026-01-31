
interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  unit?: string
  disabled?: boolean
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit = '',
  disabled = false,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-3 w-full">
      {label && (
        <span className="text-xs text-slate-500 dark:text-neutral-400 w-16 shrink-0">
          {label}
        </span>
      )}
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 appearance-none rounded-full cursor-pointer
            bg-slate-200 dark:bg-neutral-700
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-slate-900
            [&::-webkit-slider-thumb]:dark:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-slate-900
            [&::-moz-range-thumb]:dark:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
          `}
          style={{
            background: `linear-gradient(to right, var(--accent-primary, #64748b) 0%, var(--accent-primary, #64748b) ${percentage}%, rgb(226 232 240) ${percentage}%, rgb(226 232 240) 100%)`,
          }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-neutral-300 w-12 text-right tabular-nums">
        {value}{unit}
      </span>
    </div>
  )
}
