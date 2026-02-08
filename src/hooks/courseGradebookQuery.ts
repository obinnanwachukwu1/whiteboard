import {
  toAssignmentInputsFromRest,
  toAssignmentGroupInputsFromRest,
  type AssignmentInput,
  type AssignmentGroupInput,
} from '../utils/gradeCalc'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
}

export type CourseGradebookData = {
  groups: AssignmentGroupInput[]
  assignments: AssignmentInput[]
  raw: any[]
}

export function courseGradebookQueryKey(courseId: string | number | undefined) {
  return ['course-gradebook', courseId != null ? String(courseId) : courseId] as const
}

export async function fetchCourseGradebook(
  courseId: string | number,
  perPage = 100,
): Promise<CourseGradebookData> {
  const cid = String(courseId)
  const [groupsRes, assignmentsRes] = await Promise.all([
    window.canvas.listAssignmentGroups(cid, false),
    window.canvas.listAssignmentsWithSubmission(cid, perPage),
  ])
  const groups = toAssignmentGroupInputsFromRest(ensureOk(groupsRes as any))
  const raw = ensureOk(assignmentsRes as any) as any[]
  const assignments = toAssignmentInputsFromRest(raw)
  return { groups, assignments, raw }
}
