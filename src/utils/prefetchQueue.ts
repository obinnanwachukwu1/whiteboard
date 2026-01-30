type PrefetchTask = () => Promise<void> | void
type GuardResult = { waitMs: number; reason?: string } | null

class PrefetchQueue {
  private q: PrefetchTask[] = []
  private running = 0
  private guard: (() => Promise<GuardResult> | GuardResult) | null = null
  private maxQueueSize = 50 // Prevent unbounded queue growth
  constructor(private concurrency = 2, private minIntervalMs = 250) {}

  enqueue(task: PrefetchTask) {
    // Drop oldest tasks if queue is too large (prevents memory leak)
    if (this.q.length >= this.maxQueueSize) {
      this.q.shift()
    }
    this.q.push(task)
    this.run()
  }

  setGuard(guard: (() => Promise<GuardResult> | GuardResult) | null) {
    this.guard = guard
  }

  private async run() {
    if (this.running >= this.concurrency) return
    const next = this.q.shift()
    if (!next) return

    // Optional guard to respect rate limits
    if (this.guard) {
      try {
        const res = await this.guard()
        if (res && res.waitMs > 0) {
          // Put task back and delay
          this.q.unshift(next)
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('[Prefetch] Pausing due to guard', res)
          }
          setTimeout(() => this.run(), res.waitMs)
          return
        }
      } catch {
        // Ignore guard errors and continue
      }
    }

    this.running++
    try {
      await next()
    } catch {}
    finally {
      setTimeout(() => {
        this.running--
        this.run()
      }, this.minIntervalMs)
    }
  }
}

const shared = new PrefetchQueue(2, 300)

// Default guard based on Canvas rate headers exposed via preload IPC
shared.setGuard(async () => {
  const canvas = (window as any).canvas
  if (!canvas?.getRateLimit) return null
  try {
    const res = await canvas.getRateLimit()
    if (!res?.ok || !res.data) return null
    const remaining = res.data.remaining
    if (typeof remaining !== 'number') return null

    // Heuristic backoff thresholds
    if (remaining < 100) return { waitMs: 5 * 60 * 1000, reason: 'remaining<100' }
    if (remaining < 200) return { waitMs: 2 * 60 * 1000, reason: 'remaining<200' }
    if (remaining < 400) return { waitMs: 30 * 1000, reason: 'remaining<400' }
    return null
  } catch {
    return null
  }
})

export function enqueuePrefetch(task: PrefetchTask) {
  shared.enqueue(task)
}

export function requestIdle(cb: () => void) {
  const ric = (window as any).requestIdleCallback as any
  if (typeof ric === 'function') ric(cb)
  else setTimeout(cb, 300)
}
