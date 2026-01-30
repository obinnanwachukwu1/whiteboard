import { useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCourses } from '../hooks/useCanvasQueries'

type NotificationSettings = {
  enabled: boolean
  notifyDueAssignments: boolean
  notifyNewGrades: boolean
  notifyNewAnnouncements: boolean
  lastChecked: string // ISO string
  notifiedAssignmentIds: number[] // List of assignment IDs we already warned about
}

// Use a date in the past for first-time users so they get notified about recent items
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyDueAssignments: true,
  notifyNewGrades: true,
  notifyNewAnnouncements: true,
  lastChecked: '', // Empty means first run - will be set on first check
  notifiedAssignmentIds: [],
}

export function NotificationManager() {
  // We use a ref to track if we've already requested permission to avoid loop
  const permissionRequested = useRef(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Load settings (or defaults)
  const { data: appConfig } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const res = await window.settings.get()
      if (!res.ok) throw new Error(res.error)
      return res.data
    },
    staleTime: 5000, 
    refetchInterval: 5000,
  })

  // Parse notification settings
  const settings: NotificationSettings = {
    ...DEFAULT_SETTINGS,
    ...(appConfig?.userSettings?.notifications || {}),
  }

  // Get courses for name lookup (cached from RootLayout)
  const { data: courses } = useCourses({ enrollment_state: 'active' }, { enabled: settings.enabled })
  
  const courseMap = useMemo(() => {
    const map = new Map<string | number, string>()
    if (courses) {
      for (const c of courses) {
        map.set(c.id, c.name || c.course_code || 'Course')
        map.set(String(c.id), c.name || c.course_code || 'Course')
      }
    }
    return map
  }, [courses])

  // Helper to save settings
  const updateSettings = async (partial: Partial<NotificationSettings>) => {
    const newSettings = { ...settings, ...partial }
    if (newSettings.notifiedAssignmentIds.length > 500) {
      newSettings.notifiedAssignmentIds = newSettings.notifiedAssignmentIds.slice(-200)
    }

    await window.settings.set({
      userSettings: {
        ...(appConfig?.userSettings || {}),
        notifications: newSettings,
      },
    })
    // Invalidate config query to reflect changes immediately in local state
    queryClient.invalidateQueries({ queryKey: ['app-config'] })
  }

  // Debug: log notification state on mount
  useEffect(() => {
    console.log('[Notifications] State:', {
      enabled: settings.enabled,
      permission: Notification.permission,
      notifyDueAssignments: settings.notifyDueAssignments,
      notifyNewGrades: settings.notifyNewGrades,
      notifyNewAnnouncements: settings.notifyNewAnnouncements,
      lastChecked: settings.lastChecked,
    })
  }, [settings.enabled, settings.notifyDueAssignments, settings.notifyNewGrades, settings.notifyNewAnnouncements, settings.lastChecked])

  // Request permission on mount if enabled
  useEffect(() => {
    if (settings.enabled && !permissionRequested.current && Notification.permission === 'default') {
      permissionRequested.current = true
      Notification.requestPermission().then((result) => {
        if (result === 'granted') {
          console.log('[Notifications] Permission granted')
        } else {
          console.log('[Notifications] Permission denied or dismissed')
        }
      })
    }
  }, [settings.enabled])

  // --- Polling: Activity Stream (Grades, Announcements) ---
  useQuery({
    queryKey: ['notifications', 'activity-stream', courses?.length], // Re-run if courses load
    queryFn: async () => {
      if (!settings.enabled) return null
      if (Notification.permission !== 'granted') return null

      const res = await window.canvas.listActivityStream?.({ onlyActiveCourses: true, perPage: 20 })
      if (!res?.ok) return null

      const items = res.data || []
      // Handle first run: use 1 hour ago if no lastChecked saved
      const lastChecked = settings.lastChecked
        ? new Date(settings.lastChecked)
        : new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      let maxDate = lastChecked

      // Iterate newest first
      for (const item of items) {
        if (!item.created_at) continue
        const itemDate = new Date(item.created_at)
        
        // Track max date found
        if (itemDate > maxDate) maxDate = itemDate

        // Check if new and newer than last check
        if (itemDate > lastChecked) {
          const courseName = (item.course_id && courseMap.get(String(item.course_id))) || 'Canvas'

          // Notify based on type
          if (settings.notifyNewAnnouncements && item.type === 'Announcement') {
            // Prefetch content
            if (item.course_id && item.discussion_topic_id) {
              queryClient.prefetchQuery({
                queryKey: ['announcement', String(item.course_id), String(item.discussion_topic_id)],
                queryFn: async () => {
                  const res = await window.canvas.getAnnouncement?.(item.course_id!, item.discussion_topic_id!)
                  return res?.ok ? res.data : null
                },
                staleTime: 1000 * 60 * 60, // 1 hour
              })
            }

            const snippet = item.message ? item.message.replace(/<[^>]*>/g, '').slice(0, 80) + (item.message.length > 80 ? '...' : '') : 'Tap to view.'
            const notif = new Notification(`New Announcement`, {
              body: `${courseName}: ${item.title || 'Announcement'}\n${snippet}`,
              silent: false,
            })
            notif.onclick = async () => {
              window.focus()
              if (item.course_id && item.discussion_topic_id) {
                navigate({
                  to: '/course/$courseId',
                  params: { courseId: String(item.course_id) },
                  search: {
                    tab: 'announcements',
                    type: 'announcement',
                    contentId: String(item.discussion_topic_id),
                    title: item.title
                  }
                })
              } else if (item.html_url) {
                ;(await import('../utils/openExternal')).openExternal(item.html_url)
              }
            }
          } else if (settings.notifyNewGrades && item.type === 'Submission') {
            // Prefetch assignment details if possible
            if (item.course_id && item.assignment_id) {
              queryClient.prefetchQuery({
                queryKey: ['assignment-rest', String(item.course_id), String(item.assignment_id)],
                queryFn: async () => {
                  const res = await window.canvas.getAssignmentRest?.(item.course_id!, item.assignment_id!)
                  return res?.ok ? res.data : null
                },
                staleTime: 1000 * 60 * 60,
              })
            }

            const notif = new Notification(`Grade Posted`, {
              body: `${courseName}: ${item.title || 'Assignment'}\nCheck your score in the app.`,
              silent: false,
            })
            notif.onclick = async () => {
              window.focus()
              // For submissions, we usually go to the grades tab or the assignment details
              // item.assignment_id might be available or we can infer
              if (item.course_id) {
                // If we have an assignment ID, maybe go to assignment detail?
                // Activity stream items for submission often have 'assignment_id'
                if (item.assignment_id) {
                   navigate({
                    to: '/course/$courseId',
                    params: { courseId: String(item.course_id) },
                    search: {
                      tab: 'assignments',
                      type: 'assignment',
                      contentId: String(item.assignment_id),
                      title: item.title
                    }
                  })
                } else {
                  // Fallback to grades list
                   navigate({
                    to: '/course/$courseId',
                    params: { courseId: String(item.course_id) },
                    search: { tab: 'grades' }
                  })
                }
              } else if (item.html_url) {
                ;(await import('../utils/openExternal')).openExternal(item.html_url)
              }
            }
          }
        }
      }

      // Update last checked if we found newer items
      if (maxDate > lastChecked) {
        await updateSettings({ lastChecked: maxDate.toISOString() })
      }
      return items
    },
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    enabled: settings.enabled && (settings.notifyNewGrades || settings.notifyNewAnnouncements),
  })

  // --- Polling: Due Assignments ---
  useQuery({
    queryKey: ['notifications', 'due-assignments'],
    queryFn: async () => {
      if (!settings.enabled || !settings.notifyDueAssignments) return null
      if (Notification.permission !== 'granted') return null

      // Look ahead 24 hours
      const res = await window.canvas.listDueAssignments?.({ days: 1 })
      if (!res?.ok) return null

      const assignments = res.data || []
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const notifiedIds = new Set(settings.notifiedAssignmentIds)
      const newNotifiedIds: number[] = []

      for (const assign of assignments) {
        if (!assign.dueAt) continue
        const due = new Date(assign.dueAt)
        const id = Number(assign.assignment_rest_id || assign.assignment_graphql_id)
        if (!id) continue
        
        // If due in future (but soon) AND not already notified
        if (due > now && due <= in24h && !notifiedIds.has(id)) {
          // Calculate hours left
          const diffMs = due.getTime() - now.getTime()
          const hoursLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))
          const courseName = assign.course_name || 'Assignment'
          
          // Prefetch assignment details
          if (assign.course_id && (assign.assignment_rest_id || assign.assignment_graphql_id)) {
            const assignId = String(assign.assignment_rest_id || assign.assignment_graphql_id)
            queryClient.prefetchQuery({
              queryKey: ['assignment-rest', String(assign.course_id), assignId],
              queryFn: async () => {
                const res = await window.canvas.getAssignmentRest?.(assign.course_id, assignId)
                return res?.ok ? res.data : null
              },
              staleTime: 1000 * 60 * 60,
            })
          }

          const notif = new Notification(`Due in ${hoursLeft} hours`, {
            body: `${courseName}: ${assign.name}`,
            silent: false,
          })
          notif.onclick = async () => {
             window.focus()
             // Use assignment_rest_id or graphql_id. CoursePage expects numeric REST ID usually, or handle both?
             // checking CoursePage... it treats contentId as string.
             // We need course_id. listDueAssignments returns it.
             if (assign.course_id && (assign.assignment_rest_id || assign.assignment_graphql_id)) {
               navigate({
                  to: '/course/$courseId',
                  params: { courseId: String(assign.course_id) },
                  search: {
                    tab: 'assignments',
                    type: 'assignment',
                    contentId: String(assign.assignment_rest_id || assign.assignment_graphql_id),
                    title: assign.name
                  }
               })
             } else if (assign.htmlUrl) {
                ;(await import('../utils/openExternal')).openExternal(assign.htmlUrl)
             }
          }

          newNotifiedIds.push(id)
        }
      }

      if (newNotifiedIds.length > 0) {
        await updateSettings({ 
          notifiedAssignmentIds: [...settings.notifiedAssignmentIds, ...newNotifiedIds] 
        })
      }
      return assignments
    },
    refetchInterval: 60 * 60 * 1000, // Check every hour
    enabled: settings.enabled && settings.notifyDueAssignments,
  })

  return null // Headless component
}
