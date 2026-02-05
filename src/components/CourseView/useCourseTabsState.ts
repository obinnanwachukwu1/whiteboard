import { useEffect, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { computeResolvedTabs, getExtraCourseLinks, hasFilesFromTabs, toSupportedCourseTabKey } from '../../utils/courseTabs'
import type { ResolvedTab } from '../../types/ui'

type Params = {
  courseId: string | number
  infoData: any
  tabsData: any
  filesProbeData: any
  queryClient: QueryClient
}

export function useCourseTabsState({
  courseId,
  infoData,
  tabsData,
  filesProbeData,
  queryClient,
}: Params) {
  const [availableTabs, setAvailableTabs] = useState<ResolvedTab[] | null>(null)
  const [skeletonLeft, setSkeletonLeft] = useState<number | null>(null)

  const defaultView = (infoData?.default_view || '').toLowerCase()
  const hasSyllabus =
    typeof infoData?.syllabus_body === 'string' && infoData?.syllabus_body.trim() !== ''
  const hasHome = defaultView === 'wiki'
  const hasFilesViaTabs = hasFilesFromTabs(tabsData as any)
  const hasFiles = hasFilesViaTabs || (Array.isArray(filesProbeData) && filesProbeData.length > 0)
  const hasLinks = getExtraCourseLinks(tabsData as any).length > 0
  const hasQuizzes =
    Array.isArray(tabsData) && tabsData.some((t) => toSupportedCourseTabKey(t) === 'quizzes')

  useEffect(() => {
    const base = computeResolvedTabs(infoData || null, (tabsData as any[]) || [], hasFiles)
    setAvailableTabs(base)
    const fallbackOnly = !hasHome && !hasSyllabus && !hasFiles && !hasLinks && !hasQuizzes
    if (Array.isArray(tabsData) && !fallbackOnly) {
      queryClient.setQueryData(['course-resolved-tabs', String(courseId)], base)
    }
  }, [courseId, hasHome, hasSyllabus, hasFiles, hasLinks, hasQuizzes, tabsData, infoData, queryClient])

  useEffect(() => {
    const cachedTabs = queryClient.getQueryData<ResolvedTab[]>([
      'course-resolved-tabs',
      String(courseId),
    ])
    if (cachedTabs && cachedTabs.length) {
      setAvailableTabs(cachedTabs)
    }
  }, [courseId, queryClient])

  useEffect(() => {
    if (availableTabs) return
    const cachedResolved = queryClient.getQueryData<any>(['course-resolved-tabs', String(courseId)])
    if (cachedResolved) return
    const cachedInfo = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const dv = String(cachedInfo?.default_view || '').toLowerCase()
    const showHome = dv === 'wiki'
    const fallback: ResolvedTab[] = []
    if (showHome) fallback.push({ key: 'home', label: 'Home' })
    fallback.push(
      { key: 'announcements', label: 'Announcements' },
      { key: 'modules', label: 'Modules' },
      { key: 'assignments', label: 'Assignments' },
      { key: 'grades', label: 'Grades' },
    )
    setAvailableTabs(fallback)
  }, [availableTabs, courseId, queryClient])

  useEffect(() => {
    function compute() {
      const el = document.getElementById('course-content-anchor')
      if (!el) {
        setSkeletonLeft(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setSkeletonLeft(rect.left + rect.width / 2)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [courseId])

  return {
    availableTabs,
    hasSyllabus,
    hasHome,
    hasFiles,
    hasLinks,
    hasQuizzes,
    skeletonLeft,
  }
}
