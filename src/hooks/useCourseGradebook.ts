import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import {
  courseGradebookQueryKey,
  fetchCourseGradebook,
  type CourseGradebookData,
} from './courseGradebookQuery'

export function useCourseGradebook(
  courseId: string | number | undefined,
  opts: { perPage?: number } = {},
  options?: Partial<UseQueryOptions<CourseGradebookData, Error, CourseGradebookData>>,
) {
  const { perPage = 100 } = opts || {}
  return useQuery<CourseGradebookData, Error, CourseGradebookData>({
    queryKey: courseGradebookQueryKey(courseId),
    queryFn: async () => {
      if (courseId == null) throw new Error('courseId is required')
      return fetchCourseGradebook(courseId, perPage)
    },
    enabled: courseId != null && (options?.enabled ?? true),
    staleTime: 1000 * 30,
    ...options,
  })
}
