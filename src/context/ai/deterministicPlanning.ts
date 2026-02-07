import { extractAssignmentIdFromUrl } from '../../utils/urlHelpers'

export type DeterministicPlanningItem = {
  id: string
  title: string
  courseId: string
  courseName: string
  dueISO: string
  dueLabel: string
  points: number | null
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay() // 0=Sun
  const diff = (day - 1 + 7) % 7
  const out = new Date(d)
  out.setDate(out.getDate() - diff)
  return startOfDay(out)
}

function buildDueWindow(query: string, now: Date): { start: Date; end: Date | null } {
  const q = String(query || '').toLowerCase()
  const today = startOfDay(now)

  if (q.includes('due today') || q.includes('today')) {
    return { start: today, end: endOfDay(today) }
  }

  if (q.includes('tomorrow')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return { start: tomorrow, end: endOfDay(tomorrow) }
  }

  if (q.includes('this week')) {
    const ws = startOfWeekMonday(now)
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    return { start: today, end: endOfDay(we) }
  }

  if (q.includes('next week')) {
    const ws = startOfWeekMonday(now)
    const next = new Date(ws)
    next.setDate(next.getDate() + 7)
    const we = new Date(next)
    we.setDate(we.getDate() + 6)
    return { start: next, end: endOfDay(we) }
  }

  return { start: now, end: null }
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return String(iso || '')
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function extractPointValue(a: any): number | null {
  const value = a?.points_possible ?? a?.pointsPossible
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function selectDeterministicPlanningItems(
  query: string,
  dueAssignments: any[],
  courses: any[],
  maxItems = 8,
  now = new Date(),
): DeterministicPlanningItem[] {
  const window = buildDueWindow(query, now)
  const courseNameById = new Map<string, string>()
  for (const c of courses || []) {
    courseNameById.set(String(c?.id), String(c?.name || c?.course_code || 'Unknown Course'))
  }

  const rows = (dueAssignments || [])
    .map((a: any) => {
      const dueISO = String(a?.due_at || a?.dueAt || '')
      const dueDate = new Date(dueISO)
      if (!dueISO || !Number.isFinite(dueDate.getTime())) return null

      const courseId = String(a?.course_id || a?.courseId || '')
      const courseName = String(
        a?.course_name ||
          a?.courseName ||
          courseNameById.get(courseId) ||
          a?.course_code ||
          'Unknown Course',
      )
      const url = String(a?.html_url || a?.htmlUrl || a?.url || '')
      const restId =
        a?.assignment_rest_id ??
        a?.assignmentRestId ??
        a?.assignment_id ??
        a?.id ??
        a?._id ??
        extractAssignmentIdFromUrl(url)

      if (restId == null || String(restId) === '' || String(restId) === 'undefined') return null

      return {
        id: `assignment:${courseId}:${String(restId)}`,
        title: String(a?.name || ''),
        courseId,
        courseName,
        dueISO,
        dueTime: dueDate.getTime(),
        dueLabel: formatDue(dueISO),
        points: extractPointValue(a),
      }
    })
    .filter(Boolean) as Array<
    DeterministicPlanningItem & {
      dueTime: number
    }
  >

  const filtered = rows
    .filter((r) => r.dueTime >= window.start.getTime())
    .filter((r) => (window.end ? r.dueTime <= window.end.getTime() : true))
    .sort((a, b) => a.dueTime - b.dueTime)
    .slice(0, maxItems)

  return filtered.map((r) => ({
    id: r.id,
    title: r.title,
    courseId: r.courseId,
    courseName: r.courseName,
    dueISO: r.dueISO,
    dueLabel: r.dueLabel,
    points: r.points,
  }))
}

export function buildDeterministicPlanningAnswer(items: DeterministicPlanningItem[]): string {
  if (!items.length) return "I don't have any upcoming assignments in the provided context."

  const lines = items.map((item) => {
    const points =
      typeof item.points === 'number' && Number.isFinite(item.points) ? ` - ${item.points} pts` : ''
    return `- ${item.title} (${item.courseName}) - due ${item.dueLabel}${points}`
  })

  const first = items[0]
  const recommendation =
    items.length > 1
      ? `Start with ${first.title} in ${first.courseName} first, then continue in due-date order.`
      : `Start with ${first.title} in ${first.courseName}.`

  return `Here are your upcoming assignments:\n${lines.join('\n')}\n\n${recommendation}`
}
