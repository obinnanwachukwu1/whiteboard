import React from 'react'
// no Card wrapper; rendered within page container
import { MoreVertical, EyeOff, Link as LinkIcon } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseTabs } from '../hooks/useCanvasQueries'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'

type Props = {
  courseId: string | number
}

export const CourseLinks: React.FC<Props> = ({ courseId }) => {
  const { data: tabs = [], isLoading, error } = useCourseTabs(courseId, true)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Course Links</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <div className="text-slate-500 dark:text-neutral-400 text-sm">Loading…</div>}
        {!isLoading && tabs && tabs.length === 0 && (
          <div className="text-slate-500 dark:text-neutral-400 text-sm">No links</div>
        )}
        {!isLoading && tabs && tabs.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-3">
            {tabs
              .slice()
              .sort((a: any, b: any) => (Number(a.position || 0) - Number(b.position || 0)))
              .map((t: any, i: number) => {
                const isHidden = !!t.hidden
                const url = t.html_url
                const type = (t.type || '').toLowerCase()
                const menuId = String(t.id)
                const isMenuOpen = menuOpenId === menuId

                const handleOpen = async () => {
                  if (url) (await import('../utils/openExternal')).openExternal(url)
                }

                return (
                  <li key={i}>
                    <ListItemRow
                      icon={<LinkIcon className="w-4 h-4" />}
                      title={t.label || t.id}
                      subtitle={
                        <>
                          {type && <MetadataBadge>{type}</MetadataBadge>}
                          {isHidden && <MetadataBadge><EyeOff className="w-3 h-3" /> hidden</MetadataBadge>}
                        </>
                      }
                      onClick={handleOpen}
                      menuOpen={isMenuOpen}
                      menu={
                        url ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : menuId) }}
                              className={`inline-flex items-center p-1 rounded text-slate-500 hover:text-slate-800 dark:text-neutral-200 dark:hover:text-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
                              aria-label="More options"
                              ref={(el) => { anchorEls.current.set(menuId, el) }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <Dropdown open={isMenuOpen} onOpenChange={(o) => setMenuOpenId(o ? menuId : null)} align="right" offsetY={40} anchorEl={anchorEls.current.get(menuId)}>
                              <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={async (e) => { e.stopPropagation(); setMenuOpenId(null); (await import('../utils/openExternal')).openExternal(url) }}>
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
    </div>
  )
}
