import { useMemo, useState, useCallback } from 'react'
import { useActivityAnnouncements } from './useCanvasQueries'
import {
  getReadAnnouncementIds,
  markAnnouncementRead,
  markAnnouncementUnread,
} from '../utils/readAnnouncements'

/**
 * Announcement normalized for the activity feed.
 */
export type NormalizedAnnouncement = {
  id: string
  topicId: string
  courseId: string | number
  courseName: string
  title: string
  message?: string
  postedAt: Date | null
  htmlUrl?: string
  isRead: boolean
}

/**
 * Hook that fetches announcements and filters out read ones for the dashboard.
 * Also provides methods to mark announcements as read/unread.
 */
export function useUnreadAnnouncements(options?: {
  /** Maximum announcements to return */
  limit?: number
  /** Maximum age in hours for announcements (default: 72) */
  maxAgeHours?: number
  /** Include read announcements? (default: false) */
  includeRead?: boolean
}) {
  const { limit = 10, maxAgeHours = 72, includeRead = false } = options ?? {}
  
  // Track read state changes to trigger re-renders
  const [readVersion, setReadVersion] = useState(0)
  
  const query = useActivityAnnouncements(50) // Fetch more than we need for filtering
  
  const announcements = useMemo(() => {
    if (!query.data) return []
    
    // Get current read IDs (re-evaluate when readVersion changes)
    const readIds = getReadAnnouncementIds()
    void readVersion // Ensure this is used for reactivity
    
    const normalized: NormalizedAnnouncement[] = []
    const now = new Date()
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000
    
    for (const ann of query.data) {
      // Extract topic ID from URL or use id
      let topicId = ''
      try {
        if (ann.html_url) {
          const url = new URL(ann.html_url)
          const parts = url.pathname.split('/')
          const dtIdx = parts.indexOf('discussion_topics')
          if (dtIdx >= 0 && parts[dtIdx + 1]) topicId = parts[dtIdx + 1]
          const annIdx = parts.indexOf('announcements')
          if (annIdx >= 0 && parts[annIdx + 1]) topicId = parts[annIdx + 1]
        }
      } catch {}
      
      if (!topicId) topicId = `ann-${normalized.length}`
      
      // Parse posted date
      const postedAt = ann.created_at ? new Date(ann.created_at) : null
      
      // Filter by age
      if (postedAt && (now.getTime() - postedAt.getTime()) > maxAgeMs) {
        continue
      }
      
      // Check if read
      const isRead = readIds.has(topicId)
      
      // Skip read announcements if not including them
      if (isRead && !includeRead) continue
      
      // Extract course ID from URL
      let courseId: string | number = ann.course_id ?? ''
      if (!courseId && ann.html_url) {
        try {
          const url = new URL(ann.html_url)
          const parts = url.pathname.split('/')
          const cIdx = parts.indexOf('courses')
          if (cIdx >= 0 && parts[cIdx + 1]) courseId = parts[cIdx + 1]
        } catch {}
      }
      
      normalized.push({
        id: ann.html_url || topicId,
        topicId,
        courseId,
        courseName: String(courseId),
        title: ann.title || 'Announcement',
        message: ann.message, // Capture message
        postedAt,
        htmlUrl: ann.html_url,
        isRead,
      })
    }
    
    // Sort by posted date (most recent first)
    normalized.sort((a, b) => {
      const aTime = a.postedAt?.getTime() ?? 0
      const bTime = b.postedAt?.getTime() ?? 0
      return bTime - aTime
    })
    
    return normalized.slice(0, limit)
  }, [query.data, limit, maxAgeHours, includeRead, readVersion])
  
  // Methods to mark as read/unread
  const markRead = useCallback((topicId: string) => {
    markAnnouncementRead(topicId)
    setReadVersion((v) => v + 1)
  }, [])
  
  const markUnread = useCallback((topicId: string) => {
    markAnnouncementUnread(topicId)
    setReadVersion((v) => v + 1)
  }, [])
  
  const toggleRead = useCallback((topicId: string) => {
    const readIds = getReadAnnouncementIds()
    if (readIds.has(topicId)) {
      markAnnouncementUnread(topicId)
    } else {
      markAnnouncementRead(topicId)
    }
    setReadVersion((v) => v + 1)
  }, [])
  
  // Count of unread announcements
  const unreadCount = useMemo(() => {
    return announcements.filter((a) => !a.isRead).length
  }, [announcements])
  
  return {
    announcements,
    unreadCount,
    markRead,
    markUnread,
    toggleRead,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
