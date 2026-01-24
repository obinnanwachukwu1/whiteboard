import React from 'react'
// no Card wrapper; rendered within page container
import { MoreVertical, EyeOff, Link as LinkIcon } from 'lucide-react'
import { Dropdown } from './ui/Dropdown'
import { useCourseTabs } from '../hooks/useCanvasQueries'
import { ListItemRow } from './ui/ListItemRow'
import { MetadataBadge } from './ui/MetadataBadge'
import { SkeletonList } from './Skeleton'

type Props = {
  courseId: string | number
}

export const CourseLinks: React.FC<Props> = ({ courseId }) => {
  const { data: tabs = [], isLoading, error } = useCourseTabs(courseId, true)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const anchorEls = React.useRef<Map<string, HTMLElement | null>>(new Map())

  const friendlyLabel = React.useCallback((t: any) => {
    const raw = t?.label || t?.id || ''
    const url: string = t?.html_url || ''
    const type = (t?.type || '').toLowerCase()

    // Canonical names for built-in/internal tabs to avoid localized labels leaking through
    const typeMap: Record<string, string> = {
      wiki: 'Home',
      pages: 'Home',
      announcements: 'Announcements',
      modules: 'Modules',
      files: 'Files',
      grades: 'Grades',
      assignments: 'Assignments',
      discussions: 'Discussions',
      people: 'People',
      syllabus: 'Syllabus',
      quizzes: 'Quizzes',
      collaborations: 'Collaborations',
      conferences: 'Conferences',
      outcomes: 'Outcomes',
      settings: 'Settings',
      links: 'Links',
    }

    // If Canvas provides a known type, force the canonical English label
    if (typeMap[type]) return typeMap[type]

    // Infer internal destinations by path even if type is external/external_tool (Canvas sometimes marks internal links that way)
    try {
      const path = new URL(url, 'https://placeholder.local').pathname
      if (/\/announcements/.test(path)) return 'Announcements'
      if (/\/modules/.test(path)) return 'Modules'
      if (/\/files/.test(path)) return 'Files'
      if (/^\/courses\/\d+\/?$/.test(path)) return 'Home'
      if (/\/pages/.test(path)) return 'Home'
      if (/\/grades/.test(path)) return 'Grades'
      if (/\/assignments/.test(path)) return 'Assignments'
      if (/\/people/.test(path)) return 'People'
      if (/\/quizzes/.test(path)) return 'Quizzes'
      if (/\/syllabus/.test(path)) return 'Syllabus'
      if (/\/discussions/.test(path)) return 'Discussions'
    } catch {}

    // External or unknown: show the raw label
    return raw
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Course Links</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && <SkeletonList count={6} hasAvatar variant="row" />}
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
                      title={friendlyLabel(t)}
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
