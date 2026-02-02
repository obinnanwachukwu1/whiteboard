import React from 'react'
import {
  FileText,
  File,
  Image as ImageIcon,
  Video,
  Folder as FolderIcon,
  ChevronRight,
  ArrowUpDown,
  FileArchive,
  FileSpreadsheet,
  FileAudio,
  FileCode2,
  Presentation,
  MoreVertical,
  Pin,
  ExternalLink,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { Button } from './ui/Button'
import { useCourseFolders, useFolderFiles } from '../hooks/useCanvasQueries'
import type { CanvasFolder, CanvasFile } from '../types/canvas'
import { Dropdown, DropdownItem } from './ui/Dropdown'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import { SkeletonList } from './Skeleton'
import { useAppData, useAppActions } from '../context/AppContext'
import { canvasContentUrl } from '../utils/canvasContentUrl'
import { openExternal } from '../utils/openExternal'

type Props = {
  courseId: string | number
  courseName?: string
  currentFolderId?: string | null
  onFolderChange?: (folderId: string | null) => void
  onOpenContent?: (content: {
    courseId: string | number
    contentType: 'file'
    contentId: string
    title: string
  }) => void
}

function iconForFile(name?: string, contentType?: string) {
  const n = String(name || '')
  const ext = n.includes('.') ? n.split('.').pop()!.toLowerCase() : ''
  const ct = String(contentType || '').toLowerCase()
  const icon = (el: React.ReactElement) => React.cloneElement(el, { className: 'w-4 h-4' })
  if (ext) {
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext))
      return icon(<ImageIcon />)
    if (['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext)) return icon(<Video />)
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return icon(<FileAudio />)
    if (['xls', 'xlsx', 'csv'].includes(ext)) return icon(<FileSpreadsheet />)
    if (['ppt', 'pptx', 'key'].includes(ext)) return icon(<Presentation />)
    if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext)) return icon(<FileArchive />)
    if (['pdf'].includes(ext)) return icon(<FileText />)
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'md', 'xml', 'yml', 'yaml'].includes(ext))
      return icon(<FileCode2 />)
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return icon(<FileText />)
  }
  if (ct.startsWith('image/')) return icon(<ImageIcon />)
  if (ct.startsWith('video/')) return icon(<Video />)
  if (ct.startsWith('audio/')) return icon(<FileAudio />)
  if (ct === 'application/pdf') return icon(<FileText />)
  if (ct.includes('spreadsheet') || ct.includes('excel') || ct.includes('csv'))
    return icon(<FileSpreadsheet />)
  if (ct.includes('zip') || ct.includes('tar') || ct.includes('archive'))
    return icon(<FileArchive />)
  return icon(<File />)
}

function formatBytes(bytes?: number | null) {
  const b = typeof bytes === 'number' && isFinite(bytes) ? bytes : 0
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  let idx = 0
  let val = b
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx++
  }
  if (idx === 0) return `${val} ${units[idx]}`
  return `${val.toFixed(1)} ${units[idx]}`
}

function fileTypeLabel(name?: string, contentType?: string) {
  const n = String(name || '')
  const ext = n.includes('.') ? n.split('.').pop() : ''
  if (ext) return ext.toUpperCase()
  if (contentType) {
    if (contentType === 'application/pdf') return 'PDF'
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'XLSX'
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return 'PPTX'
    if (contentType.includes('msword') || contentType.includes('word')) return 'DOCX'
    if (contentType.startsWith('image/')) return contentType.replace('image/', '').toUpperCase()
    if (contentType.startsWith('video/')) return contentType.replace('video/', '').toUpperCase()
    return contentType
  }
  return null
}

export const CourseFiles: React.FC<Props> = ({
  courseId,
  courseName,
  currentFolderId,
  onFolderChange,
  onOpenContent,
}) => {
  const { data: folders = [], isLoading, error } = useCourseFolders(courseId, 100)
  // Use controlled folder state if provided, otherwise use local state
  const [localCurrent, setLocalCurrent] = React.useState<string | null>(null)
  const current = currentFolderId !== undefined ? currentFolderId : localCurrent
  const setCurrent = React.useCallback(
    (folderId: string | null) => {
      if (onFolderChange) {
        onFolderChange(folderId)
      } else {
        setLocalCurrent(folderId)
      }
    },
    [onFolderChange],
  )
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())
  const data = useAppData()
  const actions = useAppActions()

  const byId = React.useMemo(
    () => new Map((folders as CanvasFolder[]).map((f) => [String(f.id), f])),
    [folders],
  )
  const children = React.useMemo(() => {
    const map = new Map<string | null, CanvasFolder[]>()
    for (const f of folders as CanvasFolder[]) {
      const pid = f?.parent_folder_id != null ? String(f.parent_folder_id) : null
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid)!.push(f)
    }
    return map
  }, [folders])

  // Find the course root folder ("course files") and treat it as app root
  const courseRootId = React.useMemo(() => {
    let root: string | null = null
    for (const f of folders as CanvasFolder[]) {
      const name = String(f?.full_name || f?.name || '').toLowerCase()
      const isTop = f?.parent_folder_id == null
      if (isTop && /\bcourse files\b/i.test(name)) {
        root = String(f.id)
        break
      }
    }
    if (!root) {
      // Fallback: first top-level folder
      const top = (folders as CanvasFolder[]).find((f) => f?.parent_folder_id == null)
      root = top ? String(top.id) : null
    }
    return root
  }, [folders])

  // Default into course root when folders load
  React.useEffect(() => {
    if (!isLoading && current == null && courseRootId) {
      setCurrent(courseRootId)
    }
  }, [isLoading, current, courseRootId, setCurrent])

  const breadcrumb = React.useMemo(() => {
    const out: any[] = []
    let fid = current
    while (fid && byId.has(fid)) {
      const f = byId.get(fid)
      // Do not include the course root itself in the breadcrumb trail
      if (!f) break
      if (courseRootId && String(f.id) === courseRootId) break
      out.unshift(f)
      const parent = f?.parent_folder_id != null ? String(f.parent_folder_id) : null
      // Stop if we reached the top
      if (parent == null) break
      fid = parent
    }
    return out
  }, [current, byId, courseRootId])

  const effectiveCurrent = current || courseRootId || null
  const [sortKey, setSortKey] = React.useState<'name' | 'updated'>('updated')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')

  // No global listeners; handled by Dropdown

  function compare(a: any, b: any) {
    let va: string | number = ''
    let vb: string | number = ''
    if (sortKey === 'name') {
      va = String(a?.name || a?.display_name || a?.full_name || '')
      vb = String(b?.name || b?.display_name || b?.full_name || '')
      const r = va.localeCompare(vb, undefined, { sensitivity: 'base' })
      return sortOrder === 'asc' ? r : -r
    } else {
      va = a?.updated_at ? new Date(a.updated_at).getTime() : 0
      vb = b?.updated_at ? new Date(b.updated_at).getTime() : 0
      const r = (va as number) - (vb as number)
      return sortOrder === 'asc' ? r : -r
    }
  }

  const listFolders = React.useMemo(() => {
    const arr = [...(children.get(effectiveCurrent) || [])]
    arr.sort(compare)
    return arr
  }, [children, effectiveCurrent, sortKey, sortOrder])
  const filesQ = useFolderFiles(effectiveCurrent || undefined, 100, {
    enabled: effectiveCurrent != null,
  })
  const files = React.useMemo(() => {
    const arr = [...(filesQ.data || [])]
    arr.sort(compare)
    return arr
  }, [filesQ.data, sortKey, sortOrder])

  // Combined list: folders first, then files
  type ListItem = { type: 'folder'; data: CanvasFolder } | { type: 'file'; data: CanvasFile }
  const combinedItems = React.useMemo<ListItem[]>(() => {
    const folderItems: ListItem[] = listFolders.map((f) => ({ type: 'folder', data: f }))
    const fileItems: ListItem[] = files.map((f) => ({ type: 'file', data: f }))
    return [...folderItems, ...fileItems]
  }, [listFolders, files])

  const showListSkeleton = isLoading || (effectiveCurrent != null && filesQ.isLoading)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Files</h3>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600 dark:text-slate-300">Sort:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="px-2 py-1 rounded-control border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <option value="name">Name</option>
            <option value="updated">Date</option>
          </select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            title={`Toggle ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && (
          <div className="text-red-600 text-sm mb-2">
            {String((error as any)?.message || error)}
          </div>
        )}
        {showListSkeleton && <SkeletonList count={8} hasAvatar variant="row" />}

        {/* Breadcrumb */}
        <div className="text-sm text-slate-600 dark:text-neutral-300 mb-2 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <button className="hover:underline" onClick={() => setCurrent(courseRootId || null)}>
            {courseRootId ? 'Course Files' : 'Root'}
          </button>
          {breadcrumb.map((f: any) => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-4 h-4 opacity-60" />
              <button className="hover:underline" onClick={() => setCurrent(String(f.id))}>
                {f.name || f.full_name || 'Folder'}
              </button>
            </React.Fragment>
          ))}
        </div>

        {!isLoading && (folders as any[]).length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No files</div>
        )}

        {/* Combined folders + files list */}
        {effectiveCurrent != null && (
          <>
            {!filesQ.isLoading && combinedItems.length === 0 && (
              <div className="text-slate-500 dark:text-neutral-400 text-sm">
                No items in this folder
              </div>
            )}
            {!filesQ.isLoading && combinedItems.length > 0 && (
              <ul className="list-none m-0 p-0 space-y-3">
                {combinedItems.map((item) => {
                  if (item.type === 'folder') {
                    const f = item.data
                    return (
                      <li key={`folder-${f.id}`}>
                        <ListItemRow
                          icon={<FolderIcon className="w-4 h-4" />}
                          title={f.name || f.full_name || 'Folder'}
                          subtitle={<MetadataBadge>Folder</MetadataBadge>}
                          onClick={() => setCurrent(String(f.id))}
                        />
                      </li>
                    )
                  } else {
                    const f = item.data
                    const name = f?.display_name || f?.filename || 'File'
                    const viewable =
                      /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|bmp|svg|avif|mp3|wav|ogg|m4a|aac|mp4|webm|mov|m4v)$/i.test(
                        String(name),
                      ) ||
                      /^(application\/(pdf|vnd\.openxmlformats-officedocument|vnd\.ms-)|image\/|audio\/|video\/)/i.test(
                        String(f?.content_type || ''),
                      )
                    const type = fileTypeLabel(name, f?.content_type)
                    const sizeStr = typeof f?.size === 'number' ? formatBytes(f.size) : null
                    const menuId = String(f.id)
                    const isMenuOpen = menuOpenId === menuId

                    const handleOpen = async () => {
                      if (viewable) {
                        onOpenContent?.({
                          courseId,
                          contentType: 'file',
                          contentId: String(f.id),
                          title: name,
                        })
                      } else if (f?.url) {
                        ;(await import('../utils/openExternal')).openExternal(f.url)
                      }
                    }

                    return (
                      <li key={`file-${f.id}`}>
                        <ListItemRow
                          icon={iconForFile(name, f?.content_type)}
                          title={name}
                          subtitle={
                            <>
                              {type && <MetadataBadge>{type}</MetadataBadge>}
                              {sizeStr && <span>{sizeStr}</span>}
                            </>
                          }
                          onClick={handleOpen}
                          menuOpen={isMenuOpen}
                          menu={(() => {
                            const pinId = `file:${f.id}`
                            const isPinned = data.pinnedItems?.some((i) => i.id === pinId) ?? false
                            const openInCanvasUrl = data.baseUrl
                              ? canvasContentUrl({
                                  baseUrl: data.baseUrl,
                                  courseId,
                                  type: 'file',
                                  contentId: String(f.id),
                                })
                              : f?.url

                            const handleTogglePin = () => {
                              setMenuOpenId(null)
                              if (isPinned) {
                                actions.unpinItem(pinId)
                              } else {
                                actions.pinItem({
                                  id: pinId,
                                  type: 'file',
                                  title: name,
                                  courseId,
                                  contentId: String(f.id),
                                })
                              }
                            }

                            const handleOpenInNewWindow = async () => {
                              setMenuOpenId(null)
                              try {
                                await window.system?.openContentWindow?.({
                                  courseId: String(courseId),
                                  courseName: courseName || undefined,
                                  type: 'file',
                                  contentId: String(f.id),
                                  title: name,
                                })
                              } catch {}
                            }

                            return (
                              <>
                                <button
                                  onClick={(e) => {
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
                                  offsetY={40}
                                  anchorEl={anchorEls.current.get(menuId)}
                                >
                                  <DropdownItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTogglePin()
                                    }}
                                    icon={<Pin className="w-4 h-4" />}
                                  >
                                    {isPinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
                                  </DropdownItem>
                                  {openInCanvasUrl && (
                                    <DropdownItem
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setMenuOpenId(null)
                                        await openExternal(openInCanvasUrl)
                                      }}
                                      icon={<ExternalLink className="w-4 h-4" />}
                                    >
                                      Open in Canvas
                                    </DropdownItem>
                                  )}
                                  {viewable && (
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
                                </Dropdown>
                              </>
                            )
                          })()}
                        />
                      </li>
                    )
                  }
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
