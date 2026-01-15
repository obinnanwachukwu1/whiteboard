// electron/embedding/indexingService.ts
import { ipcMain } from 'electron'
import type { IndexableItem } from './manager'

function extractAssignmentIdFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const idx = parts.indexOf('assignments')
    if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
    return null
  } catch {
    return null
  }
}

/**
 * IndexingService handles the conversion of Canvas content to indexable items.
 * It's used by the renderer to prepare content for embedding.
 */
export class IndexingService {

  /**
   * Convert raw Canvas data to IndexableItem format.
   * This is a helper that can be called from the renderer via IPC.
   */
  static prepareAnnouncementForIndexing(
    announcement: { id: string | number; title?: string; message?: string },
    courseId: string,
    courseName: string,
    url?: string
  ): IndexableItem {
    return {
      id: `announcement:${courseId}:${announcement.id}`,
      type: 'announcement',
      courseId,
      courseName,
      title: announcement.title || 'Untitled Announcement',
      content: announcement.message || '',
      url,
    }
  }

  static prepareAssignmentForIndexing(
    assignment: { _id?: string; id?: string | number; name?: string; description?: string; htmlUrl?: string },
    courseId: string,
    courseName: string
  ): IndexableItem {
    // Prefer REST id for reliable internal navigation.
    const restId = assignment._id != null ? String(assignment._id) : extractAssignmentIdFromUrl(assignment.htmlUrl)
    const fallback = assignment.id != null
      ? String(assignment.id)
      : (assignment.htmlUrl || assignment.name || 'unknown')

    const id = restId || fallback

    return {
      id: `assignment:${courseId}:${id}`,
      type: 'assignment',
      courseId,
      courseName,
      title: assignment.name || 'Untitled Assignment',
      content: assignment.description || '',
      url: assignment.htmlUrl,
    }
  }

  static prepareModuleItemForIndexing(
    moduleName: string,
    item: { _id?: string; id?: string | number; title?: string; htmlUrl?: string },
    courseId: string,
    courseName: string
  ): IndexableItem {
    const id = item._id || String(item.id)
    return {
      id: `module:${courseId}:${id}`,
      type: 'module',
      courseId,
      courseName,
      title: item.title || 'Untitled Item',
      content: `Module: ${moduleName}`, // Module items usually don't have descriptions
      url: item.htmlUrl,
    }
  }

  static preparePageForIndexing(
    page: { url?: string; title?: string; body?: string },
    courseId: string,
    courseName: string
  ): IndexableItem {
    return {
      id: `page:${courseId}:${page.url || page.title}`,
      type: 'page',
      courseId,
      courseName,
      title: page.title || 'Untitled Page',
      content: page.body || '',
      url: undefined, // Pages don't have direct URLs in Canvas API
    }
  }

  /**
   * Batch prepare content from the search index data structure.
   * This matches the format from useGlobalSearch.
   */
  static prepareFromSearchData(data: {
    courses?: Array<{ id: string | number; name?: string; course_code?: string }>
    courseAssignments?: Map<string, any[]>
    courseAnnouncements?: Map<string, any[]>
    courseModules?: Map<string, any[]>
  }): IndexableItem[] {
    const items: IndexableItem[] = []
    const courses = data.courses || []

    // Helper to get course name
    const getCourseName = (courseId: string): string => {
      const course = courses.find(c => String(c.id) === courseId)
      return course?.name || course?.course_code || 'Unknown Course'
    }

    // Process announcements
    if (data.courseAnnouncements) {
      for (const [courseId, announcements] of data.courseAnnouncements) {
        const courseName = getCourseName(courseId)
        for (const ann of announcements || []) {
          items.push(IndexingService.prepareAnnouncementForIndexing(
            ann,
            courseId,
            courseName,
            ann.html_url
          ))
        }
      }
    }

    // Process assignments
    if (data.courseAssignments) {
      for (const [courseId, assignments] of data.courseAssignments) {
        const courseName = getCourseName(courseId)
        for (const assignment of assignments || []) {
          items.push(IndexingService.prepareAssignmentForIndexing(
            assignment,
            courseId,
            courseName
          ))
        }
      }
    }

    // Process modules and their items
    if (data.courseModules) {
      for (const [courseId, modules] of data.courseModules) {
        const courseName = getCourseName(courseId)
        for (const module of modules || []) {
          const moduleName = module.name || 'Untitled Module'
          const moduleItems = module.moduleItemsConnection?.nodes || module.items || []
          
          for (const item of moduleItems) {
            if (item.title) {
              items.push(IndexingService.prepareModuleItemForIndexing(
                moduleName,
                item,
                courseId,
                courseName
              ))
            }
          }
        }
      }
    }

    return items
  }
}

/**
 * Register IPC handler for batch content preparation.
 * This allows the renderer to send raw Canvas data and get back IndexableItems.
 */
export function registerIndexingIPC(): void {
  ipcMain.handle('embedding:prepareContent', async (_evt, data: {
    courses?: any[]
    courseAssignments?: Record<string, any[]>
    courseAnnouncements?: Record<string, any[]>
    courseModules?: Record<string, any[]>
  }) => {
    try {
      // Convert Records to Maps for the prepare function
      const courseAssignments = data.courseAssignments 
        ? new Map(Object.entries(data.courseAssignments))
        : undefined
      const courseAnnouncements = data.courseAnnouncements
        ? new Map(Object.entries(data.courseAnnouncements))
        : undefined
      const courseModules = data.courseModules
        ? new Map(Object.entries(data.courseModules))
        : undefined

      const items = IndexingService.prepareFromSearchData({
        courses: data.courses,
        courseAssignments,
        courseAnnouncements,
        courseModules,
      })

      return { ok: true, data: items }
    } catch (e: any) {
      console.error('[IndexingService] Error preparing content:', e)
      return { ok: false, error: String(e?.message || e) }
    }
  })
}
