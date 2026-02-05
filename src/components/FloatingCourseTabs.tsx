import React from 'react'
import { BookOpen, Megaphone, FileText, Percent, Link as LinkIcon } from 'lucide-react'
import { FloatingTabs, type FloatingTab } from './FloatingTabs'

export type CourseTabKey =
  | 'home'
  | 'wiki'
  | 'syllabus'
  | 'announcements'
  | 'discussions'
  | 'files'
  | 'modules'
  | 'links'
  | 'assignments'
  | 'quizzes'
  | 'grades'
  | 'people'

type TabDesc = FloatingTab<CourseTabKey>
type Props = {
  current: CourseTabKey
  onChange: (tab: CourseTabKey) => void
  anchorId?: string
  tabs?: TabDesc[]
  onHover?: (tab: CourseTabKey) => void
}

const defaultTabs: TabDesc[] = [
  { key: 'announcements', label: 'Announcements', Icon: Megaphone },
  { key: 'modules', label: 'Modules', Icon: BookOpen },
  { key: 'links', label: 'Links', Icon: LinkIcon },
  { key: 'assignments', label: 'Assignments', Icon: FileText },
  { key: 'quizzes', label: 'Quizzes', Icon: FileText },
  { key: 'grades', label: 'Grades', Icon: Percent },
]

export const FloatingCourseTabs: React.FC<Props> = ({ current, onChange, anchorId, tabs, onHover }) => {
  const tabList = tabs || defaultTabs
  return (
    <FloatingTabs
      current={current}
      onChange={onChange}
      anchorId={anchorId}
      tabs={tabList}
      onHover={onHover}
    />
  )
}
