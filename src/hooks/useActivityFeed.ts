import { useMemo } from 'react'
import { useUnreadAnnouncements } from './useUnreadAnnouncements'
import { useUpcomingEvents } from './useUpcomingEvents'

/**
 * Unified activity feed item type.
 */
export type ActivityFeedItem = {
  id: string
  type: 'announcement' | 'event'
  title: string
  courseName: string
  timestamp: Date | null
  htmlUrl?: string
  /** For announcements: topic ID for marking as read */
  topicId?: string
  /** Is this item read? (only for announcements) */
  isRead?: boolean
}

/**
 * Hook that merges announcements and calendar events into a unified activity feed.
 * Items are sorted by timestamp (most recent first for announcements, soonest first for events).
 */
export function useActivityFeed(options?: {
  /** Maximum items to return */
  limit?: number
  /** Maximum age in hours for announcements */
  maxAnnouncementAgeHours?: number
}) {
  const { limit = 10, maxAnnouncementAgeHours = 72 } = options ?? {}
  
  const announcementsQuery = useUnreadAnnouncements({
    limit: 20,
    maxAgeHours: maxAnnouncementAgeHours,
    includeRead: false,
  })
  
  const eventsQuery = useUpcomingEvents({ limit: 10 })
  
  // Merge announcements and events
  const feedItems = useMemo((): ActivityFeedItem[] => {
    const items: ActivityFeedItem[] = []
    
    // Add announcements
    for (const ann of announcementsQuery.announcements) {
      items.push({
        id: ann.id,
        type: 'announcement',
        title: ann.title,
        courseName: ann.courseName,
        timestamp: ann.postedAt,
        htmlUrl: ann.htmlUrl,
        topicId: ann.topicId,
        isRead: ann.isRead,
      })
    }
    
    // Add calendar events (not assignment events - those are in Priority)
    for (const event of eventsQuery.calendarEvents) {
      items.push({
        id: event.id,
        type: 'event',
        title: event.title,
        courseName: event.courseName || '',
        timestamp: event.startAt,
        htmlUrl: event.htmlUrl,
      })
    }
    
    // Sort: announcements by recency (most recent first), events by soonest
    // We'll interleave them in a way that makes sense:
    // - Recent announcements (within last 24h) first
    // - Then upcoming events
    // - Then older announcements
    
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const recentAnnouncements = items.filter(
      (i) => i.type === 'announcement' && i.timestamp && i.timestamp >= oneDayAgo
    )
    const events = items.filter((i) => i.type === 'event')
    const olderAnnouncements = items.filter(
      (i) => i.type === 'announcement' && (!i.timestamp || i.timestamp < oneDayAgo)
    )
    
    // Sort each group
    recentAnnouncements.sort((a, b) => {
      const aTime = a.timestamp?.getTime() ?? 0
      const bTime = b.timestamp?.getTime() ?? 0
      return bTime - aTime // Most recent first
    })
    
    events.sort((a, b) => {
      const aTime = a.timestamp?.getTime() ?? Infinity
      const bTime = b.timestamp?.getTime() ?? Infinity
      return aTime - bTime // Soonest first
    })
    
    olderAnnouncements.sort((a, b) => {
      const aTime = a.timestamp?.getTime() ?? 0
      const bTime = b.timestamp?.getTime() ?? 0
      return bTime - aTime // Most recent first
    })
    
    // Combine: recent announcements, then events, then older announcements
    const combined = [...recentAnnouncements, ...events, ...olderAnnouncements]
    
    return combined.slice(0, limit)
  }, [announcementsQuery.announcements, eventsQuery.calendarEvents, limit])
  
  // Separate counts
  const announcementCount = useMemo(() => {
    return feedItems.filter((i) => i.type === 'announcement').length
  }, [feedItems])
  
  const eventCount = useMemo(() => {
    return feedItems.filter((i) => i.type === 'event').length
  }, [feedItems])
  
  const isEmpty = feedItems.length === 0
  
  return {
    /** All activity feed items */
    items: feedItems,
    /** Number of announcements in feed */
    announcementCount,
    /** Number of events in feed */
    eventCount,
    /** Whether the feed is empty */
    isEmpty,
    /** Mark an announcement as read */
    markAnnouncementRead: announcementsQuery.markRead,
    /** Mark an announcement as unread */
    markAnnouncementUnread: announcementsQuery.markUnread,
    /** Toggle announcement read state */
    toggleAnnouncementRead: announcementsQuery.toggleRead,
    /** Unread announcement count (from announcements query) */
    unreadAnnouncementCount: announcementsQuery.unreadCount,
    /** Loading state */
    isLoading: announcementsQuery.isLoading || eventsQuery.isLoading,
    /** Error state */
    isError: announcementsQuery.isError || eventsQuery.isError,
    /** Refetch all data */
    refetch: () => {
      announcementsQuery.refetch()
      eventsQuery.refetch()
    },
  }
}

/**
 * Format relative time for activity items.
 */
export function formatActivityTime(timestamp: Date | null): string {
  if (!timestamp) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - timestamp.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const isFuture = diffMs < 0
  const absDiffHours = Math.abs(diffHours)
  
  if (absDiffHours < 1) {
    const mins = Math.round(absDiffHours * 60)
    if (mins < 1) return 'Just now'
    return isFuture ? `in ${mins}m` : `${mins}m ago`
  }
  
  if (absDiffHours < 24) {
    const hours = Math.round(absDiffHours)
    return isFuture ? `in ${hours}h` : `${hours}h ago`
  }
  
  const days = Math.round(absDiffHours / 24)
  
  if (days === 1) {
    return isFuture ? 'Tomorrow' : 'Yesterday'
  }
  
  if (days < 7) {
    return isFuture ? `in ${days}d` : `${days}d ago`
  }
  
  // For future events beyond a week, show the day/time
  if (isFuture) {
    return timestamp.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }
  
  return `${Math.round(days / 7)}w ago`
}
