import React from 'react'
import { MoreVertical, GripVertical } from 'lucide-react'
import { Dropdown, DropdownItem } from '../ui/Dropdown'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Course = { id: number | string; name: string; course_code?: string }

type SidebarCourseRowProps = {
  course: Course
  active: boolean
  label: string
  onSelect: () => void
  onMore: () => void
  moreOpen: boolean
  onHideCourse: () => void
  onPrefetch: () => void
  onHoverLeave: () => void
}

export const SidebarCourseRow: React.FC<SidebarCourseRowProps> = ({
  course,
  active,
  label,
  onSelect,
  onMore,
  moreOpen,
  onHideCourse,
  onPrefetch,
  onHoverLeave,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(course.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }
  const btnRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg ${isDragging ? 'scale-[0.99]' : ''}`}
      onMouseEnter={onPrefetch}
      onMouseLeave={onHoverLeave}
    >
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        {...attributes}
        {...listeners}
        aria-label="Drag course"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <button
        className={`w-full text-left py-2 pl-7 pr-8 rounded-lg text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
          active
            ? 'bg-[var(--accent-200)] dark:bg-[var(--accent-50)] text-slate-900 dark:text-slate-100 font-medium shadow-sm ring-1 ring-[var(--accent-300)] dark:ring-[var(--accent-300)]'
            : 'hover:bg-[var(--glass-hover)] text-slate-600 dark:text-slate-300'
        }`}
        onClick={onSelect}
        title={course.name}
        aria-current={active ? 'page' : undefined}
      >
        <span className="block truncate">{label}</span>
      </button>
      <button
        ref={btnRef}
        data-sb-more
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        aria-label="Course options"
        onClick={(e) => {
          e.stopPropagation()
          onMore()
        }}
        title="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <Dropdown
        open={moreOpen}
        onOpenChange={(o) => {
          if (!o) onMore()
        }}
        align="right"
        offsetY={32}
        anchorRef={btnRef}
      >
        <DropdownItem
          onClick={(e) => {
            e.stopPropagation()
            onMore()
            onHideCourse()
          }}
        >
          Hide from sidebar
        </DropdownItem>
      </Dropdown>
    </div>
  )
}
