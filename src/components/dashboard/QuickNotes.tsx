import React from 'react'
import { StickyNote } from 'lucide-react'
import { Card } from '../ui/Card'

type Props = {
  value: string
  onChange: (value: string) => void
}

/**
 * Simple persistent scratchpad.
 */
export const QuickNotes: React.FC<Props> = ({ value, onChange }) => {
  // Local state for immediate feedback while typing
  const [localValue, setLocalValue] = React.useState(value)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Sync from props if changed externally (e.g. loaded from storage)
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    
    // Debounce the save to parent (localStorage)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
    }, 1000)
  }

  return (
    <Card className="h-full flex flex-col min-h-[300px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-yellow-500/10 dark:bg-yellow-400/10 flex items-center justify-center">
          <StickyNote className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </span>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          Quick Notes
        </h2>
      </div>

      {/* Content */}
      <textarea
        className="flex-1 w-full resize-none bg-transparent border-0 p-0 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-0 leading-relaxed text-sm"
        placeholder="Type some notes here..."
        value={localValue}
        onChange={handleChange}
        spellCheck={false}
      />
    </Card>
  )
}
