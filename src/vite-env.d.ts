/// <reference types="vite/client" />

declare global {
  interface Window {
    settings: {
      get: () => Promise<{ ok: boolean; data?: { baseUrl: string; verbose?: boolean; theme?: 'light' | 'dark'; prefetchEnabled?: boolean; sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> } }; error?: string }>
      set: (partial: Partial<{ baseUrl: string; verbose?: boolean; theme?: 'light' | 'dark'; prefetchEnabled?: boolean; sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> } }>) => Promise<{ ok: boolean; data?: any; error?: string }>
    }
    canvas: {
      init: (cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => Promise<{ ok: boolean; insecure?: boolean; error?: string }>
      clearToken: (baseUrl?: string) => Promise<{ ok: boolean; error?: string }>
      getProfile: () => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourses: (opts?: { enrollment_state?: string }) => Promise<{ ok: boolean; data?: any; error?: string }>
      listDueAssignments: (opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseAssignments: (courseId: string | number, first?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseModulesGql: (courseId: string | number, first?: number, itemsFirst?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listUpcoming: (opts?: { onlyActiveCourses?: boolean }) => Promise<{ ok: boolean; data?: any; error?: string }>
      listTodo: () => Promise<{ ok: boolean; data?: any; error?: string }>
      getMySubmission: (courseId: string | number, assignmentRestId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCoursePages: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getCoursePage: (courseId: string | number, slugOrUrl: string) => Promise<{ ok: boolean; data?: any; error?: string }>
      getAssignmentRest: (courseId: string | number, assignmentRestId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getFile: (fileId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getFileBytes: (fileId: string | number) => Promise<{ ok: boolean; data?: ArrayBuffer; error?: string }>
      listAssignmentsWithSubmission: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listAssignmentGroups: (courseId: string | number, includeAssignments?: boolean) => Promise<{ ok: boolean; data?: any; error?: string }>
      listMyEnrollmentsForCourse: (courseId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseTabs: (courseId: string | number, includeExternal?: boolean) => Promise<{ ok: boolean; data?: any; error?: string }>
    }
    ipcRenderer: any
  }
}

export {}
