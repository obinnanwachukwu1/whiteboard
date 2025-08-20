import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BASE_URL = 'https://gatech.instructure.com'
const API_PREFIX = '/api/v1'
const GQL_PATH = '/api/graphql'

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

  constructor(opts: CanvasClientOptions) {
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
    this.apiRoot = `${this.baseUrl}${API_PREFIX}`
    this.timeoutMs = opts.timeoutMs ?? 30_000
    this.retry = opts.retry ?? DefaultRetry
    this.verbose = !!opts.verbose

    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/json',
    }
    if (opts.userAgent) headers['User-Agent'] = opts.userAgent

    this.axios = axios.create({
      headers,
      timeout: this.timeoutMs,
      validateStatus: () => true, // we'll handle errors
    })
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let attempt = 0
    while (true) {
      attempt += 1
      const url = config.url
      if (this.verbose && url) {
        const method = (config.method || 'GET').toUpperCase()
        const paramsDbg = config.params ? ` params=${JSON.stringify(config.params)}` : ''
        const dataDbg = config.data ? ` data=${typeof config.data === 'string' ? '[string]' : JSON.stringify(config.data).slice(0, 200)}` : ''
        // eslint-disable-next-line no-console
        console.log(`[${method}] ${url}${paramsDbg}${dataDbg}`)
      }

      const resp = await this.axios.request<T>(config)
      if (this.retry.retryStatuses.includes(resp.status) && attempt <= this.retry.maxRetries) {
        const ra = resp.headers['retry-after']
        const delay = ra ? Math.max(500, Number(ra) * 1000 || 0) : this.retry.backoffFactor * attempt * 1000
        if (this.verbose) {
          // eslint-disable-next-line no-console
          console.warn(`Retrying (${attempt}/${this.retry.maxRetries}) in ${(delay / 1000).toFixed(1)}s due to ${resp.status}...`)
        }
        await sleep(delay)
        continue
      }
      if (resp.status >= 400) {
        let body: any
        try { body = resp.data } catch { body = resp.statusText }
        throw new CanvasError(`HTTP ${resp.status} for ${config.url}: ${JSON.stringify(body, null, 2)}`)
      }
      return resp
    }
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

  async paginate<T = any>(pathOrUrl: string, params?: Record<string, any>): Promise<T[]> {
    const out: T[] = []
    let url: string | null = this.url(pathOrUrl)
    let first = true
    while (url) {
      const resp = await this.request<any>({ method: 'GET', url, params: first ? params : undefined })
      first = false
      const data = resp.data
      if (Array.isArray(data)) {
        out.push(...data)
      } else {
        out.push(data)
        break
      }
      const link = (resp.headers['link'] || resp.headers['Link']) as string | undefined
      if (link) {
        const match = link.split(',').map((s) => s.trim()).find((s) => s.endsWith('rel="next"'))
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
    const p: Record<string, any> = { per_page: params.per_page ?? 100, enrollment_state: params.enrollment_state ?? 'active' }
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

  listMyEnrollmentsForCourse(courseId: string | number) {
    // Useful for comparing to Canvas-computed current/final grades
    const p: Record<string, any> = { user_id: 'self', 'type[]': ['StudentEnrollment'] }
    return this.paginate<any>(`/courses/${courseId}/enrollments`, p)
  }

  // GraphQL
  async graphql(query: string, variables?: Record<string, any>, operationName?: string) {
    const url = `${this.baseUrl}${GQL_PATH}`
    const payload: any = { query }
    if (variables) payload.variables = variables
    if (operationName) payload.operationName = operationName
    const resp = await this.request({ method: 'POST', url, data: payload })
    const data = resp.data
    if (data && data.errors && data.errors.length) {
      throw new CanvasError(JSON.stringify(data.errors, null, 2))
    }
    return data
  }

  async graphqlPaginate(
    query: string,
    variables: Record<string, any>,
    extract: (payload: any) => { nodes: any[]; endCursor?: string | null; hasNextPage?: boolean },
    afterKey = 'after',
  ): Promise<any[]> {
    const varsLocal = { ...variables }
    let cursor: string | null | undefined = varsLocal[afterKey]
    const all: any[] = []
    while (true) {
      varsLocal[afterKey] = cursor
      const payload = await this.graphql(query, varsLocal)
      const { nodes, endCursor, hasNextPage } = extract(payload)
      all.push(...nodes)
      if (!hasNextPage || !endCursor) break
      cursor = endCursor
    }
    return all
  }

  async listCourseAssignmentsGql(courseRestId: string | number, first = 100) {
    const query = `
      query Assignments($id: ID!, $first: Int = 100, $after: String) {
        course(id: $id) {
          _id
          name
          assignmentsConnection(first: $first, after: $after) {
            nodes { id _id name dueAt state pointsPossible submissionTypes htmlUrl }
            pageInfo { endCursor hasNextPage }
          }
        }
      }
    `
    const nodes = await this.graphqlPaginate(
      query,
      { id: String(courseRestId), first },
      (payload) => {
        const conn = payload?.data?.course?.assignmentsConnection
        return {
          nodes: conn?.nodes ?? [],
          endCursor: conn?.pageInfo?.endCursor ?? null,
          hasNextPage: conn?.pageInfo?.hasNextPage ?? false,
        }
      },
    )
    return nodes
  }

  async listCourseModulesGql(courseRestId: string | number, first = 20, itemsFirst = 50) {
    try {
      const query = `
        query CourseModules($id: ID!, $first: Int = 20, $after: String, $itemsFirst: Int = 50) {
          course(id: $id) {
            _id
            name
            modulesConnection(first: $first, after: $after) {
              nodes {
                id
                _id
                name
                position
                moduleItemsConnection(first: $itemsFirst) {
                  nodes {
                    id
                    _id
                    __typename
                    title
                  }
                  pageInfo { endCursor hasNextPage }
                }
              }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `
      const nodes = await this.graphqlPaginate(
        query,
        { id: String(courseRestId), first, itemsFirst },
        (payload) => {
          const conn = payload?.data?.course?.modulesConnection
          return {
            nodes: conn?.nodes ?? [],
            endCursor: conn?.pageInfo?.endCursor ?? null,
            hasNextPage: conn?.pageInfo?.hasNextPage ?? false,
          }
        },
      )
      // Enrich with REST html_url per module item so items are clickable
      const enriched = await Promise.all(
        nodes.map(async (m: any) => {
          try {
            const restItems = await this.paginate<any>(
              `/courses/${courseRestId}/modules/${m._id}/items`,
              { per_page: 100 },
            )
            const byItemId = new Map<string, any>(restItems.map((ri: any) => [String(ri.id), ri]))
            const items = (m.moduleItemsConnection?.nodes || []).map((it: any) => {
              const ri = byItemId.get(String(it._id))
              return {
                ...it,
                htmlUrl: ri?.html_url,
                contentId: ri?.content_id,
                pageUrl: ri?.page_url,
              }
            })
            return { ...m, moduleItemsConnection: { nodes: items } }
          } catch {
            return m
          }
        })
      )
      return enriched
    } catch (_e) {
      // Fallback to REST: include items and content_details
      const modules = await this.paginate<any>(
        `/courses/${courseRestId}/modules`,
        { per_page: 50, 'include[]': ['items', 'content_details'] },
      )
      const mapType = (t?: string) => {
        switch ((t || '').toLowerCase()) {
          case 'assignment': return 'AssignmentModuleItem'
          case 'page': return 'PageModuleItem'
          case 'file': return 'FileModuleItem'
          case 'discussion': return 'DiscussionModuleItem'
          case 'externalurl': return 'ExternalUrlModuleItem'
          case 'quiz': return 'QuizModuleItem'
          default: return 'ModuleItem'
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
  }

  async listUpcoming(opts: { onlyActiveCourses?: boolean } = {}) {
    const onlyActiveCourses = opts.onlyActiveCourses ?? true
    return this.get('/users/self/upcoming_events', { only_active_courses: onlyActiveCourses })
  }

  async listTodo() {
    return this.get('/users/self/todo')
  }

  async getMySubmission(courseId: string | number, assignmentRestId: string | number) {
    return this.get(`/courses/${courseId}/assignments/${assignmentRestId}/submissions/self`)
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

  // Assignments (REST detail for description)
  async getAssignmentRest(courseId: string | number, assignmentRestId: string | number) {
    return this.get(`/courses/${courseId}/assignments/${assignmentRestId}`)
  }

  // Files
  async getFile(fileId: string | number) {
    return this.get(`/files/${fileId}`)
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
  async listDueAssignmentsGql(params: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean } = {}) {
    const days = params.days ?? 7
    const onlyPublished = params.onlyPublished ?? true
    const includeCourseName = params.includeCourseName ?? true

    const courses = await this.listCourses({ enrollment_state: 'active' })
    const now = new Date()
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const out: any[] = []

    for (const c of courses) {
      const cid = c?.id
      const cname = c?.name ?? ''
      if (!cid) continue
      const nodes = await this.listCourseAssignmentsGql(cid, 200)
      for (const n of nodes) {
        if (onlyPublished && n?.state !== 'published') continue
        const dt = parseIso(n?.dueAt)
        if (!dt) continue
        if (dt >= now && dt <= end) {
          const item: any = {
            course_id: cid,
            assignment_rest_id: n?._id ? Number(n._id) : null,
            assignment_graphql_id: n?.id,
            name: n?.name,
            dueAt: dt.toISOString(),
            state: n?.state,
            pointsPossible: n?.pointsPossible,
            htmlUrl: n?.htmlUrl,
          }
          if (includeCourseName) item.course_name = cname
          out.push(item)
        }
      }
    }
    out.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    return out
  }
}

// A tiny service layer to manage token storage with keytar and provide a singleton client
const SERVICE_NAME = 'canvas-desk'
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

// Insecure file-based fallback for development when keytar isn't available
function tokenFilePath() {
  const dir = app.getPath('userData')
  return path.join(dir, 'canvas-desk-tokens.json')
}

function readTokens(): Record<string, string> {
  try {
    const p = tokenFilePath()
    if (!fs.existsSync(p)) return {}
    return JSON.parse(fs.readFileSync(p, 'utf-8')) || {}
  } catch {
    return {}
  }
}

function writeTokens(map: Record<string, string>) {
  try {
    const p = tokenFilePath()
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(map, null, 2))
  } catch {}
}

async function setToken(baseUrl: string, token: string): Promise<{ insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    await keytar.setPassword(SERVICE_NAME, baseUrl, token)
    return { insecure: false }
  } catch {
    const map = readTokens()
    map[baseUrl] = token
    writeTokens(map)
    return { insecure: true }
  }
}

async function getToken(baseUrl: string): Promise<{ token: string | null; insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    const t = await keytar.getPassword(SERVICE_NAME, baseUrl)
    return { token: t || null, insecure: false }
  } catch {
    const map = readTokens()
    const t = map[baseUrl] || null
    return { token: t, insecure: !!t }
  }
}

async function deleteToken(baseUrl: string): Promise<{ insecure: boolean }> {
  try {
    const keytar = await getKeytar()
    await keytar.deletePassword(SERVICE_NAME, baseUrl)
    return { insecure: false }
  } catch {
    const map = readTokens()
    delete map[baseUrl]
    writeTokens(map)
    return { insecure: true }
  }
}

export async function initCanvas(config: { token?: string; baseUrl?: string; verbose?: boolean }): Promise<{ insecure: boolean }> {
  currentBaseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
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

export async function listDueAssignments(opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) {
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

export async function listCourseModulesGql(courseId: string | number, first = 20, itemsFirst = 50) {
  return ensureClient().listCourseModulesGql(courseId, first, itemsFirst)
}

export async function listUpcoming(opts?: { onlyActiveCourses?: boolean }) {
  return ensureClient().listUpcoming({ onlyActiveCourses: opts?.onlyActiveCourses })
}

export async function listTodo() {
  return ensureClient().listTodo()
}

export async function getMySubmission(courseId: string | number, assignmentRestId: string | number) {
  return ensureClient().getMySubmission(courseId, assignmentRestId)
}

export async function listCoursePages(courseId: string | number, perPage = 100) {
  return ensureClient().listCoursePages(courseId, perPage)
}
export async function getCoursePage(courseId: string | number, slugOrUrl: string) {
  return ensureClient().getCoursePage(courseId, slugOrUrl)
}
export async function getAssignmentRest(courseId: string | number, assignmentRestId: string | number) {
  return ensureClient().getAssignmentRest(courseId, assignmentRestId)
}
export async function getFile(fileId: string | number) {
  return ensureClient().getFile(fileId)
}

export async function getFileBytes(fileId: string | number) {
  return ensureClient().getFileBytes(fileId)
}
