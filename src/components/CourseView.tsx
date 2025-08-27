import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { FileText, Calendar, Star, Home as HomeIcon, BookOpen, Megaphone, ClipboardList, ScrollText, Percent, Link as LinkIcon } from 'lucide-react'
import { useCourseAssignments, useCourseInfo, useCourseFrontPage, useCourseTabs, useCourseFiles } from '../hooks/useCanvasQueries'
import { CourseGrades } from './CourseGrades'
import { CourseModules } from './CourseModules'
import { CourseFiles } from './CourseFiles'
import { CanvasContentView } from './CanvasContentView'
import { CourseLinks } from './CourseLinks'
import { CourseAnnouncements } from './CourseAnnouncements'
import { FloatingCourseTabs, type CourseTabKey } from './FloatingCourseTabs'
import { HtmlContent } from './HtmlContent'


type Detail = { contentType: 'page' | 'assignment' | 'file' | 'announcement'; contentId: string; title: string }

type Props = {
  courseId: string | number
  courseName?: string
  activeTab: CourseTabKey
  onChangeTab: (tab: CourseTabKey) => void
  content: Detail | null
  onOpenDetail: (detail: Detail) => void
  onClearDetail: () => void
  baseUrl?: string
  onNavigateCourse?: (courseId: string | number, init?: { type: 'assignment' | 'announcement' | 'page' | 'file'; id: string; title?: string }) => void
}

export const CourseView: React.FC<Props> = ({ courseId, courseName: _courseName, activeTab, onChangeTab, content, onOpenDetail, onClearDetail, baseUrl, onNavigateCourse }) => {
  const queryClient = useQueryClient()
  const [availableTabs, setAvailableTabs] = React.useState<any[] | null>(null)

  const { data: items = [], isLoading, error } = useCourseAssignments(courseId, 200, { enabled: courseId != null && activeTab === 'assignments' })
  const infoQ = useCourseInfo(courseId)
  const frontQ = useCourseFrontPage(courseId, { enabled: activeTab === 'home' })
  const tabsQ = useCourseTabs(courseId, true, { staleTime: 1000 * 60 * 60 * 24 })
  const showLoading = (!items || items.length === 0) && isLoading

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
  const hasLinks = Array.isArray(tabsQ.data) && (tabsQ.data as any[]).length > 0

  // Gate rendering tabs until we know the final list to avoid pop-ins
  const infoFetched = !!(infoQ.isFetched || infoQ.isSuccess || infoQ.data || infoQ.error)
  const tabsFetched = !!(tabsQ.isFetched || tabsQ.isSuccess || tabsQ.data || tabsQ.error)
  // Don't block on files probe; we can add Files tab later
  const tabsReady = infoFetched || tabsFetched

  React.useEffect(() => {
    if (!tabsReady) return
    const nextTabs: any[] = [
      ...(hasHome ? [{ key: 'home', label: 'Home', Icon: HomeIcon }] as any[] : []),
      ...(hasSyllabus ? [{ key: 'syllabus', label: 'Syllabus', Icon: ScrollText }] as any[] : []),
      { key: 'announcements', label: 'Announcements', Icon: Megaphone },
      ...(hasFiles ? [{ key: 'files', label: 'Files', Icon: FileText }] as any[] : []),
      { key: 'modules', label: 'Modules', Icon: BookOpen },
      ...(hasLinks ? [{ key: 'links', label: 'Links', Icon: LinkIcon }] as any[] : []),
      { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
      { key: 'grades', label: 'Grades', Icon: Percent },
    ]
    setAvailableTabs(nextTabs)
    // Cache resolved tabs in query cache to avoid recompute flicker next time
    queryClient.setQueryData(['course-resolved-tabs', String(courseId)], nextTabs)
  }, [tabsReady, hasHome, hasSyllabus, hasFiles, hasLinks])

  // Seed availableTabs from cache immediately to minimize skeleton time
  React.useEffect(() => {
    const cachedTabs = queryClient.getQueryData<any>(['course-resolved-tabs', String(courseId)])
    if (cachedTabs && !availableTabs) setAvailableTabs(cachedTabs)
  }, [courseId])

  // If no cached tabs yet, seed a fast fallback so skeleton is minimal
  React.useEffect(() => {
    if (availableTabs) return
    const cachedInfo = queryClient.getQueryData<any>(['course-info', String(courseId)]) as any
    const dv = String(cachedInfo?.default_view || '').toLowerCase()
    const showHome = dv === 'wiki'
    const fallback: any[] = [
      ...(showHome ? [{ key: 'home', label: 'Home', Icon: HomeIcon }] as any[] : []),
      { key: 'announcements', label: 'Announcements', Icon: Megaphone },
      { key: 'modules', label: 'Modules', Icon: BookOpen },
      { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
      { key: 'grades', label: 'Grades', Icon: Percent },
    ]
    setAvailableTabs(fallback)
  }, [availableTabs, courseId])

  // Keep the skeleton aligned with the main content anchor
  const [skeletonLeft, setSkeletonLeft] = React.useState<number | null>(null)
  React.useEffect(() => {
    function compute() {
      const el = document.getElementById('course-content-anchor')
      if (!el) { setSkeletonLeft(null); return }
      const rect = el.getBoundingClientRect()
      setSkeletonLeft(rect.left + rect.width / 2)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [courseId])

  // Controlled: default selection and deep-link behavior handled by parent (App)

  // Central link handler for rich HTML content
  const handleNavigate = (href: string) => {
    try {
      const u = new URL(href)
      const originMatch = baseUrl ? u.origin === new URL(baseUrl).origin : false
      const path = u.pathname
      const parts = path.split('/').filter(Boolean)
      const idxCourse = parts.indexOf('courses')
      const cid = idxCourse >= 0 && parts[idxCourse + 1] ? parts[idxCourse + 1] : null
      const withinCurrent = cid && String(cid) === String(courseId)

      const openAssignment = () => {
        const idx = parts.indexOf('assignments')
        const id = idx >= 0 ? parts[idx + 1] : null
        if (id) {
          if (withinCurrent) { onChangeTab('assignments'); onOpenDetail({ contentType: 'assignment', contentId: String(id), title: 'Assignment' }) }
          else if (cid) onNavigateCourse?.(cid, { type: 'assignment', id: String(id) })
          return true
        }
        return false
      }
      const openAnnouncement = () => {
        const idxD = parts.indexOf('discussion_topics')
        const idxA = parts.indexOf('announcements')
        const idx = idxD >= 0 ? idxD : idxA
        const id = idx >= 0 ? parts[idx + 1] : null
        if (id) {
          if (withinCurrent) { onChangeTab('announcements'); onOpenDetail({ contentType: 'announcement', contentId: String(id), title: 'Announcement' }) }
          else if (cid) onNavigateCourse?.(cid, { type: 'announcement', id: String(id) })
          return true
        }
        return false
      }
      const openPage = () => {
        const idxP = parts.indexOf('pages')
        const slug = idxP >= 0 ? parts[idxP + 1] : null
        if (slug) {
          if (withinCurrent) { onChangeTab('home'); onOpenDetail({ contentType: 'page', contentId: String(slug), title: 'Page' }) }
          else if (cid) onNavigateCourse?.(cid, { type: 'page', id: String(slug) })
          return true
        }
        return false
      }
      const openFile = () => {
        const idxF = parts.indexOf('files')
        const seg = idxF >= 0 ? parts[idxF + 1] : null
        // Only treat as file if immediate segment after 'files' is numeric (avoid folder routes)
        if (seg && /^\d+$/.test(seg)) {
          const fid = seg
          if (withinCurrent) { onChangeTab('files'); onOpenDetail({ contentType: 'file', contentId: String(fid), title: 'File' }) }
          else if (cid) onNavigateCourse?.(cid, { type: 'file', id: String(fid) })
          return true
        }
        return false
      }

      const isInternal = originMatch || path.startsWith('/courses') || path.startsWith('/files')
      if (!isInternal) { window.system?.openExternal?.(href); return }
      if (openAssignment()) return
      if (openAnnouncement()) return
      if (openPage()) return
      if (openFile()) return
      if (withinCurrent && idxCourse >= 0) { onChangeTab('modules'); return }
      window.system?.openExternal?.(href)
    } catch {
      window.system?.openExternal?.(href)
    }
  }

  // No detail/content resets here; parent controls tab/content. Keep tabs seeded via cache above.

  return (
    <Card id="course-content-anchor" className="flex-1 overflow-y-auto relative">
      {availableTabs && (
        <FloatingCourseTabs
          current={activeTab}
          onChange={(t) => { onClearDetail(); onChangeTab(t) }}
          anchorId="course-content-anchor"
          tabs={availableTabs as any}
        />
      )}
      {!availableTabs && (
        <div
          className="fixed top-16 z-40 px-2 py-2"
          style={{ left: skeletonLeft ?? '50%', transform: 'translateX(-50%)' }}
          aria-hidden
        >
          <div className="inline-flex items-center gap-1 rounded-full overflow-hidden ring-1 ring-gray-200/60 dark:ring-neutral-800/60 bg-white/60 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg">
            {[72, 96, 88, 84].map((w, i) => (
              <div key={i} className="h-8 mx-[1px] rounded-full bg-slate-200/70 dark:bg-neutral-800/70 animate-pulse" style={{ width: w }} />
            ))}
          </div>
        </div>
      )}

      {content ? (
        <div className="-m-5">
          <CanvasContentView
            courseId={courseId}
            contentType={content.contentType}
            contentId={content.contentId}
            title={content.title}
            onBack={onClearDetail}
            onNavigate={handleNavigate}
          />
        </div>
      ) : (
        <>
          {activeTab === 'home' && (
            <div className="mt-2">
              {frontQ.isLoading && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}
              {frontQ.error && <div className="text-red-600">{String((frontQ.error as any)?.message || frontQ.error)}</div>}
              {frontQ.data?.body && (
                <HtmlContent html={frontQ.data.body} className="rich-html" onNavigate={handleNavigate} />
              )}
            </div>
          )}

          {/* No separate wiki tab; Home renders front page */}

          {activeTab === 'syllabus' && (
            <div className="mt-2">
              {hasSyllabus ? (
                <HtmlContent html={infoQ.data?.syllabus_body || ''} className="rich-html" onNavigate={handleNavigate} />
              ) : (
                <div className="text-slate-500 dark:text-slate-400">No syllabus</div>
              )}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="mt-2">
              <CourseAnnouncements
                courseId={courseId}
                onOpen={(topicId, title) => onOpenDetail({ contentType: 'announcement', contentId: topicId, title })}
              />
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="mt-2">
              <CourseModules
                courseId={courseId}
                onOpenExternal={(url) => window.open(url, '_blank', 'noreferrer')}
                onOpenContent={(c) => onOpenDetail({ contentType: c.contentType, contentId: String(c.contentId), title: c.title })}
              />
            </div>
          )}

          {activeTab === 'links' && (
            <div className="mt-2">
              <CourseLinks courseId={courseId} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="mt-2">
              <CourseFiles
                courseId={courseId}
                onOpenContent={(c) => onOpenDetail({ contentType: 'file', contentId: String(c.contentId), title: c.title })}
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
                    const restId = String((a as any)?._id ?? '')
                    return (
                      <li className="py-2" key={i}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => restId && onOpenDetail({ contentType: 'assignment', contentId: restId, title: a.name })}
                          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && restId) { e.preventDefault(); onOpenDetail({ contentType: 'assignment', contentId: restId, title: a.name }) } }}
                          className="cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors"
                        >
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
                          <div className="shrink-0 text-xs text-slate-500">Open</div>
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
