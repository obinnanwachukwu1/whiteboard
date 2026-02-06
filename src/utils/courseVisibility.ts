export function normalizeCourseId(id: string | number): string {
  return String(id)
}

export function toHiddenCourseIdSet(
  hiddenCourseIds: Array<string | number> | undefined,
): Set<string> {
  return new Set((hiddenCourseIds || []).map(normalizeCourseId))
}

export function filterVisibleCourses<T extends { id: string | number }>(
  courses: T[],
  hiddenCourseIds: Array<string | number> | undefined,
): T[] {
  const hidden = toHiddenCourseIdSet(hiddenCourseIds)
  return courses.filter((course) => !hidden.has(normalizeCourseId(course.id)))
}

export function updateHiddenCourseIds(
  hiddenCourseIds: Array<string | number> | undefined,
  courseId: string | number,
  hide: boolean,
): string[] {
  const next = toHiddenCourseIdSet(hiddenCourseIds)
  const id = normalizeCourseId(courseId)
  if (hide) next.add(id)
  else next.delete(id)
  return Array.from(next)
}
