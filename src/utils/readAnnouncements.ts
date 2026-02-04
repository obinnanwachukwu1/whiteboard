import { getJson, setJson, removeItem } from './secureStorage'

/**
 * localStorage helpers for tracking read announcements.
 *
 * Read announcements are hidden from the dashboard but still visible
 * (grayed out) on the /announcements page.
 */

const STORAGE_KEY = 'whiteboard:read-announcements'

/**
 * Get the set of read announcement IDs from localStorage.
 */
export function getReadAnnouncementIds(): Set<string> {
  try {
    const parsed = getJson<any>(STORAGE_KEY, null)
    if (!Array.isArray(parsed)) return new Set()
    
    return new Set(parsed.map(String))
  } catch {
    return new Set()
  }
}

/**
 * Check if a specific announcement has been marked as read.
 */
export function isAnnouncementRead(announcementId: string | number): boolean {
  const readIds = getReadAnnouncementIds()
  return readIds.has(String(announcementId))
}

/**
 * Mark an announcement as read.
 */
export function markAnnouncementRead(announcementId: string | number): void {
  const readIds = getReadAnnouncementIds()
  readIds.add(String(announcementId))
  saveReadAnnouncementIds(readIds)
}

/**
 * Mark an announcement as unread.
 */
export function markAnnouncementUnread(announcementId: string | number): void {
  const readIds = getReadAnnouncementIds()
  readIds.delete(String(announcementId))
  saveReadAnnouncementIds(readIds)
}

/**
 * Toggle the read state of an announcement.
 * Returns the new read state.
 */
export function toggleAnnouncementRead(announcementId: string | number): boolean {
  const readIds = getReadAnnouncementIds()
  const id = String(announcementId)
  
  if (readIds.has(id)) {
    readIds.delete(id)
    saveReadAnnouncementIds(readIds)
    return false
  } else {
    readIds.add(id)
    saveReadAnnouncementIds(readIds)
    return true
  }
}

/**
 * Mark multiple announcements as read.
 */
export function markAllAnnouncementsRead(announcementIds: Array<string | number>): void {
  const readIds = getReadAnnouncementIds()
  for (const id of announcementIds) {
    readIds.add(String(id))
  }
  saveReadAnnouncementIds(readIds)
}

/**
 * Clear all read announcement history.
 */
export function clearReadAnnouncementHistory(): void {
  try {
    removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the count of read announcements.
 */
export function getReadAnnouncementCount(): number {
  return getReadAnnouncementIds().size
}

/**
 * Prune old announcement IDs to prevent unbounded growth.
 * Keeps only the most recent N IDs.
 * Call this periodically (e.g., on app startup).
 */
export function pruneReadAnnouncementHistory(maxEntries = 500): void {
  const readIds = getReadAnnouncementIds()
  
  if (readIds.size <= maxEntries) return
  
  // Convert to array and keep only the last maxEntries
  // Note: Sets maintain insertion order in modern JS
  const arr = Array.from(readIds)
  const pruned = arr.slice(-maxEntries)
  
  saveReadAnnouncementIds(new Set(pruned))
}

// Internal helper to save the set to localStorage
function saveReadAnnouncementIds(ids: Set<string>): void {
  try {
    const arr = Array.from(ids)
    setJson(STORAGE_KEY, arr)
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Filter a list of announcements to only unread ones.
 */
export function filterUnreadAnnouncements<T extends { id?: string | number; topicId?: string | number }>(
  announcements: T[]
): T[] {
  const readIds = getReadAnnouncementIds()
  
  return announcements.filter((a) => {
    // Use topicId if available (more reliable), fallback to id
    const id = String(a.topicId ?? a.id ?? '')
    if (!id) return true  // Keep if no ID (shouldn't happen)
    return !readIds.has(id)
  })
}

/**
 * React hook-friendly version that returns current state.
 * Note: This doesn't automatically update on changes from other tabs.
 * For that, you'd need to add a storage event listener.
 */
export function createReadAnnouncementsStore() {
  return {
    getIds: getReadAnnouncementIds,
    isRead: isAnnouncementRead,
    markRead: markAnnouncementRead,
    markUnread: markAnnouncementUnread,
    toggle: toggleAnnouncementRead,
    markAllRead: markAllAnnouncementsRead,
    clear: clearReadAnnouncementHistory,
    prune: pruneReadAnnouncementHistory,
    filterUnread: filterUnreadAnnouncements,
  }
}
