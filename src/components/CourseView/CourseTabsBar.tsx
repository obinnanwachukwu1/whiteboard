import React from 'react'
import {
  FileText,
  Home as HomeIcon,
  BookOpen,
  Megaphone,
  MessageCircle,
  ClipboardList,
  ScrollText,
  Percent,
  Link as LinkIcon,
  Users,
} from 'lucide-react'
import { FloatingCourseTabs, type CourseTabKey } from '../FloatingCourseTabs'
import type { ResolvedTab } from '../../types/ui'

type Props = {
  availableTabs: ResolvedTab[] | null
  activeTab: CourseTabKey
  onChangeTab: (t: CourseTabKey) => void
  onHover: (t: CourseTabKey) => void
  skeletonLeft: number | null
}

export const CourseTabsBar: React.FC<Props> = ({
  availableTabs,
  activeTab,
  onChangeTab,
  onHover,
  skeletonLeft,
}) => {
  if (!availableTabs) {
    return (
      <div
        className="fixed top-16 z-40 px-2 py-2"
        style={{ left: skeletonLeft ?? '50%', transform: 'translateX(-50%)' }}
        aria-hidden
      >
        <div className="inline-flex items-center gap-1 rounded-full overflow-hidden ring-1 ring-gray-200/60 dark:ring-neutral-800/60 bg-white/60 dark:bg-neutral-900/70 shadow-lg">
          {[72, 96, 88, 84].map((w, i) => (
            <div
              key={i}
              className="h-8 mx-[1px] rounded-full bg-slate-200/70 dark:bg-neutral-800/70 animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <FloatingCourseTabs
      current={activeTab}
      onChange={onChangeTab}
      onHover={onHover}
      anchorId="course-content-anchor"
      tabs={
        availableTabs.map((t) => ({
          key: t.key,
          label:
            (
              {
                home: 'Home',
                wiki: 'Home',
                syllabus: 'Syllabus',
                announcements: 'Announcements',
                discussions: 'Discussions',
                files: 'Files',
                modules: 'Modules',
                links: 'Links',
                assignments: 'Assignments',
                grades: 'Grades',
                people: 'People',
              } as const
            )[t.key] || t.label,
          Icon: (
            {
              home: HomeIcon,
              wiki: HomeIcon,
              syllabus: ScrollText,
              announcements: Megaphone,
              discussions: MessageCircle,
              files: FileText,
              modules: BookOpen,
              links: LinkIcon,
              assignments: ClipboardList,
              grades: Percent,
              people: Users,
            } as const
          )[t.key],
        })) as any
      }
    />
  )
}
