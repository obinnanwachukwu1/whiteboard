import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from './ui/Card'
import { FileText, Home as HomeIcon, BookOpen, Megaphone, ClipboardList, ScrollText, Percent, Link as LinkIcon } from 'lucide-react'
import { useCourseInfo, useCourseFrontPage, useCourseTabs, useCourseFiles } from '../hooks/useCanvasQueries'
import { CourseGrades } from './CourseGrades'
import { CourseModules } from './CourseModules'
import { CourseFiles } from './CourseFiles'
import { CanvasContentView } from './CanvasContentView'
import { CourseLinks } from './CourseLinks'
import { CourseAnnouncements } from './CourseAnnouncements'
import { CourseAssignments } from './CourseAssignments'
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
  // Persist current folder for Files tab so navigating back from a file returns to the same folder
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)

  const infoQ = useCourseInfo(courseId)
  const frontQ = useCourseFrontPage(courseId, { enabled: activeTab === 'home' })
  const tabsQ = useCourseTabs(courseId, true, { staleTime: 1000 * 60 * 60 * 24 })

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
    setCurrentFolderId(null) // Reset folder when switching courses
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
    <Card id="course-content-anchor" className="flex-1 flex flex-col overflow-hidden relative">
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
        <div className="flex-1 -m-5 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <CanvasContentView
              courseId={courseId}
              contentType={content.contentType}
              contentId={content.contentId}
              title={content.title}
              onBack={onClearDetail}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'home' && (
            <div className="flex-1 overflow-y-auto">
              <div className="mt-2">
                {frontQ.isLoading && <div className="text-slate-500 dark:text-neutral-400">Loading…</div>}
                {frontQ.error && <div className="text-red-600">{String((frontQ.error as any)?.message || frontQ.error)}</div>}
                {frontQ.data?.body && (
                  <HtmlContent html={frontQ.data.body} className="rich-html" onNavigate={handleNavigate} />
                )}
              </div>
            </div>
          )}

          {/* No separate wiki tab; Home renders front page */}

          {activeTab === 'syllabus' && (
            <div className="flex-1 overflow-y-auto">
              <div className="mt-2">
                {hasSyllabus ? (
                  <HtmlContent html={infoQ.data?.syllabus_body || ''} className="rich-html" onNavigate={handleNavigate} />
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
                onOpen={(topicId, title) => onOpenDetail({ contentType: 'announcement', contentId: topicId, title })}
              />
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CourseModules
                courseId={courseId}
                onOpenExternal={async (url) => { (await import('../utils/openExternal')).openExternal(url) }}
                onOpenContent={(c) => onOpenDetail({ contentType: c.contentType, contentId: String(c.contentId), title: c.title })}
              />
            </div>
          )}

          {activeTab === 'links' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CourseLinks courseId={courseId} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CourseFiles
                courseId={courseId}
                currentFolderId={currentFolderId}
                onFolderChange={setCurrentFolderId}
                onOpenContent={(c) => onOpenDetail({ contentType: 'file', contentId: String(c.contentId), title: c.title })}
              />
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CourseAssignments 
                courseId={courseId}
                onOpenDetail={onOpenDetail}
              />
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CourseGrades courseId={courseId} />
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
