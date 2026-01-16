import type { ResolvedTab } from '../types/ui'
import type { CourseInfo, CanvasTab } from '../types/canvas'

export function computeResolvedTabs(
  info: CourseInfo | null | undefined,
  tabs: CanvasTab[] | null | undefined,
  hasFiles: boolean,
): ResolvedTab[] {
  const defaultView = String(info?.default_view || '').toLowerCase()
  const hasSyllabus = typeof info?.syllabus_body === 'string' && String(info?.syllabus_body).trim() !== ''
  const hasHome = defaultView === 'wiki'
  const hasLinks = Array.isArray(tabs) && (tabs as CanvasTab[]).length > 0
  // Check if People tab exists in Canvas tabs
  const hasPeople = Array.isArray(tabs) && tabs.some((t) => {
    const idOrType = String(t?.id || '').toLowerCase()
    const label = String(t?.label || '').toLowerCase()
    return (!t?.hidden) && (idOrType === 'people' || label === 'people')
  })
  const list: ResolvedTab[] = []
  if (hasHome) list.push({ key: 'home', label: 'Home' })
  if (hasSyllabus) list.push({ key: 'syllabus', label: 'Syllabus' })
  list.push({ key: 'announcements', label: 'Announcements' })
  list.push({ key: 'discussions', label: 'Discussions' })
  if (hasFiles) list.push({ key: 'files', label: 'Files' })
  list.push({ key: 'modules', label: 'Modules' })
  if (hasLinks) list.push({ key: 'links', label: 'Links' })
  list.push({ key: 'assignments', label: 'Assignments' })
  list.push({ key: 'grades', label: 'Grades' })
  if (hasPeople) list.push({ key: 'people', label: 'People' })
  return list
}

export function hasFilesFromTabs(tabs: CanvasTab[] | null | undefined): boolean {
  if (!Array.isArray(tabs)) return false
  return tabs.some((t) => {
    const idOrType = String(t?.id || t?.type || '').toLowerCase()
    const label = String(t?.label || '').toLowerCase()
    return (!t?.hidden) && (idOrType.includes('files') || label.includes('files'))
  })
}
