import React from 'react'
import {
  FileText,
  File,
  MessageSquare,
  Link as LinkIcon,
  BookOpen,
  MoreVertical,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Pin,
  ExternalLink,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { Dropdown, DropdownItem } from './ui/Dropdown'
import { useCourseModules } from '../hooks/useCanvasQueries'
import type { CanvasModule, CanvasModuleItem, CanvasFile } from '../types/canvas'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import { useAIPanelActions } from '../context/AIPanelContext'
import { useAppData, useAppFlags, useAppActions } from '../context/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { usePrefetchOnHover } from '../hooks/usePrefetchOnHover'
import { enqueuePrefetch, requestIdle } from '../utils/prefetchQueue'
import { SkeletonList } from './Skeleton'
import { canvasContentUrl } from '../utils/canvasContentUrl'
import { openExternal } from '../utils/openExternal'
import { useAIContextOffer } from '../hooks/useAIContextOffer'

type Props = {
  courseId: string | number
  courseName?: string
  onOpenExternal?: (url: string) => void
  onOpenContent?: (content: {
    courseId: string | number
    contentType: 'page' | 'assignment' | 'file'
    contentId: string
    title: string
  }) => void
}

function useModuleItemPrefetch(courseId: string | number, it: CanvasModuleItem) {
  const flags = useAppFlags()
  const enabled = !!(
    (it.__typename === 'PageModuleItem' && it.pageUrl) ||
    (it.__typename === 'AssignmentModuleItem' && it.contentId)
  )

  const queryKey = React.useMemo(() => {
    if (it.__typename === 'PageModuleItem' && it.pageUrl) {
      return ['course-page', String(courseId), it.pageUrl]
    }
    if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
      return ['assignment-rest', String(courseId), String(it.contentId)]
    }
    return ['ignore']
  }, [courseId, it])

  const queryFn = React.useCallback(async () => {
    if (it.__typename === 'PageModuleItem' && it.pageUrl) {
      const res = await window.canvas.getCoursePage?.(courseId, it.pageUrl)
      if (!res?.ok) throw new Error(res?.error || 'Failed')
      return res.data
    }
    if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
      const res = await window.canvas.getAssignmentRest?.(courseId, it.contentId)
      if (!res?.ok) throw new Error(res?.error || 'Failed')
      return res.data
    }
    return null
  }, [courseId, it])

  return usePrefetchOnHover({
    queryKey,
    queryFn,
    enabled: enabled && flags.prefetchEnabled && !flags.privateModeEnabled,
    staleTime: 1000 * 60 * 5,
  })
}

const ModuleItemRow: React.FC<{
  it: CanvasModuleItem
  courseId: string | number
  courseName?: string
  baseUrl?: string
  icon: React.ReactNode
  title: string
  kind: string
  onClick: () => void
  isMenuOpen: boolean
  menuId: string
  setMenuOpenId: (id: string | null) => void
  anchorEls: React.MutableRefObject<Map<string, HTMLElement | null>>
  aiEnabled: boolean
  aiPanel: any
  isPinned: boolean
  onTogglePin: () => void
}> = ({
  it,
  courseId,
  courseName,
  baseUrl,
  icon,
  title,
  kind,
  onClick,
  isMenuOpen,
  menuId,
  setMenuOpenId,
  anchorEls,
  aiEnabled,
  aiPanel,
  isPinned,
  onTogglePin,
}) => {
  const hoverHandlers = useModuleItemPrefetch(courseId, it)

  // Determine if this item can be opened in CanvasContentView (and thus new window)
  const canOpenInApp =
    (it.__typename === 'PageModuleItem' && it.pageUrl) ||
    (it.__typename === 'AssignmentModuleItem' && it.contentId) ||
    (it.__typename === 'FileModuleItem' && it.contentId)

  // Get the content type and ID for building Canvas URL and opening in new window
  const getContentInfo = (): { type: 'page' | 'assignment' | 'file'; contentId: string } | null => {
    if (it.__typename === 'PageModuleItem' && it.pageUrl) {
      return { type: 'page', contentId: it.pageUrl }
    }
    if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
      return { type: 'assignment', contentId: String(it.contentId) }
    }
    if (it.__typename === 'FileModuleItem' && it.contentId) {
      return { type: 'file', contentId: String(it.contentId) }
    }
    return null
  }

  const contentInfo = getContentInfo()

  const openInCanvasUrl =
    baseUrl && contentInfo
      ? canvasContentUrl({
          baseUrl,
          courseId,
          type: contentInfo.type,
          contentId: contentInfo.contentId,
        })
      : it.htmlUrl

  const handleOpenInCanvas = async () => {
    setMenuOpenId(null)
    await openExternal(openInCanvasUrl)
  }

  const handleOpenInNewWindow = async () => {
    if (!contentInfo) return
    setMenuOpenId(null)
    try {
      await window.system?.openContentWindow?.({
        courseId: String(courseId),
        courseName: courseName || undefined,
        type: contentInfo.type,
        contentId: contentInfo.contentId,
        title,
      })
    } catch {}
  }

  return (
    <ListItemRow
      interactiveProps={hoverHandlers}
      icon={icon}
      title={title}
      subtitle={<MetadataBadge>{kind}</MetadataBadge>}
      menuOpen={isMenuOpen}
      onClick={onClick}
      menu={
        <>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpenId(isMenuOpen ? null : menuId)
            }}
            className={`inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
            aria-label="More options"
            ref={(el) => {
              anchorEls.current.set(menuId, el)
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <Dropdown
            open={isMenuOpen}
            onOpenChange={(o) => setMenuOpenId(o ? menuId : null)}
            align="right"
            offsetY={32}
            anchorEl={anchorEls.current.get(menuId)}
          >
            <DropdownItem
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin()
              }}
              icon={<Pin className="w-4 h-4" />}
            >
              {isPinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
            </DropdownItem>
            {openInCanvasUrl && (
              <DropdownItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenInCanvas()
                }}
                icon={<ExternalLink className="w-4 h-4" />}
              >
                {it.__typename === 'ExternalUrlModuleItem' ? 'Open in Browser' : 'Open in Canvas'}
              </DropdownItem>
            )}
            {canOpenInApp && (
              <DropdownItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenInNewWindow()
                }}
                icon={<SquareArrowOutUpRight className="w-4 h-4" />}
              >
                Open in New Window
              </DropdownItem>
            )}
            {aiEnabled && it.__typename === 'PageModuleItem' && it.pageUrl && (
              <DropdownItem
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenId(null)
                  aiPanel.openExplainPage({
                    courseId,
                    courseName,
                    pageUrl: it.pageUrl!,
                    title,
                  })
                }}
                icon={<Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                className="text-indigo-600 dark:text-indigo-400"
              >
                Explain
              </DropdownItem>
            )}
          </Dropdown>
        </>
      }
    />
  )
}

export const CourseModules: React.FC<Props> = ({
  courseId,
  courseName,
  onOpenExternal,
  onOpenContent,
}) => {
  const { data: modules = null, isLoading, error } = useCourseModules(courseId)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set())
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())
  const aiPanel = useAIPanelActions()
  const data = useAppData()
  const flags = useAppFlags()
  const actions = useAppActions()
  const queryClient = useQueryClient()
  const autoPrefetchedRef = React.useRef<string | null>(null)
  const initializedForCourseRef = React.useRef<string | null>(null)

  const modulesContext = React.useMemo(() => {
    if (!modules || !Array.isArray(modules) || modules.length === 0) return ''
    const lines = (modules as CanvasModule[]).slice(0, 10).map((m) => {
      const items = (m?.moduleItemsConnection?.nodes || []) as CanvasModuleItem[]
      const itemTitles = items
        .slice(0, 3)
        .map((it) => it.title || 'Item')
        .filter(Boolean)
      const remaining = Math.max(items.length - itemTitles.length, 0)
      const itemLabel = itemTitles.length
        ? `: ${itemTitles.join(', ')}${remaining ? ` (+${remaining} more)` : ''}`
        : ''
      return `- ${m.name || 'Module'}${itemLabel}`
    })
    return [`Modules (${modules.length})`, ...lines].join('\n')
  }, [modules])

  const modulesOffer = React.useMemo(() => {
    if (!modulesContext) return null
    return {
      id: `course-modules:${String(courseId)}`,
      slot: 'view' as const,
      kind: 'modules' as const,
      title: 'Modules',
      courseId,
      courseName,
      contentText: modulesContext.slice(0, 4000),
    }
  }, [modulesContext, courseId, courseName])

  useAIContextOffer(`course-modules:${String(courseId)}`, modulesOffer)

  // Initialize: expand only the first module when modules load
  React.useEffect(() => {
    if (!modules || !Array.isArray(modules) || modules.length === 0) return
    const key = String(courseId)
    if (initializedForCourseRef.current === key) return
    initializedForCourseRef.current = key
    const firstModule = modules[0] as CanvasModule
    const firstId = String(firstModule._id || firstModule.id)
    setExpandedModules(new Set([firstId]))
  }, [modules, courseId])

  const toggleModule = React.useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }, [])

  const expandAll = React.useCallback(() => {
    if (!modules || !Array.isArray(modules)) return
    const allIds = (modules as CanvasModule[]).map((m) => String(m._id || m.id))
    setExpandedModules(new Set(allIds))
  }, [modules])

  const allExpanded = React.useMemo(() => {
    if (!modules || !Array.isArray(modules) || modules.length === 0) return false
    return (modules as CanvasModule[]).every((m) => expandedModules.has(String(m._id || m.id)))
  }, [modules, expandedModules])

  // Lightweight proactive prefetch: grab meta + content for a few top items.
  // Keeps UX snappy (less "Loading…") while avoiding the old module-items fanout.
  React.useEffect(() => {
    if (!flags.prefetchEnabled || flags.privateModeEnabled) return
    if (!modules || !Array.isArray(modules) || modules.length === 0) return
    const key = `${courseId}`
    if (autoPrefetchedRef.current === key) return
    autoPrefetchedRef.current = key

    requestIdle(() => {
      let count = 0
      for (const m of modules as CanvasModule[]) {
        const nodes = m?.moduleItemsConnection?.nodes || []
        for (const it of nodes) {
          if (count >= 3) break
          const itemId = (it as any)?._id
          if (!itemId) continue

          enqueuePrefetch(async () => {
            if (it.__typename === 'PageModuleItem' && it.pageUrl) {
              await queryClient.prefetchQuery({
                queryKey: ['course-page', String(courseId), it.pageUrl],
                queryFn: async () => {
                  const res = await window.canvas.getCoursePage?.(courseId, it.pageUrl!)
                  if (!res?.ok) throw new Error(res?.error || 'Failed')
                  return res.data
                },
                staleTime: 1000 * 60 * 5,
              })
              return
            }
            if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
              await queryClient.prefetchQuery({
                queryKey: ['assignment-rest', String(courseId), String(it.contentId)],
                queryFn: async () => {
                  const res = await window.canvas.getAssignmentRest?.(courseId, it.contentId!)
                  if (!res?.ok) throw new Error(res?.error || 'Failed')
                  return res.data
                },
                staleTime: 1000 * 60 * 5,
              })
            }
          })
          count++
        }
        if (count >= 3) break
      }
    })
  }, [modules, courseId, queryClient, flags.prefetchEnabled, flags.privateModeEnabled])

  async function openItem(it: CanvasModuleItem, title: string) {
    const openExternal = async (url: string) => {
      try {
        await (onOpenExternal as any)?.(url)
      } catch {
        // ignore
      }
    }
    // Fast path: if we already have enough info, route directly
    if (it.__typename === 'PageModuleItem' && it.pageUrl) {
      onOpenContent?.({ courseId, contentType: 'page', contentId: it.pageUrl, title })
      return
    }
    if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
      onOpenContent?.({
        courseId,
        contentType: 'assignment',
        contentId: String(it.contentId),
        title,
      })
      return
    }
    if (it.__typename === 'FileModuleItem' && it.contentId) {
      const res = await window.canvas.getFile?.(it.contentId)
      if (res?.ok) {
        const fileData = res.data as CanvasFile
        const fileName = fileData?.display_name || fileData?.filename || title
        const contentType = fileData?.content_type || ''
        const isViewableFile =
          /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|bmp|svg|avif|mp3|wav|ogg|m4a|aac|mp4|webm|mov|m4v)$/i.test(
            fileName,
          ) ||
          /^(application\/(pdf|vnd\.openxmlformats-officedocument|vnd\.ms-)|image\/|audio\/|video\/)/i.test(
            contentType,
          )
        if (isViewableFile) {
          onOpenContent?.({
            courseId,
            contentType: 'file',
            contentId: String(it.contentId),
            title: fileName,
          })
        } else {
          const url = fileData?.url as string | undefined
          if (url) await openExternal(url)
        }
      }
      return
    }

    // Handle other module item types
    if (it.__typename === 'DiscussionModuleItem' && it.contentId) {
      const url = new URL(
        `/courses/${courseId}/discussion_topics/${it.contentId}`,
        data.baseUrl,
      ).toString()
      await openExternal(url)
      return
    }
    if (it.__typename === 'QuizModuleItem' && it.contentId) {
      const url = new URL(`/courses/${courseId}/quizzes/${it.contentId}`, data.baseUrl).toString()
      await openExternal(url)
      return
    }
    if (it.__typename === 'ExternalUrlModuleItem') {
      if (it.htmlUrl) await openExternal(it.htmlUrl)
      return
    }

    // Fallback: fetch the module item info via API sequence endpoint and route from it.
    const itemId = (it as any)?._id
    if (itemId) {
      const canvas = window.canvas as any
      const res = await canvas.getCourseModuleItem?.(courseId, itemId)
      if (res?.ok && res.data) {
        const meta = res.data as any
        const type = String(meta?.type || '').toLowerCase()
        if (type === 'page' && meta?.page_url) {
          onOpenContent?.({
            courseId,
            contentType: 'page',
            contentId: String(meta.page_url),
            title,
          })
          return
        }
        if (type === 'assignment' && meta?.content_id != null) {
          onOpenContent?.({
            courseId,
            contentType: 'assignment',
            contentId: String(meta.content_id),
            title,
          })
          return
        }
        if (type === 'file' && meta?.content_id != null) {
          onOpenContent?.({
            courseId,
            contentType: 'file',
            contentId: String(meta.content_id),
            title,
          })
          return
        }
        if (type === 'discussion' && meta?.content_id != null) {
          const url = new URL(
            `/courses/${courseId}/discussion_topics/${meta.content_id}`,
            data.baseUrl,
          ).toString()
          await openExternal(url)
          return
        }
        if (type === 'quiz' && meta?.content_id != null) {
          const url = new URL(
            `/courses/${courseId}/quizzes/${meta.content_id}`,
            data.baseUrl,
          ).toString()
          await openExternal(url)
          return
        }
        const htmlUrl = meta?.html_url || meta?.external_url
        if (htmlUrl) {
          await openExternal(htmlUrl)
          return
        }
      }
    }

    if (it.htmlUrl) await openExternal(it.htmlUrl)
  }

  const iconFor = (n: CanvasModuleItem) => {
    switch (n?.__typename) {
      case 'AssignmentModuleItem':
        return <FileText className="w-4 h-4" />
      case 'PageModuleItem':
        return <BookOpen className="w-4 h-4" />
      case 'FileModuleItem':
        return <File className="w-4 h-4" />
      case 'DiscussionModuleItem':
        return <MessageSquare className="w-4 h-4" />
      case 'ExternalUrlModuleItem':
        return <LinkIcon className="w-4 h-4" />
      case 'QuizModuleItem':
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const labelFor = (n: CanvasModuleItem) => {
    switch (n?.__typename) {
      case 'AssignmentModuleItem':
        return 'Assignment'
      case 'PageModuleItem':
        return 'Page'
      case 'FileModuleItem':
        return 'File'
      case 'DiscussionModuleItem':
        return 'Discussion'
      case 'ExternalUrlModuleItem':
        return 'Link'
      case 'QuizModuleItem':
        return 'Quiz'
      default:
        return 'Item'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Modules</h3>
        {!isLoading && modules && modules.length > 1 && !allExpanded && (
          <button
            onClick={expandAll}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Expand All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && (
          <div className="text-red-600 text-sm mb-2">
            {String((error as any)?.message || error)}
          </div>
        )}
        {isLoading && <SkeletonList count={6} hasAvatar variant="row" />}
        {!isLoading && modules && modules.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No modules</div>
        )}
        {!isLoading && modules && modules.length > 0 && (
          <div className="space-y-3">
            {(modules as CanvasModule[]).map((m) => {
              const moduleId = String(m._id || m.id)
              const isExpanded = expandedModules.has(moduleId)
              const itemCount = m?.moduleItemsConnection?.nodes?.length ?? 0

              return (
                <div key={moduleId}>
                  {/* Module header - clickable to toggle */}
                  <button
                    onClick={() => toggleModule(moduleId)}
                    className="flex items-center justify-between w-full mb-1.5 p-1 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-neutral-300">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      {m.name}
                    </span>
                    <span className="text-xs text-slate-400">{itemCount} items</span>
                  </button>

                  {/* Module items - only rendered when expanded */}
                  {isExpanded && itemCount > 0 && (
                    <ul className="list-none m-0 p-0 space-y-3 ml-5">
                      {m.moduleItemsConnection?.nodes?.map((it: CanvasModuleItem) => {
                        const title = it.title || 'Item'
                        const kind = labelFor(it)
                        const menuId = String(it.id || it._id)
                        const isMenuOpen = menuOpenId === menuId

                        // Calculate pinId based on item type
                        const getPinInfo = (): {
                          type: 'page' | 'assignment' | 'file'
                          contentId: string
                        } | null => {
                          if (it.__typename === 'PageModuleItem' && it.pageUrl) {
                            return { type: 'page', contentId: it.pageUrl }
                          }
                          if (it.__typename === 'AssignmentModuleItem' && it.contentId) {
                            return { type: 'assignment', contentId: String(it.contentId) }
                          }
                          if (it.__typename === 'FileModuleItem' && it.contentId) {
                            return { type: 'file', contentId: String(it.contentId) }
                          }
                          return null
                        }
                        const pinInfo = getPinInfo()
                        const pinId = pinInfo
                          ? `${pinInfo.type}:${pinInfo.contentId}`
                          : `module-item:${it._id}`
                        const isPinned = data.pinnedItems?.some((i) => i.id === pinId) ?? false

                        const handleTogglePin = () => {
                          setMenuOpenId(null)
                          if (isPinned) {
                            actions.unpinItem(pinId)
                          } else {
                            actions.pinItem({
                              id: pinId,
                              type: pinInfo?.type || 'page',
                              title,
                              courseId,
                              contentId: pinInfo?.contentId || it._id,
                            })
                          }
                        }

                        return (
                          <li key={String(it.id || it._id)}>
                            <ModuleItemRow
                              it={it}
                              courseId={courseId}
                              courseName={courseName}
                              baseUrl={data.baseUrl}
                              icon={iconFor(it)}
                              title={title}
                              kind={kind}
                              onClick={() => openItem(it, title)}
                              isMenuOpen={isMenuOpen}
                              menuId={menuId}
                              setMenuOpenId={setMenuOpenId}
                              anchorEls={anchorEls}
                              aiEnabled={flags.aiEnabled}
                              aiPanel={aiPanel}
                              isPinned={isPinned}
                              onTogglePin={handleTogglePin}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
