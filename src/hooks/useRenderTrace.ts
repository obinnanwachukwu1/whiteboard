import { useEffect, useRef } from 'react'

type TraceValues = Record<string, unknown>

function diffValues(prev: TraceValues, next: TraceValues) {
  const changes: Record<string, { prev: unknown; next: unknown }> = {}
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of keys) {
    if (!Object.is(prev[key], next[key])) {
      changes[key] = { prev: prev[key], next: next[key] }
    }
  }
  return changes
}

export function useRenderTrace(name: string, values: TraceValues) {
  const prevRef = useRef<TraceValues | null>(null)
  const renderCount = useRef(0)

  if (import.meta.env.DEV) {
    renderCount.current += 1
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const prev = prevRef.current
    if (prev) {
      const changes = diffValues(prev, values)
      if (Object.keys(changes).length > 0) {
        console.log(`[trace] ${name} render #${renderCount.current}`, changes)
      } else {
        console.log(`[trace] ${name} render #${renderCount.current} (no prop changes)`)
      }
    } else {
      console.log(`[trace] ${name} first render`)
    }

    prevRef.current = values
  })
}
