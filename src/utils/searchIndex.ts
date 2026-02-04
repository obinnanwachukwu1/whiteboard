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
  addItems?(items: SearchResult[]): void | Promise<void>
  clear?(): void | Promise<void>
}

type WorkerRequest =
  | { id: number; type: 'build'; items: SearchResult[] }
  | { id: number; type: 'search'; query: string; limit: number }
  | { id: number; type: 'clear' }

type DistributeOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never
type WorkerRequestWithoutId = DistributeOmit<WorkerRequest, 'id'>

type WorkerResponse =
  | { id: number; type: 'build:done'; count: number }
  | { id: number; type: 'search:done'; results: SearchResult[] }
  | { id: number; type: 'clear:done' }
  | { id: number; type: 'error'; message: string }

class SearchWorkerClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<
    number,
    { resolve: (value: WorkerResponse) => void; reject: (err: Error) => void }
  >()

  private ensureWorker() {
    if (this.worker) return this.worker
    this.worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.type === 'error') {
        pending.reject(new Error(message.message))
        return
      }
      pending.resolve(message)
    }
    this.worker.onerror = (event) => {
      const message = event instanceof ErrorEvent ? event.message : 'Search worker error'
      const err = new Error(message || 'Search worker error')
      for (const pending of this.pending.values()) {
        pending.reject(err)
      }
      this.pending.clear()
    }
    return this.worker
  }

  private request(message: WorkerRequestWithoutId): Promise<WorkerResponse> {
    const worker = this.ensureWorker()
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      worker.postMessage({ id, ...message } satisfies WorkerRequest)
    })
  }

  async build(items: SearchResult[]): Promise<number> {
    const response = await this.request({ type: 'build', items })
    if (response.type !== 'build:done') return 0
    return response.count
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const response = await this.request({ type: 'search', query, limit })
    if (response.type !== 'search:done') return []
    return response.results
  }

  async clear(): Promise<void> {
    const response = await this.request({ type: 'clear' })
    if (response.type !== 'clear:done') return
  }
}

class WorkerSearchProvider implements SearchProvider {
  name = 'fuzzy'
  private client: SearchWorkerClient
  private sizeValue = 0

  constructor(client: SearchWorkerClient) {
    this.client = client
  }

  async addItems(items: SearchResult[]) {
    this.sizeValue = await this.client.build(items)
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    return this.client.search(query, limit)
  }

  clear() {
    this.sizeValue = 0
    void this.client.clear()
  }

  get size() {
    return this.sizeValue
  }
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
  private _indexSize = 0
  private readyCallbacks: (() => void)[] = []

  constructor() {
    const canUseWorker = typeof Worker !== 'undefined'
    if (canUseWorker) {
      this.addProvider(new WorkerSearchProvider(new SearchWorkerClient()))
    } else {
      this.addProvider(new FuzzySearchProvider())
    }
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
  }): Promise<{ count: number; items: SearchResult[] }> {
    this._isBuilding = true
    const items: SearchResult[] = []
    try {
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
        await provider.addItems?.(items)
      }

      this._indexSize = items.length
      this.markReady()
      return { count: items.length, items }
    } catch (error) {
      this._isBuilding = false
      throw error
    }
  }

  async buildFromItems(items: SearchResult[]): Promise<number> {
    this._isBuilding = true
    try {
      for (const provider of this.providers) {
        await provider.addItems?.(items)
      }
      this._indexSize = items.length
      this.markReady()
      return items.length
    } catch (error) {
      this._isBuilding = false
      throw error
    }
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
    this._indexSize = 0
  }

  get indexSize() {
    return this._indexSize
  }
}

// Singleton instance
export const searchManager = new SearchManager()
