import React from 'react'
import { FileText, File, MessageSquare, Link as LinkIcon, BookOpen, MoreVertical } from 'lucide-react'
import { useCourseModules } from '../hooks/useCanvasQueries'
import type { CanvasModule, CanvasModuleItem, CanvasFile } from '../types/canvas'

type Props = {
  courseId: string | number
  onOpenExternal?: (url: string) => void
  onOpenContent?: (content: {
    courseId: string | number
    contentType: 'page' | 'assignment' | 'file'
    contentId: string
    title: string
  }) => void
}

export const CourseModules: React.FC<Props> = ({ courseId, onOpenExternal, onOpenContent }) => {
  const { data: modules = null, isLoading, error } = useCourseModules(courseId)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const [menuVisible, setMenuVisible] = React.useState(false)

  async function openItem(it: CanvasModuleItem, title: string) {
    if (it.__typename === 'PageModuleItem' || it.pageUrl) {
      onOpenContent?.({ courseId, contentType: 'page', contentId: it.pageUrl || '', title })
      return
    }
    if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
      onOpenContent?.({ courseId, contentType: 'assignment', contentId: String(it.contentId), title })
      return
    }
    if (it.__typename === 'FileModuleItem' || (it.__typename === 'ModuleItem' && it.contentId && it.title?.match(/\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|mp4|mov|avi)$/i))) {
      if (!it.contentId) {
        if (it.htmlUrl) onOpenExternal?.(it.htmlUrl)
        return
      }
      const res = await window.canvas.getFile?.(it.contentId)
      if (res?.ok) {
        const fileData = res.data as CanvasFile
        const fileName = fileData?.display_name || fileData?.filename || title
        const contentType = fileData?.content_type || ''
        const isViewableFile = /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|bmp|svg|avif|mp3|wav|ogg|m4a|aac|mp4|webm|mov|m4v)$/i.test(fileName)
          || /^(application\/(pdf|vnd\.openxmlformats-officedocument|vnd\.ms-)|image\/|audio\/|video\/)/i.test(contentType)
        if (isViewableFile) {
          onOpenContent?.({ courseId, contentType: 'file', contentId: String(it.contentId), title: fileName })
        } else {
          const url = fileData?.url as string | undefined
          if (url) onOpenExternal?.(url)
        }
      }
      return
    }
    if (it.htmlUrl) {
      onOpenExternal?.(it.htmlUrl)
    }
  }

  React.useEffect(() => {
    if (menuOpenId) {
      const raf = requestAnimationFrame(() => setMenuVisible(true))
      const onDocKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpenId(null) }
      const onDocClick = (e: MouseEvent) => {
        const t = e.target as HTMLElement
        if (t.closest('[data-mod-menu]') || t.closest('[data-mod-more]')) return
        setMenuOpenId(null)
      }
      document.addEventListener('keydown', onDocKey)
      document.addEventListener('mousedown', onDocClick)
      return () => { cancelAnimationFrame(raf); setMenuVisible(false); document.removeEventListener('keydown', onDocKey); document.removeEventListener('mousedown', onDocClick) }
    } else {
      const t = setTimeout(() => setMenuVisible(false), 150)
      return () => clearTimeout(t)
    }
  }, [menuOpenId])

  const iconFor = (n: CanvasModuleItem) => {
    switch (n?.__typename) {
      case 'AssignmentModuleItem': return <FileText className="w-4 h-4" />
      case 'PageModuleItem': return <BookOpen className="w-4 h-4" />
      case 'FileModuleItem': return <File className="w-4 h-4" />
      case 'DiscussionModuleItem': return <MessageSquare className="w-4 h-4" />
      case 'ExternalUrlModuleItem': return <LinkIcon className="w-4 h-4" />
      case 'QuizModuleItem': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const labelFor = (n: CanvasModuleItem) => {
    switch (n?.__typename) {
      case 'AssignmentModuleItem': return 'Assignment'
      case 'PageModuleItem': return 'Page'
      case 'FileModuleItem': return 'File'
      case 'DiscussionModuleItem': return 'Discussion'
      case 'ExternalUrlModuleItem': return 'Link'
      case 'QuizModuleItem': return 'Quiz'
      default: return 'Item'
    }
  }

  return (
    <div>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-base font-semibold">Modules</h3>
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
      {!isLoading && modules && modules.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 text-sm">No modules</div>
      )}
      {!isLoading && modules && modules.length > 0 && (
        <div className="space-y-3">
          {(modules as CanvasModule[]).map((m, i) => (
            <div key={i} className="rounded-card ring-1 ring-gray-200 dark:ring-slate-700 overflow-hidden">
              <div className="px-4 py-2 font-medium bg-gradient-to-r from-slate-50/70 to-transparent dark:from-neutral-800/40 flex items-center justify-between">
                <span>{m.name}</span>
                <span className="text-xs text-slate-500">{m?.moduleItemsConnection?.nodes?.length ?? 0} items</span>
              </div>
              {(m.moduleItemsConnection?.nodes?.length ?? 0) > 0 && (
                <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
                  {m.moduleItemsConnection?.nodes?.map((it: CanvasModuleItem, j: number) => {
                    const title = it.title || 'Item'
                    const kind = labelFor(it)
                    return (
                      <li key={j} className="px-3 sm:px-4 py-2 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openItem(it, title)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(it, title) } }}
                          className="group cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center">
                              {iconFor(it)}
                            </div>
                            <div className="truncate">
                              <div className="truncate font-medium group-hover:underline decoration-slate-300 dark:decoration-neutral-700">{title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">{kind}</span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 sm:gap-2 relative">
                            {it.htmlUrl && (
                              <>
                                <button
                                  data-mod-more
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === String(it.id || `${i}-${j}`) ? null : String(it.id || `${i}-${j}`)) }}
                                  className="inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  aria-label="More options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuOpenId === String(it.id || `${i}-${j}`) && (
                                  <>
                                    <div className="fixed inset-0 z-[105]" aria-hidden onClick={() => setMenuOpenId(null)} />
                                    <div
                                      data-mod-menu
                                      role="menu"
                                      className={`absolute right-0 top-8 z-[110] min-w-[180px] rounded-md shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md overflow-hidden origin-top-right transition-all duration-150 ease-out ${menuVisible ? 'opacity-100 translate-y-0 scale-100 animate-pop' : 'opacity-0 translate-y-1 scale-95'}`}
                                    >
                                      <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(it.htmlUrl!) }}>
                                        Open in Browser
                                      </button>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
