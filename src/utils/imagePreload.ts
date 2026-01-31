// Simple image preload + decode cache for the renderer.
// Used to prevent avatar/icon fallback -> image swaps on initial mount.

const loadedUrls = new Set<string>()
const inflight = new Map<string, Promise<void>>()

export function isImagePreloaded(url: string | undefined | null): boolean {
  if (!url) return false
  return loadedUrls.has(url)
}

export function markImagePreloaded(url: string | undefined | null) {
  if (!url) return
  loadedUrls.add(url)
}

function preloadViaImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const cleanup = () => {
      img.onload = null
      img.onerror = null
    }
    img.onload = () => {
      cleanup()
      resolve()
    }
    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image'))
    }
    img.src = url

    // If already cached by the browser, resolve synchronously.
    if (img.complete && img.naturalWidth > 0) {
      cleanup()
      resolve()
    }
  })
}

export function preloadImage(url: string | undefined | null): Promise<void> {
  if (!url) return Promise.resolve()
  if (loadedUrls.has(url)) return Promise.resolve()
  const existing = inflight.get(url)
  if (existing) return existing

  const p = (async () => {
    // Prefer decode() when available to avoid a paint-time decode hitch.
    const img = new Image()
    img.src = url
    try {
      if (typeof (img as any).decode === 'function') {
        await (img as any).decode()
      } else {
        await preloadViaImage(url)
      }
      loadedUrls.add(url)
    } finally {
      inflight.delete(url)
    }
  })()

  inflight.set(url, p)
  return p
}
