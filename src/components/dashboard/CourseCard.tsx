import React from 'react'
import { Card } from '../ui/Card'
import { courseHueFor, courseInitials } from '../../utils/colorHelpers'

type Props = {
  course: { id: string | number; name: string; course_code?: string }
  label: string
  grade: number | null
  imgUrl?: string
  onClick: () => void
}

export const CourseCard: React.FC<Props> = ({ course, label, grade, imgUrl, onClick }) => {
  const hue = courseHueFor(course.id, course.name || String(course.id))
  const banner = imgUrl ? undefined : `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 18) % 360} 85% 50%))`
  const avatarBg = imgUrl ? undefined : `hsl(${hue} 75% 42%)`
  const initials = courseInitials(course.name, course.course_code)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:ring-black/15 dark:hover:ring-white/20"
    >
      {/* Banner */}
      <div
        className="-mx-5 -mt-5 h-28 relative bg-center bg-cover"
        style={banner ? { background: banner } : (imgUrl ? { backgroundImage: `url(${imgUrl})` } : {})}
      >
        {/* Dim overlay for readability when image present */}
        {imgUrl && <div className="absolute inset-0 bg-black/20" />}
        {grade != null && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-white/90 dark:bg-neutral-900/80 ring-1 ring-black/10 dark:ring-white/10">
            {grade}%
          </div>
        )}
        {/* Avatar overlapping bottom-left */}
        {imgUrl ? (
          <img
            className="absolute -bottom-5 left-5 w-10 h-10 rounded-full ring-2 ring-white dark:ring-neutral-900 object-cover shadow"
            src={imgUrl}
            alt={label}
          />
        ) : (
          <div className="absolute -bottom-5 left-5 w-10 h-10 rounded-full ring-2 ring-white dark:ring-neutral-900 flex items-center justify-center text-white text-sm font-semibold shadow" style={{ background: avatarBg }}>
            {initials}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="mt-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate" title={course.name}>{course.name}</div>
        </div>
      </div>
    </Card>
  )
}
