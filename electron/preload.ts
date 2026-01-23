import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electron', {
  onMainProcessMessage: (callback: (message: string) => void) => {
    return ipcRenderer.on('main-process-message', (_event, message) => callback(message))
  },
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  }
})

// High-level Canvas API
contextBridge.exposeInMainWorld('canvas', {
  init: (cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => ipcRenderer.invoke('canvas:init', cfg),
  clearToken: (baseUrl?: string) => ipcRenderer.invoke('canvas:clearToken', baseUrl),
  getProfile: () => ipcRenderer.invoke('canvas:getProfile'),
  listCourses: (opts?: { enrollment_state?: string }) => ipcRenderer.invoke('canvas:listCourses', opts),
  listDueAssignments: (opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) => ipcRenderer.invoke('canvas:listDueAssignments', opts),
  listCourseAssignments: (courseId: string | number, first?: number) => ipcRenderer.invoke('canvas:listCourseAssignments', courseId, first),
  listCourseModulesGql: (courseId: string | number, first?: number, itemsFirst?: number) => ipcRenderer.invoke('canvas:listCourseModulesGql', courseId, first, itemsFirst),
  listUpcoming: (opts?: { onlyActiveCourses?: boolean }) => ipcRenderer.invoke('canvas:listUpcoming', opts),
  listTodo: () => ipcRenderer.invoke('canvas:listTodo'),
  getMySubmission: (courseId: string | number, assignmentRestId: string | number) => ipcRenderer.invoke('canvas:getMySubmission', courseId, assignmentRestId),
  listCoursePages: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCoursePages', courseId, perPage),
  getCoursePage: (courseId: string | number, slugOrUrl: string) => ipcRenderer.invoke('canvas:getCoursePage', courseId, slugOrUrl),
  getAssignmentRest: (courseId: string | number, assignmentRestId: string | number) => ipcRenderer.invoke('canvas:getAssignmentRest', courseId, assignmentRestId),
  getFile: (fileId: string | number) => ipcRenderer.invoke('canvas:getFile', fileId),
  getFileBytes: async (fileId: string | number) => {
    return ipcRenderer.invoke('canvas:getFileBytes', fileId)
  },
  cacheCourseImage: (courseId: string | number, url: string) => ipcRenderer.invoke('canvas:cacheCourseImage', courseId, url),
  listAssignmentsWithSubmission: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listAssignmentsWithSubmission', courseId, perPage),
  listAssignmentGroups: (courseId: string | number, includeAssignments?: boolean) => ipcRenderer.invoke('canvas:listAssignmentGroups', courseId, includeAssignments),
  listMyEnrollmentsForCourse: (courseId: string | number) => ipcRenderer.invoke('canvas:listMyEnrollmentsForCourse', courseId),
  listCourseTabs: (courseId: string | number, includeExternal?: boolean) => ipcRenderer.invoke('canvas:listCourseTabs', courseId, includeExternal),
  listActivityStream: (opts?: { onlyActiveCourses?: boolean; perPage?: number }) => ipcRenderer.invoke('canvas:listActivityStream', opts),
  listCourseAnnouncements: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseAnnouncements', courseId, perPage),
  listCourseAnnouncementsPage: (courseId: string | number, page?: number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseAnnouncementsPage', courseId, page, perPage),
  getCourseInfo: (courseId: string | number) => ipcRenderer.invoke('canvas:getCourseInfo', courseId),
  getCourseFrontPage: (courseId: string | number) => ipcRenderer.invoke('canvas:getCourseFrontPage', courseId),
  getAnnouncement: (courseId: string | number, topicId: string | number) => ipcRenderer.invoke('canvas:getAnnouncement', courseId, topicId),
  // Discussions
  listCourseDiscussions: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseDiscussions', courseId, perPage),
  getDiscussion: (courseId: string | number, topicId: string | number) => ipcRenderer.invoke('canvas:getDiscussion', courseId, topicId),
  getDiscussionView: (courseId: string | number, topicId: string | number) => ipcRenderer.invoke('canvas:getDiscussionView', courseId, topicId),
  postDiscussionEntry: (courseId: string | number, topicId: string | number, message: string) => ipcRenderer.invoke('canvas:postDiscussionEntry', courseId, topicId, message),
  postDiscussionReply: (courseId: string | number, topicId: string | number, entryId: string | number, message: string) => ipcRenderer.invoke('canvas:postDiscussionReply', courseId, topicId, entryId, message),
  listCourseFiles: (courseId: string | number, perPage?: number, sort?: 'name' | 'size' | 'created_at' | 'updated_at', order?: 'asc' | 'desc') => ipcRenderer.invoke('canvas:listCourseFiles', courseId, perPage, sort, order),
  listCourseFolders: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseFolders', courseId, perPage),
  listFolderFiles: (folderId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listFolderFiles', folderId, perPage),
  listCourseUsers: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseUsers', courseId, perPage),
  listCourseGroups: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listCourseGroups', courseId, perPage),
  listMyGroups: (contextType?: 'Account' | 'Course') => ipcRenderer.invoke('canvas:listMyGroups', contextType),
  listGroupUsers: (groupId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listGroupUsers', groupId, perPage),
  // Conversations (Inbox)
  listConversations: (params?: { scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'; perPage?: number }) => ipcRenderer.invoke('canvas:listConversations', params),
  getConversation: (conversationId: string | number) => ipcRenderer.invoke('canvas:getConversation', conversationId),
  getUnreadCount: () => ipcRenderer.invoke('canvas:getUnreadCount'),
  createConversation: (params: { recipients: string[]; subject?: string; body: string; groupConversation?: boolean; contextCode?: string }) => ipcRenderer.invoke('canvas:createConversation', params),
  addMessage: (conversationId: string | number, body: string, includedMessages?: string[]) => ipcRenderer.invoke('canvas:addMessage', conversationId, body, includedMessages),
  updateConversation: (conversationId: string | number, params: { workflowState?: 'read' | 'unread' | 'archived'; starred?: boolean; subscribed?: boolean }) => ipcRenderer.invoke('canvas:updateConversation', conversationId, params),
  deleteConversation: (conversationId: string | number) => ipcRenderer.invoke('canvas:deleteConversation', conversationId),
  searchRecipients: (params: { search: string; context?: string; type?: 'user' | 'context'; perPage?: number }) => ipcRenderer.invoke('canvas:searchRecipients', params),
})

contextBridge.exposeInMainWorld('settings', {
  get: () => ipcRenderer.invoke('config:get'),
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
      sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> }
      pdfGestureZoomEnabled?: boolean
      pdfZoom?: Record<string, number>
      lastUserId?: string
      aiEnabled?: boolean
    }>,
  ) => ipcRenderer.invoke('config:set', partial),
})

// System helpers
contextBridge.exposeInMainWorld('system', {
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  getPdfPreloadPath: () => ipcRenderer.invoke('app:getPdfPreloadPath'),
})

// AI Helpers
contextBridge.exposeInMainWorld('ai', {
  chat: (messages: any[], max_tokens?: number) => ipcRenderer.invoke('ai:chat', { messages, max_tokens }),
  chatStream: (messages: any[], onChunk: (content: string) => void) => {
    const id = Math.random().toString(36).substring(7);
    
    const chunkHandler = (_: any, data: { id: string, content: string }) => {
      if (data.id === id) onChunk(data.content);
    };
    
    // We can also listen for done/error to clean up automatically if we wanted,
    // but the caller is responsible for calling the returned cleanup function.
    
    ipcRenderer.on('ai:stream:chunk', chunkHandler);
    ipcRenderer.send('ai:chat-stream', { id, messages });
    
    return () => {
      ipcRenderer.removeListener('ai:stream:chunk', chunkHandler);
    };
  }
})

// Embedding / Deep Search Helpers
contextBridge.exposeInMainWorld('embedding', {
  search: (query: string, k?: number, opts?: { courseIds?: string[]; types?: Array<'announcement' | 'assignment' | 'page' | 'module' | 'file'>; minScore?: number }) => ipcRenderer.invoke('embedding:search', query, k, opts),
  index: (items: Array<{
    id: string
    type: 'announcement' | 'assignment' | 'page' | 'module' | 'file'
    courseId: string
    courseName: string
    title: string
    content: string
    url?: string
  }>) => ipcRenderer.invoke('embedding:index', items),
  getStatus: () => ipcRenderer.invoke('embedding:status'),
  clear: () => ipcRenderer.invoke('embedding:clear'),
  // File indexing APIs
  indexFile: (
    fileId: string,
    courseId: string,
    courseName: string,
    fileName: string,
    fileSize: number,
    updatedAt?: string,
    url?: string
  ) => ipcRenderer.invoke('embedding:indexFile', fileId, courseId, courseName, fileName, fileSize, updatedAt, url),
  pruneCourse: (courseId: string) => ipcRenderer.invoke('embedding:pruneCourse', courseId),
  getStorageStats: () => ipcRenderer.invoke('embedding:getStorageStats'),
  onDownloadProgress: (callback: (progress: { file: string; downloaded: number; total: number; percent: number }) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('embedding:download-progress', handler)
    // Return cleanup function
    return () => ipcRenderer.removeListener('embedding:download-progress', handler)
  }
})

// Platform helpers + body class for macOS styling hooks
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
})

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
