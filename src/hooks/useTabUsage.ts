import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'whiteboard_tab_usage'

type UsageStats = Record<string, Record<string, number>>

export function useTabUsage() {
  const [stats, setStats] = useState<UsageStats>({})

  // Load stats on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setStats(JSON.parse(raw))
      }
    } catch (e) {
      console.warn('Failed to load tab usage stats', e)
    }
  }, [])

  const recordVisit = useCallback((courseId: string | number, tab: string) => {
    if (!courseId || !tab) return

    setStats((prev) => {
      const cId = String(courseId)
      const courseStats = prev[cId] || {}
      const newCount = (courseStats[tab] || 0) + 1

      const next = {
        ...prev,
        [cId]: {
          ...courseStats,
          [tab]: newCount,
        },
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (_e) {
        // ignore quota errors
      }

      return next
    })
  }, [])

  const getSortedTabs = useCallback(
    (courseId: string | number, tabs: string[]) => {
      const cId = String(courseId)
      const courseStats = stats[cId] || {}

      // Default priority weights (higher is better)
      // Syllabus/Home/Announcements are high priority "landing" tabs
      const baseWeights: Record<string, number> = {
        syllabus: 100,
        home: 95, // Wiki
        announcements: 90,
        modules: 85,
        assignments: 80,
        discussions: 75,
        grades: 70,
        people: 60,
        links: 50,
        files: 10, // Files always last by default
      }

      return [...tabs].sort((a, b) => {
        // Get user usage count (default to 0)
        const usageA = courseStats[a] || 0
        const usageB = courseStats[b] || 0

        // Get base weight (default to 50)
        const weightA = baseWeights[a] || 50
        const weightB = baseWeights[b] || 50

        // Combined score: Base weight + (Usage * 5)
        // This means 2 visits = +10 priority, enough to jump a minor tier
        const scoreA = weightA + usageA * 5
        const scoreB = weightB + usageB * 5

        return scoreB - scoreA // Descending order
      })
    },
    [stats],
  )

  return { recordVisit, getSortedTabs }
}
