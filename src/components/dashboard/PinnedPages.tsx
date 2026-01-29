import React from 'react'
import { Pin, ExternalLink, X, FileText, File, MessageSquare, Megaphone, Link as LinkIcon, BookOpen } from 'lucide-react'
import { Card } from '../ui/Card'
import { useAppContext } from '../../context/AppContext'

type PinnedItem = {
  id: string
  type: 'course' | 'assignment' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
  title: string
  subtitle?: string
  url?: string
  courseId?: string | number
  contentId?: string | number
}

type Props = {
  items: PinnedItem[]
  onUnpin: (id: string) => void
}

export const PinnedPages: React.FC<Props> = ({ items, onUnpin }) => {
  const ctx = useAppContext()

  const handleOpen = (item: PinnedItem) => {
    if (item.type === 'url' && item.url) {
        window.system.openExternal(item.url)
        return
    }
    
    if (!item.courseId) return

    switch (item.type) {
        case 'assignment':
            ctx.onOpenAssignment(item.courseId, item.contentId!, item.title)
            break
        case 'page':
            ctx.onOpenPage(item.courseId, String(item.contentId!), item.title)
            break
        case 'discussion':
            ctx.onOpenDiscussion(item.courseId, String(item.contentId!), item.title)
            break
        case 'announcement':
            ctx.onOpenAnnouncement(item.courseId, String(item.contentId!), item.title)
            break
        case 'file':
            ctx.onOpenFile(item.courseId, String(item.contentId!), item.title)
            break
        case 'course':
            ctx.onOpenCourse(item.courseId)
            break
    }
  }

  const handlePopOut = async (e: React.MouseEvent, item: PinnedItem) => {
    e.stopPropagation()
    if (item.type === 'url' || !item.courseId || !item.contentId) return
    
    // Only certain types support pop-out
    if (['page', 'assignment', 'announcement', 'discussion', 'file'].includes(item.type)) {
        await window.system.openContentWindow({
            courseId: String(item.courseId),
            type: item.type as any,
            contentId: String(item.contentId),
            title: item.title
        })
    }
  }

  const getIcon = (type: string) => {
      switch (type) {
          case 'assignment': return <FileText className="w-4 h-4" />
          case 'page': return <BookOpen className="w-4 h-4" />
          case 'discussion': return <MessageSquare className="w-4 h-4" />
          case 'announcement': return <Megaphone className="w-4 h-4" />
          case 'file': return <File className="w-4 h-4" />
          case 'url': return <LinkIcon className="w-4 h-4" />
          default: return <BookOpen className="w-4 h-4" />
      }
  }

  return (
    <Card className="h-full flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center">
            <Pin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
            Pinned Pages
            </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-1">
        {items.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 dark:text-neutral-400">
                <Pin className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Pin assignments, pages, or files here for quick access.</p>
            </div>
        )}
        
        {items.map((item) => (
            <div 
                key={item.id}
                onClick={() => handleOpen(item)}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            >
                <div className="w-8 h-8 rounded bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 flex items-center justify-center shrink-0 text-slate-500 dark:text-neutral-400">
                    {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
                    {item.subtitle && <div className="text-xs text-slate-500 dark:text-neutral-400 truncate">{item.subtitle}</div>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {['page', 'assignment', 'announcement', 'discussion', 'file'].includes(item.type) && (
                        <button 
                            onClick={(e) => handlePopOut(e, item)}
                            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                            title="Open in new window"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUnpin(item.id) }}
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 text-slate-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                        title="Unpin"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        ))}
      </div>
    </Card>
  )
}
