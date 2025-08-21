import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { FileText, Calendar, Star, Home as HomeIcon, BookOpen, Megaphone, ClipboardList, ScrollText, Percent } from 'lucide-react'
import { useCourseAssignments, useCourseInfo, useCourseFrontPage, useCourseTabs, useCourseFiles } from '../hooks/useCanvasQueries'
import { CourseGrades } from './CourseGrades'
import { CourseModules } from './CourseModules'
import { CourseFiles } from './CourseFiles'
import { CanvasContentView } from './CanvasContentView'
import { CourseLinks } from './CourseLinks'
import { CourseAnnouncements } from './CourseAnnouncements'
import { FloatingCourseTabs, type CourseTabKey } from './FloatingCourseTabs'
import { HtmlContent } from './HtmlContent'


type Props = {
  courseId: string | number
  courseName?: string
}

export const CourseView: React.FC<Props> = ({ courseId, courseName: _courseName }) => {
  const { data: items = [], isLoading, error } = useCourseAssignments(courseId, 200)
  const infoQ = useCourseInfo(courseId)
  const frontQ = useCourseFrontPage(courseId, { enabled: true })
  const tabsQ = useCourseTabs(courseId, true)
  const showLoading = (!items || items.length === 0) && isLoading
  const [content, setContent] = React.useState<{
    contentType: 'page' | 'assignment' | 'file' | 'announcement'
    contentId: string
    title: string
  } | null>(null)
  const [activeTab, setActiveTab] = React.useState<CourseTabKey>('announcements')

  // Determine available tabs
  const defaultView = (infoQ.data?.default_view || '').toLowerCase()
  const hasSyllabus = typeof infoQ.data?.syllabus_body === 'string' && infoQ.data?.syllabus_body.trim() !== ''
  const hasHome = defaultView === 'wiki'
  const hasFilesFromTabs = Array.isArray(tabsQ.data) && (tabsQ.data as any[]).some((t: any) => {
    const idOrType = String(t?.id || t?.type || '').toLowerCase()
    const label = String(t?.label || '').toLowerCase()
    return (!t?.hidden) && (idOrType.includes('files') || label.includes('files'))
  })
  // Fallback probe: if tabs didn’t reveal Files, try a 1-item files fetch; if it works and returns >0, enable Files tab
  const filesProbeQ = useCourseFiles(courseId, 1, 'updated_at', 'desc', { enabled: courseId != null && !!tabsQ.data && !hasFilesFromTabs })
  const hasFiles = hasFilesFromTabs || (!!filesProbeQ.data && (filesProbeQ.data as any[]).length > 0)

  const tabs = [
    ...(hasHome ? [{ key: 'home', label: 'Home', Icon: HomeIcon }] as any[] : []),
    ...(hasSyllabus ? [{ key: 'syllabus', label: 'Syllabus', Icon: ScrollText }] as any[] : []),
    { key: 'announcements', label: 'Announcements', Icon: Megaphone },
    ...(hasFiles ? [{ key: 'files', label: 'Files', Icon: FileText }] as any[] : []),
    { key: 'modules', label: 'Modules', Icon: BookOpen },
    { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
    { key: 'grades', label: 'Grades', Icon: Percent },
  ]

  // Set initial active tab based on course default view
  React.useEffect(() => {
    if (!defaultView) return
    const map: Record<string, CourseTabKey> = {
      wiki: 'home',
      modules: 'modules',
      assignments: 'assignments',
      syllabus: 'syllabus',
      feed: 'announcements',
    }
    const next = map[defaultView]
    if (next) setActiveTab(next)
  }, [defaultView])

  // Keep the floating tabs visible even when viewing content details

  return (
    <Card id="course-content-anchor" className="flex-1 overflow-y-auto relative">
      <FloatingCourseTabs current={activeTab} onChange={setActiveTab} anchorId="course-content-anchor" tabs={tabs as any} />

      {content ? (
        <div className="-m-5">
          <CanvasContentView
            courseId={courseId}
            contentType={content.contentType}
            contentId={content.contentId}
            title={content.title}
            onBack={() => setContent(null)}
          />
        </div>
      ) : (
        <>
          {activeTab === 'home' && (
            <div className="mt-2">
              {frontQ.isLoading && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}
              {frontQ.error && <div className="text-red-600">{String((frontQ.error as any)?.message || frontQ.error)}</div>}
              {frontQ.data?.body && (
                <HtmlContent html={frontQ.data.body} className="rich-html" />
              )}
            </div>
          )}

          {/* No separate wiki tab; Home renders front page */}

          {activeTab === 'syllabus' && (
            <div className="mt-2">
              {hasSyllabus ? (
                <HtmlContent html={infoQ.data?.syllabus_body || ''} className="rich-html" />
              ) : (
                <div className="text-slate-500 dark:text-slate-400">No syllabus</div>
              )}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="mt-2">
              <CourseAnnouncements
                courseId={courseId}
                onOpen={(topicId, title) => setContent({ contentType: 'announcement', contentId: topicId, title })}
              />
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="mt-2">
              <CourseModules
                courseId={courseId}
                onOpenExternal={(url) => window.open(url, '_blank', 'noreferrer')}
                onOpenContent={(c) => setContent({ contentType: c.contentType, contentId: String(c.contentId), title: c.title })}
              />
              <div className="mt-6">
                <CourseLinks courseId={courseId} />
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="mt-2">
              <CourseFiles
                courseId={courseId}
                onOpenContent={(c) => setContent({ contentType: 'file', contentId: String(c.contentId), title: c.title })}
              />
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="mt-2">
              <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Assignments</h3>
              {showLoading && <div className="text-slate-500 dark:text-slate-400 p-2">Loading…</div>}
              {error && <div className="text-red-600 p-2">{String(error.message || error)}</div>}
              {!showLoading && !error && items.length === 0 && (
                <div className="text-slate-500 dark:text-slate-400 p-3 flex items-center gap-2">📭 <span>No assignments found</span></div>
              )}
              {!showLoading && !error && items.length > 0 && (
                <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
                  {items.map((a, i) => {
                    const dueStr = a.dueAt ? new Date(a.dueAt).toLocaleString() : null
                    return (
                      <li className="py-2" key={i}>
                        <div className="flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium leading-snug truncate hover:text-slate-700 transition-colors dark:hover:text-slate-100/90">{a.name}</div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                                  <Star className="w-3 h-3" /> {a.pointsPossible ? `${a.pointsPossible} pts` : '—'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                                  <Calendar className="w-3 h-3" /> {dueStr ? `Due ${dueStr}` : 'No due date'}
                                </span>
                              </div>
                            </div>
                          </div>
                              {a.htmlUrl && (
                                <button onClick={() => window.system?.openExternal?.(a.htmlUrl)} className="inline-flex items-center px-2.5 py-1.5 rounded-control text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
                                  Open in Browser
                                </button>
                              )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="mt-2">
              <CourseGrades courseId={courseId} />
            </div>
          )}
        </>
      )}
    </Card>
  )
}
