import React from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { BookOpen } from 'lucide-react'
import { extractAnnouncementIdFromUrl, extractCourseIdFromUrl } from '../../utils/urlHelpers'
import { formatDateTime } from '../../utils/dateFormat'
import { SkeletonList } from '../Skeleton'
import { CourseAvatar } from '../CourseAvatar'

type Announcement = {
  courseId?: string | number
  courseName?: string
  title: string
  postedAt?: string
  htmlUrl?: string
  topicId?: string
}

type Props = {
  announcements: Announcement[]
  loading: boolean
  onOpenAnnouncement?: (courseId: string | number, topicId: string, title: string) => void
  onOpenCourse?: (courseId: string | number) => void
  courseImageUrl: (courseId: string | number | undefined | null) => string | undefined
  navigate: (opts: { to: string }) => void
}

export const AnnouncementList: React.FC<Props> = ({ announcements, loading, onOpenAnnouncement, onOpenCourse, courseImageUrl, navigate }) => {
  return (
    <Card>
      <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-slate-100 dark:bg-neutral-800 grid place-items-center shrink-0">
            <BookOpen className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
          </span>
          <span className="truncate">Announcements</span>
        </span>
        <Button size="sm" variant="ghost" className="shrink-0 ml-auto" onClick={() => navigate({ to: '/announcements' })}>View all</Button>
      </h2>
      {loading && (
        <SkeletonList count={3} hasAvatar variant="simple" />
      )}
      {!loading && announcements.length === 0 ? (
        <div className="text-slate-500 dark:text-neutral-400 p-4 text-sm">No announcements</div>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-gray-100 dark:divide-neutral-800">
          {announcements.map((a, i) => {
            const open = () => {
              const tid = a.topicId ?? extractAnnouncementIdFromUrl(a.htmlUrl)
              const cid = a.courseId ?? extractCourseIdFromUrl(a.htmlUrl)
              if (tid && cid != null) onOpenAnnouncement?.(cid, tid, a.title)
              else if (cid != null) onOpenCourse?.(cid)
            }
            const cid = a.courseId ?? extractCourseIdFromUrl(a.htmlUrl)
            const img = courseImageUrl(cid as any)
            return (
              <li key={i} className="py-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                  className="cursor-pointer rounded-md px-2 sm:px-3 py-2 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-sm ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10"
                >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CourseAvatar
                          courseId={cid || ''}
                          courseName={a.courseName}
                          src={img}
                          className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                        />
                        <div className="min-w-0">
                        <div className="font-medium truncate" title={a.title}>{a.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Badge tone="brand">{a.courseName}</Badge>
                          <span className="mx-1">·</span>
                          <span>{a.postedAt ? formatDateTime(a.postedAt) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
