import React from 'react'
import { FileText, File, Image as ImageIcon, Video, Folder as FolderIcon, ChevronRight, ExternalLink, ArrowUpDown } from 'lucide-react'
import { Button } from './ui/Button'
import { useCourseFolders, useFolderFiles } from '../hooks/useCanvasQueries'

type Props = {
  courseId: string | number
  onOpenContent?: (content: { courseId: string | number; contentType: 'file'; contentId: string; title: string }) => void
}

function iconForContentType(ct: string | undefined) {
  if (!ct) return <File className="w-4 h-4" />
  if (ct.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
  if (ct.startsWith('video/')) return <Video className="w-4 h-4" />
  if (ct === 'application/pdf') return <FileText className="w-4 h-4" />
  return <File className="w-4 h-4" />
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

export const CourseFiles: React.FC<Props> = ({ courseId, onOpenContent }) => {
  const { data: folders = [], isLoading, error } = useCourseFolders(courseId, 100)
  const [current, setCurrent] = React.useState<string | null>(null)

  const byId = React.useMemo(() => new Map((folders as any[]).map((f: any) => [String(f.id), f])), [folders])
  const children = React.useMemo(() => {
    const map = new Map<string | null, any[]>()
    for (const f of (folders as any[])) {
      const pid = f?.parent_folder_id != null ? String(f.parent_folder_id) : null
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid)!.push(f)
    }
    return map
  }, [folders])

  // Find the course root folder ("course files") and treat it as app root
  const courseRootId = React.useMemo(() => {
    let root: string | null = null
    for (const f of (folders as any[])) {
      const name = String(f?.full_name || f?.name || '').toLowerCase()
      const isTop = f?.parent_folder_id == null
      if (isTop && /\bcourse files\b/i.test(name)) {
        root = String(f.id)
        break
      }
    }
    if (!root) {
      // Fallback: first top-level folder
      const top = (folders as any[]).find((f: any) => f?.parent_folder_id == null)
      root = top ? String(top.id) : null
    }
    return root
  }, [folders])

  // Default into course root when folders load
  React.useEffect(() => {
    if (!isLoading && current == null && courseRootId) {
      setCurrent(courseRootId)
    }
  }, [isLoading, current, courseRootId])

  const breadcrumb = React.useMemo(() => {
    const out: any[] = []
    let fid = current
    while (fid && byId.has(fid)) {
      const f = byId.get(fid)
      // Do not include the course root itself in the breadcrumb trail
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
  const filesQ = useFolderFiles(effectiveCurrent || undefined, 100, { enabled: effectiveCurrent != null })
  const files = React.useMemo(() => {
    const arr = [...(filesQ.data || [])]
    arr.sort(compare)
    return arr
  }, [filesQ.data, sortKey, sortOrder])

  return (
    <div>
      <div className="mt-0 mb-3 flex items-center justify-between gap-3">
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
      {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
      {isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
      {!isLoading && (folders as any[]).length === 0 && (
        <div className="text-slate-500 dark:text-slate-400 text-sm">No files</div>
      )}

      {/* Breadcrumb */}
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1">
        <button className="hover:underline" onClick={() => setCurrent(courseRootId || null)}>{courseRootId ? 'Course Files' : 'Root'}</button>
        {breadcrumb.map((f: any, idx: number) => (
          <React.Fragment key={f.id}>
            <ChevronRight className="w-4 h-4 opacity-60" />
            <button className="hover:underline" onClick={() => setCurrent(String(f.id))}>{f.name || f.full_name || 'Folder'}</button>
          </React.Fragment>
        ))}
      </div>

      {/* Folders */}
      {listFolders.length > 0 && (
        <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700 mb-2">
          {listFolders.map((f: any) => (
            <li key={f.id} className="py-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCurrent(String(f.id))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrent(String(f.id)) } }}
                className="group cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center shrink-0">
                    <FolderIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate group-hover:underline decoration-slate-300 dark:decoration-neutral-700">{f.name || f.full_name || 'Folder'}</div>
                    <div className="text-xs text-slate-500 truncate">{f.full_name}</div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Files in current folder */}
      {current != null && (
        <div>
          {filesQ.isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading files…</div>}
          {!filesQ.isLoading && files.length === 0 && listFolders.length === 0 && (
            <div className="text-slate-500 dark:text-slate-400 text-sm">No items in this folder</div>
          )}
          {!filesQ.isLoading && files.length > 0 && (
            <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
              {files.map((f: any) => {
                const updated = f?.updated_at ? new Date(f.updated_at).toLocaleString() : ''
                const name = f?.display_name || f?.filename || 'File'
                const viewable = /\.(pdf|docx?|pptx?|xlsx?)$/i.test(String(name)) || /^application\/(pdf|vnd\.openxmlformats-officedocument|vnd\.ms-)/i.test(String(f?.content_type || ''))
                const type = fileTypeLabel(name, f?.content_type)
                const sizeStr = typeof f?.size === 'number' ? formatBytes(f.size) : null
                return (
                  <li key={f.id} className="py-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={async () => {
                        if (viewable) {
                          onOpenContent?.({ courseId, contentType: 'file', contentId: String(f.id), title: name })
                        } else if (f?.url) {
                          window.system?.openExternal?.(f.url)
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (viewable) onOpenContent?.({ courseId, contentType: 'file', contentId: String(f.id), title: name }); else if (f?.url) window.system?.openExternal?.(f.url) } }}
                      className="group cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 rounded-md px-2 sm:px-3 py-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-neutral-600/15 text-slate-600 dark:text-neutral-200 inline-flex items-center justify-center shrink-0">
                          {iconForContentType(f?.content_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate group-hover:underline decoration-slate-300 dark:decoration-neutral-700">{name}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {type && <span>{type}</span>}
                            {updated && <span className="ml-2">• Updated {updated}</span>}
                            {sizeStr && <span className="ml-2">• {sizeStr}</span>}
                          </div>
                        </div>
                      </div>
                      {f?.url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.system?.openExternal?.(f.url) }}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-control text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> Open in Browser
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
