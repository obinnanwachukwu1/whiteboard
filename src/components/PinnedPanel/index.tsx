import React from 'react'
import {
  BookOpen,
  ExternalLink,
  File,
  FileText,
  Link as LinkIcon,
  Megaphone,
  MessageCircle,
  Pin,
  X,
} from 'lucide-react'
import { useAppActions, useAppData, type AppDataValue } from '../../context/AppContext'
import { ListItemRow } from '../ui/ListItemRow'
import { SlideInPanel } from '../SlideInPanel'

type Props = {
  isOpen: boolean
  onClose: () => void
}

type PinnedItem = AppDataValue['pinnedItems'][number]

const POPOUT_TYPES = new Set(['page', 'assignment', 'quiz', 'announcement', 'discussion', 'file'])

export const PinnedPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const data = useAppData()
  const actions = useAppActions()
  const courseNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const course of data.courses || []) {
      const id = String(course?.id ?? '')
      const name = String(course?.name || course?.course_code || '').trim()
      if (id && name) map.set(id, name)
    }
    return map
  }, [data.courses])

  const subtitleForItem = React.useCallback(
    (item: PinnedItem) => {
      if (item.courseId == null) return item.subtitle
      return courseNameById.get(String(item.courseId)) || item.subtitle
    },
    [courseNameById],
  )

  const handleOpen = (item: PinnedItem) => {
    if (item.type === 'url' && item.url) {
      window.system?.openExternal?.(item.url)
      onClose()
      return
    }

    if (!item.courseId) return

    switch (item.type) {
      case 'assignment':
        actions.onOpenAssignment(item.courseId, item.contentId!, item.title)
        break
      case 'quiz':
        actions.onOpenQuiz(item.courseId, item.contentId!, item.title)
        break
      case 'page':
        actions.onOpenPage(item.courseId, String(item.contentId!), item.title)
        break
      case 'discussion':
        actions.onOpenDiscussion(item.courseId, String(item.contentId!), item.title)
        break
      case 'announcement':
        actions.onOpenAnnouncement(item.courseId, String(item.contentId!), item.title)
        break
      case 'file':
        actions.onOpenFile(item.courseId, String(item.contentId!), item.title)
        break
      case 'course':
        actions.onOpenCourse(item.courseId)
        break
      default:
        break
    }

    onClose()
  }

  const handlePopOut = async (e: React.MouseEvent, item: PinnedItem) => {
    e.stopPropagation()
    if (!item.courseId || !item.contentId || !POPOUT_TYPES.has(item.type)) return

    await window.system?.openContentWindow?.({
      courseId: String(item.courseId),
      type: item.type as 'page' | 'assignment' | 'quiz' | 'announcement' | 'discussion' | 'file',
      contentId: String(item.contentId),
      title: item.title,
    })
  }

  const getIcon = (type: PinnedItem['type']) => {
    switch (type) {
      case 'assignment':
      case 'quiz':
        return <FileText className="w-4 h-4" />
      case 'page':
      case 'course':
        return <BookOpen className="w-4 h-4" />
      case 'discussion':
        return <MessageCircle className="w-4 h-4" />
      case 'announcement':
        return <Megaphone className="w-4 h-4" />
      case 'file':
        return <File className="w-4 h-4" />
      case 'url':
        return <LinkIcon className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  return (
    <SlideInPanel isOpen={isOpen} onClose={onClose} labelledBy="pinned-pages-title">
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-neutral-700/50 app-drag">
        <h2
          id="pinned-pages-title"
          className="font-semibold text-sm text-gray-900 dark:text-gray-100 app-no-drag"
        >
          Pinned Pages
        </h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors app-no-drag"
          title="Close (Esc)"
          aria-label="Close pinned pages"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {data.pinnedItems.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-500 dark:text-neutral-400">
            <Pin className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Pin assignments, pages, or files here for quick access.</p>
          </div>
        )}

        {data.pinnedItems.map((item) => (
          <ListItemRow
            key={item.id}
            onClick={() => handleOpen(item)}
            icon={getIcon(item.type)}
            title={item.title}
            subtitle={subtitleForItem(item)}
            menu={
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {POPOUT_TYPES.has(item.type) && (
                  <button
                    onClick={(e) => {
                      void handlePopOut(e, item)
                    }}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    actions.unpinItem(item.id)
                  }}
                  className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 text-slate-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                  title="Unpin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          />
        ))}
      </div>
    </SlideInPanel>
  )
}
