import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { toAssignmentInputsFromRest, toAssignmentGroupInputsFromRest, type AssignmentInput, type AssignmentGroupInput } from '../utils/gradeCalc'

type IpcResult<T> = { ok: boolean; data?: T; error?: string }

function ensureOk<T>(res: IpcResult<T>): T {
  if (!res?.ok) throw new Error(res?.error || 'IPC call failed')
  return res.data as T
}

export function useCourseGradebook(
  courseId: string | number | undefined,
  opts: { perPage?: number } = {},
  options?: Partial<UseQueryOptions<{ groups: AssignmentGroupInput[]; assignments: AssignmentInput[]; raw: any[] }, Error, { groups: AssignmentGroupInput[]; assignments: AssignmentInput[]; raw: any[] }>>,
) {
  const { perPage = 100 } = opts || {}
  return useQuery<{ groups: AssignmentGroupInput[]; assignments: AssignmentInput[]; raw: any[] }, Error, { groups: AssignmentGroupInput[]; assignments: AssignmentInput[]; raw: any[] }>({
    queryKey: ['course-gradebook', courseId],
    queryFn: async () => {
      if (courseId == null) throw new Error('courseId is required')
      const [groupsRes, assignmentsRes] = await Promise.all([
        window.canvas.listAssignmentGroups(courseId, false),
        window.canvas.listAssignmentsWithSubmission(courseId, perPage),
      ])
      const groups = toAssignmentGroupInputsFromRest(ensureOk(groupsRes as any))
      const raw = ensureOk(assignmentsRes as any) as any[]
      const assignments = toAssignmentInputsFromRest(raw)
      return { groups, assignments, raw }
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 30,
    ...options,
  })
}
