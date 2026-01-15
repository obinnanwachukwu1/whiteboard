// electron/embedding/indexingQueue.ts
// Background queue for file indexing with persistence and cancellation

import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

export interface QueueItem {
  fileId: string
  courseId: string
  courseName: string
  fileName: string
  fileSize: number
  priority: 'high' | 'normal' | 'low'
  source: 'auto' | 'on-open' | 'manual'
  addedAt: number
  attempts: number
  lastError?: string
}

export interface QueueStatus {
  length: number
  processing: boolean
  currentItem: QueueItem | null
  processedCount: number
  failedCount: number
}

interface QueuePersistence {
  version: number
  items: QueueItem[]
  processedCount: number
  failedCount: number
}

const QUEUE_VERSION = 1
const MAX_ATTEMPTS = 3

type ProcessCallback = (item: QueueItem) => Promise<{ success: boolean; error?: string }>

export class IndexingQueue extends EventEmitter {
  private queue: QueueItem[] = []
  private processing = false
  private stopped = true
  private currentItem: QueueItem | null = null
  private processedCount = 0
  private failedCount = 0
  private processCallback: ProcessCallback | null = null
  private persistPath: string
  private cancelledCourses: Set<string> = new Set()

  constructor() {
    super()
    this.persistPath = path.join(app.getPath('userData'), 'indexing-queue.json')
  }

  /**
   * Set the callback that processes each queue item
   */
  setProcessCallback(callback: ProcessCallback): void {
    this.processCallback = callback
  }

  /**
   * Add an item to the queue
   */
  enqueue(item: Omit<QueueItem, 'addedAt' | 'attempts'>): boolean {
    // Check if already in queue
    if (this.queue.some(q => q.fileId === item.fileId)) {
      return false
    }

    // Check if currently processing this file
    if (this.currentItem?.fileId === item.fileId) {
      return false
    }

    const queueItem: QueueItem = {
      ...item,
      addedAt: Date.now(),
      attempts: 0,
    }

    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    const insertIdx = this.queue.findIndex(
      q => priorityOrder[q.priority] > priorityOrder[item.priority]
    )

    if (insertIdx === -1) {
      this.queue.push(queueItem)
    } else {
      this.queue.splice(insertIdx, 0, queueItem)
    }

    this.emit('enqueued', queueItem)
    this.persistAsync()

    // Start processing if not already running
    if (!this.stopped && !this.processing) {
      this.processNext()
    }

    return true
  }

  /**
   * Remove a specific file from the queue
   */
  remove(fileId: string): boolean {
    const idx = this.queue.findIndex(q => q.fileId === fileId)
    if (idx !== -1) {
      this.queue.splice(idx, 1)
      this.persistAsync()
      return true
    }
    return false
  }

  /**
   * Cancel all pending items for a course
   * Also marks the course as cancelled so in-progress items are skipped
   */
  cancelCourse(courseId: string): number {
    // Mark course as cancelled (for in-progress items)
    this.cancelledCourses.add(courseId)

    // Remove all pending items for this course
    const before = this.queue.length
    this.queue = this.queue.filter(q => q.courseId !== courseId)
    const removed = before - this.queue.length

    if (removed > 0) {
      this.persistAsync()
      this.emit('course-cancelled', courseId, removed)
    }

    return removed
  }

  /**
   * Clear cancellation flag for a course (e.g., if re-pinned)
   */
  uncancelCourse(courseId: string): void {
    this.cancelledCourses.delete(courseId)
  }

  /**
   * Check if a course has been cancelled
   */
  isCourseCancelled(courseId: string): boolean {
    return this.cancelledCourses.has(courseId)
  }

  /**
   * Clear all pending items
   */
  clear(): void {
    this.queue = []
    this.cancelledCourses.clear()
    this.persistAsync()
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (!this.stopped) return
    
    this.stopped = false
    this.emit('started')
    
    if (this.queue.length > 0 && !this.processing) {
      this.processNext()
    }
  }

  /**
   * Stop processing (current item will finish)
   */
  stop(): void {
    this.stopped = true
    this.emit('stopped')
  }

  /**
   * Process the next item in the queue
   */
  private async processNext(): Promise<void> {
    if (this.stopped || this.processing || this.queue.length === 0) {
      return
    }

    if (!this.processCallback) {
      console.warn('[IndexingQueue] No process callback set')
      return
    }

    this.processing = true
    const item = this.queue.shift()!
    this.currentItem = item

    this.emit('processing', item)

    try {
      // Check if course was cancelled
      if (this.cancelledCourses.has(item.courseId)) {
        console.log(`[IndexingQueue] Skipping ${item.fileName} (course cancelled)`)
        this.currentItem = null
        this.processing = false
        this.processNext()
        return
      }

      // Process the item
      item.attempts++
      const result = await this.processCallback(item)

      if (result.success) {
        this.processedCount++
        this.emit('completed', item)
      } else {
        item.lastError = result.error
        
        // Retry if under max attempts
        if (item.attempts < MAX_ATTEMPTS) {
          // Re-add to queue with lower priority
          item.priority = 'low'
          this.queue.push(item)
          this.emit('retry', item)
        } else {
          this.failedCount++
          this.emit('failed', item)
        }
      }
    } catch (error) {
      item.lastError = error instanceof Error ? error.message : 'Unknown error'
      item.attempts++
      
      if (item.attempts < MAX_ATTEMPTS) {
        item.priority = 'low'
        this.queue.push(item)
        this.emit('retry', item)
      } else {
        this.failedCount++
        this.emit('failed', item)
      }
    }

    this.currentItem = null
    this.processing = false
    this.persistAsync()

    // Continue processing after a small delay (yield to event loop)
    if (!this.stopped && this.queue.length > 0) {
      setTimeout(() => this.processNext(), 100)
    } else if (this.queue.length === 0) {
      this.emit('idle')
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      length: this.queue.length,
      processing: this.processing,
      currentItem: this.currentItem,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    }
  }

  /**
   * Get all items in queue (for debugging)
   */
  getItems(): QueueItem[] {
    return [...this.queue]
  }

  /**
   * Persist queue to disk (async, fire-and-forget)
   */
  private persistAsync(): void {
    const data: QueuePersistence = {
      version: QUEUE_VERSION,
      items: this.queue,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    }

    fs.writeFile(this.persistPath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error('[IndexingQueue] Failed to persist:', err)
      }
    })
  }

  /**
   * Load queue from disk
   */
  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.persistPath)) {
        console.log('[IndexingQueue] No persisted queue found')
        return
      }

      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8')) as QueuePersistence

      if (data.version !== QUEUE_VERSION) {
        console.log('[IndexingQueue] Queue version mismatch, starting fresh')
        return
      }

      this.queue = data.items || []
      this.processedCount = data.processedCount || 0
      this.failedCount = data.failedCount || 0

      console.log(`[IndexingQueue] Loaded ${this.queue.length} items from disk`)
    } catch (error) {
      console.error('[IndexingQueue] Failed to load:', error)
      // Start fresh on error
      this.queue = []
    }
  }

  /**
   * Save queue to disk (sync, for shutdown)
   */
  async save(): Promise<void> {
    const data: QueuePersistence = {
      version: QUEUE_VERSION,
      items: this.queue,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    }

    try {
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2))
      console.log(`[IndexingQueue] Saved ${this.queue.length} items to disk`)
    } catch (error) {
      console.error('[IndexingQueue] Failed to save:', error)
    }
  }
}
