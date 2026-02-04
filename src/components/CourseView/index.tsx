import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '../ui/Card'
import {
  useCourseInfo,
  useCourseFrontPage,
  useCourseTabs,
  useCourseFiles,
} from '../../hooks/useCanvasQueries'
import type { CourseTabKey } from '../FloatingCourseTabs'
import { prefetchCourseTab } from '../../utils/coursePrefetch'
import { CourseTabsBar } from './CourseTabsBar'
import { CourseDetailView } from './CourseDetailView'
import { CourseTabContent } from './CourseTabContent'
import { useCourseTabsState } from './useCourseTabsState'
import { useCourseLinkNavigator } from './useCourseLinkNavigator'
import { useAppFlags } from '../../context/AppContext'

type Detail = {
  contentType: 'page' | 'assignment' | 'file' | 'announcement' | 'discussion'
  contentId: string
  title: string
}

type Props = {
  courseId: string | number
  courseName?: string
  activeTab: CourseTabKey
  onChangeTab: (tab: CourseTabKey) => void
  content: Detail | null
  onOpenDetail: (detail: Detail) => void
  onClearDetail: () => void
  baseUrl?: string
  onNavigateCourse?: (
    courseId: string | number,
    init?: { type: 'assignment' | 'announcement' | 'page' | 'file'; id: string; title?: string },
  ) => void
}

export const CourseView: React.FC<Props> = ({
  courseId,
  courseName,
  activeTab,
  onChangeTab,
  content,
  onOpenDetail,
  onClearDetail,
  baseUrl,
  onNavigateCourse,
}) => {
  const queryClient = useQueryClient()
  const { prefetchEnabled, privateModeEnabled } = useAppFlags()
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)

  const infoQ = useCourseInfo(courseId)
  const frontQ = useCourseFrontPage(courseId, { enabled: activeTab === 'home' })
  const tabsQ = useCourseTabs(courseId, true, { staleTime: 1000 * 60 * 60 * 24 })
  const filesProbeQ = useCourseFiles(courseId, 1, 'updated_at', 'desc', {
    enabled: courseId != null && !!tabsQ.data,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const { availableTabs, hasSyllabus, skeletonLeft } = useCourseTabsState({
    courseId,
    infoData: infoQ.data,
    tabsData: tabsQ.data,
    filesProbeData: filesProbeQ.data,
    queryClient,
  })

  React.useEffect(() => {
    setCurrentFolderId(null)
  }, [courseId])

  const handleNavigate = useCourseLinkNavigator({
    baseUrl,
    courseId,
    onChangeTab,
    onOpenDetail,
    onNavigateCourse,
  })

  return (
    <Card
      id="course-content-anchor"
      variant="default"
      className="flex-1 min-h-0 flex flex-col overflow-hidden relative"
    >
      <CourseTabsBar
        availableTabs={availableTabs}
        activeTab={activeTab}
        onChangeTab={(t) => {
          onClearDetail()
          onChangeTab(t)
        }}
        onHover={(t) => {
          if (!prefetchEnabled || privateModeEnabled) return
          prefetchCourseTab(queryClient, courseId, t)
        }}
        skeletonLeft={skeletonLeft}
      />

      {content ? (
        <CourseDetailView
          content={content}
          courseId={courseId}
          courseName={courseName}
          onClearDetail={onClearDetail}
          onNavigate={handleNavigate}
        />
      ) : (
        <CourseTabContent
          activeTab={activeTab}
          courseId={courseId}
          courseName={courseName}
          frontQ={frontQ}
          infoQ={infoQ}
          hasSyllabus={hasSyllabus}
          currentFolderId={currentFolderId}
          onFolderChange={setCurrentFolderId}
          onOpenDetail={onOpenDetail}
          onNavigate={handleNavigate}
        />
      )}
    </Card>
  )
}
