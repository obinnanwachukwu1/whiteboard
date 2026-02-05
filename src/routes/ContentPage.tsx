import { useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { CanvasContentView } from '../components/CanvasContentView'
import { DiscussionDetail } from '../components/DiscussionDetail'
import { useAppData } from '../context/AppContext'
import { openExternal } from '../utils/openExternal'

type SearchParams = {
  courseId?: string
  type?: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
  contentId?: string
  title?: string
  embed?: string
}

type ViewState = {
  type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
  contentId: string
  title: string
}

export default function ContentPage() {
  const search = useSearch({ from: '/content' }) as SearchParams
  const navigate = useNavigate()
  const data = useAppData()

  const courseId = String(search.courseId || '')
  // Robust check for embed flag: support string '1', boolean true, or direct URL check as fallback
  const embed = search.embed === '1' || (search as any).embed === true || (typeof window !== 'undefined' && window.location.hash.includes('embed=1'))

  // Initialize view state from URL params
  const [view, setView] = useState<ViewState | null>(() => {
    if (search.type && search.contentId) {
      return {
        type: search.type,
        contentId: search.contentId,
        title: search.title || 'Content'
      }
    }
    return null
  })

  // Navigation stack for embedded history
  const [history, setHistory] = useState<ViewState[]>([])

  const courseName = (data.courses || []).find((c: any) => String(c.id) === String(courseId))?.name

  const onBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setHistory(h => h.slice(0, -1))
      setView(prev)
      return
    }

    if (embed) {
      try { window.close() } catch {}
      return
    }
    navigate({ to: '/course/$courseId', params: { courseId } })
  }

  const handleNavigate = async (href: string) => {
    try {
      const u = new URL(href)
      const path = u.pathname
      const parts = path.split('/').filter(Boolean)
      const idxCourse = parts.indexOf('courses')
      const cid = idxCourse >= 0 && parts[idxCourse + 1] ? parts[idxCourse + 1] : null
      
      // Only handle navigation within the same course for now
      // (Cross-course navigation in embedded window is complex UX)
      const isSameCourse = cid && String(cid) === String(courseId)

      if (!isSameCourse) {
        await openExternal(href)
        return
      }

      const navigateTo = (type: ViewState['type'], id: string, title: string = 'Content') => {
        if (view) {
          setHistory(h => [...h, view])
        }
        setView({ type, contentId: id, title })
      }

      // Handle Assignments
      const idxAssign = parts.indexOf('assignments')
      if (idxAssign >= 0 && parts[idxAssign + 1]) {
        navigateTo('assignment', parts[idxAssign + 1], 'Assignment')
        return
      }

      // Handle Announcements/Discussions
      const idxDisc = parts.indexOf('discussion_topics')
      if (idxDisc >= 0 && parts[idxDisc + 1]) {
        // We need to guess if it's announcement or discussion, defaulting to discussion for generic topics
        // But commonly announcements are just a type of discussion topic. 
        // For embedded view, 'discussion' generic type handles both mostly OK, 
        // but let's try to infer if we can. 
        // Actually, the routing logic in CourseView separates them.
        // For now, let's treat generic discussion_topics as 'discussion' unless we know better.
        navigateTo('discussion', parts[idxDisc + 1], 'Discussion')
        return
      }

      // Handle Pages
      const idxPage = parts.indexOf('pages')
      if (idxPage >= 0 && parts[idxPage + 1]) {
        navigateTo('page', parts[idxPage + 1], 'Page')
        return
      }

      // Handle Files
      const idxFile = parts.indexOf('files')
      if (idxFile >= 0 && parts[idxFile + 1]) {
        const fileId = parts[idxFile + 1]
        // Filter out folder routes which also use /files/folder/xxx sometimes
        if (/^\d+$/.test(fileId)) {
          navigateTo('file', fileId, 'File')
          return
        }
      }

      // Handle Quizzes
      const idxQuiz = parts.indexOf('quizzes')
      if (idxQuiz >= 0 && parts[idxQuiz + 1]) {
        navigateTo('quiz', parts[idxQuiz + 1], 'Quiz')
        return
      }

      // Handle Module Item Redirects
      if (path.includes('/modules/items/')) {
        try {
          const res = await (window.canvas as any).resolveUrl(href)
          if (res.ok && res.data && res.data !== href) {
            handleNavigate(res.data)
            return
          }
        } catch {}
      }

      // Fallback
      await openExternal(href)

    } catch {
      await openExternal(href)
    }
  }

  if (!courseId || !view) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-600 dark:text-neutral-300">
        Missing content params.
      </div>
    )
  }

  if (view.type === 'discussion') {
    return (
      <DiscussionDetail 
        courseId={courseId} 
        courseName={courseName}
        topicId={view.contentId} 
        title={view.title} 
        onBack={onBack} 
        isEmbedded={embed}
        onNavigate={handleNavigate}
        canGoBack={history.length > 0}
      />
    )
  }

  return (
    <CanvasContentView
      courseId={courseId}
      courseName={courseName}
      contentType={view.type}
      contentId={view.contentId}
      title={view.title}
      onBack={onBack}
      isEmbedded={embed}
      onNavigate={handleNavigate}
      canGoBack={history.length > 0}
    />
  )
}
