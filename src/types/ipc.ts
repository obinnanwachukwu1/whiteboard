export type AccentPreset =
  | 'slate'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'

export type BackgroundMode = 'accent' | 'background'
export type BackgroundType = 'solid' | 'pattern' | 'image'
export type PatternId = 'dots' | 'grid' | 'mesh'

export interface BackgroundSettings {
  type: BackgroundType
  patternId?: PatternId
  imageUrl?: string
  blur: number
  opacity: number
  overlay: number
  extractedAccent?: { h: number; s: number; l: number }
}

export interface ThemeConfig {
  theme: 'light' | 'dark'
  accentPreset: AccentPreset
  backgroundMode: BackgroundMode
  background: BackgroundSettings
}

export type ApiResult<T = any> = {
  ok: boolean
  data?: T
  error?: string
}

export type CourseId = string | number
export type AssignmentId = string | number
export type TopicId = string | number
export type FileId = string | number
export type FolderId = string | number
export type AccountId = string | number
export type GroupId = string | number
export type ConversationId = string | number

export type ContentType = 'announcement' | 'assignment' | 'page' | 'module' | 'file'

export type CanvasSubmitAssignmentParams = {
  submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
  body?: string
  url?: string
  fileIds?: Array<string | number>
}

export type CourseDiscussionQuery = {
  perPage?: number
  searchTerm?: string
  filterBy?: 'all' | 'unread'
  scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
  orderBy?: 'position' | 'recent_activity' | 'title'
  maxPages?: number
}

export type CanvasConversationScope = 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'

export interface CanvasApi {
  init: (cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => Promise<{
    ok: boolean
    insecure?: boolean
    error?: string
  }>
  clearToken: (baseUrl?: string) => Promise<ApiResult>
  getProfile: () => Promise<ApiResult>
  listCourses: (opts?: { enrollment_state?: string }) => Promise<ApiResult>
  listDueAssignments: (opts?: {
    days?: number
    onlyPublished?: boolean
    includeCourseName?: boolean
  }) => Promise<ApiResult>
  listCourseAssignments: (courseId: CourseId, first?: number) => Promise<ApiResult>
  listCourseModulesGql: (courseId: CourseId, first?: number, itemsFirst?: number) => Promise<ApiResult>
  getCourseModuleItem: (courseId: CourseId, itemId: string | number) => Promise<ApiResult>
  listUpcoming: (opts?: { onlyActiveCourses?: boolean }) => Promise<ApiResult>
  listTodo: () => Promise<ApiResult>
  getMySubmission: (
    courseId: CourseId,
    assignmentRestId: AssignmentId,
    include?: string[],
  ) => Promise<ApiResult>
  submitAssignment: (
    courseId: CourseId,
    assignmentRestId: AssignmentId,
    params: CanvasSubmitAssignmentParams,
  ) => Promise<ApiResult>
  submitAssignmentUpload: (
    courseId: CourseId,
    assignmentRestId: AssignmentId,
    filePaths: string[],
  ) => Promise<ApiResult>
  listCoursePages: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  getCoursePage: (courseId: CourseId, slugOrUrl: string) => Promise<ApiResult>
  getAssignmentRest: (
    courseId: CourseId,
    assignmentRestId: AssignmentId,
    include?: string[],
  ) => Promise<ApiResult>
  getFile: (fileId: FileId) => Promise<ApiResult>
  getFileBytes: (fileId: FileId) => Promise<ApiResult<string>>
  cacheCourseImage: (courseId: CourseId, url: string) => Promise<ApiResult<string>>
  listAssignmentsWithSubmission: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  listAssignmentGroups: (courseId: CourseId, includeAssignments?: boolean) => Promise<ApiResult>
  listMyEnrollmentsForCourse: (courseId: CourseId) => Promise<ApiResult>
  listCourseTabs: (courseId: CourseId, includeExternal?: boolean) => Promise<ApiResult>
  listCourseQuizzes: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  getCourseQuiz: (courseId: CourseId, quizId: string | number) => Promise<ApiResult>
  listActivityStream: (opts?: { onlyActiveCourses?: boolean; perPage?: number }) => Promise<ApiResult>
  listAccountNotifications: (
    accountId: AccountId,
    params?: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean },
  ) => Promise<ApiResult>
  listCourseAnnouncements: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  listCourseAnnouncementsPage: (courseId: CourseId, page?: number, perPage?: number) => Promise<ApiResult>
  getCourseInfo: (courseId: CourseId) => Promise<ApiResult>
  getCourseFrontPage: (courseId: CourseId) => Promise<ApiResult>
  getAnnouncement: (courseId: CourseId, topicId: TopicId) => Promise<ApiResult>
  listCourseDiscussions: (courseId: CourseId, params?: CourseDiscussionQuery) => Promise<ApiResult>
  getDiscussion: (courseId: CourseId, topicId: TopicId) => Promise<ApiResult>
  getDiscussionView: (courseId: CourseId, topicId: TopicId) => Promise<ApiResult>
  postDiscussionEntry: (courseId: CourseId, topicId: TopicId, message: string) => Promise<ApiResult>
  postDiscussionReply: (
    courseId: CourseId,
    topicId: TopicId,
    entryId: string | number,
    message: string,
  ) => Promise<ApiResult>
  markDiscussionEntriesRead: (
    courseId: CourseId,
    topicId: TopicId,
    entryIds: Array<string | number>,
  ) => Promise<ApiResult>
  listCourseFiles: (
    courseId: CourseId,
    perPage?: number,
    sort?: 'name' | 'size' | 'created_at' | 'updated_at',
    order?: 'asc' | 'desc',
  ) => Promise<ApiResult>
  listCourseFolders: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  listFolderFiles: (folderId: FolderId, perPage?: number) => Promise<ApiResult>
  listCourseUsers: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  listCourseGroups: (courseId: CourseId, perPage?: number) => Promise<ApiResult>
  listMyGroups: (contextType?: 'Account' | 'Course') => Promise<ApiResult>
  listGroupUsers: (groupId: GroupId, perPage?: number) => Promise<ApiResult>
  listConversations: (params?: {
    scope?: CanvasConversationScope
    perPage?: number
    pageUrl?: string
  }) => Promise<ApiResult<{ items: any[]; nextPageUrl?: string | null }>>
  getConversation: (conversationId: ConversationId) => Promise<ApiResult>
  getUnreadCount: () => Promise<ApiResult<{ unread_count: string }>>
  createConversation: (params: {
    recipients: string[]
    subject?: string
    body: string
    groupConversation?: boolean
    contextCode?: string
  }) => Promise<ApiResult>
  addMessage: (
    conversationId: ConversationId,
    body: string,
    includedMessages?: string[],
  ) => Promise<ApiResult>
  updateConversation: (
    conversationId: ConversationId,
    params: {
      workflowState?: 'read' | 'unread' | 'archived'
      starred?: boolean
      subscribed?: boolean
    },
  ) => Promise<ApiResult>
  deleteConversation: (conversationId: ConversationId) => Promise<ApiResult>
  searchRecipients: (params: {
    search: string
    context?: string
    type?: 'user' | 'context'
    perPage?: number
  }) => Promise<ApiResult>
  resolveUrl: (url: string) => Promise<ApiResult<string>>
  getRateLimit: () => Promise<ApiResult<{ remaining?: number; cost?: number; at: number } | null>>
}

export interface SettingsData {
  baseUrl: string
  verbose?: boolean
  theme?: 'light' | 'dark'
  accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'
  themeConfig?: ThemeConfig
  prefetchEnabled?: boolean
  reduceEffectsEnabled?: boolean
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

export interface SettingsApi {
  get: () => Promise<ApiResult<SettingsData>>
  set: (partial: Partial<SettingsData>) => Promise<ApiResult>
}

export type ThemeConfigChangedPayload = {
  themeConfig?: ThemeConfig
  theme?: SettingsData['theme']
  accent?: SettingsData['accent']
}

export type AIAvailabilityData = {
  status: 'available' | 'unsupported' | 'disabled' | 'error'
  detail?: string
}

export type AIChatOptions =
  | number
  | {
      max_tokens?: number
      response_format?: any
      tools?: any
      tool_choice?: any
      temperature?: number
      top_p?: number
    }

export type AITelemetryEvent =
  | {
      name: 'coordinator_result'
      data?: { fallback?: boolean; parseError?: boolean }
      ts?: number
    }
  | {
      name: 'overflow_retry'
      data?: { triggered?: boolean }
      ts?: number
    }
  | {
      name: 'prompt_section_tokens'
      data?: { sections?: Record<string, number> }
      ts?: number
    }
  | {
      name: 'due_date_exact_match'
      data?: { exactHit?: boolean; hadCandidates?: boolean }
      ts?: number
    }
  | {
      name: 'unsupported_claim_sample'
      data?: { sampled?: boolean; flagged?: boolean }
      ts?: number
    }
  | {
      name: 'followup_reference'
      data?: { attempted?: boolean; resolved?: boolean }
      ts?: number
    }
  | {
      name: 'stage_timing'
      data?: { stage?: string; ms?: number }
      ts?: number
    }
  | {
      name: 'stream_parse_error' | 'request_timeout' | 'request_error'
      data?: Record<string, unknown>
      ts?: number
    }

export interface AIApi {
  getAvailability: (opts?: { force?: boolean }) => Promise<ApiResult<AIAvailabilityData>>
  chat: (messages: any[], opts?: AIChatOptions) => Promise<{ ok: boolean; choices?: any[]; error?: any }>
  chatStream: (
    messages: any[],
    onChunk: (content: string) => void,
    onDone?: () => void,
    onError?: (error: string) => void,
  ) => () => void
  recordTelemetry: (event: AITelemetryEvent) => Promise<ApiResult>
  getTelemetrySummary: () => Promise<ApiResult<any>>
  exportTelemetry: () => Promise<ApiResult<{ path: string; summary: any }>>
  resetTelemetry: () => Promise<ApiResult>
}

export type EmbeddingMetadata = {
  type: ContentType
  courseId: string
  courseName: string
  title: string
  snippet: string
  url?: string
  contentHash: string
}

export interface EmbeddingApi {
  search: (
    query: string,
    k?: number,
    opts?: {
      courseIds?: string[]
      types?: ContentType[]
      minScore?: number
      dedupe?: boolean
    },
  ) => Promise<ApiResult<Array<{ id: string; score: number; metadata: EmbeddingMetadata }>>>
  index: (
    items: Array<{
      id: string
      type: ContentType
      courseId: string
      courseName: string
      title: string
      content: string
      url?: string
    }>,
  ) => Promise<ApiResult<{ indexed: number; skipped: number }>>
  getStatus: () => Promise<
    ApiResult<{
      ready: boolean
      modelDownloaded: boolean
      itemCount: number
      memoryUsedMB: number
      memoryLimitMB: number
    }>
  >
  setPaused: (paused: boolean) => Promise<ApiResult>
  clear: () => Promise<ApiResult>
  indexFile: (
    fileId: string,
    courseId: string,
    courseName: string,
    fileName: string,
    fileSize: number,
    updatedAt?: string,
    url?: string,
    opts?: { maxPages?: number },
  ) => Promise<ApiResult<{ chunks: number; pageCount: number; truncated: boolean; skipped?: boolean }>>
  pruneCourse: (courseId: string) => Promise<ApiResult<number>>
  getStorageStats: () => Promise<
    ApiResult<{
      totalEntries: number
      totalBytes: number
      byCourse: Record<string, { entries: number; bytes: number }>
      byType: Record<string, { entries: number; bytes: number }>
    }>
  >
  onDownloadProgress: (
    callback: (progress: { file: string; downloaded: number; total: number; percent: number }) => void,
  ) => () => void
}

export interface DegreeAuditApi {
  extractPdfText: (
    pdfBytes: ArrayBuffer,
    options?: { maxPages?: number; maxFileSizeBytes?: number; maxChars?: number },
  ) => Promise<ApiResult<{ text: string; pageCount: number; truncated: boolean; extractedChars: number }>>
}

export interface SystemApi {
  openExternal: (url: string) => Promise<ApiResult>
  openContentWindow: (params: {
    courseId: string
    type: 'page' | 'assignment' | 'announcement' | 'discussion' | 'file' | 'quiz'
    contentId: string
    title?: string
    courseName?: string
  }) => Promise<ApiResult>
  pickFiles: (opts?: {
    multiple?: boolean
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<ApiResult<Array<{ path: string; name: string; size: number }>>>
  downloadFile: (fileId: FileId, suggestedName?: string) => Promise<ApiResult<string>>
  clearTempCache: () => Promise<ApiResult<{ removed: number }>>
  writeClipboard: (text: string) => Promise<ApiResult>
  copyText: (text: string) => Promise<ApiResult>
}

export interface SecureStorageApi {
  isAvailable: () => boolean
  isEncryptionAvailable?: () => boolean
  encrypt: (value: string) => string | null
  decrypt: (payload: string) => string | null
}

export interface ElectronApi {
  onMainProcessMessage: (callback: (message: string) => void) => void
  onMenuAction: (callback: (action: string) => void) => () => void
  onThemeConfigChanged: (callback: (payload: ThemeConfigChangedPayload) => void) => () => void
}

export interface ThemeApi {
  pickBackgroundImage: () => Promise<ApiResult<{ path: string; name: string; size: number }>>
  uploadBackgroundImage: (filePath: string) => Promise<ApiResult<{ url: string }>>
  deleteBackgroundImage: (imageUrl: string) => Promise<ApiResult>
}

export interface PlatformApi {
  isMac: boolean
  isWindows: boolean
  setTitleBarOverlayTheme: (opts: { isDark: boolean }) => Promise<ApiResult>
}

export interface WhiteboardWindow {
  canvas: CanvasApi
  settings: SettingsApi
  system: SystemApi
  secureStorage: SecureStorageApi
  ai: AIApi
  embedding: EmbeddingApi
  degreeAudit: DegreeAuditApi
  electron: ElectronApi
  theme: ThemeApi
  platform: PlatformApi
}
