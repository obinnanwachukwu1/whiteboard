type ContentType = 'page' | 'assignment' | 'announcement' | 'discussion' | 'file'

function trimSlash(s: string) {
  return s.replace(/\/+$/, '')
}

export function canvasContentUrl(params: {
  baseUrl: string
  courseId: string | number
  type: ContentType
  contentId: string
}): string | null {
  const baseUrl = String(params.baseUrl || '').trim()
  if (!baseUrl) return null

  const base = trimSlash(baseUrl)
  const courseId = encodeURIComponent(String(params.courseId))
  const id = String(params.contentId)

  if (params.type === 'assignment') {
    return `${base}/courses/${courseId}/assignments/${encodeURIComponent(id)}`
  }

  if (params.type === 'announcement' || params.type === 'discussion') {
    return `${base}/courses/${courseId}/discussion_topics/${encodeURIComponent(id)}`
  }

  if (params.type === 'file') {
    return `${base}/courses/${courseId}/files/${encodeURIComponent(id)}`
  }

  if (params.type === 'page') {
    // Canvas sometimes gives full URLs for pages; preserve if so.
    try {
      const u = new URL(id)
      return u.toString()
    } catch {
      return `${base}/courses/${courseId}/pages/${encodeURIComponent(id)}`
    }
  }

  return null
}
