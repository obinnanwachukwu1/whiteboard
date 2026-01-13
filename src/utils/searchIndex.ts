/**
 * Global Search Manager
 * 
 * Extensible architecture for fuzzy search across Canvas content.
 * Currently uses FlexSearch for fast fuzzy matching.
 * Designed to support future AI/embedding-based search providers.
 */

import { Index } from 'flexsearch'

// Search result types
export type SearchResultType = 'course' | 'assignment' | 'announcement' | 'file' | 'module' | 'page'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  courseId?: string | number
  courseName?: string
  url?: string
  // For navigation
  contentId?: string | number
  pageUrl?: string
}

export interface SearchProvider {
  name: string
  search(query: string, limit?: number): Promise<SearchResult[]>
  addItems?(items: SearchResult[]): void
  clear?(): void
}

// FlexSearch-based fuzzy search provider
class FuzzySearchProvider implements SearchProvider {
  name = 'fuzzy'
  private index: Index
  private items: Map<string, SearchResult> = new Map()

  constructor() {
    this.index = new Index({
      tokenize: 'forward',
      resolution: 9,
    })
  }

  addItems(items: SearchResult[]) {
    for (const item of items) {
      const key = `${item.type}:${item.id}`
      if (!this.items.has(key)) {
        this.items.set(key, item)
        // Index title and subtitle together for better matching
        const searchText = [item.title, item.subtitle, item.courseName].filter(Boolean).join(' ')
        this.index.add(key, searchText)
      }
    }
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    if (!query.trim()) return []
    const keys = this.index.search(query, { limit }) as string[]
    return keys.map(k => this.items.get(k)).filter((x): x is SearchResult => !!x)
  }

  clear() {
    this.items.clear()
    this.index = new Index({
      tokenize: 'forward',
      resolution: 9,
    })
  }

  get size() {
    return this.items.size
  }
}

// Search Manager - coordinates multiple providers
class SearchManager {
  private providers: SearchProvider[] = []
  private _isReady = false
  private _isBuilding = false
  private readyCallbacks: (() => void)[] = []

  constructor() {
    // Add default fuzzy provider
    this.addProvider(new FuzzySearchProvider())
  }

  addProvider(provider: SearchProvider) {
    this.providers.push(provider)
  }

  get isReady() {
    return this._isReady
  }

  get isBuilding() {
    return this._isBuilding
  }

  onReady(callback: () => void) {
    if (this._isReady) {
      callback()
    } else {
      this.readyCallbacks.push(callback)
    }
  }

  private markReady() {
    this._isReady = true
    this._isBuilding = false
    for (const cb of this.readyCallbacks) {
      try { cb() } catch {}
    }
    this.readyCallbacks = []
  }

  // Build index from React Query cache data
  async buildIndex(data: {
    courses?: any[]
    courseAssignments?: Map<string, any[]>
    courseAnnouncements?: Map<string, any[]>
    courseFiles?: Map<string, any[]>
    courseModules?: Map<string, any[]>
  }) {
    this._isBuilding = true
    const items: SearchResult[] = []

    // Index courses
    if (data.courses) {
      for (const course of data.courses) {
        items.push({
          id: String(course.id),
          type: 'course',
          title: course.name || course.course_code || 'Untitled Course',
          subtitle: course.course_code,
        })
      }
    }

    // Index assignments per course
    if (data.courseAssignments) {
      for (const [courseId, assignments] of data.courseAssignments) {
        const course = data.courses?.find(c => String(c.id) === courseId)
        const courseName = course?.name || ''
        for (const a of assignments || []) {
          items.push({
            id: `${courseId}-${a._id || a.id}`,
            type: 'assignment',
            title: a.name || 'Untitled Assignment',
            subtitle: a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : undefined,
            courseId,
            courseName,
            contentId: a._id || a.id,
            url: a.htmlUrl,
          })
        }
      }
    }

    // Index announcements per course
    if (data.courseAnnouncements) {
      for (const [courseId, announcements] of data.courseAnnouncements) {
        const course = data.courses?.find(c => String(c.id) === courseId)
        const courseName = course?.name || ''
        for (const ann of announcements || []) {
          items.push({
            id: `${courseId}-${ann.id}`,
            type: 'announcement',
            title: ann.title || 'Untitled Announcement',
            subtitle: ann.posted_at ? new Date(ann.posted_at).toLocaleDateString() : undefined,
            courseId,
            courseName,
            contentId: ann.id,
            url: ann.html_url,
          })
        }
      }
    }

    // Index files per course
    if (data.courseFiles) {
      for (const [courseId, files] of data.courseFiles) {
        const course = data.courses?.find(c => String(c.id) === courseId)
        const courseName = course?.name || ''
        for (const f of files || []) {
          items.push({
            id: `${courseId}-${f.id}`,
            type: 'file',
            title: f.display_name || f.filename || 'Untitled File',
            subtitle: f.content_type,
            courseId,
            courseName,
            contentId: f.id,
            url: f.url,
          })
        }
      }
    }

    // Index modules per course
    if (data.courseModules) {
      for (const [courseId, modules] of data.courseModules) {
        const course = data.courses?.find(c => String(c.id) === courseId)
        const courseName = course?.name || ''
        for (const m of modules || []) {
          items.push({
            id: `${courseId}-module-${m._id || m.id}`,
            type: 'module',
            title: m.name || 'Untitled Module',
            courseId,
            courseName,
          })
          // Index module items too
          const moduleItems = m.moduleItemsConnection?.nodes || m.items || []
          for (const item of moduleItems) {
            if (item.title) {
              // Determine actual item type from __typename
              let itemType: SearchResultType = 'page'
              if (item.__typename === 'FileModuleItem' || item.__typename === 'File') {
                itemType = 'file'
              } else if (item.__typename === 'AssignmentModuleItem' || item.__typename === 'Assignment') {
                itemType = 'assignment'
              } else if (item.__typename === 'PageModuleItem' || item.__typename === 'Page') {
                itemType = 'page'
              }
              // Also check by file extension if title looks like a file
              if (itemType === 'page' && /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|mp4|mov|mp3|wav|zip)$/i.test(item.title)) {
                itemType = 'file'
              }
              
              items.push({
                id: `${courseId}-moditem-${item._id || item.id}`,
                type: itemType,
                title: item.title,
                subtitle: `in ${m.name}`,
                courseId,
                courseName,
                contentId: item.contentId || item._id || item.id,
                pageUrl: item.pageUrl,
                url: item.htmlUrl,
              })
            }
          }
        }
      }
    }

    // Add all items to providers
    for (const provider of this.providers) {
      provider.addItems?.(items)
    }

    this.markReady()
    return items.length
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    if (!query.trim()) return []
    
    // For now, just use the first provider (fuzzy)
    // Future: merge results from multiple providers with scoring
    const results: SearchResult[] = []
    for (const provider of this.providers) {
      const providerResults = await provider.search(query, limit)
      results.push(...providerResults)
    }
    
    // Dedupe by id+type
    const seen = new Set<string>()
    return results.filter(r => {
      const key = `${r.type}:${r.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, limit)
  }

  clear() {
    for (const provider of this.providers) {
      provider.clear?.()
    }
    this._isReady = false
    this._isBuilding = false
  }

  get indexSize() {
    const fuzzy = this.providers.find(p => p.name === 'fuzzy') as FuzzySearchProvider | undefined
    return fuzzy?.size || 0
  }
}

// Singleton instance
export const searchManager = new SearchManager()
