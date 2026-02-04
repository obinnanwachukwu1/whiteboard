import React from 'react'
import type { CourseTabKey } from '../FloatingCourseTabs'
import { CourseGrades } from '../CourseGrades'
import { CourseModules } from '../CourseModules'
import { CourseFiles } from '../CourseFiles'
import { CourseLinks } from '../CourseLinks'
import { CourseAnnouncements } from '../CourseAnnouncements'
import { CourseAssignments } from '../CourseAssignments'
import { CourseDiscussions } from '../CourseDiscussions'
import { CoursePeople } from '../CoursePeople'
import { HtmlContent } from '../HtmlContent'
import { Skeleton, SkeletonText } from '../Skeleton'
import { useOptionalAIPanelActions } from '../../context/AIPanelContext'
import { stripHtmlToText } from '../../utils/stripHtmlToText'

type Detail = {
  contentType: 'page' | 'assignment' | 'file' | 'announcement' | 'discussion'
  contentId: string
  title: string
}

type Props = {
  activeTab: CourseTabKey
  courseId: string | number
  courseName?: string
  frontQ: any
  infoQ: any
  hasSyllabus: boolean
  currentFolderId: string | null
  onFolderChange: (id: string | null) => void
  onOpenDetail: (detail: Detail) => void
  onNavigate: (href: string, linkTitle?: string) => void
}

export const CourseTabContent: React.FC<Props> = ({
  activeTab,
  courseId,
  courseName,
  frontQ,
  infoQ,
  hasSyllabus,
  currentFolderId,
  onFolderChange,
  onOpenDetail,
  onNavigate,
}) => {
  const aiPanel = useOptionalAIPanelActions()
  const syllabusHtml = hasSyllabus ? String(infoQ.data?.syllabus_body || '') : ''

  React.useEffect(() => {
    if (!aiPanel) return

    if (activeTab !== 'syllabus' || !hasSyllabus || !syllabusHtml.trim()) {
      aiPanel.setContextOffer(null)
      return
    }

    aiPanel.setContextOffer({
      id: `syllabus:${String(courseId)}`,
      slot: 'view',
      kind: 'syllabus',
      courseId,
      courseName,
      title: 'Syllabus',
      contentText: stripHtmlToText(syllabusHtml).slice(0, 4000),
    })

    return () => {
      aiPanel.setContextOffer(null)
    }
  }, [aiPanel, activeTab, courseId, courseName, hasSyllabus, syllabusHtml])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {activeTab === 'home' && (
        <div className="flex-1 overflow-y-auto">
          <div className="mt-2">
            {frontQ.isLoading && (
              <div className="space-y-4">
                <Skeleton height="h-6" width="w-2/3" />
                <SkeletonText lines={10} />
              </div>
            )}
            {frontQ.error && (
              <div className="text-red-600">
                {String((frontQ.error as any)?.message || frontQ.error)}
              </div>
            )}
            {frontQ.data?.body && (
              <HtmlContent html={frontQ.data.body} className="rich-html" onNavigate={onNavigate} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'syllabus' && (
        <div className="flex-1 overflow-y-auto">
          <div className="mt-2">
            {hasSyllabus ? (
              <HtmlContent
                html={infoQ.data?.syllabus_body || ''}
                className="rich-html"
                onNavigate={onNavigate}
              />
            ) : (
              <div className="text-slate-500 dark:text-neutral-400">No syllabus</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseAnnouncements
            courseId={courseId}
            onOpen={(topicId, title) =>
              onOpenDetail({ contentType: 'announcement', contentId: topicId, title })
            }
          />
        </div>
      )}

      {activeTab === 'discussions' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseDiscussions
            courseId={courseId}
            onOpen={(topicId, title) =>
              onOpenDetail({ contentType: 'discussion', contentId: topicId, title })
            }
          />
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseModules
            courseId={courseId}
            courseName={courseName}
            onOpenExternal={onNavigate}
            onOpenContent={(c) =>
              onOpenDetail({
                contentType: c.contentType,
                contentId: String(c.contentId),
                title: c.title,
              })
            }
          />
        </div>
      )}

      {activeTab === 'links' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseLinks courseId={courseId} onNavigate={onNavigate} />
        </div>
      )}

      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseFiles
            courseId={courseId}
            courseName={courseName}
            currentFolderId={currentFolderId}
            onFolderChange={onFolderChange}
            onOpenContent={(c) =>
              onOpenDetail({
                contentType: 'file',
                contentId: String(c.contentId),
                title: c.title,
              })
            }
          />
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseAssignments courseId={courseId} onOpenDetail={onOpenDetail} />
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CourseGrades courseId={courseId} />
        </div>
      )}

      {activeTab === 'people' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <CoursePeople courseId={courseId} />
        </div>
      )}
    </div>
  )
}
