import type { ResolvedTab } from '../types/ui'
import type { CourseInfo, CanvasTab } from '../types/canvas'
import type { CourseTabKey } from '../components/FloatingCourseTabs'

type TabKeySource = CourseTabKey | null

const TAB_KEY_MAP: Record<string, CourseTabKey> = {
  home: 'home',
  wiki: 'home',
  pages: 'home',
  syllabus: 'syllabus',
  announcements: 'announcements',
  discussion_topics: 'discussions',
  discussions: 'discussions',
  modules: 'modules',
  files: 'files',
  assignments: 'assignments',
  quiz: 'quizzes',
  quizzes: 'quizzes',
  grades: 'grades',
  people: 'people',
  users: 'people',
}

function keyFromIdOrLabel(value: string): TabKeySource {
  const raw = value.trim().toLowerCase()
  if (!raw) return null
  return TAB_KEY_MAP[raw] || null
}

function keyFromUrl(url?: string): TabKeySource {
  if (!url) return null
  try {
    const u = new URL(url, 'https://placeholder.local')
    const path = u.pathname
    if (/\/discussion_topics/.test(path)) {
      const onlyAnnouncements = u.searchParams.get('only_announcements')
      return onlyAnnouncements === '1' ? 'announcements' : 'discussions'
    }
    if (/\/announcements/.test(path)) return 'announcements'
    if (/\/modules/.test(path)) return 'modules'
    if (/\/assignments/.test(path)) return 'assignments'
    if (/\/quizzes/.test(path)) return 'quizzes'
    if (/\/grades/.test(path)) return 'grades'
    if (/\/files/.test(path)) return 'files'
    if (/\/(people|users)/.test(path)) return 'people'
    if (/\/(pages|wiki)/.test(path)) return 'home'
    if (/^\/courses\/\d+\/?$/.test(path)) return 'home'
  } catch {}
  return null
}

function isLinksHub(tab: CanvasTab | null | undefined) {
  const id = String(tab?.id || '')
    .trim()
    .toLowerCase()
  const label = String(tab?.label || '')
    .trim()
    .toLowerCase()
  return id === 'links' || label === 'links'
}

export function toSupportedCourseTabKey(tab: CanvasTab | null | undefined): TabKeySource {
  if (!tab || tab.hidden) return null
  if (isLinksHub(tab)) return null
  const id = String(tab.id || '')
  const label = String(tab.label || '')
  return keyFromIdOrLabel(id) || keyFromIdOrLabel(label) || keyFromUrl(tab.html_url)
}

export function getExtraCourseLinks(tabs: CanvasTab[] | null | undefined): CanvasTab[] {
  if (!Array.isArray(tabs)) return []
  return tabs.filter((t) => !t?.hidden && !isLinksHub(t) && !toSupportedCourseTabKey(t))
}

export function computeResolvedTabs(
  info: CourseInfo | null | undefined,
  tabs: CanvasTab[] | null | undefined,
  hasFiles: boolean,
): ResolvedTab[] {
  const defaultView = String(info?.default_view || '').toLowerCase()
  const hasSyllabus =
    typeof info?.syllabus_body === 'string' && String(info?.syllabus_body).trim() !== ''
  const hasHome = defaultView === 'wiki'
  const hasLinks = getExtraCourseLinks(tabs).length > 0
  const hasPeople = Array.isArray(tabs) && tabs.some((t) => toSupportedCourseTabKey(t) === 'people')
  const hasDiscussions =
    Array.isArray(tabs) && tabs.some((t) => toSupportedCourseTabKey(t) === 'discussions')
  const hasQuizzes =
    Array.isArray(tabs) && tabs.some((t) => toSupportedCourseTabKey(t) === 'quizzes')
  const list: ResolvedTab[] = []
  if (hasHome) list.push({ key: 'home', label: 'Home' })
  if (hasSyllabus) list.push({ key: 'syllabus', label: 'Syllabus' })
  list.push({ key: 'announcements', label: 'Announcements' })
  if (hasDiscussions) list.push({ key: 'discussions', label: 'Discussions' })
  if (hasFiles) list.push({ key: 'files', label: 'Files' })
  list.push({ key: 'modules', label: 'Modules' })
  if (hasLinks) list.push({ key: 'links', label: 'Links' })
  list.push({ key: 'assignments', label: 'Assignments' })
  if (hasQuizzes) list.push({ key: 'quizzes', label: 'Quizzes' })
  list.push({ key: 'grades', label: 'Grades' })
  if (hasPeople) list.push({ key: 'people', label: 'People' })
  return list
}

export function hasFilesFromTabs(tabs: CanvasTab[] | null | undefined): boolean {
  if (!Array.isArray(tabs)) return false
  return tabs.some((t) => {
    const idOrType = String(t?.id || t?.type || '').toLowerCase()
    const label = String(t?.label || '').toLowerCase()
    return !t?.hidden && (idOrType.includes('files') || label.includes('files'))
  })
}
