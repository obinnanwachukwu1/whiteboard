import React from 'react'
import { Card } from './ui/Card'
import { FileText, File, MessageSquare, Link as LinkIcon, BookOpen } from 'lucide-react'
import { useCourseModules } from '../hooks/useCanvasQueries'

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

  const iconFor = (n: any) => {
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

  return (
    <Card>
      <h3 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Modules</h3>
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
      {!isLoading && modules && modules.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 text-sm">No modules</div>
      )}
      {!isLoading && modules && modules.length > 0 && (
        <div className="space-y-3">
          {modules.map((m, i) => (
            <div key={i} className="rounded-card ring-1 ring-gray-200 dark:ring-slate-700">
              <div className="px-4 py-2 font-medium">{m.name}</div>
              {(m.moduleItemsConnection?.nodes?.length ?? 0) > 0 && (
                <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
                  {m.moduleItemsConnection?.nodes?.map((it: any, j: number) => {
                    const title = it.title || it.assignment?.name || it.page?.title || it.file?.displayName || it.discussionTopic?.title || it.quiz?.title || 'Item'
                    
                    // Debug logging for ALL items
                    console.log('Module item:', {
                      title,
                      typename: it.__typename,
                      contentId: it.contentId,
                      htmlUrl: it.htmlUrl,
                      pageUrl: it.pageUrl,
                      fullItem: it
                    })
                    
                    return (
                      <li key={j} className="px-4 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {iconFor(it)}
                            <div className="truncate">{title}</div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {(it.__typename === 'PageModuleItem' || it.pageUrl) && (
                              <button
                                className="text-slate-600 dark:text-slate-300 text-sm underline"
                                onClick={() => {
                                  onOpenContent?.({
                                    courseId,
                                    contentType: 'page',
                                    contentId: it.pageUrl || '',
                                    title: title
                                  })
                                }}
                              >
                                View
                              </button>
                            )}
                            {(it.__typename === 'AssignmentModuleItem' && it.contentId) && (
                              <button
                                className="text-slate-600 dark:text-slate-300 text-sm underline"
                                onClick={() => {
                                  onOpenContent?.({
                                    courseId,
                                    contentType: 'assignment',
                                    contentId: it.contentId,
                                    title: title
                                  })
                                }}
                              >
                                View
                              </button>
                            )}
                            {(it.__typename === 'FileModuleItem' || (it.__typename === 'ModuleItem' && it.contentId && it.title?.match(/\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|mp4|mov|avi)$/i))) && (
                              <button
                                className="text-slate-600 dark:text-slate-300 text-sm underline"
                                onClick={async () => {
                                  console.log('File button clicked:', it)
                                  if (!it.contentId) {
                                    console.log('No contentId, opening htmlUrl instead')
                                    if (it.htmlUrl) {
                                      onOpenExternal?.(it.htmlUrl)
                                    }
                                    return
                                  }
                                  
                                  // First, get file details to check if it's viewable
                                  const res: any = await window.canvas.getFile?.(it.contentId)
                                  if (res?.ok) {
                                    const fileData = res.data
                                    const fileName = fileData?.display_name || fileData?.filename || title
                                    const contentType = fileData?.content_type || ''
                                    
                                    console.log('File data:', { 
                                      fileName, 
                                      contentType, 
                                      url: fileData?.url,
                                      preview_url: fileData?.preview_url,
                                      display_url: fileData?.display_url,
                                      fileData 
                                    })
                                    
                                    // Check if it's a viewable file type
                                    const isViewableFile = 
                                      /\.(pdf|docx?|pptx?|xlsx?)$/i.test(fileName) ||
                                      /^application\/(pdf|vnd\.openxmlformats-officedocument|vnd\.ms-)/i.test(contentType)
                                    
                                    console.log('Is viewable file:', isViewableFile)
                                    
                                    if (isViewableFile) {
                                      onOpenContent?.({
                                        courseId,
                                        contentType: 'file',
                                        contentId: it.contentId,
                                        title: fileName
                                      })
                                    } else {
                                      const url = fileData?.url || fileData?.preview_url || fileData?.display_url
                                      if (url) window.open(url, '_blank')
                                    }
                                  }
                                }}
                              >
                                View
                              </button>
                            )}
                            {it.htmlUrl && (
                              <a href={it.htmlUrl} onClick={(e) => { e.preventDefault(); onOpenExternal?.(it.htmlUrl) }} className="text-slate-600 dark:text-slate-300 text-sm">Open</a>
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
    </Card>
  )
}
