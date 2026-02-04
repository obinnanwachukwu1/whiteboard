import React from 'react'
import { Users, Search, GraduationCap, BookOpen, UserCog, User, UsersRound, ChevronDown, ChevronRight } from 'lucide-react'
import { useCourseUsers, useCourseGroups, useMyGroups } from '../hooks/useCanvasQueries'
import type { CanvasUser, CanvasEnrollment, CanvasGroup } from '../types/canvas'
import { useAIContextOffer } from '../hooks/useAIContextOffer'

type Props = {
  courseId: string | number
  courseName?: string
}

// Get primary role from enrollments
function getPrimaryRole(enrollments?: CanvasEnrollment[]): string {
  if (!enrollments || enrollments.length === 0) return 'Member'
  // Priority order: Teacher > TA > Designer > Student > Observer
  const priority = ['TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment', 'StudentEnrollment', 'ObserverEnrollment']
  for (const p of priority) {
    if (enrollments.some(e => e.type === p)) {
      return p.replace('Enrollment', '').replace(/([A-Z])/g, ' $1').trim()
    }
  }
  // Fallback to first enrollment type
  const first = enrollments[0]?.type || 'Member'
  return first.replace('Enrollment', '').replace(/([A-Z])/g, ' $1').trim()
}

// Get display-friendly role label
function getRoleLabel(role: string): string {
  switch (role.toLowerCase()) {
    case 'teacher': return 'Instructor'
    case 'ta': return 'Teaching Assistant'
    case 'designer': return 'Course Designer'
    case 'student': return 'Student'
    case 'observer': return 'Observer'
    default: return role
  }
}

// Get role icon
function RoleIcon({ role }: { role: string }) {
  const r = role.toLowerCase()
  const cls = "w-4 h-4"
  if (r === 'teacher' || r === 'instructor') return <GraduationCap className={cls} />
  if (r === 'ta' || r === 'teaching assistant') return <BookOpen className={cls} />
  if (r === 'designer') return <UserCog className={cls} />
  return <User className={cls} />
}

// Role badge with color
function RoleBadge({ role }: { role: string }) {
  const r = role.toLowerCase()
  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
  if (r === 'teacher' || r === 'instructor') {
    bgClass = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
  } else if (r === 'ta' || r === 'teaching assistant') {
    bgClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
  } else if (r === 'designer') {
    bgClass = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
  } else if (r === 'student') {
    bgClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>
      <RoleIcon role={role} />
      <span>{getRoleLabel(role)}</span>
    </span>
  )
}

// Avatar component with fallback
function Avatar({ user }: { user: CanvasUser }) {
  const [imgError, setImgError] = React.useState(false)
  const initials = (user.short_name || user.name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  
  if (user.avatar_url && !imgError) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-neutral-900"
        onError={() => setImgError(true)}
      />
    )
  }
  
  // Fallback to initials with gradient
  const gradients = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-red-500',
    'from-indigo-500 to-violet-500',
  ]
  const gradientIdx = Math.abs(String(user.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % gradients.length
  
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradients[gradientIdx]} flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white dark:ring-neutral-900`}>
      {initials}
    </div>
  )
}

// Filter/role buttons
const ROLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'instructor', label: 'Instructors' },
  { key: 'student', label: 'Students' },
] as const

type RoleFilter = typeof ROLE_FILTERS[number]['key']

export const CoursePeople: React.FC<Props> = ({ courseId, courseName }) => {
  const { data, isLoading, error } = useCourseUsers(courseId)
  const { data: courseGroups, isLoading: groupsLoading } = useCourseGroups(courseId)
  const { data: myAllGroups } = useMyGroups('Course')
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('all')
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string | number>>(new Set())
  
  // Filter to only show groups for this course that the user is in
  const myGroups = React.useMemo(() => {
    if (!courseGroups || !myAllGroups) return []
    const myGroupIds = new Set(myAllGroups.map(g => String(g.id)))
    return courseGroups.filter(g => myGroupIds.has(String(g.id)))
  }, [courseGroups, myAllGroups])
  
  const toggleGroup = (groupId: string | number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }
  
  // Process and group users
  const processedUsers = React.useMemo(() => {
    if (!data) return { instructors: [], tas: [], students: [], others: [] }
    
    const users = data.map(u => ({
      ...u,
      role: getPrimaryRole(u.enrollments),
    }))
    
    // Filter by search
    const filtered = users.filter(u => {
      const searchLower = search.toLowerCase()
      const nameMatch = (u.name || '').toLowerCase().includes(searchLower) ||
                       (u.short_name || '').toLowerCase().includes(searchLower) ||
                       (u.email || '').toLowerCase().includes(searchLower)
      return nameMatch
    })
    
    // Filter by role
    const roleFiltered = filtered.filter(u => {
      if (roleFilter === 'all') return true
      if (roleFilter === 'instructor') {
        return ['teacher', 'ta', 'designer'].includes(u.role.toLowerCase())
      }
      if (roleFilter === 'student') {
        return u.role.toLowerCase() === 'student'
      }
      return true
    })
    
    // Group by role
    const instructors = roleFiltered.filter(u => u.role.toLowerCase() === 'teacher')
    const tas = roleFiltered.filter(u => u.role.toLowerCase() === 'ta')
    const students = roleFiltered.filter(u => u.role.toLowerCase() === 'student')
    const others = roleFiltered.filter(u => !['teacher', 'ta', 'student'].includes(u.role.toLowerCase()))
    
    // Sort each group alphabetically
    const sortByName = (a: typeof users[0], b: typeof users[0]) => 
      (a.sortable_name || a.name || '').localeCompare(b.sortable_name || b.name || '')
    
    instructors.sort(sortByName)
    tas.sort(sortByName)
    students.sort(sortByName)
    others.sort(sortByName)
    
    return { instructors, tas, students, others }
  }, [data, search, roleFilter])
  
  const totalCount = data?.length || 0
  const filteredCount = processedUsers.instructors.length + processedUsers.tas.length + 
                       processedUsers.students.length + processedUsers.others.length

  const peopleContext = React.useMemo(() => {
    if (!data || data.length === 0) return ''
    const parts: string[] = []
    if (search.trim() || roleFilter !== 'all') {
      const filters: string[] = []
      if (search.trim()) filters.push(`Search: "${search.trim()}"`)
      if (roleFilter !== 'all') filters.push(`Role: ${roleFilter}`)
      parts.push(`Filters: ${filters.join(' · ')}`)
    }
    parts.push(`People: ${filteredCount} of ${totalCount}`)
    parts.push(
      `Instructors: ${processedUsers.instructors.length}, ` +
        `TAs: ${processedUsers.tas.length}, ` +
        `Students: ${processedUsers.students.length}, ` +
        `Others: ${processedUsers.others.length}`,
    )

    const visible = [
      ...processedUsers.instructors,
      ...processedUsers.tas,
      ...processedUsers.students,
      ...processedUsers.others,
    ]
    const lines = visible.slice(0, 15).map((u: any) => {
      const role = getRoleLabel(u.role || '')
      return `- ${u.name || u.short_name || 'User'}${role ? ` (${role})` : ''}`
    })
    if (lines.length) {
      parts.push(['People List:', ...lines].join('\n'))
    }
    return parts.join('\n')
  }, [data, search, roleFilter, processedUsers, filteredCount, totalCount])

  const peopleOffer = React.useMemo(() => {
    if (!peopleContext) return null
    return {
      id: `course-people:${String(courseId)}`,
      slot: 'view' as const,
      kind: 'people' as const,
      title: 'People',
      courseId,
      courseName,
      contentText: peopleContext.slice(0, 4000),
    }
  }, [peopleContext, courseId, courseName])

  useAIContextOffer(`course-people:${String(courseId)}`, peopleOffer)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">People</h3>
          {!isLoading && data && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {filteredCount === totalCount ? totalCount : `${filteredCount} of ${totalCount}`}
            </span>
          )}
        </div>
      </div>
      
      {/* My Groups Section */}
      {myGroups.length > 0 && (
        <div className="mb-4 shrink-0">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            My Groups ({myGroups.length})
          </h4>
          <div className="space-y-3">
            {myGroups.map(group => (
              <GroupCard 
                key={group.id} 
                group={group} 
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>
        </div>
      )}
      {groupsLoading && myGroups.length === 0 && (
        <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 text-sm mb-4">
          <UsersRound className="w-4 h-4 animate-pulse" />
          Loading groups...
        </div>
      )}
      
      {/* Search and Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 shrink-0">
          {ROLE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                roleFilter === f.key
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {error && <div className="text-red-600 text-sm mb-2">{String((error as any)?.message || error)}</div>}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 text-sm">
            <Users className="w-4 h-4 animate-pulse" />
            Loading people...
          </div>
        )}
        
        {!isLoading && data && filteredCount === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-neutral-400">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">
              {search || roleFilter !== 'all' ? 'No people match your search' : 'No people in this course'}
            </p>
          </div>
        )}
        
        {!isLoading && data && filteredCount > 0 && (
          <div className="space-y-6">
            {/* Instructors */}
            {processedUsers.instructors.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Instructors ({processedUsers.instructors.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {processedUsers.instructors.map(user => (
                    <PersonCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}
            
            {/* TAs */}
            {processedUsers.tas.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Teaching Assistants ({processedUsers.tas.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {processedUsers.tas.map(user => (
                    <PersonCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}
            
            {/* Others (Designers, Observers) */}
            {processedUsers.others.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <UserCog className="w-4 h-4" />
                  Other ({processedUsers.others.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {processedUsers.others.map(user => (
                    <PersonCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}
            
            {/* Students */}
            {processedUsers.students.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Students ({processedUsers.students.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {processedUsers.students.map(user => (
                    <PersonCard key={user.id} user={user} compact />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Person card component
function PersonCard({ user, compact = false }: { user: CanvasUser & { role: string }, compact?: boolean }) {
  const displayName = user.short_name || user.name || 'Unknown'
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 dark:bg-neutral-900/70 ring-1 ring-gray-200 dark:ring-neutral-800 hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)] transition-all">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">{displayName}</div>
          {user.email && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/70 dark:bg-neutral-900/70 ring-1 ring-gray-200 dark:ring-neutral-800 hover:ring-[var(--app-accent-hover)] hover:bg-[var(--app-accent-bg)] transition-all">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate text-slate-900 dark:text-slate-100">{displayName}</div>
        {user.email && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">{user.email}</div>
        )}
        <RoleBadge role={user.role} />
      </div>
    </div>
  )
}

// Group card component
function GroupCard({ group, isExpanded, onToggle }: { group: CanvasGroup, isExpanded: boolean, onToggle: () => void }) {
  const memberCount = group.members_count || group.users?.length || 0
  const previewUsers = (group.users || []).slice(0, 4)
  
  return (
    <div className="rounded-lg bg-white/70 dark:bg-neutral-900/70 ring-1 ring-gray-200 dark:ring-neutral-800 overflow-hidden transition-all hover:ring-[var(--app-accent-hover)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--app-accent-bg)] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
          <UsersRound className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{group.name || 'Unnamed Group'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="shrink-0 text-slate-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      
      {isExpanded && previewUsers.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
          <div className="space-y-1.5">
            {previewUsers.map(user => (
              <div key={user.id} className="flex items-center gap-2">
                <Avatar user={user} />
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {user.short_name || user.name || 'Unknown'}
                </span>
              </div>
            ))}
            {memberCount > 4 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 pl-12">
                +{memberCount - 4} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
