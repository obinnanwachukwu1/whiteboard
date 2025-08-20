import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
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
  getFileBytes: (fileId: string | number) => ipcRenderer.invoke('canvas:getFileBytes', fileId),
  listAssignmentsWithSubmission: (courseId: string | number, perPage?: number) => ipcRenderer.invoke('canvas:listAssignmentsWithSubmission', courseId, perPage),
  listAssignmentGroups: (courseId: string | number, includeAssignments?: boolean) => ipcRenderer.invoke('canvas:listAssignmentGroups', courseId, includeAssignments),
  listMyEnrollmentsForCourse: (courseId: string | number) => ipcRenderer.invoke('canvas:listMyEnrollmentsForCourse', courseId),
  listCourseTabs: (courseId: string | number, includeExternal?: boolean) => ipcRenderer.invoke('canvas:listCourseTabs', courseId, includeExternal),
})

contextBridge.exposeInMainWorld('settings', {
  get: () => ipcRenderer.invoke('config:get'),
  set: (partial: Partial<{ baseUrl: string; verbose?: boolean; theme?: 'light' | 'dark'; prefetchEnabled?: boolean; sidebar?: { hiddenCourseIds?: Array<string | number>; customNames?: Record<string, string>; order?: Array<string | number> } }>) => ipcRenderer.invoke('config:set', partial),
})

// Platform helpers + body class for macOS styling hooks
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
})

// Tag the <html> or <body> so renderer CSS can adjust spacing for traffic lights
try {
  if (process.platform === 'darwin') {
    const el = document.documentElement || document.body
    el.classList.add('mac')
  }
} catch {}
