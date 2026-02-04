type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }

type WorkerRequest = { id: number; colors: RGB[] }
type WorkerResponse = { id: number; ok: true; data: HSL } | { id: number; ok: false; error: string }

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

function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  )
}

function kMeansClustering(colors: RGB[], k: number, maxIterations = 20): RGB[] {
  if (colors.length === 0) return []
  if (colors.length <= k) return colors

  const sortedByBrightness = [...colors].sort((a, b) =>
    (a.r + a.g + a.b) - (b.r + b.g + b.b)
  )

  const centroids: RGB[] = []
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / k) * sortedByBrightness.length)
    centroids.push({ ...sortedByBrightness[idx] })
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
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

function scoreAccentColor(hsl: HSL): number {
  let score = 0

  if (hsl.s >= 30 && hsl.s <= 80) {
    score += 30
  } else if (hsl.s >= 20 && hsl.s <= 90) {
    score += 15
  }

  if (hsl.l >= 35 && hsl.l <= 65) {
    score += 30
  } else if (hsl.l >= 25 && hsl.l <= 75) {
    score += 15
  }

  if (hsl.l < 15 || hsl.l > 85) {
    score -= 20
  }

  if (hsl.s < 10) {
    score -= 30
  }

  if (hsl.s >= 50 && hsl.l >= 40 && hsl.l <= 60) {
    score += 20
  }

  return score
}

function pickBestAccent(colors: RGB[]): HSL {
  const dominantColors = kMeansClustering(colors, 8)

  const scoredColors = dominantColors.map(rgb => {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    return {
      hsl,
      score: scoreAccentColor(hsl),
    }
  })

  scoredColors.sort((a, b) => b.score - a.score)

  const best = scoredColors[0]?.hsl || { h: 215, s: 16, l: 47 }

  if (best.s < 20) {
    best.s = 20
  }
  if (best.l < 30) {
    best.l = 30
  } else if (best.l > 70) {
    best.l = 70
  }

  return best
}

const ctx = self as any

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, colors } = event.data || {}
  if (typeof id !== 'number' || !Array.isArray(colors)) return
  let payload: WorkerResponse
  try {
    const data = pickBestAccent(colors)
    payload = { id, ok: true, data }
  } catch (err) {
    payload = { id, ok: false, error: err instanceof Error ? err.message : 'Worker failed' }
  }
  ctx.postMessage(payload)
}
