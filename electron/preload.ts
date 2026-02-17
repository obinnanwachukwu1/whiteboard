import { contextBridge, ipcRenderer } from 'electron'
import type {
  AIApi,
  CanvasApi,
  DegreeAuditApi,
  ElectronApi,
  EmbeddingApi,
  PlatformApi,
  SecureStorageApi,
  SettingsApi,
  SystemApi,
  ThemeConfigChangedPayload,
  ThemeApi,
} from '../src/types/ipc'

// SECURITY: Only expose APIs to the main frame, not iframes
if (process.isMainFrame) {
  // (No native embedded views to clean up.)

  // --------- Expose some API to the Renderer process ---------
  const electronApi = {
    onMainProcessMessage: (callback: (message: string) => void) => {
      return ipcRenderer.on('main-process-message', (_event, message) => callback(message))
    },
    onMenuAction: (callback: (action: string) => void) => {
      const handler = (_event: any, action: string) => callback(action)
      ipcRenderer.on('menu:action', handler)
      return () => ipcRenderer.removeListener('menu:action', handler)
    },
    onThemeConfigChanged: (callback: (payload: ThemeConfigChangedPayload) => void) => {
      const handler = (_event: any, payload: ThemeConfigChangedPayload) => callback(payload)
      ipcRenderer.on('config:themeChanged', handler)
      return () => ipcRenderer.removeListener('config:themeChanged', handler)
    },
  } satisfies ElectronApi

  contextBridge.exposeInMainWorld('electron', electronApi)

  // High-level Canvas API
  const canvasApi = {
    init: (cfg: { token?: string; baseUrl?: string; verbose?: boolean }) =>
      ipcRenderer.invoke('canvas:init', cfg),
    clearToken: (baseUrl?: string) => ipcRenderer.invoke('canvas:clearToken', baseUrl),
    getProfile: () => ipcRenderer.invoke('canvas:getProfile'),
    listCourses: (opts?: { enrollment_state?: string }) =>
      ipcRenderer.invoke('canvas:listCourses', opts),
    listDueAssignments: (opts?: {
      days?: number
      onlyPublished?: boolean
      includeCourseName?: boolean
    }) => ipcRenderer.invoke('canvas:listDueAssignments', opts),
    listCourseAssignments: (courseId: string | number, first?: number) =>
      ipcRenderer.invoke('canvas:listCourseAssignments', courseId, first),
    listCourseModulesGql: (courseId: string | number, first?: number, itemsFirst?: number) =>
      ipcRenderer.invoke('canvas:listCourseModulesGql', courseId, first, itemsFirst),
    getCourseModuleItem: (courseId: string | number, itemId: string | number) =>
      ipcRenderer.invoke('canvas:getCourseModuleItem', courseId, itemId),
    listUpcoming: (opts?: { onlyActiveCourses?: boolean }) =>
      ipcRenderer.invoke('canvas:listUpcoming', opts),
    listTodo: () => ipcRenderer.invoke('canvas:listTodo'),
    getMySubmission: (
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => ipcRenderer.invoke('canvas:getMySubmission', courseId, assignmentRestId, include),
    submitAssignment: (
      courseId: string | number,
      assignmentRestId: string | number,
      params: {
        submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
        body?: string
        url?: string
        fileIds?: Array<string | number>
      },
    ) => ipcRenderer.invoke('canvas:submitAssignment', courseId, assignmentRestId, params),
    submitAssignmentUpload: (
      courseId: string | number,
      assignmentRestId: string | number,
      filePaths: string[],
    ) => ipcRenderer.invoke('canvas:submitAssignmentUpload', courseId, assignmentRestId, filePaths),
    listCoursePages: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCoursePages', courseId, perPage),
    getCoursePage: (courseId: string | number, slugOrUrl: string) =>
      ipcRenderer.invoke('canvas:getCoursePage', courseId, slugOrUrl),
    getAssignmentRest: (
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => ipcRenderer.invoke('canvas:getAssignmentRest', courseId, assignmentRestId, include),
    getFile: (fileId: string | number) => ipcRenderer.invoke('canvas:getFile', fileId),
    getFileBytes: async (fileId: string | number) => {
      return ipcRenderer.invoke('canvas:getFileBytes', fileId)
    },
    cacheCourseImage: (courseId: string | number, url: string) =>
      ipcRenderer.invoke('canvas:cacheCourseImage', courseId, url),
    listAssignmentsWithSubmission: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listAssignmentsWithSubmission', courseId, perPage),
    listAssignmentGroups: (courseId: string | number, includeAssignments?: boolean) =>
      ipcRenderer.invoke('canvas:listAssignmentGroups', courseId, includeAssignments),
    listMyEnrollmentsForCourse: (courseId: string | number) =>
      ipcRenderer.invoke('canvas:listMyEnrollmentsForCourse', courseId),
    listCourseTabs: (courseId: string | number, includeExternal?: boolean) =>
      ipcRenderer.invoke('canvas:listCourseTabs', courseId, includeExternal),
    listCourseQuizzes: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseQuizzes', courseId, perPage),
    getCourseQuiz: (courseId: string | number, quizId: string | number) =>
      ipcRenderer.invoke('canvas:getCourseQuiz', courseId, quizId),
    listActivityStream: (opts?: { onlyActiveCourses?: boolean; perPage?: number }) =>
      ipcRenderer.invoke('canvas:listActivityStream', opts),
    listAccountNotifications: (
      accountId: string | number,
      params?: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean },
    ) => ipcRenderer.invoke('canvas:listAccountNotifications', accountId, params),
    listCourseAnnouncements: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseAnnouncements', courseId, perPage),
    listCourseAnnouncementsPage: (courseId: string | number, page?: number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseAnnouncementsPage', courseId, page, perPage),
    getCourseInfo: (courseId: string | number) =>
      ipcRenderer.invoke('canvas:getCourseInfo', courseId),
    getCourseFrontPage: (courseId: string | number) =>
      ipcRenderer.invoke('canvas:getCourseFrontPage', courseId),
    getAnnouncement: (courseId: string | number, topicId: string | number) =>
      ipcRenderer.invoke('canvas:getAnnouncement', courseId, topicId),
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
    ) => ipcRenderer.invoke('canvas:listCourseDiscussions', courseId, params),
    getDiscussion: (courseId: string | number, topicId: string | number) =>
      ipcRenderer.invoke('canvas:getDiscussion', courseId, topicId),
    getDiscussionView: (courseId: string | number, topicId: string | number) =>
      ipcRenderer.invoke('canvas:getDiscussionView', courseId, topicId),
    postDiscussionEntry: (courseId: string | number, topicId: string | number, message: string) =>
      ipcRenderer.invoke('canvas:postDiscussionEntry', courseId, topicId, message),
    postDiscussionReply: (
      courseId: string | number,
      topicId: string | number,
      entryId: string | number,
      message: string,
    ) => ipcRenderer.invoke('canvas:postDiscussionReply', courseId, topicId, entryId, message),
    markDiscussionEntriesRead: (
      courseId: string | number,
      topicId: string | number,
      entryIds: (string | number)[],
    ) => ipcRenderer.invoke('canvas:markDiscussionEntriesRead', courseId, topicId, entryIds),
    listCourseFiles: (
      courseId: string | number,
      perPage?: number,
      sort?: 'name' | 'size' | 'created_at' | 'updated_at',
      order?: 'asc' | 'desc',
    ) => ipcRenderer.invoke('canvas:listCourseFiles', courseId, perPage, sort, order),
    listCourseFolders: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseFolders', courseId, perPage),
    listFolderFiles: (folderId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listFolderFiles', folderId, perPage),
    listCourseUsers: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseUsers', courseId, perPage),
    listCourseGroups: (courseId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listCourseGroups', courseId, perPage),
    listMyGroups: (contextType?: 'Account' | 'Course') =>
      ipcRenderer.invoke('canvas:listMyGroups', contextType),
    listGroupUsers: (groupId: string | number, perPage?: number) =>
      ipcRenderer.invoke('canvas:listGroupUsers', groupId, perPage),
    // Conversations (Inbox)
    listConversations: (params?: {
      scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'
      perPage?: number
      pageUrl?: string
    }) => ipcRenderer.invoke('canvas:listConversations', params),
    getConversation: (conversationId: string | number) =>
      ipcRenderer.invoke('canvas:getConversation', conversationId),
    getUnreadCount: () => ipcRenderer.invoke('canvas:getUnreadCount'),
    createConversation: (params: {
      recipients: string[]
      subject?: string
      body: string
      groupConversation?: boolean
      contextCode?: string
    }) => ipcRenderer.invoke('canvas:createConversation', params),
    addMessage: (conversationId: string | number, body: string, includedMessages?: string[]) =>
      ipcRenderer.invoke('canvas:addMessage', conversationId, body, includedMessages),
    updateConversation: (
      conversationId: string | number,
      params: {
        workflowState?: 'read' | 'unread' | 'archived'
        starred?: boolean
        subscribed?: boolean
      },
    ) => ipcRenderer.invoke('canvas:updateConversation', conversationId, params),
    deleteConversation: (conversationId: string | number) =>
      ipcRenderer.invoke('canvas:deleteConversation', conversationId),
    searchRecipients: (params: {
      search: string
      context?: string
      type?: 'user' | 'context'
      perPage?: number
    }) => ipcRenderer.invoke('canvas:searchRecipients', params),
    resolveUrl: (url: string) => ipcRenderer.invoke('canvas:resolveUrl', url),
    getRateLimit: () => ipcRenderer.invoke('canvas:getRateLimit'),
  } satisfies CanvasApi

  contextBridge.exposeInMainWorld('canvas', canvasApi)

  const settingsApi = {
    get: () => ipcRenderer.invoke('config:get'),
    set: (partial: Parameters<SettingsApi['set']>[0]) => ipcRenderer.invoke('config:set', partial),
  } satisfies SettingsApi

  contextBridge.exposeInMainWorld('settings', settingsApi)

  // System helpers
  const systemApi = {
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    openContentWindow: (params: {
      courseId: string
      type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
      contentId: string
      title?: string
      courseName?: string
    }) => ipcRenderer.invoke('app:openContentWindow', params),
    pickFiles: (opts?: {
      multiple?: boolean
      filters?: { name: string; extensions: string[] }[]
    }) => ipcRenderer.invoke('app:pickFiles', opts),
    downloadFile: (fileId: string | number, suggestedName?: string) =>
      ipcRenderer.invoke('app:downloadFile', fileId, suggestedName),
    clearTempCache: () => ipcRenderer.invoke('app:clearTempCache'),
    writeClipboard: (text: string) => ipcRenderer.invoke('app:writeClipboard', text),
    copyText: (text: string) => ipcRenderer.invoke('app:copyText', text),
  } satisfies SystemApi

  contextBridge.exposeInMainWorld('system', systemApi)

  // Secure storage helpers (sync, backed by OS keychain via main process)
  const secureStorageApi = {
    isAvailable: () => {
      try {
        return Boolean(ipcRenderer.sendSync('secureStorage:isAvailable'))
      } catch {
        return false
      }
    },
    isEncryptionAvailable: () => {
      try {
        return Boolean(ipcRenderer.sendSync('secureStorage:isAvailable'))
      } catch {
        return false
      }
    },
    encrypt: (value: string) => {
      try {
        return ipcRenderer.sendSync('secureStorage:encrypt', String(value)) ?? null
      } catch {
        return null
      }
    },
    decrypt: (payload: string) => {
      try {
        return ipcRenderer.sendSync('secureStorage:decrypt', String(payload)) ?? null
      } catch {
        return null
      }
    },
  } satisfies SecureStorageApi

  contextBridge.exposeInMainWorld('secureStorage', secureStorageApi)

  // (PDF/PPTX viewers run in iframes; no viewer bridge exposed.)

  // AI Helpers
  const aiApi = {
    getAvailability: (opts?: { force?: boolean }) => ipcRenderer.invoke('ai:availability', opts),
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
    ) => {
      const payload: any = { messages }
      if (typeof opts === 'number') {
        payload.max_tokens = opts
      } else if (opts && typeof opts === 'object') {
        payload.max_tokens = opts.max_tokens
        if (opts.response_format) payload.response_format = opts.response_format
        if (opts.tools) payload.tools = opts.tools
        if (opts.tool_choice) payload.tool_choice = opts.tool_choice
        if (typeof opts.temperature === 'number') payload.temperature = opts.temperature
        if (typeof opts.top_p === 'number') payload.top_p = opts.top_p
      }
      return ipcRenderer.invoke('ai:chat', payload)
    },
    chatStream: (
      messages: any[],
      onChunk: (content: string) => void,
      onDone?: () => void,
      onError?: (error: string) => void,
    ) => {
      const id = Math.random().toString(36).substring(7)

      const chunkHandler = (_: any, data: { id: string; content: string }) => {
        if (data.id === id) onChunk(data.content)
      }

      const doneHandler = (_: any, data: { id: string }) => {
        if (data.id === id) onDone?.()
      }

      const errorHandler = (_: any, data: { id: string; error: string }) => {
        if (data.id === id) onError?.(data.error)
      }

      // We can also listen for done/error to clean up automatically if we wanted,
      // but the caller is responsible for calling the returned cleanup function.

      ipcRenderer.on('ai:stream:chunk', chunkHandler)
      ipcRenderer.on('ai:stream:done', doneHandler)
      ipcRenderer.on('ai:stream:error', errorHandler)
      ipcRenderer.send('ai:chat-stream', { id, messages })

      return () => {
        ipcRenderer.removeListener('ai:stream:chunk', chunkHandler)
        ipcRenderer.removeListener('ai:stream:done', doneHandler)
        ipcRenderer.removeListener('ai:stream:error', errorHandler)
        ipcRenderer.send('ai:chat-cancel', { id })
      }
    },
    recordTelemetry: (event: Parameters<AIApi['recordTelemetry']>[0]) =>
      ipcRenderer.invoke('ai:telemetry:record', event),
    getTelemetrySummary: () => ipcRenderer.invoke('ai:telemetry:getSummary'),
    exportTelemetry: () => ipcRenderer.invoke('ai:telemetry:export'),
    resetTelemetry: () => ipcRenderer.invoke('ai:telemetry:reset'),
  } satisfies AIApi

  contextBridge.exposeInMainWorld('ai', aiApi)

  // Embedding / Deep Search Helpers
  const embeddingApi = {
    search: (
      query: string,
      k?: number,
      opts?: {
        courseIds?: string[]
        types?: Array<'announcement' | 'assignment' | 'page' | 'module' | 'file'>
        minScore?: number
      },
    ) => ipcRenderer.invoke('embedding:search', query, k, opts),
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
    ) => ipcRenderer.invoke('embedding:index', items),
    getStatus: () => ipcRenderer.invoke('embedding:status'),
    setPaused: (paused: boolean) => ipcRenderer.invoke('embedding:setPaused', paused),
    clear: () => ipcRenderer.invoke('embedding:clear'),
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
    ) =>
      ipcRenderer.invoke(
        'embedding:indexFile',
        fileId,
        courseId,
        courseName,
        fileName,
        fileSize,
        updatedAt,
        url,
        opts,
      ),
    pruneCourse: (courseId: string) => ipcRenderer.invoke('embedding:pruneCourse', courseId),
    getStorageStats: () => ipcRenderer.invoke('embedding:getStorageStats'),
    onDownloadProgress: (
      callback: (progress: {
        file: string
        downloaded: number
        total: number
        percent: number
      }) => void,
    ) => {
      const handler = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('embedding:download-progress', handler)
      // Return cleanup function
      return () => ipcRenderer.removeListener('embedding:download-progress', handler)
    },
  } satisfies EmbeddingApi

  contextBridge.exposeInMainWorld('embedding', embeddingApi)

  // Degree audit helpers
  const degreeAuditApi = {
    extractPdfText: (
      pdfBytes: ArrayBuffer,
      options?: { maxPages?: number; maxFileSizeBytes?: number; maxChars?: number },
    ) => ipcRenderer.invoke('degreeAudit:extractPdfText', pdfBytes, options),
  } satisfies DegreeAuditApi

  contextBridge.exposeInMainWorld('degreeAudit', degreeAuditApi)

  // Theme helpers for background image management
  const themeApi = {
    uploadBackgroundImage: (filePath: string) =>
      ipcRenderer.invoke('theme:uploadBackgroundImage', filePath),
    deleteBackgroundImage: (imageUrl: string) =>
      ipcRenderer.invoke('theme:deleteBackgroundImage', imageUrl),
    pickBackgroundImage: () => ipcRenderer.invoke('theme:pickBackgroundImage'),
  } satisfies ThemeApi

  contextBridge.exposeInMainWorld('theme', themeApi)

  // Platform helpers + body class for macOS styling hooks
  const platformApi = {
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    setTitleBarOverlayTheme: (opts: { isDark: boolean }) =>
      ipcRenderer.invoke('window:setTitleBarOverlayTheme', opts),
  } satisfies PlatformApi

  contextBridge.exposeInMainWorld('platform', platformApi)

  // Tag the <html> or <body> so renderer CSS can adjust spacing for traffic lights
  try {
    if (process.platform === 'darwin') {
      const el = document.documentElement || document.body
      el.classList.add('mac')
    }
    if (process.platform === 'win32') {
      const el = document.documentElement || document.body
      el.classList.add('win')
    }
  } catch {}
}
