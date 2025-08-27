/// <reference types="vite/client" />

declare global {
  interface Window {
    settings: {
      get: () => Promise<{ ok: boolean; data?: { baseUrl: string; verbose?: boolean; theme?: 'light' | 'dark'; prefetchEnabled?: boolean; cachedCourses?: any[]; cachedDue?: any[]; queryCache?: any; sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> } }; error?: string }>
      set: (partial: Partial<{ baseUrl: string; verbose?: boolean; theme?: 'light' | 'dark'; prefetchEnabled?: boolean; cachedCourses?: any[]; cachedDue?: any[]; queryCache?: any; sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> } }>) => Promise<{ ok: boolean; data?: any; error?: string }>
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
      listActivityStream: (opts?: { onlyActiveCourses?: boolean; perPage?: number }) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseAnnouncements: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseAnnouncementsPage: (courseId: string | number, page?: number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getCourseInfo: (courseId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getCourseFrontPage: (courseId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getAnnouncement: (courseId: string | number, topicId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseFiles: (courseId: string | number, perPage?: number, sort?: 'name' | 'size' | 'created_at' | 'updated_at', order?: 'asc' | 'desc') => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseFolders: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listFolderFiles: (folderId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
    }
    system: {
      openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>
    }
    ipcRenderer: any
  }
}

export {}
