import { useEffect, useState } from 'react'

type Options = {
  /** Update cadence for the clock tick (default: once per minute). */
  intervalMs?: number
}

/**
 * Provides a periodically updating "now" timestamp for live relative-time labels.
 */
export function useNowTick(options?: Options): number {
  const intervalMs = options?.intervalMs ?? 60_000
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (intervalMs <= 0) return

    let intervalId: number | null = null
    let timeoutId: number | null = null

    const startInterval = () => {
      setNowMs(Date.now())
      intervalId = window.setInterval(() => {
        setNowMs(Date.now())
      }, intervalMs)
    }

    const remainder = Date.now() % intervalMs
    const delayToBoundary = remainder === 0 ? intervalMs : intervalMs - remainder
    timeoutId = window.setTimeout(startInterval, delayToBoundary)

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [intervalMs])

  return nowMs
}
