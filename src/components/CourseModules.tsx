import React from 'react'
import { FileText, File, MessageSquare, Link as LinkIcon, BookOpen, MoreVertical } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseModules } from '../hooks/useCanvasQueries'
import type { CanvasModule, CanvasModuleItem, CanvasFile } from '../types/canvas'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'

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
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Modules</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
        {!isLoading && modules && modules.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No modules</div>
        )}
        {!isLoading && modules && modules.length > 0 && (
          <div className="space-y-3">
            {(modules as CanvasModule[]).map((m, i) => (
              <div key={i}>
                {/* Module header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-600 dark:text-neutral-300">{m.name}</span>
                  <span className="text-xs text-slate-400">{m?.moduleItemsConnection?.nodes?.length ?? 0} items</span>
                </div>
                
                {/* Module items as card-style list */}
                {(m.moduleItemsConnection?.nodes?.length ?? 0) > 0 && (
                  <ul className="list-none m-0 p-0 space-y-1">
                    {m.moduleItemsConnection?.nodes?.map((it: CanvasModuleItem, j: number) => {
                      const title = it.title || 'Item'
                      const kind = labelFor(it)
                      const menuId = String(it.id || `${i}-${j}`)
                      const isMenuOpen = menuOpenId === menuId
                      
                      return (
                        <li key={j}>
                          <ListItemRow
                            icon={iconFor(it)}
                            title={title}
                            subtitle={<MetadataBadge>{kind}</MetadataBadge>}
                            menuOpen={isMenuOpen}
                            onClick={() => openItem(it, title)}
                            menu={
                              it.htmlUrl ? (
                                <>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : menuId) }}
                                    className={`inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
                                    aria-label="More options"
                                    ref={(el) => { anchorEls.current.set(menuId, el) }}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  <Dropdown open={isMenuOpen} onOpenChange={(o) => setMenuOpenId(o ? menuId : null)} align="right" offsetY={32} anchorEl={anchorEls.current.get(menuId)}>
                                    <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(it.htmlUrl!) }}>
                                      Open in Browser
                                    </button>
                                  </Dropdown>
                                </>
                              ) : undefined
                            }
                          />
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
    </div>
  )
}
