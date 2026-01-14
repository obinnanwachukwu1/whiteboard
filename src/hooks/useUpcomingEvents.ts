import { useMemo } from 'react'
import { useUpcoming } from './useCanvasQueries'

/**
 * Upcoming event normalized for the activity feed.
 */
export type NormalizedEvent = {
  id: string
  type: 'event' | 'assignment'
  title: string
  courseName?: string
  startAt: Date | null
  htmlUrl?: string
  /** For assignment events */
  dueAt?: Date | null
}

/**
 * Hook that fetches and normalizes upcoming events for the dashboard.
 * Separates calendar events from assignment due dates.
 */
export function useUpcomingEvents(options?: { limit?: number }) {
  const { limit = 10 } = options ?? {}
  
  const query = useUpcoming()
  
  const events = useMemo(() => {
    if (!query.data) return []
    
    const normalized: NormalizedEvent[] = []
    
    for (const event of query.data) {
      // Skip if no useful data
      if (!event.title && !event.assignment?.name) continue
      
      const startAt = parseDate(event.start_at)
      
      // Determine if this is an assignment or calendar event
      const isAssignment = !!event.assignment
      
      normalized.push({
        id: event.html_url || `event-${normalized.length}`,
        type: isAssignment ? 'assignment' : 'event',
        title: event.assignment?.name || event.title || 'Untitled Event',
        courseName: event.context_name,
        startAt,
        htmlUrl: event.html_url,
        dueAt: isAssignment ? parseDate(event.assignment?.due_at) : undefined,
      })
    }
    
    // Sort by start time (soonest first)
    normalized.sort((a, b) => {
      const aTime = a.startAt?.getTime() ?? Infinity
      const bTime = b.startAt?.getTime() ?? Infinity
      return aTime - bTime
    })
    
    // Filter to only future events
    const now = new Date()
    const futureEvents = normalized.filter((e) => {
      if (!e.startAt) return true // Keep events with no date
      return e.startAt.getTime() > now.getTime()
    })
    
    return futureEvents.slice(0, limit)
  }, [query.data, limit])
  
  // Separate calendar events from assignment events
  const calendarEvents = useMemo(() => {
    return events.filter((e) => e.type === 'event')
  }, [events])
  
  const assignmentEvents = useMemo(() => {
    return events.filter((e) => e.type === 'assignment')
  }, [events])
  
  return {
    events,
    calendarEvents,
    assignmentEvents,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Parse a date string, returning null if invalid.
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}
