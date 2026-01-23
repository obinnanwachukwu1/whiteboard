export function hashString(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i)
  return Math.abs(h)
}

export function courseHueFor(id: string | number, fallback: string) {
  // Use the ID if available to ensure consistent colors across views.
  // Fallback to the name/label only if ID is missing.
  const key = (id && String(id) !== '') ? String(id) : fallback
  // Multiply by a prime to scatter the hash values more evenly
  return (hashString(key) * 137) % 360
}

export function courseInitials(name?: string, courseCode?: string) {
  const base = (courseCode || name || '').trim()
  if (!base) return '—'
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    const letters = words[0].replace(/[^A-Za-z0-9]/g, '')
    return letters.slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}
