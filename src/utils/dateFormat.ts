/**
 * Standardized date/time formatting utilities for consistent display across the app.
 * All functions handle invalid inputs gracefully by returning a fallback string.
 */

const FALLBACK = '—'

/**
 * Format a date with both date and time (e.g., "Jan 13, 2026, 2:30 PM")
 */
export function formatDateTime(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return fallback
  }
}

/**
 * Format a date only (e.g., "Jan 13, 2026")
 */
export function formatDate(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return fallback
  }
}

/**
 * Format a time only (e.g., "2:30 PM")
 */
export function formatTime(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return fallback
  }
}

/**
 * Format a short date (e.g., "Jan 13")
 */
export function formatShortDate(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return fallback
  }
}

/**
 * Format a weekday with short date (e.g., "Monday, Jan 13")
 */
export function formatWeekdayDate(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  } catch {
    return fallback
  }
}

/**
 * Format a month and year (e.g., "January 2026")
 */
export function formatMonthYear(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  } catch {
    return fallback
  }
}

/**
 * Get a relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(iso?: string | Date | null, fallback = FALLBACK): string {
  if (!iso) return fallback
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    if (isNaN(date.getTime())) return fallback
    
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffSecs = Math.round(diffMs / 1000)
    const diffMins = Math.round(diffSecs / 60)
    const diffHours = Math.round(diffMins / 60)
    const diffDays = Math.round(diffHours / 24)
    
    // Use Intl.RelativeTimeFormat if available
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
      
      if (Math.abs(diffDays) >= 1) {
        return rtf.format(diffDays, 'day')
      } else if (Math.abs(diffHours) >= 1) {
        return rtf.format(diffHours, 'hour')
      } else if (Math.abs(diffMins) >= 1) {
        return rtf.format(diffMins, 'minute')
      } else {
        return rtf.format(diffSecs, 'second')
      }
    }
    
    // Fallback for older browsers
    const abs = Math.abs
    if (abs(diffDays) >= 1) {
      return diffDays > 0 ? `in ${diffDays} day${abs(diffDays) > 1 ? 's' : ''}` : `${abs(diffDays)} day${abs(diffDays) > 1 ? 's' : ''} ago`
    } else if (abs(diffHours) >= 1) {
      return diffHours > 0 ? `in ${diffHours} hour${abs(diffHours) > 1 ? 's' : ''}` : `${abs(diffHours)} hour${abs(diffHours) > 1 ? 's' : ''} ago`
    } else if (abs(diffMins) >= 1) {
      return diffMins > 0 ? `in ${diffMins} minute${abs(diffMins) > 1 ? 's' : ''}` : `${abs(diffMins)} minute${abs(diffMins) > 1 ? 's' : ''} ago`
    } else {
      return 'just now'
    }
  } catch {
    return fallback
  }
}

/**
 * Check if a date is in the past
 */
export function isPast(iso?: string | Date | null): boolean {
  if (!iso) return false
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    return date.getTime() < Date.now()
  } catch {
    return false
  }
}

/**
 * Check if a date is today
 */
export function isToday(iso?: string | Date | null): boolean {
  if (!iso) return false
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  } catch {
    return false
  }
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(iso?: string | Date | null, days: number = 7): boolean {
  if (!iso) return false
  try {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    const now = Date.now()
    const future = now + days * 24 * 60 * 60 * 1000
    const time = date.getTime()
    return time >= now && time <= future
  } catch {
    return false
  }
}
