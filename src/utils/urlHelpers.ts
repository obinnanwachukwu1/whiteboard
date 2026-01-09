export function extractCourseIdFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idx = parts.indexOf('courses')
    if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
    return null
  } catch { return null }
}

export function extractAssignmentIdFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idx = parts.indexOf('assignments')
    if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
    return null
  } catch { return null }
}

export function extractAnnouncementIdFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idxDT = parts.indexOf('discussion_topics')
    if (idxDT >= 0 && parts[idxDT + 1]) return String(parts[idxDT + 1])
    const idxAnn = parts.indexOf('announcements')
    if (idxAnn >= 0 && parts[idxAnn + 1]) return String(parts[idxAnn + 1])
    return null
  } catch { return null }
}
