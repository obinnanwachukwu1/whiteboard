// Image Color Extraction
// Canvas-based image sampling with k-means clustering for dominant colors

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

type WorkerResponse =
  | { id: number; ok: true; data: HSL }
  | { id: number; ok: false; error: string }

const WORKER_TIMEOUT_MS = 4000
let colorWorker: Worker | null = null
let workerRequestId = 0
const workerPending = new Map<number, { resolve: (value: HSL | null) => void }>()

function getColorWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null
  if (colorWorker) return colorWorker
  try {
    colorWorker = new Worker(new URL('../workers/colorWorker.ts', import.meta.url), { type: 'module' })
    colorWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const payload = event.data
      if (!payload || typeof payload.id !== 'number') return
      const pending = workerPending.get(payload.id)
      if (!pending) return
      workerPending.delete(payload.id)
      pending.resolve(payload.ok ? payload.data : null)
    }
    colorWorker.onerror = () => {
      // Fail all pending requests if the worker crashes.
      for (const pending of workerPending.values()) {
        pending.resolve(null)
      }
      workerPending.clear()
      colorWorker = null
    }
  } catch {
    colorWorker = null
  }
  return colorWorker
}

function computeAccentWithWorker(colors: RGB[]): Promise<HSL | null> {
  const worker = getColorWorker()
  if (!worker) return Promise.resolve(null)
  return new Promise((resolve) => {
    const id = ++workerRequestId
    const timer = window.setTimeout(() => {
      workerPending.delete(id)
      resolve(null)
    }, WORKER_TIMEOUT_MS)
    workerPending.set(id, {
      resolve: (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
    })
    worker.postMessage({ id, colors })
  })
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// Calculate distance between two RGB colors
function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  )
}

// K-means clustering for color extraction
function kMeansClustering(colors: RGB[], k: number, maxIterations = 20): RGB[] {
  if (colors.length === 0) return []
  if (colors.length <= k) return colors

  // Initialize centroids by picking evenly spaced colors from sorted array
  const sortedByBrightness = [...colors].sort((a, b) =>
    (a.r + a.g + a.b) - (b.r + b.g + b.b)
  )

  const centroids: RGB[] = []
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / k) * sortedByBrightness.length)
    centroids.push({ ...sortedByBrightness[idx] })
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign each color to nearest centroid
    const clusters: RGB[][] = Array.from({ length: k }, () => [])

    for (const color of colors) {
      let minDist = Infinity
      let closestIdx = 0

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(color, centroids[i])
        if (dist < minDist) {
          minDist = dist
          closestIdx = i
        }
      }

      clusters[closestIdx].push(color)
    }

    // Update centroids
    let changed = false
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue

      const newCentroid: RGB = {
        r: Math.round(clusters[i].reduce((sum, c) => sum + c.r, 0) / clusters[i].length),
        g: Math.round(clusters[i].reduce((sum, c) => sum + c.g, 0) / clusters[i].length),
        b: Math.round(clusters[i].reduce((sum, c) => sum + c.b, 0) / clusters[i].length),
      }

      if (colorDistance(newCentroid, centroids[i]) > 1) {
        changed = true
        centroids[i] = newCentroid
      }
    }

    if (!changed) break
  }

  return centroids
}

// Score a color for accent-worthiness
// Prefers colors with moderate saturation and brightness
function scoreAccentColor(hsl: HSL): number {
  let score = 0

  // Prefer mid-range saturation (20-80%)
  if (hsl.s >= 30 && hsl.s <= 80) {
    score += 30
  } else if (hsl.s >= 20 && hsl.s <= 90) {
    score += 15
  }

  // Prefer mid-range lightness (30-70%)
  if (hsl.l >= 35 && hsl.l <= 65) {
    score += 30
  } else if (hsl.l >= 25 && hsl.l <= 75) {
    score += 15
  }

  // Penalize very dark or very light colors
  if (hsl.l < 15 || hsl.l > 85) {
    score -= 20
  }

  // Penalize very low saturation (grayscale)
  if (hsl.s < 10) {
    score -= 30
  }

  // Bonus for vibrant colors
  if (hsl.s >= 50 && hsl.l >= 40 && hsl.l <= 60) {
    score += 20
  }

  return score
}

// Sample pixels from an image
async function sampleImageColors(imageUrl: string, sampleSize = 120): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Scale down large images for performance
      const maxDim = 128
      let width = img.width
      let height = img.height

      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      const imageData = ctx.getImageData(0, 0, width, height)
      const pixels = imageData.data
      const colors: RGB[] = []

      // Sample pixels at regular intervals
      const totalPixels = width * height
      const step = Math.max(1, Math.floor(totalPixels / sampleSize))

      for (let i = 0; i < totalPixels; i += step) {
        const idx = i * 4
        const r = pixels[idx]
        const g = pixels[idx + 1]
        const b = pixels[idx + 2]
        const a = pixels[idx + 3]

        // Skip transparent pixels
        if (a < 128) continue

        colors.push({ r, g, b })
      }

      resolve(colors)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageUrl
  })
}

// Extract the best accent color from an image
export async function extractAccentColor(imageUrl: string): Promise<HSL> {
  try {
    // Sample colors from the image
    const colors = await sampleImageColors(imageUrl, 160)

    if (colors.length === 0) {
      // Fallback to default slate
      return { h: 215, s: 16, l: 47 }
    }

    const workerResult = await computeAccentWithWorker(colors)
    if (workerResult) {
      return workerResult
    }

    // Cluster to find dominant colors
    const dominantColors = kMeansClustering(colors, 8)

    // Convert to HSL and score each color
    const scoredColors = dominantColors.map(rgb => {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      return {
        hsl,
        score: scoreAccentColor(hsl),
      }
    })

    // Sort by score and pick the best
    scoredColors.sort((a, b) => b.score - a.score)

    // Use the highest-scored color, or fallback to first one
    const best = scoredColors[0]?.hsl || { h: 215, s: 16, l: 47 }

    // Ensure saturation is at least 20% for a visible accent
    if (best.s < 20) {
      best.s = 20
    }

    // Clamp lightness to usable range
    if (best.l < 30) {
      best.l = 30
    } else if (best.l > 70) {
      best.l = 70
    }

    return best
  } catch (error) {
    console.error('Failed to extract accent color:', error)
    // Fallback to default slate
    return { h: 215, s: 16, l: 47 }
  }
}

// Get a palette of dominant colors from an image
export async function extractColorPalette(imageUrl: string, count = 5): Promise<HSL[]> {
  try {
    const colors = await sampleImageColors(imageUrl, 300)

    if (colors.length === 0) {
      return [{ h: 215, s: 16, l: 47 }]
    }

    const dominantColors = kMeansClustering(colors, count)

    return dominantColors.map(rgb => rgbToHsl(rgb.r, rgb.g, rgb.b))
  } catch (error) {
    console.error('Failed to extract color palette:', error)
    return [{ h: 215, s: 16, l: 47 }]
  }
}
