type Task = () => Promise<any>

class PrefetchQueue {
  private q: Task[] = []
  private running = 0
  constructor(private concurrency = 2, private minIntervalMs = 250) {}

  enqueue(task: Task) {
    this.q.push(task)
    this.run()
  }

  private async run() {
    if (this.running >= this.concurrency) return
    const next = this.q.shift()
    if (!next) return
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

export function enqueuePrefetch(task: Task) {
  shared.enqueue(task)
}

export function requestIdle(cb: () => void) {
  const ric = (window as any).requestIdleCallback as any
  if (typeof ric === 'function') ric(cb)
  else setTimeout(cb, 300)
}

