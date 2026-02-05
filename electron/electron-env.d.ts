/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js / preload.mjs
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  canvas: {
    init: (cfg: {
      token?: string
      baseUrl?: string
      verbose?: boolean
    }) => Promise<{ ok: boolean; insecure?: boolean; error?: string }>
    clearToken: (baseUrl?: string) => Promise<{ ok: boolean; error?: string }>
    getProfile: () => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourses: (opts?: {
      enrollment_state?: string
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
    listDueAssignments: (opts?: {
      days?: number
      onlyPublished?: boolean
      includeCourseName?: boolean
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseAssignments: (
      courseId: string | number,
      first?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseModulesGql: (
      courseId: string | number,
      first?: number,
      itemsFirst?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listUpcoming: (opts?: {
      onlyActiveCourses?: boolean
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
    listTodo: () => Promise<{ ok: boolean; data?: any; error?: string }>
    getMySubmission: (
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    submitAssignment: (
      courseId: string | number,
      assignmentRestId: string | number,
      params: {
        submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
        body?: string
        url?: string
        fileIds?: Array<string | number>
      },
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    submitAssignmentUpload: (
      courseId: string | number,
      assignmentRestId: string | number,
      filePaths: string[],
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCoursePages: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getCoursePage: (
      courseId: string | number,
      slugOrUrl: string,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getAssignmentRest: (
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getFile: (fileId: string | number) => Promise<{ ok: boolean; data?: any; error?: string }>
    getFileBytes: (
      fileId: string | number,
    ) => Promise<{ ok: boolean; data?: ArrayBuffer; error?: string }>
    listAssignmentsWithSubmission: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listAssignmentGroups: (
      courseId: string | number,
      includeAssignments?: boolean,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listMyEnrollmentsForCourse: (
      courseId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseTabs: (
      courseId: string | number,
      includeExternal?: boolean,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseQuizzes: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getCourseQuiz: (
      courseId: string | number,
      quizId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listActivityStream: (opts?: {
      onlyActiveCourses?: boolean
      perPage?: number
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
    listAccountNotifications: (
      accountId: string | number,
      params?: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean },
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseAnnouncements: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseAnnouncementsPage: (
      courseId: string | number,
      page?: number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getCourseInfo: (
      courseId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getCourseFrontPage: (
      courseId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getAnnouncement: (
      courseId: string | number,
      topicId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    // Discussions
    listCourseDiscussions: (
      courseId: string | number,
      params?: {
        perPage?: number
        searchTerm?: string
        filterBy?: 'all' | 'unread'
        scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
        orderBy?: 'position' | 'recent_activity' | 'title'
        maxPages?: number
      },
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getDiscussion: (
      courseId: string | number,
      topicId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getDiscussionView: (
      courseId: string | number,
      topicId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    postDiscussionEntry: (
      courseId: string | number,
      topicId: string | number,
      message: string,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    postDiscussionReply: (
      courseId: string | number,
      topicId: string | number,
      entryId: string | number,
      message: string,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    markDiscussionEntriesRead: (
      courseId: string | number,
      topicId: string | number,
      entryIds: (string | number)[],
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseFolders: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listFolderFiles: (
      folderId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseFiles: (
      courseId: string | number,
      perPage?: number,
      sort?: 'name' | 'size' | 'created_at' | 'updated_at',
      order?: 'asc' | 'desc',
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseUsers: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listCourseGroups: (
      courseId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listMyGroups: (
      contextType?: 'Account' | 'Course',
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    listGroupUsers: (
      groupId: string | number,
      perPage?: number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    // Conversations (Inbox)
      listConversations: (params?: {
        scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'
        perPage?: number
        pageUrl?: string
      }) => Promise<{
        ok: boolean
        data?: { items: any[]; nextPageUrl?: string | null }
        error?: string
      }>
    getConversation: (
      conversationId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    getUnreadCount: () => Promise<{ ok: boolean; data?: { unread_count: string }; error?: string }>
    createConversation: (params: {
      recipients: string[]
      subject?: string
      body: string
      groupConversation?: boolean
      contextCode?: string
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
    addMessage: (
      conversationId: string | number,
      body: string,
      includedMessages?: string[],
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    updateConversation: (
      conversationId: string | number,
      params: {
        workflowState?: 'read' | 'unread' | 'archived'
        starred?: boolean
        subscribed?: boolean
      },
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    deleteConversation: (
      conversationId: string | number,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
    searchRecipients: (params: {
      search: string
      context?: string
      type?: 'user' | 'context'
      perPage?: number
    }) => Promise<{ ok: boolean; data?: any; error?: string }>
  }
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
        userSettings?: Record<string, any>
        userSidebars?: Record<string, any>
        courseImages?: Record<string, Record<string, string>>
        courseImageAllowlist?: string[]
        sidebar?: {
          hiddenCourseIds?: Array<string | number>
          customNames?: Record<string, string>
          order?: Array<string | number>
        }
        pdfGestureZoomEnabled?: boolean
        pdfZoom?: Record<string, number>
        lastUserId?: string
        embeddingsEnabled?: boolean
        aiEnabled?: boolean
        privateModeEnabled?: boolean
        privateModeAcknowledged?: boolean
        encryptionEnabled?: boolean
      }
      error?: string
    }>
    set: (
      partial: Partial<{
        baseUrl: string
        verbose?: boolean
        theme?: 'light' | 'dark'
        accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'
        prefetchEnabled?: boolean
        cachedCourses?: any[]
        cachedDue?: any[]
        queryCache?: any
        userSettings?: Record<string, any>
        userSidebars?: Record<string, any>
        courseImages?: Record<string, Record<string, string>>
        courseImageAllowlist?: string[]
        sidebar?: {
          hiddenCourseIds?: Array<string | number>
          customNames?: Record<string, string>
          order?: Array<string | number>
        }
        pdfGestureZoomEnabled?: boolean
        pdfZoom?: Record<string, number>
        lastUserId?: string
        embeddingsEnabled?: boolean
        aiEnabled?: boolean
        privateModeEnabled?: boolean
        privateModeAcknowledged?: boolean
        encryptionEnabled?: boolean
      }>,
    ) => Promise<{ ok: boolean; data?: any; error?: string }>
  }
  ai: {
    getAvailability?: (opts?: {
      force?: boolean
    }) => Promise<{
      ok: boolean
      data?: {
        status: 'available' | 'unsupported' | 'disabled' | 'error'
        detail?: string
      }
      error?: string
    }>
    chat: (
      messages: any[],
      opts?:
        | number
        | {
            max_tokens?: number
            response_format?: any
            tools?: any
            tool_choice?: any
            temperature?: number
            top_p?: number
          },
    ) => Promise<{ ok: boolean; choices?: any[]; error?: any }>
    chatStream: (
      messages: any[],
      onChunk: (content: string) => void,
      onDone?: () => void,
      onError?: (error: string) => void,
    ) => () => void
  }
  embedding: {
    search: (
      query: string,
      k?: number,
      opts?: {
        courseIds?: string[]
        types?: Array<'announcement' | 'assignment' | 'page' | 'module' | 'file'>
        minScore?: number
        dedupe?: boolean
      },
    ) => Promise<{
      ok: boolean
      data?: Array<{
        id: string
        score: number
        metadata: {
          type: 'announcement' | 'assignment' | 'page' | 'module' | 'file'
          courseId: string
          courseName: string
          title: string
          snippet: string
          url?: string
          contentHash: string
        }
      }>
      error?: string
    }>
    index: (
      items: Array<{
        id: string
        type: 'announcement' | 'assignment' | 'page' | 'module' | 'file'
        courseId: string
        courseName: string
        title: string
        content: string
        url?: string
      }>,
    ) => Promise<{
      ok: boolean
      data?: { indexed: number; skipped: number }
      error?: string
    }>
    getStatus: () => Promise<{
      ok: boolean
      data?: {
        ready: boolean
        modelDownloaded: boolean
        itemCount: number
        memoryUsedMB: number
        memoryLimitMB: number
      }
      error?: string
    }>
    setPaused: (paused: boolean) => Promise<{ ok: boolean; error?: string }>
    clear: () => Promise<{ ok: boolean; error?: string }>
    // File indexing APIs
    indexFile: (
      fileId: string,
      courseId: string,
      courseName: string,
      fileName: string,
      fileSize: number,
      updatedAt?: string,
      url?: string,
      opts?: { maxPages?: number },
    ) => Promise<{
      ok: boolean
      data?: { chunks: number; pageCount: number; truncated: boolean; skipped?: boolean }
      error?: string
    }>
    pruneCourse: (courseId: string) => Promise<{
      ok: boolean
      data?: number
      error?: string
    }>
    getStorageStats: () => Promise<{
      ok: boolean
      data?: {
        totalEntries: number
        totalBytes: number
        byCourse: Record<string, { entries: number; bytes: number }>
        byType: Record<string, { entries: number; bytes: number }>
      }
      error?: string
    }>
    onDownloadProgress: (
      callback: (progress: {
        file: string
        downloaded: number
        total: number
        percent: number
      }) => void,
    ) => () => void
  }
  degreeAudit: {
    extractPdfText: (
      pdfBytes: ArrayBuffer,
      options?: { maxPages?: number; maxFileSizeBytes?: number; maxChars?: number },
    ) => Promise<{
      ok: boolean
      data?: { text: string; pageCount: number; truncated: boolean; extractedChars: number }
      error?: string
    }>
  }
  system: {
    openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>
    openContentWindow: (params: {
      courseId: string
      type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
      contentId: string
      title?: string
      courseName?: string
    }) => Promise<{ ok: boolean; error?: string }>
    pickFiles: (opts?: {
      multiple?: boolean
      filters?: { name: string; extensions: string[] }[]
    }) => Promise<{
      ok: boolean
      data?: Array<{ path: string; name: string; size: number }>
      error?: string
    }>
    downloadFile: (
      fileId: string | number,
      suggestedName?: string,
    ) => Promise<{ ok: boolean; data?: string; error?: string }>
    clearTempCache: () => Promise<{ ok: boolean; data?: { removed: number }; error?: string }>
  }
  secureStorage: {
    isAvailable: () => boolean
    isEncryptionAvailable?: () => boolean
    encrypt: (value: string) => string | null
    decrypt: (payload: string) => string | null
  }
}
