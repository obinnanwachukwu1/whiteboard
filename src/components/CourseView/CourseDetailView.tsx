import React from 'react'
import { CanvasContentView } from '../CanvasContentView'
import { DiscussionDetail } from '../DiscussionDetail'

type Detail = {
  contentType: 'page' | 'assignment' | 'file' | 'announcement' | 'discussion'
  contentId: string
  title: string
}

type Props = {
  content: Detail
  courseId: string | number
  courseName?: string
  onClearDetail: () => void
  onNavigate: (href: string, linkTitle?: string) => void
}

export const CourseDetailView: React.FC<Props> = ({
  content,
  courseId,
  courseName,
  onClearDetail,
  onNavigate,
}) => {
  return (
    <div className="flex-1 -m-5 flex flex-col overflow-hidden bg-white dark:bg-neutral-900 rounded-card">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
        {content.contentType === 'discussion' ? (
          <DiscussionDetail
            courseId={courseId}
            topicId={content.contentId}
            title={content.title}
            onBack={onClearDetail}
          />
        ) : (
          <CanvasContentView
            courseId={courseId}
            courseName={courseName}
            contentType={content.contentType}
            contentId={content.contentId}
            title={content.title}
            onBack={onClearDetail}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  )
}
