import { ipcMain } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CanvasError,
  clearToken,
  getProfile as canvasGetProfile,
  getRateLimitSnapshot as canvasGetRateLimitSnapshot,
  getAssignmentRest as svcGetAssignmentRest,
  getAnnouncement as svcGetAnnouncement,
  getConversation as svcGetConversation,
  getCourseFrontPage as svcGetCourseFrontPage,
  getCourseInfo as svcGetCourseInfo,
  getCourseModuleItem as svcGetCourseModuleItem,
  getCoursePage as svcGetCoursePage,
  getCourseQuiz as svcGetCourseQuiz,
  getDiscussion as svcGetDiscussion,
  getDiscussionView as svcGetDiscussionView,
  getFile as svcGetFile,
  initCanvas,
  listAccountNotifications as svcListAccountNotifications,
  listAssignmentGroups as svcListAssignmentGroups,
  listAssignmentsWithSubmission as svcListAssignmentsWithSubmission,
  listConversations as svcListConversations,
  listCourseAnnouncements as svcListCourseAnnouncements,
  listCourseAnnouncementsPage as svcListCourseAnnouncementsPage,
  listCourseAssignments as canvasListCourseAssignments,
  listCourseDiscussions as svcListCourseDiscussions,
  listCourseFiles as svcListCourseFiles,
  listCourseFolders as svcListCourseFolders,
  listCourseGroups as svcListCourseGroups,
  listCourseModulesGql as svcListCourseModulesGql,
  listCoursePages as svcListCoursePages,
  listCourseQuizzes as svcListCourseQuizzes,
  listCourseTabs as svcListCourseTabs,
  listCourseUsers as svcListCourseUsers,
  listCourses as canvasListCourses,
  listDueAssignments as canvasListDue,
  listFolderFiles as svcListFolderFiles,
  listGroupUsers as svcListGroupUsers,
  listMyEnrollmentsForCourse as svcListMyEnrollmentsForCourse,
  listMyGroups as svcListMyGroups,
  listTodo as svcListTodo,
  listUpcoming as svcListUpcoming,
  getUnreadCount as svcGetUnreadCount,
  markDiscussionEntriesRead as svcMarkDiscussionEntriesRead,
  postDiscussionEntry as svcPostDiscussionEntry,
  postDiscussionReply as svcPostDiscussionReply,
  resolveUrl as svcResolveUrl,
  searchRecipients as svcSearchRecipients,
  submitAssignment as svcSubmitAssignment,
  submitAssignmentUpload as svcSubmitAssignmentUpload,
  updateConversation as svcUpdateConversation,
  createConversation as svcCreateConversation,
  addMessage as svcAddMessage,
  deleteConversation as svcDeleteConversation,
  listActivityStream as svcListActivityStream,
  downloadCourseImage as svcDownloadCourseImage,
  downloadFile as svcDownloadFile,
  getMySubmission as svcGetMySubmission,
} from '../canvasClient'
import { DEFAULT_CONFIG, type AppConfig, saveConfig } from '../config'

export type CanvasIpcDeps = {
  getAppConfig: () => AppConfig
  setAppConfig: (next: AppConfig) => void
  uploadFileMap: Map<string, string>
}

export function registerCanvasHandlers(deps: CanvasIpcDeps) {
  const appConfigRef = {
    get current() {
      return deps.getAppConfig()
    },
    set current(next: AppConfig) {
      deps.setAppConfig(next)
    },
  }

  const { uploadFileMap } = deps
  ipcMain.handle(
    'canvas:init',
    async (_evt, cfg: { token?: string; baseUrl?: string; verbose?: boolean }) => {
      try {
        const baseUrl = cfg?.baseUrl || appConfigRef.current.baseUrl
        const verbose = cfg?.verbose ?? appConfigRef.current.verbose
        const res = await initCanvas({ token: cfg?.token, baseUrl, verbose })
        // persist baseUrl / verbose if provided
        appConfigRef.current = await saveConfig({ baseUrl, verbose })
        return { ok: true, insecure: !!res?.insecure }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:clearToken', async (_evt, baseUrl?: string) => {
    try {
      await clearToken(baseUrl)
      return { ok: true }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:getProfile', async () => {
    try {
      const data = await canvasGetProfile()
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:getRateLimit', async () => {
    try {
      const data = await canvasGetRateLimitSnapshot()
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:listCourses', async (_evt, opts?: { enrollment_state?: string }) => {
    try {
      const data = await canvasListCourses(opts)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:listDueAssignments',
    async (_evt, opts?: { days?: number; onlyPublished?: boolean; includeCourseName?: boolean }) => {
      try {
        const data = await canvasListDue(opts)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseAssignments',
    async (_evt, courseId: string | number, first = 200) => {
      try {
        const data = await canvasListCourseAssignments(courseId, first)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseModulesGql',
    async (_evt, courseId: string | number, first = 20, itemsFirst = 50) => {
      try {
        const data = await svcListCourseModulesGql(courseId, first, itemsFirst)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:getCourseModuleItem',
    async (_evt, courseId: string | number, itemId: string | number) => {
      try {
        const data = await svcGetCourseModuleItem(courseId, itemId)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:listUpcoming', async (_evt, opts?: { onlyActiveCourses?: boolean }) => {
    try {
      const data = await svcListUpcoming(opts)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:listTodo', async () => {
    try {
      const data = await svcListTodo()
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:getMySubmission',
    async (
      _evt,
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => {
      try {
        const data = await svcGetMySubmission(courseId, assignmentRestId, include)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:submitAssignment',
    async (
      _evt,
      courseId: string | number,
      assignmentRestId: string | number,
      params: {
        submissionType: 'online_text_entry' | 'online_url' | 'online_upload'
        body?: string
        url?: string
        fileIds?: Array<string | number>
      },
    ) => {
      try {
        const data = await svcSubmitAssignment(courseId, assignmentRestId, params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:submitAssignmentUpload',
    async (
      _evt,
      courseId: string | number,
      assignmentRestId: string | number,
      fileHandles: string[],
    ) => {
      try {
        // Security: Fetch assignment details from Canvas to get authoritative allowed_extensions
        // Do NOT trust the renderer to provide the allowlist.
        const assignment = await svcGetAssignmentRest(courseId, assignmentRestId)
        const allowedRaw = assignment?.allowed_extensions || []
  
        // Normalize allowed extensions: strip dots, lowercase, trim
        const allowedSet = new Set<string>()
        if (Array.isArray(allowedRaw) && allowedRaw.length > 0) {
          for (const ext of allowedRaw) {
            if (typeof ext === 'string') {
              allowedSet.add(ext.trim().toLowerCase().replace(/^\./, ''))
            }
          }
        }
  
        // Resolve handles to paths
        const filePaths: string[] = []
        for (const handle of fileHandles) {
          if (uploadFileMap.has(handle)) {
            const p = uploadFileMap.get(handle)!
  
            // Enforce allowed extensions if restriction exists
            if (allowedSet.size > 0) {
              // Check full extension (e.g. .tar.gz) and simple extension
              const filename = path.basename(p).toLowerCase()
  
              // Check if any allowed extension matches the end of the filename
              // This handles "tar.gz" vs "gz" ambiguity safely
              let matched = false
              for (const allowed of allowedSet) {
                if (filename.endsWith(`.${allowed}`)) {
                  matched = true
                  break
                }
              }
  
              if (!matched) {
                return { ok: false, error: `File type not allowed: ${path.basename(p)}` }
              }
            }
  
            filePaths.push(p)
          } else {
            console.warn(`[Security] Blocked upload of invalid/expired handle: ${handle}`)
            return { ok: false, error: 'File selection expired. Please pick files again.' }
          }
        }
  
        const data = await svcSubmitAssignmentUpload(courseId, assignmentRestId, filePaths)
  
        // Cleanup handles on success
        for (const handle of fileHandles) {
          uploadFileMap.delete(handle)
        }
  
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:listCoursePages', async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListCoursePages(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:getCoursePage',
    async (_evt, courseId: string | number, slugOrUrl: string) => {
      try {
        const data = await svcGetCoursePage(courseId, slugOrUrl)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:getAssignmentRest',
    async (
      _evt,
      courseId: string | number,
      assignmentRestId: string | number,
      include?: string[],
    ) => {
      try {
        const data = await svcGetAssignmentRest(courseId, assignmentRestId, include)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:getFile', async (_evt, fileId: string | number) => {
    try {
      const data = await svcGetFile(fileId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:listAssignmentsWithSubmission',
    async (_evt, courseId: string | number, perPage = 100) => {
      try {
        const data = await svcListAssignmentsWithSubmission(courseId, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listAssignmentGroups',
    async (_evt, courseId: string | number, includeAssignments = false) => {
      try {
        const data = await svcListAssignmentGroups(courseId, includeAssignments)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:listMyEnrollmentsForCourse', async (_evt, courseId: string | number) => {
    try {
      const data = await svcListMyEnrollmentsForCourse(courseId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:listCourseTabs',
    async (_evt, courseId: string | number, includeExternal = true) => {
      try {
        const data = await svcListCourseTabs(courseId, includeExternal)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseQuizzes',
    async (_evt, courseId: string | number, perPage = 100) => {
      try {
        const data = await svcListCourseQuizzes(courseId, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:getCourseQuiz',
    async (_evt, courseId: string | number, quizId: string | number) => {
      try {
        const data = await svcGetCourseQuiz(courseId, quizId)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listActivityStream',
    async (_evt, opts?: { onlyActiveCourses?: boolean; perPage?: number }) => {
      try {
        const data = await svcListActivityStream(opts)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listAccountNotifications',
    async (
      _evt,
      accountId: string | number,
      params?: { includePast?: boolean; includeAll?: boolean; showIsClosed?: boolean },
    ) => {
      try {
        const data = await svcListAccountNotifications(accountId, params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseAnnouncements',
    async (_evt, courseId: string | number, perPage = 50) => {
      try {
        const data = await svcListCourseAnnouncements(courseId, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseAnnouncementsPage',
    async (_evt, courseId: string | number, page = 1, perPage = 10) => {
      try {
        const data = await svcListCourseAnnouncementsPage(courseId, page, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:getCourseInfo', async (_evt, courseId: string | number) => {
    try {
      const data = await svcGetCourseInfo(courseId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:getCourseFrontPage', async (_evt, courseId: string | number) => {
    try {
      const data = await svcGetCourseFrontPage(courseId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:listCourseFiles',
    async (
      _evt,
      courseId: string | number,
      perPage = 100,
      sort: 'name' | 'size' | 'created_at' | 'updated_at' = 'updated_at',
      order: 'asc' | 'desc' = 'desc',
    ) => {
      try {
        const data = await svcListCourseFiles(courseId, perPage, sort, order)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:listCourseFolders',
    async (_evt, courseId: string | number, perPage = 100) => {
      try {
        const data = await svcListCourseFolders(courseId, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:listFolderFiles', async (_evt, folderId: string | number, perPage = 100) => {
    try {
      const data = await svcListFolderFiles(folderId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:listCourseUsers', async (_evt, courseId: string | number, perPage = 100) => {
    try {
      const data = await svcListCourseUsers(courseId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:listCourseGroups',
    async (_evt, courseId: string | number, perPage = 100) => {
      try {
        const data = await svcListCourseGroups(courseId, perPage)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:listMyGroups', async (_evt, contextType?: 'Account' | 'Course') => {
    try {
      const data = await svcListMyGroups(contextType)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:listGroupUsers', async (_evt, groupId: string | number, perPage = 100) => {
    try {
      const data = await svcListGroupUsers(groupId, perPage)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:getAnnouncement',
    async (_evt, courseId: string | number, topicId: string | number) => {
      try {
        const data = await svcGetAnnouncement(courseId, topicId)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  // Discussions
  ipcMain.handle(
    'canvas:listCourseDiscussions',
    async (
      _evt,
      courseId: string | number,
      params?: {
        perPage?: number
        searchTerm?: string
        filterBy?: 'all' | 'unread'
        scope?: 'locked' | 'unlocked' | 'pinned' | 'unpinned'
        orderBy?: 'position' | 'recent_activity' | 'title'
        maxPages?: number
      },
    ) => {
      try {
        // Validate inputs
        const safeParams = { ...params }
  
        // Clamp perPage
        if (safeParams.perPage !== undefined) {
          const p = Number(safeParams.perPage)
          if (!Number.isFinite(p) || p < 1 || p > 100) {
            safeParams.perPage = 50
          } else {
            safeParams.perPage = p
          }
        }
  
        // Validate maxPages
        if (safeParams.maxPages !== undefined) {
          const m = Number(safeParams.maxPages)
          if (!Number.isFinite(m) || m < 1) {
            delete safeParams.maxPages
          } else {
            // Cap maxPages to prevent abuse (e.g. 10 pages max)
            safeParams.maxPages = Math.min(m, 10)
          }
        }
  
        // Validate filterBy
        if (
          safeParams.filterBy &&
          safeParams.filterBy !== 'all' &&
          safeParams.filterBy !== 'unread'
        ) {
          delete safeParams.filterBy
        }
  
        // Validate scope
        const allowedScopes = ['locked', 'unlocked', 'pinned', 'unpinned']
        if (safeParams.scope && !allowedScopes.includes(safeParams.scope)) {
          delete safeParams.scope
        }
  
        // Validate orderBy
        const allowedOrder = ['position', 'recent_activity', 'title']
        if (safeParams.orderBy && !allowedOrder.includes(safeParams.orderBy)) {
          delete safeParams.orderBy
        }
  
        // Trim searchTerm and treat empty/whitespace as undefined
        if (safeParams.searchTerm) {
          safeParams.searchTerm = String(safeParams.searchTerm).trim()
          if (!safeParams.searchTerm) delete safeParams.searchTerm
        }
  
        const data = await svcListCourseDiscussions(courseId, safeParams)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:getDiscussion',
    async (_evt, courseId: string | number, topicId: string | number) => {
      try {
        const data = await svcGetDiscussion(courseId, topicId)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:getDiscussionView',
    async (_evt, courseId: string | number, topicId: string | number) => {
      try {
        const data = await svcGetDiscussionView(courseId, topicId)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:postDiscussionEntry',
    async (_evt, courseId: string | number, topicId: string | number, message: string) => {
      try {
        const data = await svcPostDiscussionEntry(courseId, topicId, message)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:postDiscussionReply',
    async (
      _evt,
      courseId: string | number,
      topicId: string | number,
      entryId: string | number,
      message: string,
    ) => {
      try {
        const data = await svcPostDiscussionReply(courseId, topicId, entryId, message)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:markDiscussionEntriesRead',
    async (
      _evt,
      courseId: string | number,
      topicId: string | number,
      entryIds: (string | number)[],
    ) => {
      try {
        const data = await svcMarkDiscussionEntriesRead(courseId, topicId, entryIds)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:getFileBytes', async (_evt, fileId: string | number) => {
    try {
      // Return path instead of bytes, prefixed with custom protocol
      const path = await svcDownloadFile(fileId)
      // Encode the path for the URL using pathToFileURL to handle special chars and platform specific syntax
      const url = pathToFileURL(path)
        .toString()
        .replace(/^file:/, 'canvas-file:')
      return { ok: true, data: url }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:cacheCourseImage', async (_evt, courseId: string | number, url: string) => {
    try {
      if (appConfigRef.current?.privateModeEnabled) {
        return { ok: false, error: 'Private Mode is enabled' }
      }
      const normalizeHosts = (list: string[]) =>
        list.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
      const hostAllowed = (host: string, allowHosts: string[]) =>
        allowHosts.some((entry) => host === entry || host.endsWith(`.${entry}`))
  
      const isPrivateHost = (host: string) => {
        if (host === 'localhost' || host === '::1') return true
        if (/^127\./.test(host)) return true
        if (/^10\./.test(host)) return true
        if (/^192\.168\./.test(host)) return true
        if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
        if (/^169\.254\./.test(host)) return true
        if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:'))
          return true
        return false
      }
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return { ok: false, error: 'Invalid URL' }
      }
      if (parsed.protocol !== 'https:') {
        return { ok: false, error: 'Only https URLs are allowed' }
      }
      if (isPrivateHost(parsed.hostname)) {
        return { ok: false, error: 'Private network URLs are not allowed' }
      }
      const defaults = ['inscloudgate.net']
      const cfgList = Array.isArray(appConfigRef.current?.courseImageAllowlist)
        ? appConfigRef.current.courseImageAllowlist
        : []
      const envList =
        process.env.WB_COURSE_IMAGE_ALLOWLIST?.split(',').map((v) => v.trim()).filter(Boolean) || []
      let baseHost = ''
      try {
        baseHost = new URL(appConfigRef.current?.baseUrl || DEFAULT_CONFIG.baseUrl).hostname
      } catch {}
      const allowHosts = Array.from(
        new Set(normalizeHosts([...defaults, ...cfgList, ...envList, baseHost].filter(Boolean))),
      )
      if (!allowHosts.length) {
        return { ok: false, error: 'No allowed hosts configured for course images' }
      }
      if (!hostAllowed(parsed.hostname.toLowerCase(), allowHosts)) {
        return { ok: false, error: 'Image host is not in allowlist' }
      }
      const path = await svcDownloadCourseImage(courseId, url, { allowHosts })
      const fileUrl = pathToFileURL(path)
        .toString()
        .replace(/^file:/, 'canvas-file:')
      return { ok: true, data: fileUrl }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  // Conversations (Inbox)
  ipcMain.handle(
    'canvas:listConversations',
    async (
      _evt,
      params?: { scope?: 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'; perPage?: number },
    ) => {
      try {
        const data = await svcListConversations(params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:getConversation', async (_evt, conversationId: string | number) => {
    try {
      const data = await svcGetConversation(conversationId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle('canvas:getUnreadCount', async () => {
    try {
      const data = await svcGetUnreadCount()
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:createConversation',
    async (
      _evt,
      params: {
        recipients: string[]
        subject?: string
        body: string
        groupConversation?: boolean
        contextCode?: string
      },
    ) => {
      try {
        const data = await svcCreateConversation(params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:addMessage',
    async (_evt, conversationId: string | number, body: string, includedMessages?: string[]) => {
      try {
        const data = await svcAddMessage(conversationId, body, includedMessages)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle(
    'canvas:updateConversation',
    async (
      _evt,
      conversationId: string | number,
      params: {
        workflowState?: 'read' | 'unread' | 'archived'
        starred?: boolean
        subscribed?: boolean
      },
    ) => {
      try {
        const data = await svcUpdateConversation(conversationId, params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:deleteConversation', async (_evt, conversationId: string | number) => {
    try {
      const data = await svcDeleteConversation(conversationId)
      return { ok: true, data }
    } catch (e: any) {
      const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
      return { ok: false, error: msg }
    }
  })
  
  ipcMain.handle(
    'canvas:searchRecipients',
    async (
      _evt,
      params: {
        search: string
        context?: string
        type?: 'user' | 'context'
        perPage?: number
      },
    ) => {
      try {
        const data = await svcSearchRecipients(params)
        return { ok: true, data }
      } catch (e: any) {
        const msg = e instanceof CanvasError ? e.message : String(e?.message || e)
        return { ok: false, error: msg }
      }
    },
  )
  
  ipcMain.handle('canvas:resolveUrl', async (_evt, url: string) => {
    try {
      if (!url.startsWith('http')) return { ok: false, error: 'Invalid URL' }
      const target = new URL(url)
      const base = new URL((appConfigRef.current?.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/$/, ''))
      if (target.origin !== base.origin) {
        // Never resolve non-Canvas origins in main; avoid leaking auth on redirects.
        return { ok: true, data: url }
      }
  
      const data = await svcResolveUrl(url)
      return { ok: true, data }
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) }
    }
  })
  
}
