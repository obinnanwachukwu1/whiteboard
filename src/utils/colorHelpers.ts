export function hashString(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i)
  return Math.abs(h)
}

export function courseHueFor(id: string | number, fallback: string) {
  const key = `${id}|${fallback}`
  return hashString(key) % 360
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
