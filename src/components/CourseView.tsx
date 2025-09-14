import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from './ui/Card'
import { FileText, Calendar, Star, Home as HomeIcon, BookOpen, Megaphone, ClipboardList, ScrollText, Percent, Link as LinkIcon } from 'lucide-react'
import { useCourseAssignments, useCourseInfo, useCourseFrontPage, useCourseTabs, useCourseFiles } from '../hooks/useCanvasQueries'
import type { CanvasAssignment } from '../types/canvas'
import { CourseGrades } from './CourseGrades'
import { CourseModules } from './CourseModules'
import { CourseFiles } from './CourseFiles'
import { CanvasContentView } from './CanvasContentView'
import { CourseLinks } from './CourseLinks'
import { CourseAnnouncements } from './CourseAnnouncements'
import { FloatingCourseTabs, type CourseTabKey } from './FloatingCourseTabs'
import { HtmlContent } from './HtmlContent'
import { computeResolvedTabs, hasFilesFromTabs } from '../utils/courseTabs'
import type { ResolvedTab } from '../types/ui'


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
  const [availableTabs, setAvailableTabs] = React.useState<ResolvedTab[] | null>(null)

  const assignmentsQ = useCourseAssignments(courseId, 200, { enabled: courseId != null && activeTab === 'assignments' })
  const infoQ = useCourseInfo(courseId)
  const frontQ = useCourseFrontPage(courseId, { enabled: activeTab === 'home' })
  const tabsQ = useCourseTabs(courseId, true, { staleTime: 1000 * 60 * 60 * 24 })
  const assignments: CanvasAssignment[] = (assignmentsQ.data || []) as CanvasAssignment[]
  const showLoading = (!assignments || assignments.length === 0) && assignmentsQ.isLoading

  // Determine available tabs
  const defaultView = (infoQ.data?.default_view || '').toLowerCase()
  const hasSyllabus = typeof infoQ.data?.syllabus_body === 'string' && infoQ.data?.syllabus_body.trim() !== ''
  const hasHome = defaultView === 'wiki'
  const hasFilesViaTabs = hasFilesFromTabs(tabsQ.data as any)
  // Fallback probe: if tabs didn’t reveal Files, try a 1-item files fetch; if it works and returns >0, enable Files tab
  const filesProbeQ = useCourseFiles(courseId, 1, 'updated_at', 'desc', { enabled: courseId != null && !!tabsQ.data && !hasFilesViaTabs })
  const hasFiles = hasFilesViaTabs || (Array.isArray(filesProbeQ.data) && filesProbeQ.data.length > 0)
  const hasLinks = Array.isArray(tabsQ.data) && (tabsQ.data as any[]).length > 0

  // Recompute tabs whenever course info or tabs data change
  React.useEffect(() => {
    const base = computeResolvedTabs(infoQ.data || null, (tabsQ.data as any[]) || [], hasFiles)
    setAvailableTabs(base)
    // Only cache when actual tabs list has been fetched for this course
    const fallbackOnly = !hasHome && !hasSyllabus && !hasFiles && !hasLinks
    if (Array.isArray(tabsQ.data) && !fallbackOnly) {
      queryClient.setQueryData(['course-resolved-tabs', String(courseId)], base)
    }
  }, [courseId, hasHome, hasSyllabus, hasFiles, hasLinks, tabsQ.data])

  // Reset and seed availableTabs on course change
  React.useEffect(() => {
    setAvailableTabs(null)
    const cachedTabs = queryClient.getQueryData<ResolvedTab[]>(['course-resolved-tabs', String(courseId)])
    if (cachedTabs && cachedTabs.length) setAvailableTabs(cachedTabs)
  }, [courseId])

  // If no cached tabs yet, seed a fast fallback so skeleton is minimal
  React.useEffect(() => {
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
  const handleNavigate = async (href: string) => {
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
      if (!isInternal) { (await import('../utils/openExternal')).openExternal(href); return }
      if (openAssignment()) return
      if (openAnnouncement()) return
      if (openPage()) return
      if (openFile()) return
      if (withinCurrent && idxCourse >= 0) { onChangeTab('modules'); return }
      ;(await import('../utils/openExternal')).openExternal(href)
    } catch {
      ;(await import('../utils/openExternal')).openExternal(href)
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
          tabs={availableTabs.map((t) => ({ key: t.key, label: t.label, Icon: ({
            home: HomeIcon,
            wiki: HomeIcon,
            syllabus: ScrollText,
            announcements: Megaphone,
            files: FileText,
            modules: BookOpen,
            links: LinkIcon,
            assignments: ClipboardList,
            grades: Percent,
          } as const)[t.key] })) as any}
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
              {frontQ.isLoading && <div className="text-slate-500 dark:text-neutral-400">Loading…</div>}
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
                <div className="text-slate-500 dark:text-neutral-400">No syllabus</div>
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
                onOpenExternal={async (url) => { (await import('../utils/openExternal')).openExternal(url) }}
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
              {showLoading && <div className="text-slate-500 dark:text-neutral-400 p-2">Loading…</div>}
              {assignmentsQ.error && <div className="text-red-600 p-2">{String((assignmentsQ.error as any).message || assignmentsQ.error)}</div>}
              {!showLoading && !assignmentsQ.error && assignments.length === 0 && (
                <div className="text-slate-500 dark:text-neutral-400 p-3 flex items-center gap-2">📭 <span>No assignments found</span></div>
              )}
              {!showLoading && !assignmentsQ.error && assignments.length > 0 && (
                <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-neutral-700">
                  {assignments.map((a, i) => {
                    const dueStr = a.dueAt ? new Date(a.dueAt).toLocaleString() : null
                    const restId = String((a._id ?? a.id ?? '') as any)
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
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-300">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                                  <Star className="w-3 h-3" /> {typeof a.pointsPossible === 'number' ? `${a.pointsPossible} pts` : '—'}
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
