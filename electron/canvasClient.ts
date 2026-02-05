import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { app } from 'electron'
import fs from 'node:fs'

import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { normalizeWin32Path } from './pathUtils'
import { assertNormalizedAssignmentDev, normalizeAssignmentFromRest } from './assignmentNormalization'

// Uploads: use node-friendly multipart form
// (Types provided via a local d.ts in electron/form-data.d.ts)
import type FormDataType from 'form-data'

const DEFAULT_BASE_URL = 'https://gatech.instructure.com'
const API_PREFIX = '/api/v1'

export class CanvasError extends Error {}

export type RetryConfig = {
  maxRetries: number
  backoffFactor: number
  retryStatuses: number[]
}

const DefaultRetry: RetryConfig = {
  maxRetries: 3,
  backoffFactor: 1.5,
  retryStatuses: [429, 500, 502, 503, 504],
}

function buildUserAgentString() {
  const appName = app.getName?.() || 'Whiteboard'
  const appVersion = app.getVersion?.() || '0.0.0'
  const electron = process.versions.electron || 'unknown'
  const chrome = process.versions.chrome || 'unknown'
  const node = process.versions.node || 'unknown'
  const platform = `${process.platform}; ${process.arch}`
  return `${appName}/${appVersion} (Electron ${electron}; Chrome ${chrome}; Node ${node}; ${platform})`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseIso(dt?: string | null): Date | null {
  if (!dt) return null
  try {
    return new Date(dt)
  } catch {
    return null
  }
}

function safeLog(obj: any): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (/token|auth|secret|password|credential/i.test(key)) return '[REDACTED]'
      return value
    })
  } catch {
    return '[Circular/Error]'
  }
}

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

const DEFAULT_COURSE_IMAGE_MAX_BYTES = 10 * 1024 * 1024

function normalizeHostList(hosts: string[] | undefined): string[] {
  if (!hosts) return []
  return hosts
    .map((h) => String(h || '').trim().toLowerCase())
    .filter((h) => !!h)
}

function isHostAllowed(host: string, allowHosts: string[]): boolean {
  if (!host) return false
  const h = host.toLowerCase()
  return allowHosts.some((entry) => h === entry || h.endsWith(`.${entry}`))
}

export interface CanvasClientOptions {
  token: string
  baseUrl?: string
  timeoutMs?: number
  retry?: RetryConfig
  userAgent?: string
  verbose?: boolean
}

export class CanvasClient {
  private axios: AxiosInstance
  private baseUrl: string
  private apiRoot: string
  private timeoutMs: number
  private retry: RetryConfig
  private verbose: boolean
  private lastRateLimit?: { remaining?: number; cost?: number; at: number }

  constructor(opts: CanvasClientOptions) {
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
    this.apiRoot = `${this.baseUrl}${API_PREFIX}`
    this.timeoutMs = opts.timeoutMs ?? 30_000
    this.retry = opts.retry ?? DefaultRetry
    this.verbose = !!opts.verbose

    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': opts.userAgent || buildUserAgentString(),
    }

    this.axios = axios.create({
      headers,
      timeout: this.timeoutMs,
      validateStatus: () => true, // we'll handle errors
    })
  }

  private isCanvasOrigin(url: string): boolean {
    try {
      const base = new URL(this.baseUrl)
      const target = new URL(url)
      return base.origin === target.origin
    } catch {
      return false
    }
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let attempt = 0
    while (true) {
      attempt += 1
      const url = config.url
      if (this.verbose && url) {
        const method = (config.method || 'GET').toUpperCase()
        const paramsDbg = config.params ? ` params=${safeLog(config.params)}` : ''
        const dataDbg = config.data
          ? ` data=${typeof config.data === 'string' ? '(body)' : safeLog(config.data).slice(0, 200)}`
          : ''
        console.log(`[${method}] ${url}${paramsDbg}${dataDbg}`)
      }

      const resp = await this.axios.request<T>(config)

      // Track rate limit hints if provided
      const costRaw = resp.headers['x-request-cost']
      const remainingRaw = resp.headers['x-rate-limit-remaining']
      const cost =
        typeof costRaw === 'string'
          ? Number(costRaw)
          : Array.isArray(costRaw)
            ? Number(costRaw[0])
            : undefined
      const remaining =
        typeof remainingRaw === 'string'
          ? Number(remainingRaw)
          : Array.isArray(remainingRaw)
            ? Number(remainingRaw[0])
            : undefined
      if (Number.isFinite(cost) || Number.isFinite(remaining)) {
        this.lastRateLimit = {
          cost: Number.isFinite(cost) ? cost : undefined,
          remaining: Number.isFinite(remaining) ? remaining : undefined,
          at: Date.now(),
        }
        if (this.verbose) {
          console.log('[Canvas rate]', {
            cost: this.lastRateLimit.cost,
            remaining: this.lastRateLimit.remaining,
          })
        }
      }
      if (this.retry.retryStatuses.includes(resp.status) && attempt <= this.retry.maxRetries) {
        const ra = resp.headers['retry-after']
        const delay = ra
          ? Math.max(500, Number(ra) * 1000 || 0)
          : this.retry.backoffFactor * attempt * 1000
        if (this.verbose) {
          console.warn(
            `Retrying (${attempt}/${this.retry.maxRetries}) in ${(delay / 1000).toFixed(1)}s due to ${resp.status}...`,
          )
        }
        await sleep(delay)
        continue
      }
      if (resp.status >= 400) {
        let body: any
        try {
          body = resp.data
        } catch {
          body = resp.statusText
        }
        throw new CanvasError(
          `HTTP ${resp.status} for ${config.url}: ${JSON.stringify(body, null, 2)}`,
        )
      }
      return resp
    }
  }

  getRateLimitSnapshot() {
    return this.lastRateLimit ? { ...this.lastRateLimit } : null
  }

  private url(pathOrUrl: string) {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
    return `${this.apiRoot}${pathOrUrl}`
  }

  async get<T = any>(pathOrUrl: string, params?: Record<string, any>): Promise<T> {
    const resp = await this.request<T>({ method: 'GET', url: this.url(pathOrUrl), params })
    return resp.data
  }
  async post<T = any>(pathOrUrl: string, data?: any): Promise<T> {
    const resp = await this.request<T>({ method: 'POST', url: this.url(pathOrUrl), data })
    return resp.data
  }
  async put<T = any>(pathOrUrl: string, data?: any): Promise<T> {
    const resp = await this.request<T>({ method: 'PUT', url: this.url(pathOrUrl), data })
    return resp.data
  }
  async del<T = any>(pathOrUrl: string, params?: Record<string, any>): Promise<T> {
    const resp = await this.request<T>({ method: 'DELETE', url: this.url(pathOrUrl), params })
    return resp.data
  }

  async paginate<T = any>(
    pathOrUrl: string,
    params?: Record<string, any>,
    maxPages?: number,
  ): Promise<T[]> {
    const out: T[] = []
    let url: string | null = this.url(pathOrUrl)
    let first = true
    let pages = 0
    while (url) {
      if (maxPages && pages >= maxPages) break
      const resp = await this.request<any>({
        method: 'GET',
        url,
        params: first ? params : undefined,
      })
      first = false
      pages++
      const data = resp.data
      if (Array.isArray(data)) {
        out.push(...data)
      } else {
        out.push(data)
        break
      }
      const link = (resp.headers['link'] || resp.headers['Link']) as string | undefined
      if (link) {
        const match = link
          .split(',')
          .map((s) => s.trim())
          .find((s) => s.endsWith('rel="next"'))
        if (match) {
          const m = match.match(/<(.*)>/)
          url = m ? m[1] : null
        } else {
          url = null
        }
      } else {
        url = null
      }
    }
    return out
  }

  // Convenience REST
  getProfile() {
    return this.get('/users/self/profile')
  }

  listCourses(params: { enrollment_state?: string; include?: string[]; per_page?: number } = {}) {
    const p: Record<string, any> = {
      per_page: params.per_page ?? 100,
      enrollment_state: params.enrollment_state ?? 'active',
    }
    if (params.include) p['include[]'] = params.include
    return this.paginate<any>('/courses', p)
  }

  listCourseAssignmentsRest(courseId: string | number, include?: string[], perPage = 100) {
    const p: Record<string, any> = { per_page: perPage }
    if (include) p['include[]'] = include
    return this.paginate<any>(`/courses/${courseId}/assignments`, p)
  }

  listAssignmentsWithSubmission(courseId: string | number, perPage = 100) {
    // Include the current user's submission inline per assignment
    const p: Record<string, any> = { per_page: perPage, 'include[]': ['submission'] }
    return this.paginate<any>(`/courses/${courseId}/assignments`, p)
  }

  listAssignmentGroups(courseId: string | number, includeAssignments = false) {
    const p: Record<string, any> = { per_page: 100 }
    const include: string[] = ['rules']
    if (includeAssignments) include.push('assignments')
    p['include[]'] = include
    return this.paginate<any>(`/courses/${courseId}/assignment_groups`, p)
  }

  listCourseTabs(courseId: string | number, includeExternal = true) {
    const p: Record<string, any> = { per_page: 100 }
    if (includeExternal) p['include[]'] = ['external']
    return this.paginate<any>(`/courses/${courseId}/tabs`, p)
  }

  // Activity stream (cross-course), useful for announcements aggregation
  listActivityStream(params: { onlyActiveCourses?: boolean; perPage?: number } = {}) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, params.perPage ?? 100)),
      only_active_courses: params.onlyActiveCourses ?? true,
    }
    return this.paginate<any>('/users/self/activity_stream', p)
  }

  // Account notifications (global announcements)
  async listAccountNotifications(
    accountId: string | number,
    params: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean } = {},
  ) {
    const p: Record<string, any> = {}
    if (params.includePast) p.include_past = true
    if (params.includeAll) p.include_all = true
    if (params.showIsClosed) p.show_is_closed = true
    const encoded = encodeURIComponent(String(accountId))
    try {
      return await this.paginate<any>(
        `/accounts/${encoded}/users/self/account_notifications`,
        p,
      )
    } catch (err) {
      if (err instanceof CanvasError && /HTTP 404\b/.test(err.message)) {
        return this.paginate<any>(`/accounts/${encoded}/account_notifications`, p)
      }
      throw err
    }
  }

  // Announcements (Discussions API)
  listCourseAnnouncements(courseId: string | number, perPage = 50) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, perPage)),
      only_announcements: true,
    }
    return this.paginate<any>(`/courses/${courseId}/discussion_topics`, p)
  }
  // Single-page announcements fetch for pagination UI
  listCourseAnnouncementsPage(courseId: string | number, page = 1, perPage = 10) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, perPage)),
      page: Math.max(1, Number(page) || 1),
      only_announcements: true,
    }
    return this.get<any[]>(`/courses/${courseId}/discussion_topics`, p)
  }
  getAnnouncement(courseId: string | number, topicId: string | number) {
    return this.get<any>(`/courses/${courseId}/discussion_topics/${topicId}`)
  }

  // Discussions (NOT announcements)
  listCourseDiscussions(
    courseId: string | number,
    params: {
      perPage?: number
      searchTerm?: string
      filterBy?: 'all' | 'unread'
      scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
      orderBy?: 'position' | 'recent_activity' | 'title'
      maxPages?: number
    } = {},
  ) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, params.perPage ?? 50)),
      order_by: params.orderBy ?? 'recent_activity',
      scope: params.scope ?? 'unlocked',
      exclude_context_module_locked_topics: true,
    }
    if (params.searchTerm) p.search_term = params.searchTerm
    if (params.filterBy === 'unread') p.filter_by = 'unread'

    // Note: without only_announcements=true, this returns actual discussions
    return this.paginate<any>(`/courses/${courseId}/discussion_topics`, p, params.maxPages).then(
      (topics) => topics.filter((t: any) => !t.is_announcement),
    )
  }

  getDiscussion(courseId: string | number, topicId: string | number) {
    return this.get<any>(`/courses/${courseId}/discussion_topics/${topicId}`)
  }

  getDiscussionView(courseId: string | number, topicId: string | number) {
    return this.get<any>(`/courses/${courseId}/discussion_topics/${topicId}/view`, {
      include_new_entries: true,
    })
  }

  postDiscussionEntry(courseId: string | number, topicId: string | number, message: string) {
    return this.post<any>(`/courses/${courseId}/discussion_topics/${topicId}/entries`, {
      message,
    })
  }

  postDiscussionReply(
    courseId: string | number,
    topicId: string | number,
    entryId: string | number,
    message: string,
  ) {
    return this.post<any>(
      `/courses/${courseId}/discussion_topics/${topicId}/entries/${entryId}/replies`,
      { message },
    )
  }

  markDiscussionEntryRead(
    courseId: string | number,
    topicId: string | number,
    entryId: string | number,
  ) {
    return this.put<void>(
      `/courses/${courseId}/discussion_topics/${topicId}/entries/${entryId}/read`,
    )
  }

  async markDiscussionEntriesRead(
    courseId: string | number,
    topicId: string | number,
    entryIds: (string | number)[],
  ) {
    // Mark multiple entries as read in parallel (with concurrency limit)
    const concurrency = 5
    const results: Array<{ id: string | number; success: boolean }> = []

    for (let i = 0; i < entryIds.length; i += concurrency) {
      const batch = entryIds.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(async (entryId) => {
          try {
            await this.markDiscussionEntryRead(courseId, topicId, entryId)
            return { id: entryId, success: true }
          } catch {
            return { id: entryId, success: false }
          }
        }),
      )
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value)
      }
    }
    return results
  }

  listMyEnrollmentsForCourse(courseId: string | number) {
    // Useful for comparing to Canvas-computed current/final grades
    const p: Record<string, any> = { user_id: 'self', 'type[]': ['StudentEnrollment'] }
    return this.paginate<any>(`/courses/${courseId}/enrollments`, p)
  }

  async listCourseAssignmentsGql(courseRestId: string | number, first = 100) {
    const limit = Math.max(0, Math.floor(Number(first) || 0))
    if (limit === 0) return []

    const perPage = Math.min(100, limit)
    const maxPages = Math.max(1, Math.ceil(limit / perPage))
    const raw = await this.paginate<any>(
      `/courses/${courseRestId}/assignments`,
      { per_page: perPage, 'include[]': ['submission'] },
      maxPages,
    )
    const rawLimited = raw.slice(0, limit)
    const normalized = rawLimited.map((a) => normalizeAssignmentFromRest(a))

    for (let i = 0; i < Math.min(5, normalized.length); i++) {
      assertNormalizedAssignmentDev(normalized[i])
    }

    return normalized
  }

  async listCourseQuizzes(courseRestId: string | number, perPage = 100) {
    const per = Math.min(100, Math.max(1, Math.floor(Number(perPage) || 0)))
    if (!per) return []

    const classic = await this.paginate<any>(`/courses/${courseRestId}/quizzes`, { per_page: per })

    let newQuizzes: any[] = []
    try {
      const url = `${this.baseUrl}/api/quiz/v1/courses/${courseRestId}/quizzes`
      newQuizzes = await this.paginate<any>(url, { per_page: per })
    } catch (e) {
      if (this.verbose) {
        console.warn(`[Canvas] New Quizzes API unavailable for course ${courseRestId}:`, e)
      }
    }

    const normalizedNew = newQuizzes.map((q) => {
      const id = q?.id ?? q?.assignment_id
      const assignmentId = q?.assignment_id ?? q?.id
      return {
        ...q,
        id,
        assignment_id: assignmentId,
        description: q?.description ?? q?.instructions,
        instructions: q?.instructions,
        html_url:
          q?.html_url ||
          `${this.baseUrl}/courses/${courseRestId}/quizzes/${assignmentId ?? id}`,
        isNewQuiz: true,
      }
    })

    const merged: any[] = []
    const seen = new Set<string>()
    for (const q of [...classic, ...normalizedNew]) {
      const key = String(q?.id || q?.assignment_id || q?.html_url || '')
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      merged.push(q)
    }
    return merged
  }

  async getCourseQuiz(courseRestId: string | number, quizId: string | number) {
    try {
      return await this.get(`/courses/${courseRestId}/quizzes/${quizId}`)
    } catch (e) {
      if (this.verbose) {
        console.warn(`[Canvas] Classic quiz fetch failed; trying New Quizzes API:`, e)
      }
    }

    const url = `${this.baseUrl}/api/quiz/v1/courses/${courseRestId}/quizzes/${quizId}`
    const q = await this.get<any>(url)
    return {
      ...q,
      id: q?.assignment_id ?? q?.id ?? quizId,
      assignment_id: q?.assignment_id ?? q?.id ?? quizId,
      description: q?.description ?? q?.instructions,
      instructions: q?.instructions,
      html_url: q?.html_url || `${this.baseUrl}/courses/${courseRestId}/quizzes/${quizId}`,
      isNewQuiz: true,
    }
  }

  async listCourseModulesGql(courseRestId: string | number, _first = 20, _itemsFirst = 50) {
    // REST: include items and content_details. This avoids expensive per-module fan-out.
    const modules = await this.paginate<any>(`/courses/${courseRestId}/modules`, {
      per_page: 50,
      'include[]': ['items', 'content_details'],
    })
    const mapType = (t?: string) => {
      switch ((t || '').toLowerCase()) {
        case 'assignment':
          return 'AssignmentModuleItem'
        case 'page':
          return 'PageModuleItem'
        case 'file':
          return 'FileModuleItem'
        case 'discussion':
          return 'DiscussionModuleItem'
        case 'externalurl':
          return 'ExternalUrlModuleItem'
        case 'quiz':
          return 'QuizModuleItem'
        default:
          return 'ModuleItem'
      }
    }
    const normalized = (modules || []).map((m: any) => ({
      id: m.id,
      _id: String(m.id),
      name: m.name,
      position: m.position,
      moduleItemsConnection: {
        nodes: (m.items || []).map((it: any) => ({
          id: it.id,
          _id: String(it.id),
          __typename: mapType(it.type),
          title: it.title,
          htmlUrl: it.html_url,
          contentId: it.content_id,
          pageUrl: it.page_url,
        })),
      },
    }))
    return normalized
  }

  async getCourseModuleItem(courseId: string | number, itemId: string | number) {
    // Canvas REST API requires module_id for direct module item fetch.
    // Use the sequence endpoint to retrieve the ModuleItem by its id.
    const seq = await this.get<any>(`/courses/${courseId}/module_item_sequence`, {
      asset_type: 'ModuleItem',
      asset_id: itemId,
    })
    const node = Array.isArray(seq?.items) ? seq.items[0] : null
    return node?.current || null
  }

  async listUpcoming(opts: { onlyActiveCourses?: boolean } = {}) {
    const onlyActiveCourses = opts.onlyActiveCourses ?? true
    return this.get('/users/self/upcoming_events', { only_active_courses: onlyActiveCourses })
  }

  async listTodo() {
    return this.get('/users/self/todo')
  }

  async getMySubmission(
    courseId: string | number,
    assignmentRestId: string | number,
    include: string[] = [],
  ) {
    const p: Record<string, any> = {}
    if (include.length) p['include[]'] = include
    return this.get(`/courses/${courseId}/assignments/${assignmentRestId}/submissions/self`, p)
  }

  // Submissions (REST)
  async submitAssignment(
    courseId: string | number,
    assignmentRestId: string | number,
    params: {
      submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
      body?: string
      url?: string
      fileIds?: Array<string | number>
    },
  ) {
    const form = new URLSearchParams()
    form.set('submission[submission_type]', params.submissionType)
    if (typeof params.body === 'string') form.set('submission[body]', params.body)
    if (typeof params.url === 'string') form.set('submission[url]', params.url)
    if (Array.isArray(params.fileIds)) {
      for (const id of params.fileIds) form.append('submission[file_ids][]', String(id))
    }
    return this.post(`/courses/${courseId}/assignments/${assignmentRestId}/submissions`, form)
  }

  async startSubmissionFileUpload(
    courseId: string | number,
    assignmentRestId: string | number,
    file: { name: string; size: number; contentType?: string },
  ) {
    const form = new URLSearchParams()
    form.set('name', file.name)
    form.set('size', String(Math.max(0, Math.floor(file.size))))
    if (file.contentType) form.set('content_type', file.contentType)
    form.set('on_duplicate', 'rename')
    return this.post(
      `/courses/${courseId}/assignments/${assignmentRestId}/submissions/self/files`,
      form,
    )
  }

  private guessContentType(filename: string): string {
    const ext = path.extname(filename || '').toLowerCase()
    switch (ext) {
      case '.pdf':
        return 'application/pdf'
      case '.doc':
        return 'application/msword'
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case '.ppt':
        return 'application/vnd.ms-powerpoint'
      case '.pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      case '.xls':
        return 'application/vnd.ms-excel'
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case '.txt':
        return 'text/plain'
      case '.csv':
        return 'text/csv'
      case '.png':
        return 'image/png'
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg'
      case '.gif':
        return 'image/gif'
      case '.zip':
        return 'application/zip'
      default:
        return 'application/octet-stream'
    }
  }

  private async uploadMultipartFile(
    uploadUrl: string,
    uploadParams: Record<string, any>,
    filePath: string,
  ) {
    const mod = (await import('form-data')) as any as { default: new () => FormDataType }
    const FormData = mod.default as any
    const form = new FormData()

    for (const [k, v] of Object.entries(uploadParams || {})) {
      if (v == null) continue
      form.append(k, String(v))
    }

    const filename = path.basename(filePath)
    const contentType = this.guessContentType(filename)
    form.append('file', fs.createReadStream(filePath), { filename, contentType })

    const resp = await axios.request({
      method: 'POST',
      url: uploadUrl,
      data: form,
      headers: {
        ...(typeof (form as any).getHeaders === 'function' ? (form as any).getHeaders() : {}),
        Accept: 'application/json',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    })

    if (resp.status >= 400) {
      throw new CanvasError(
        `Upload failed (HTTP ${resp.status}): ${JSON.stringify(resp.data, null, 2)}`,
      )
    }
    return resp.data
  }

  async submitAssignmentUpload(
    courseId: string | number,
    assignmentRestId: string | number,
    filePaths: string[],
  ) {
    const paths = (Array.isArray(filePaths) ? filePaths : []).filter(Boolean)
    if (!paths.length) throw new CanvasError('No files selected')

    const fileIds: Array<string | number> = []
    for (const fp of paths) {
      const st = await fs.promises.stat(fp)
      const name = path.basename(fp)
      const init = await this.startSubmissionFileUpload(courseId, assignmentRestId, {
        name,
        size: st.size,
        contentType: this.guessContentType(name),
      })

      const uploadUrl = init?.upload_url
      const uploadParams = init?.upload_params
      if (!uploadUrl || !uploadParams) {
        throw new CanvasError(`Upload init failed: ${JSON.stringify(init, null, 2)}`)
      }

      const uploaded = await this.uploadMultipartFile(String(uploadUrl), uploadParams as any, fp)
      const id = uploaded?.id || uploaded?.attachment?.id || uploaded?.file?.id
      if (id == null) {
        throw new CanvasError(`Upload did not return file id: ${JSON.stringify(uploaded, null, 2)}`)
      }
      fileIds.push(id)
    }

    return this.submitAssignment(courseId, assignmentRestId, {
      submissionType: 'online_upload',
      fileIds,
    })
  }

  // Pages (REST)
  async listCoursePages(courseId: string | number, perPage = 100) {
    return this.paginate<any>(`/courses/${courseId}/pages`, { per_page: perPage })
  }
  async getCoursePage(courseId: string | number, slugOrUrl: string) {
    // Accept full URL or slug
    let slug = slugOrUrl
    try {
      if (/^https?:\/\//.test(slugOrUrl)) {
        const u = new URL(slugOrUrl)
        const parts = u.pathname.split('/')
        const idx = parts.indexOf('pages')
        if (idx >= 0 && parts[idx + 1]) slug = parts[idx + 1]
      }
    } catch {}
    return this.get(`/courses/${courseId}/pages/${slug}`)
  }

  // Course info + front page
  async getCourseInfo(courseId: string | number) {
    // Include course_image to get image_download_url/image_url
    return this.get(`/courses/${courseId}`, { 'include[]': ['syllabus_body', 'course_image'] })
  }
  async getCourseFrontPage(courseId: string | number) {
    return this.get(`/courses/${courseId}/front_page`)
  }

  async resolveModuleItemUrl(url: string): Promise<string> {
    let current = this.url(url)
    try {
      for (let i = 0; i < 5; i++) {
        const headers: Record<string, string> = {}
        if (this.isCanvasOrigin(current)) {
          headers['Authorization'] = this.axios.defaults.headers['Authorization'] as string
        }
        const resp = await fetch(current, { method: 'GET', headers, redirect: 'manual' })
        if (resp.status >= 300 && resp.status < 400) {
          const loc = resp.headers.get('location')
          if (!loc) break
          const next = new URL(loc, current).toString()
          if (!this.isCanvasOrigin(next)) return next
          current = next
          continue
        }
        if (resp.status >= 200 && resp.status < 400) return current
        return current
      }
      return current
    } catch (_e) {
      return current
    }
  }

  // Assignments (REST detail for description)
  async getAssignmentRest(
    courseId: string | number,
    assignmentRestId: string | number,
    include?: string[],
  ) {
    const p: Record<string, any> = {}
    if (include && include.length > 0) p['include[]'] = include
    return this.get(`/courses/${courseId}/assignments/${assignmentRestId}`, p)
  }

  // Files
  async getFile(fileId: string | number) {
    return this.get(`/files/${fileId}`)
  }

  async downloadFile(fileId: string | number): Promise<string> {
    const meta = await this.get(`/files/${fileId}`)
    const url = meta.url
    if (!url) throw new Error('No file URL available')

    const tempDir = normalizeWin32Path(app.getPath('temp'))
    // Sanitize filename to avoid directory traversal
    const safeName = (meta.filename || `file-${fileId}`).replace(/[^a-zA-Z0-9.-]/g, '_')
    const destPath = path.join(tempDir, `canvas-${fileId}-${safeName}`)

    // Check if file already exists and is recent (simple cache)
    if (fs.existsSync(destPath)) {
      // Just return it (could add expiry check)
      return destPath
    }

    return this.downloadUrlToPath(url, destPath)
  }

  async downloadCourseImage(
    courseId: string | number,
    imageUrl: string,
    opts?: { allowHosts?: string[]; maxBytes?: number },
  ): Promise<string> {
    const tempDir = normalizeWin32Path(app.getPath('temp'))
    // Create a stable filename for the course image so we can cache it
    const ext = path.extname(new URL(imageUrl).pathname) || '.jpg'
    const destPath = path.join(tempDir, `course-image-${courseId}${ext}`)

    if (fs.existsSync(destPath)) {
      return destPath
    }

    return this.downloadImageToPath(imageUrl, destPath, opts)
  }

  private async downloadImageToPath(
    url: string,
    destPath: string,
    opts?: { allowHosts?: string[]; maxBytes?: number },
  ): Promise<string> {
    const allowHosts = normalizeHostList(opts?.allowHosts)
    if (allowHosts.length === 0) {
      throw new Error('No allowed hosts configured for course image download')
    }
    const maxBytes = opts?.maxBytes ?? DEFAULT_COURSE_IMAGE_MAX_BYTES
    let current = url
    for (let i = 0; i < 5; i++) {
      let parsed: URL
      try {
        parsed = new URL(current)
      } catch {
        throw new Error('Invalid course image URL')
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Unsupported image URL protocol')
      }
      if (!isHostAllowed(parsed.hostname, allowHosts)) {
        throw new Error('Image host is not in allowlist')
      }

      const headers: Record<string, string> = {}
      if (this.isCanvasOrigin(current)) {
        headers['Authorization'] = this.axios.defaults.headers['Authorization'] as string
      }
      const resp = await fetch(current, { method: 'GET', headers, redirect: 'manual' })
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location')
        if (!loc) throw new Error('Redirect response missing Location header')
        current = new URL(loc, current).toString()
        continue
      }
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.statusText}`)
      if (!resp.body) throw new Error('No response body')

      const contentType = resp.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
      if (!contentType || !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
        throw new Error(`Unsupported image content type: ${contentType || 'unknown'}`)
      }

      const contentLength = resp.headers.get('content-length')
      if (contentLength) {
        const size = Number(contentLength)
        if (Number.isFinite(size) && size > maxBytes) {
          throw new Error(`Image exceeds max size (${maxBytes} bytes)`)
        }
      }

      let bytes = 0
      const limiter = new Transform({
        transform(chunk, _enc, cb) {
          bytes += chunk.length
          if (bytes > maxBytes) {
            cb(new Error(`Image exceeds max size (${maxBytes} bytes)`))
            return
          }
          cb(null, chunk)
        },
      })

      const fileStream = createWriteStream(destPath)
      await pipeline(Readable.fromWeb(resp.body as any), limiter, fileStream)
      return destPath
    }
    throw new Error('Too many redirects while downloading image')
  }

  private async downloadUrlToPath(url: string, destPath: string): Promise<string> {
    let current = url
    for (let i = 0; i < 5; i++) {
      const headers: Record<string, string> = {}
      if (this.isCanvasOrigin(current)) {
        headers['Authorization'] = this.axios.defaults.headers['Authorization'] as string
      }
      const resp = await fetch(current, { method: 'GET', headers, redirect: 'manual' })
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location')
        if (!loc) throw new Error('Redirect response missing Location header')
        current = new URL(loc, current).toString()
        continue
      }
      if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.statusText}`)
      if (!resp.body) throw new Error('No response body')

      const fileStream = createWriteStream(destPath)
      await pipeline(Readable.fromWeb(resp.body as any), fileStream)
      return destPath
    }
    throw new Error('Too many redirects while downloading file')
  }

  async getFileBytes(fileId: string | number) {
    // Get file metadata first to get the signed URL
    const meta = await this.get(`/files/${fileId}`)
    const url = meta.url // time-limited signed URL

    if (!url) {
      throw new Error('No file URL available')
    }

    // Download the file bytes using the signed URL
    const response = await fetch(url, {
      method: 'GET',
      // The signed URL is usually public, so we don't need Authorization header
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file bytes: ${response.statusText}`)
    }

    return response.arrayBuffer()
  }

  async listCourseFolders(courseId: string | number, perPage = 100) {
    return this.paginate<any>(`/courses/${courseId}/folders`, {
      per_page: Math.min(100, Math.max(1, perPage)),
    })
  }

  async listFolderFiles(folderId: string | number, perPage = 100) {
    return this.paginate<any>(`/folders/${folderId}/files`, {
      per_page: Math.min(100, Math.max(1, perPage)),
    })
  }

  async listCourseUsers(courseId: string | number, perPage = 100) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, perPage)),
      'include[]': ['avatar_url', 'enrollments', 'email'],
    }
    return this.paginate<any>(`/courses/${courseId}/users`, p)
  }

  // Groups
  async listCourseGroups(courseId: string | number, perPage = 100) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, perPage)),
      'include[]': ['users'],
    }
    return this.paginate<any>(`/courses/${courseId}/groups`, p)
  }

  async listMyGroups(contextType?: 'Account' | 'Course') {
    const p: Record<string, any> = { per_page: 100 }
    if (contextType) p.context_type = contextType
    return this.paginate<any>('/users/self/groups', p)
  }

  async listGroupUsers(groupId: string | number, perPage = 100) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, perPage)),
      'include[]': ['avatar_url'],
    }
    return this.paginate<any>(`/groups/${groupId}/users`, p)
  }

  // Conversations (Inbox)
  async listConversations(
    params: {
      scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'
      perPage?: number
      pageUrl?: string
    } = {},
  ) {
    const p: Record<string, any> = {
      per_page: Math.min(100, Math.max(1, params.perPage ?? 20)),
      'include[]': ['participant_avatars'],
    }
    if (params.scope) p.scope = params.scope
    const url = params.pageUrl ? this.url(params.pageUrl) : this.url('/conversations')
    const resp = await this.request<any>({
      method: 'GET',
      url,
      params: params.pageUrl ? undefined : p,
    })
    const data = Array.isArray(resp.data) ? resp.data : [resp.data]
    const link = (resp.headers['link'] || resp.headers['Link']) as string | undefined
    let nextPageUrl: string | null = null
    if (link) {
      const match = link
        .split(',')
        .map((s) => s.trim())
        .find((s) => s.endsWith('rel="next"'))
      if (match) {
        const m = match.match(/<(.*)>/)
        nextPageUrl = m ? m[1] : null
      }
    }
    return { items: data, nextPageUrl }
  }

  async getConversation(conversationId: string | number) {
    return this.get(`/conversations/${conversationId}`, {
      'include[]': ['participant_avatars'],
      auto_mark_as_read: false, // Don't mark as read just by viewing
    })
  }

  async getUnreadCount() {
    return this.get<{ unread_count: string }>('/conversations/unread_count')
  }

  async createConversation(params: {
    recipients: string[]
    subject?: string
    body: string
    groupConversation?: boolean
    contextCode?: string // e.g., 'course_12345'
  }) {
    // Canvas expects recipients as URLSearchParams-style array: recipients[]=1&recipients[]=2
    const formData = new URLSearchParams()
    for (const r of params.recipients) {
      formData.append('recipients[]', r)
    }
    formData.append('body', params.body)
    formData.append('group_conversation', String(params.groupConversation ?? true))
    if (params.subject) formData.append('subject', params.subject)
    if (params.contextCode) formData.append('context_code', params.contextCode)

    const resp = await this.axios.request({
      method: 'POST',
      url: this.url('/conversations'),
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return resp.data
  }

  async addMessage(conversationId: string | number, body: string, includedMessages?: string[]) {
    const data: Record<string, any> = { body }
    if (includedMessages && includedMessages.length > 0) {
      data['included_messages[]'] = includedMessages
    }
    return this.post(`/conversations/${conversationId}/add_message`, data)
  }

  async updateConversation(
    conversationId: string | number,
    params: {
      workflowState?: 'read' | 'unread' | 'archived'
      starred?: boolean
      subscribed?: boolean
    },
  ) {
    const formData = new URLSearchParams()
    if (params.workflowState) {
      formData.append('conversation[workflow_state]', params.workflowState)
    }
    if (params.starred !== undefined) {
      formData.append('conversation[starred]', String(params.starred))
    }
    if (params.subscribed !== undefined) {
      formData.append('conversation[subscribed]', String(params.subscribed))
    }

    const resp = await this.request({
      method: 'PUT',
      url: this.url(`/conversations/${conversationId}`),
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return resp.data
  }

  async deleteConversation(conversationId: string | number) {
    return this.del(`/conversations/${conversationId}`)
  }

  async searchRecipients(params: {
    search: string
    context?: string // e.g., 'course_12345'
    type?: 'user' | 'context'
    perPage?: number
  }) {
    const p: Record<string, any> = {
      search: params.search,
      per_page: params.perPage ?? 10,
      permissions: ['send_messages_all'],
    }
    if (params.context) p.context = params.context
    if (params.type) p.type = params.type
    return this.get('/search/recipients', p)
  }

  async listCourseFiles(
    courseId: string | number,
    perPage = 100,
    sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at',
    order: 'asc' | 'desc' = 'desc',
  ) {
    const p: Record<string, any> = { per_page: Math.min(100, Math.max(1, perPage)), sort, order }
    return this.paginate<any>(`/courses/${courseId}/files`, p)
  }
  async listDueAssignmentsGql(
    params: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean } = {},
  ) {
    const days = params.days ?? 7
    const onlyPublished = params.onlyPublished ?? true
    const includeCourseName = params.includeCourseName ?? true

    const courses = await this.listCourses({ enrollment_state: 'active' })
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const out: any[] = []
    const quizIdsFromAssignments = new Set<string>()

    const extractQuizId = (url?: string | null) => {
      if (!url) return null
      try {
        const u = new URL(url)
        const parts = u.pathname.split('/')
        const idx = parts.indexOf('quizzes')
        if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1])
      } catch {}
      return null
    }

    // Fetch per-course assignments concurrently with a small pool to reduce total time
    const concurrency = 6
    const tasks = (courses || []).map((c: any) => async () => {
      const cid = c?.id
      const cname = c?.name ?? ''
      if (!cid) return
      try {
        const assignmentById = new Map<string, any>()
        const dueAssignmentIds = new Set<string>()
        const nodes = await this.listAssignmentsWithSubmission(cid, 100)
        for (const n of nodes) {
          const assignId = String(n?.id || '')
          if (assignId) assignmentById.set(assignId, n)
          if (onlyPublished && (n as any).published === false) continue
          const dt = parseIso(n?.due_at)
          if (!dt) continue
          if (dt >= now && dt <= end) {
            const quizId = extractQuizId(n?.html_url)
            if (quizId) quizIdsFromAssignments.add(`${cid}:${quizId}`)
            if (assignId) dueAssignmentIds.add(assignId)
            const item: any = {
              course_id: cid,
              assignment_rest_id: n?.id,
              assignment_graphql_id: null,
              name: n?.name,
              dueAt: dt.toISOString(),
              state: n?.workflow_state, // REST uses workflow_state, GQL uses state.
              pointsPossible: n?.points_possible,
              htmlUrl: n?.html_url,
              contentType: 'assignment',
              submission: n?.submission
                ? {
                    submittedAt: n.submission.submitted_at,
                    workflowState: n.submission.workflow_state,
                  }
                : undefined,
            }
            if (includeCourseName) item.course_name = cname
            out.push(item)
          }
        }
        // Add quizzes so they show up in dashboard/priority, even if not in assignments list.
        try {
          const quizzes = await this.listCourseQuizzes(cid, 100)
          const pendingSubmissions: Array<{ assignmentId: string; item: any }> = []
          for (const q of quizzes || []) {
            if (onlyPublished && (q as any)?.published === false) continue
            const dt = parseIso((q as any)?.due_at)
            if (!dt) continue
            if (dt < now || dt > end) continue
            const isNew = Boolean((q as any)?.isNewQuiz)
            const assignmentId = String((q as any)?.assignment_id || '')
            const quizId = String(
              isNew
                ? assignmentId || (q as any)?.id || ''
                : (q as any)?.id || '',
            )
            if (!quizId) continue
            if (quizIdsFromAssignments.has(`${cid}:${quizId}`)) continue
            if (assignmentId && dueAssignmentIds.has(assignmentId)) continue
            const fromAssignment = assignmentId ? assignmentById.get(assignmentId) : null
            const item: any = {
              course_id: cid,
              quiz_id: quizId,
              name: (q as any)?.title || 'Quiz',
              dueAt: dt.toISOString(),
              pointsPossible:
                (q as any)?.points_possible ??
                fromAssignment?.points_possible ??
                null,
              htmlUrl: (q as any)?.html_url,
              contentType: 'quiz',
              submission: fromAssignment?.submission
                ? {
                    submittedAt: fromAssignment.submission.submitted_at,
                    workflowState: fromAssignment.submission.workflow_state,
                  }
                : undefined,
            }
            if (includeCourseName) item.course_name = cname
            out.push(item)
            if (!item.submission && assignmentId) {
              pendingSubmissions.push({ assignmentId, item })
            }
          }
          if (pendingSubmissions.length > 0) {
            let qi = 0
            const subWorkers = Array.from(
              { length: Math.min(4, pendingSubmissions.length) },
              () =>
                (async () => {
                  while (qi < pendingSubmissions.length) {
                    const cur = qi++
                    const { assignmentId, item } = pendingSubmissions[cur]
                    try {
                      const sub = await this.getMySubmission(cid, assignmentId, [])
                      if (sub) {
                        item.submission = {
                          submittedAt: sub.submitted_at,
                          workflowState: sub.workflow_state,
                        }
                      }
                    } catch {}
                  }
                })(),
            )
            await Promise.all(subWorkers)
          }
        } catch (_quizErr) {
          if (this.verbose) {
            console.warn(`[Canvas] Failed to fetch quizzes for course ${cid}:`, _quizErr)
          }
        }
      } catch (_e) {
        // ignore course-level errors to avoid blocking whole dashboard
        if (this.verbose) {
          console.warn(`[Canvas] Failed to fetch assignments for course ${cid}:`, _e)
        }
      }
    })

    let i = 0
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () =>
      (async () => {
        while (i < tasks.length) {
          const cur = i++
          await tasks[cur]()
        }
      })(),
    )
    await Promise.all(workers)

    out.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    return out
  }
}

// A tiny service layer to manage token storage with keytar and provide a singleton client
const SERVICE_NAME = 'whiteboard'
let client: CanvasClient | null = null
let currentBaseUrl = DEFAULT_BASE_URL

let _keytar: any | null = null
async function getKeytar(): Promise<any> {
  if (_keytar) return _keytar
  // dynamic import to avoid bundling native module
  try {
    const mod: any = await import('keytar')
    _keytar = mod.default ?? mod
    return _keytar
  } catch (e) {
    throw new CanvasError(`Failed to load keytar: ${String((e as any)?.message || e)}`)
  }
}

// In-memory fallback if keytar is unavailable.
// We deliberately do NOT write tokens to disk without keytar.
const memoryTokens = new Map<string, string>()

async function setToken(baseUrl: string, token: string): Promise<{ insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    await keytar.setPassword(SERVICE_NAME, baseUrl, token)
    return { insecure: false }
  } catch {
    memoryTokens.set(baseUrl, token)
    return { insecure: true }
  }
}

async function getToken(baseUrl: string): Promise<{ token: string | null; insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    const t = await keytar.getPassword(SERVICE_NAME, baseUrl)
    return { token: t || null, insecure: false }
  } catch {
    const t = memoryTokens.get(baseUrl) || null
    return { token: t, insecure: true }
  }
}

async function deleteToken(baseUrl: string): Promise<{ insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    await keytar.deletePassword(SERVICE_NAME, baseUrl)
    return { insecure: false }
  } catch {
    memoryTokens.delete(baseUrl)
    return { insecure: true }
  }
}

export async function initCanvas(config: {
  token?: string
  baseUrl?: string
  verbose?: boolean
}): Promise<{ insecure: boolean }> {
  const rawBase = (config.baseUrl || DEFAULT_BASE_URL).trim()
  let parsed: URL
  try {
    parsed = new URL(rawBase)
  } catch {
    throw new CanvasError('Invalid Canvas base URL.')
  }
  const allowInsecure =
    process.env.WB_ALLOW_INSECURE === '1' ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1'
  if (parsed.protocol !== 'https:' && !allowInsecure) {
    throw new CanvasError('Canvas base URL must use https://')
  }
  currentBaseUrl = parsed.origin.replace(/\/$/, '')
  let insecure = false
  if (config.token) {
    const r = await setToken(currentBaseUrl, config.token)
    insecure = insecure || r.insecure
  }
  const got = await getToken(currentBaseUrl)
  insecure = insecure || got.insecure
  const token = config.token || got.token
  if (!token) throw new CanvasError('No Canvas token set. Provide token in init or save one first.')
  client = new CanvasClient({ token, baseUrl: currentBaseUrl, verbose: !!config.verbose })
  return { insecure }
}

export async function clearToken(baseUrl?: string) {
  const url = (baseUrl || currentBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
  await deleteToken(url)
  client = null
}

function ensureClient() {
  if (!client) throw new CanvasError('Canvas client is not initialized. Call initCanvas first.')
  return client
}

export async function getProfile() {
  return ensureClient().getProfile()
}

export async function listCourses(opts?: { enrollment_state?: string }) {
  return ensureClient().listCourses({ enrollment_state: opts?.enrollment_state || 'active' })
}

export async function listDueAssignments(opts?: {
  days?: number
  onlyPublished?: boolean
  includeCourseName?: boolean
}) {
  return ensureClient().listDueAssignmentsGql(opts)
}

export async function listCourseAssignments(courseId: string | number, first = 200) {
  return ensureClient().listCourseAssignmentsGql(courseId, first)
}

export async function listAssignmentsWithSubmission(courseId: string | number, perPage = 100) {
  return ensureClient().listAssignmentsWithSubmission(courseId, perPage)
}

export async function listAssignmentGroups(courseId: string | number, includeAssignments = false) {
  return ensureClient().listAssignmentGroups(courseId, includeAssignments)
}

export async function listMyEnrollmentsForCourse(courseId: string | number) {
  return ensureClient().listMyEnrollmentsForCourse(courseId)
}

export async function listCourseTabs(courseId: string | number, includeExternal = true) {
  return ensureClient().listCourseTabs(courseId, includeExternal)
}
export async function listCourseQuizzes(courseId: string | number, perPage = 100) {
  return ensureClient().listCourseQuizzes(courseId, perPage)
}
export async function getCourseQuiz(courseId: string | number, quizId: string | number) {
  return ensureClient().getCourseQuiz(courseId, quizId)
}
export async function getRateLimitSnapshot() {
  return ensureClient().getRateLimitSnapshot()
}
export async function listActivityStream(opts?: { onlyActiveCourses?: boolean; perPage?: number }) {
  return ensureClient().listActivityStream(opts)
}

export async function listAccountNotifications(
  accountId: string | number,
  params?: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean },
) {
  return ensureClient().listAccountNotifications(accountId, params)
}

export async function listCourseAnnouncements(courseId: string | number, perPage = 50) {
  return ensureClient().listCourseAnnouncements(courseId, perPage)
}

export async function listCourseAnnouncementsPage(
  courseId: string | number,
  page = 1,
  perPage = 10,
) {
  return ensureClient().listCourseAnnouncementsPage(courseId, page, perPage)
}

export async function getAnnouncement(courseId: string | number, topicId: string | number) {
  return ensureClient().getAnnouncement(courseId, topicId)
}

// Discussions
export async function listCourseDiscussions(
  courseId: string | number,
  params?: {
    perPage?: number
    searchTerm?: string
    filterBy?: 'all' | 'unread'
    scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
    orderBy?: 'position' | 'recent_activity' | 'title'
  },
) {
  return ensureClient().listCourseDiscussions(courseId, params)
}

export async function getDiscussion(courseId: string | number, topicId: string | number) {
  return ensureClient().getDiscussion(courseId, topicId)
}

export async function getDiscussionView(courseId: string | number, topicId: string | number) {
  return ensureClient().getDiscussionView(courseId, topicId)
}

export async function postDiscussionEntry(
  courseId: string | number,
  topicId: string | number,
  message: string,
) {
  return ensureClient().postDiscussionEntry(courseId, topicId, message)
}

export async function postDiscussionReply(
  courseId: string | number,
  topicId: string | number,
  entryId: string | number,
  message: string,
) {
  return ensureClient().postDiscussionReply(courseId, topicId, entryId, message)
}

export async function markDiscussionEntryRead(
  courseId: string | number,
  topicId: string | number,
  entryId: string | number,
) {
  return ensureClient().markDiscussionEntryRead(courseId, topicId, entryId)
}

export async function markDiscussionEntriesRead(
  courseId: string | number,
  topicId: string | number,
  entryIds: (string | number)[],
) {
  return ensureClient().markDiscussionEntriesRead(courseId, topicId, entryIds)
}

export async function listCourseModulesGql(courseId: string | number, first = 20, itemsFirst = 50) {
  return ensureClient().listCourseModulesGql(courseId, first, itemsFirst)
}

export async function getCourseModuleItem(courseId: string | number, itemId: string | number) {
  return ensureClient().getCourseModuleItem(courseId, itemId)
}

export async function listUpcoming(opts?: { onlyActiveCourses?: boolean }) {
  return ensureClient().listUpcoming({ onlyActiveCourses: opts?.onlyActiveCourses })
}

export async function listTodo() {
  return ensureClient().listTodo()
}

export async function getMySubmission(
  courseId: string | number,
  assignmentRestId: string | number,
  include?: string[],
) {
  return ensureClient().getMySubmission(courseId, assignmentRestId, include || [])
}

export async function submitAssignment(
  courseId: string | number,
  assignmentRestId: string | number,
  params: {
    submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
    body?: string
    url?: string
    fileIds?: Array<string | number>
  },
) {
  return ensureClient().submitAssignment(courseId, assignmentRestId, params)
}

export async function submitAssignmentUpload(
  courseId: string | number,
  assignmentRestId: string | number,
  filePaths: string[],
) {
  return ensureClient().submitAssignmentUpload(courseId, assignmentRestId, filePaths)
}

export async function listCoursePages(courseId: string | number, perPage = 100) {
  return ensureClient().listCoursePages(courseId, perPage)
}
export async function getCoursePage(courseId: string | number, slugOrUrl: string) {
  return ensureClient().getCoursePage(courseId, slugOrUrl)
}
export async function getCourseInfo(courseId: string | number) {
  return ensureClient().getCourseInfo(courseId)
}
export async function getCourseFrontPage(courseId: string | number) {
  return ensureClient().getCourseFrontPage(courseId)
}
export async function getAssignmentRest(
  courseId: string | number,
  assignmentRestId: string | number,
  include?: string[],
) {
  return ensureClient().getAssignmentRest(courseId, assignmentRestId, include)
}
export async function getFile(fileId: string | number) {
  return ensureClient().getFile(fileId)
}

export async function downloadFile(fileId: string | number) {
  return ensureClient().downloadFile(fileId)
}

export async function downloadCourseImage(
  courseId: string | number,
  url: string,
  opts?: { allowHosts?: string[]; maxBytes?: number },
) {
  return ensureClient().downloadCourseImage(courseId, url, opts)
}

export async function getFileBytes(fileId: string | number) {
  return ensureClient().getFileBytes(fileId)
}

export async function listCourseFiles(
  courseId: string | number,
  perPage = 100,
  sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at',
  order: 'asc' | 'desc' = 'desc',
) {
  return ensureClient().listCourseFiles(courseId, perPage, sort, order)
}

export async function listCourseFolders(courseId: string | number, perPage = 100) {
  return ensureClient().listCourseFolders(courseId, perPage)
}

export async function listFolderFiles(folderId: string | number, perPage = 100) {
  return ensureClient().listFolderFiles(folderId, perPage)
}

export async function listCourseUsers(courseId: string | number, perPage = 100) {
  return ensureClient().listCourseUsers(courseId, perPage)
}

export async function listCourseGroups(courseId: string | number, perPage = 100) {
  return ensureClient().listCourseGroups(courseId, perPage)
}

export async function listMyGroups(contextType?: 'Account' | 'Course') {
  return ensureClient().listMyGroups(contextType)
}

export async function listGroupUsers(groupId: string | number, perPage = 100) {
  return ensureClient().listGroupUsers(groupId, perPage)
}

// Conversations (Inbox)
export async function listConversations(params?: {
  scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'
  perPage?: number
  pageUrl?: string
}) {
  return ensureClient().listConversations(params)
}

export async function getConversation(conversationId: string | number) {
  return ensureClient().getConversation(conversationId)
}

export async function getUnreadCount() {
  return ensureClient().getUnreadCount()
}

export async function createConversation(params: {
  recipients: string[]
  subject?: string
  body: string
  groupConversation?: boolean
  contextCode?: string
}) {
  return ensureClient().createConversation(params)
}

export async function addMessage(
  conversationId: string | number,
  body: string,
  includedMessages?: string[],
) {
  return ensureClient().addMessage(conversationId, body, includedMessages)
}

export async function updateConversation(
  conversationId: string | number,
  params: {
    workflowState?: 'read' | 'unread' | 'archived'
    starred?: boolean
    subscribed?: boolean
  },
) {
  return ensureClient().updateConversation(conversationId, params)
}

export async function deleteConversation(conversationId: string | number) {
  return ensureClient().deleteConversation(conversationId)
}

export async function searchRecipients(params: {
  search: string
  context?: string
  type?: 'user' | 'context'
  perPage?: number
}) {
  return ensureClient().searchRecipients(params)
}

export async function resolveUrl(url: string) {
  return ensureClient().resolveModuleItemUrl(url)
}
