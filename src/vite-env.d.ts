/// <reference types="vite/client" />

declare global {
  interface Window {
    settings: {
      get: () => Promise<{
        ok: boolean
        data?: {
          baseUrl: string
          verbose?: boolean
          theme?: 'light' | 'dark'
          accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'
          prefetchEnabled?: boolean
          cachedCourses?: any[]
          cachedDue?: any[]
          queryCache?: any
          courseImages?: Record<string, Record<string, string>>
          sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
          userSettings?: Record<string, any>
          userSidebars?: Record<string, any>
          pdfGestureZoomEnabled?: boolean
          pdfZoom?: Record<string, number>
          lastUserId?: string
        }
        error?: string
      }>
      set: (partial: Partial<{
        baseUrl: string
        verbose?: boolean
        theme?: 'light' | 'dark'
        accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'
        prefetchEnabled?: boolean
        cachedCourses?: any[]
        cachedDue?: any[]
        queryCache?: any
        courseImages?: Record<string, Record<string, string>>
        sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
        userSettings?: Record<string, any>
        userSidebars?: Record<string, any>
        pdfGestureZoomEnabled?: boolean
        pdfZoom?: Record<string, number>
        lastUserId?: string
      }>) => Promise<{ ok: boolean; data?: any; error?: string }>
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
      // Returns a canvas-file:// URL to the local file
      getFileBytes: (fileId: string | number) => Promise<{ ok: boolean; data?: string; error?: string }>
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
      listCourseUsers: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listCourseGroups: (courseId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      listMyGroups: (contextType?: 'Account' | 'Course') => Promise<{ ok: boolean; data?: any; error?: string }>
      listGroupUsers: (groupId: string | number, perPage?: number) => Promise<{ ok: boolean; data?: any; error?: string }>
      // Conversations (Inbox)
      listConversations: (params?: { scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'; perPage?: number }) => Promise<{ ok: boolean; data?: any; error?: string }>
      getConversation: (conversationId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      getUnreadCount: () => Promise<{ ok: boolean; data?: { unread_count: string }; error?: string }>
      createConversation: (params: { recipients: string[]; subject?: string; body: string; groupConversation?: boolean; contextCode?: string }) => Promise<{ ok: boolean; data?: any; error?: string }>
      addMessage: (conversationId: string | number, body: string, includedMessages?: string[]) => Promise<{ ok: boolean; data?: any; error?: string }>
      updateConversation: (conversationId: string | number, params: { workflowState?: 'read' | 'unread' | 'archived'; starred?: boolean; subscribed?: boolean }) => Promise<{ ok: boolean; data?: any; error?: string }>
      deleteConversation: (conversationId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
      searchRecipients: (params: { search: string; context?: string; type?: 'user' | 'context'; perPage?: number }) => Promise<{ ok: boolean; data?: any; error?: string }>
    }
    system: {
      openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>
    }
    electron: {
      onMainProcessMessage: (callback: (message: string) => void) => void
    }
  }
}

export {}
