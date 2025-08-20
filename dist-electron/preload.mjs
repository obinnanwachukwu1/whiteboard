"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("canvas", {
  init: (cfg) => electron.ipcRenderer.invoke("canvas:init", cfg),
  clearToken: (baseUrl) => electron.ipcRenderer.invoke("canvas:clearToken", baseUrl),
  getProfile: () => electron.ipcRenderer.invoke("canvas:getProfile"),
  listCourses: (opts) => electron.ipcRenderer.invoke("canvas:listCourses", opts),
  listDueAssignments: (opts) => electron.ipcRenderer.invoke("canvas:listDueAssignments", opts),
  listCourseAssignments: (courseId, first) => electron.ipcRenderer.invoke("canvas:listCourseAssignments", courseId, first),
  listCourseModulesGql: (courseId, first, itemsFirst) => electron.ipcRenderer.invoke("canvas:listCourseModulesGql", courseId, first, itemsFirst),
  listUpcoming: (opts) => electron.ipcRenderer.invoke("canvas:listUpcoming", opts),
  listTodo: () => electron.ipcRenderer.invoke("canvas:listTodo"),
  getMySubmission: (courseId, assignmentRestId) => electron.ipcRenderer.invoke("canvas:getMySubmission", courseId, assignmentRestId),
  listCoursePages: (courseId, perPage) => electron.ipcRenderer.invoke("canvas:listCoursePages", courseId, perPage),
  getCoursePage: (courseId, slugOrUrl) => electron.ipcRenderer.invoke("canvas:getCoursePage", courseId, slugOrUrl),
  getAssignmentRest: (courseId, assignmentRestId) => electron.ipcRenderer.invoke("canvas:getAssignmentRest", courseId, assignmentRestId),
  getFile: (fileId) => electron.ipcRenderer.invoke("canvas:getFile", fileId),
  getFileBytes: (fileId) => electron.ipcRenderer.invoke("canvas:getFileBytes", fileId),
  listAssignmentsWithSubmission: (courseId, perPage) => electron.ipcRenderer.invoke("canvas:listAssignmentsWithSubmission", courseId, perPage),
  listAssignmentGroups: (courseId, includeAssignments) => electron.ipcRenderer.invoke("canvas:listAssignmentGroups", courseId, includeAssignments),
  listMyEnrollmentsForCourse: (courseId) => electron.ipcRenderer.invoke("canvas:listMyEnrollmentsForCourse", courseId),
  listCourseTabs: (courseId, includeExternal) => electron.ipcRenderer.invoke("canvas:listCourseTabs", courseId, includeExternal)
});
electron.contextBridge.exposeInMainWorld("settings", {
  get: () => electron.ipcRenderer.invoke("config:get"),
  set: (partial) => electron.ipcRenderer.invoke("config:set", partial)
});
electron.contextBridge.exposeInMainWorld("platform", {
  isMac: process.platform === "darwin"
});
try {
  if (process.platform === "darwin") {
    const el = document.documentElement || document.body;
    el.classList.add("mac");
  }
} catch {
}
