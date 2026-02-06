import { useCallback } from 'react'
import type { CourseTabKey } from '../FloatingCourseTabs'

type Detail = {
  contentType: 'page' | 'assignment' | 'file' | 'announcement' | 'discussion' | 'quiz'
  contentId: string
  title: string
}

type Params = {
  baseUrl?: string
  courseId: string | number
  onChangeTab: (tab: CourseTabKey) => void
  onOpenDetail: (detail: Detail) => void
  onNavigateCourse?: (
    courseId: string | number,
    init?: {
      type: 'assignment' | 'announcement' | 'page' | 'file' | 'quiz'
      id: string
      title?: string
    },
  ) => void
}

export function useCourseLinkNavigator({
  baseUrl,
  courseId,
  onChangeTab,
  onOpenDetail,
  onNavigateCourse,
}: Params) {
  return useCallback(
    async function handleNavigate(href: string, linkTitle?: string) {
      try {
        const u = new URL(href)
        const originMatch = baseUrl ? u.origin === new URL(baseUrl).origin : false
        const path = u.pathname
        const onlyAnnouncements = u.searchParams.get('only_announcements') === '1'
        const parts = path.split('/').filter(Boolean)
        const idxCourse = parts.indexOf('courses')
        const cid = idxCourse >= 0 && parts[idxCourse + 1] ? parts[idxCourse + 1] : null
        const withinCurrent = cid && String(cid) === String(courseId)
        const courseSection = idxCourse >= 0 ? parts[idxCourse + 2] : null
        const courseSectionHasItem = idxCourse >= 0 && !!parts[idxCourse + 3]

        const openCourseRoot = () => {
          if (!cid) return false
          if (withinCurrent) {
            if (onNavigateCourse) onNavigateCourse(cid)
            else onChangeTab('home')
          } else {
            onNavigateCourse?.(cid)
          }
          return true
        }

        const openCourseSection = () => {
          if (!cid || !courseSection || courseSectionHasItem) return false
          const sectionMap: Record<string, CourseTabKey> = {
            announcements: 'announcements',
            discussion_topics: onlyAnnouncements ? 'announcements' : 'discussions',
            discussions: 'discussions',
            modules: 'modules',
            assignments: 'assignments',
            quizzes: 'quizzes',
            grades: 'grades',
            files: 'files',
            pages: 'home',
            wiki: 'home',
            people: 'people',
            users: 'people',
            syllabus: 'syllabus',
          }
          const tab = sectionMap[String(courseSection).toLowerCase()]
          if (!tab) return false
          if (withinCurrent) onChangeTab(tab)
          else onNavigateCourse?.(cid)
          return true
        }

        const openAssignment = () => {
          const idx = parts.indexOf('assignments')
          const id = idx >= 0 ? parts[idx + 1] : null
          if (id) {
            if (withinCurrent) {
              onChangeTab('assignments')
              onOpenDetail({
                contentType: 'assignment',
                contentId: String(id),
                title: linkTitle || 'Assignment',
              })
            } else if (cid)
              onNavigateCourse?.(cid, { type: 'assignment', id: String(id), title: linkTitle })
            return true
          }
          return false
        }
        const openQuiz = () => {
          const idx = parts.indexOf('quizzes')
          const id = idx >= 0 ? parts[idx + 1] : null
          if (id) {
            if (withinCurrent) {
              onChangeTab('quizzes')
              onOpenDetail({
                contentType: 'quiz',
                contentId: String(id),
                title: linkTitle || 'Quiz',
              })
            } else if (cid)
              onNavigateCourse?.(cid, { type: 'quiz', id: String(id), title: linkTitle })
            return true
          }
          return false
        }
        const openAnnouncement = () => {
          const idxD = parts.indexOf('discussion_topics')
          const idxA = parts.indexOf('announcements')
          const idx = idxD >= 0 ? idxD : idxA
          const id = idx >= 0 ? parts[idx + 1] : null
          if (id) {
            if (withinCurrent) {
              onChangeTab('announcements')
              onOpenDetail({
                contentType: 'announcement',
                contentId: String(id),
                title: linkTitle || 'Announcement',
              })
            } else if (cid)
              onNavigateCourse?.(cid, { type: 'announcement', id: String(id), title: linkTitle })
            return true
          }
          return false
        }
        const openPage = () => {
          const idxP = parts.indexOf('pages')
          const slug = idxP >= 0 ? parts[idxP + 1] : null
          if (slug) {
            if (withinCurrent) {
              onChangeTab('home')
              onOpenDetail({
                contentType: 'page',
                contentId: String(slug),
                title: linkTitle || 'Page',
              })
            } else if (cid)
              onNavigateCourse?.(cid, { type: 'page', id: String(slug), title: linkTitle })
            return true
          }
          return false
        }
        const openFile = () => {
          const idxF = parts.indexOf('files')
          const seg = idxF >= 0 ? parts[idxF + 1] : null
          if (seg && /^\d+$/.test(seg)) {
            const fid = seg
            if (withinCurrent) {
              onOpenDetail({
                contentType: 'file',
                contentId: String(fid),
                title: linkTitle || 'File',
              })
            } else if (cid)
              onNavigateCourse?.(cid, { type: 'file', id: String(fid), title: linkTitle })
            return true
          }
          return false
        }

        const isInternal = originMatch || path.startsWith('/courses') || path.startsWith('/files')
        if (!isInternal) {
          ;(await import('../../utils/openExternal')).openExternal(href)
          return
        }

        if (idxCourse >= 0 && !courseSection) {
          if (openCourseRoot()) return
        }

        if (idxCourse >= 0 && courseSection && !courseSectionHasItem) {
          if (openCourseSection()) return
        }

        if (path.includes('/modules/items/')) {
          try {
            const res = await window.canvas.resolveUrl(href)
            if (res.ok && res.data && res.data !== href) {
              return handleNavigate(res.data, linkTitle)
            }
          } catch {}
        }

        if (openAssignment()) return
        if (openAnnouncement()) return
        if (openQuiz()) return
        if (openPage()) return
        if (openFile()) return
        if (withinCurrent && idxCourse >= 0) {
          onChangeTab('modules')
          return
        }
        ;(await import('../../utils/openExternal')).openExternal(href)
      } catch {
        ;(await import('../../utils/openExternal')).openExternal(href)
      }
    },
    [baseUrl, courseId, onChangeTab, onOpenDetail, onNavigateCourse],
  )
}
