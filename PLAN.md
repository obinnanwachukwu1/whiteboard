# Improvement Plan for Canvas LMS Desktop Client

This document outlines the roadmap for hardening security, improving performance, and enhancing code quality for the Canvas LMS Desktop Client.

## Phase 1: Security Hardening (High Priority) 🚨 - **COMPLETE** ✅

The immediate goal is to reduce the application's attack surface and prevent Cross-Site Scripting (XSS) or Remote Code Execution (RCE) vulnerabilities.

### 1.1 Secure IPC Exposure - **DONE**
- **Task**: Remove the generic `ipcRenderer` exposure in `electron/preload.ts`.
- **Reasoning**: Exposing raw `send`/`on`/`invoke` methods allows a compromised renderer (e.g., via XSS in a course page) to send arbitrary messages to the main process.
- **Action**:
  - Remove `contextBridge.exposeInMainWorld('ipcRenderer', ...)` from `preload.ts`.
  - Ensure all communication goes through the specific, typed `canvas` and `settings` bridges.

### 1.2 Harden BrowserWindow Configuration - **DONE**
- **Task**: Update `electron/main.ts` to strictly configure the `BrowserWindow`.
- **Reasoning**: Electron defaults can be permissive. We need to explicitly disable Node integration and enable context isolation (which is already default in newer Electron but should be explicit).
- **Action**:
  - Set `nodeIntegration: false`.
  - Set `contextIsolation: true`.
  - Set `sandbox: true`.
  - Add a handler for `webContents.setWindowOpenHandler` to prevent new windows from spawning unexpectedly.

### 1.3 Sanitize External Content - **DONE**
- **Task**: Review and harden `HtmlContent.tsx` and `FileViewer.tsx`.
- **Reasoning**: The app renders HTML from Canvas courses and Markdown/Office files. This is a primary vector for XSS.
- **Action**:
  - Tighten `dompurify` config in `HtmlContent.tsx` (disable `ALLOW_UNKNOWN_PROTOCOLS` if possible, restrict `iframe` sources).
  - Ensure `marked` (Markdown) output is sanitized **before** injection.

### 1.4 Secure External Link Opening - **DONE**
- **Task**: Validate URLs before passing them to `shell.openExternal`.
- **Reasoning**: A malicious link could theoretically trigger system commands or protocol handlers.
- **Action**:
  - In `electron/main.ts` (handle `app:openExternal`), check that the URL protocol is `http:` or `https:`.
  - Reject `file:`, `javascript:`, or other protocols.

---

## Phase 2: Performance & Architecture ⚡

Focus on application responsiveness and memory usage, particularly for large files and the main dashboard.

### 2.1 Optimize File Downloads - **DONE** ✅
- **Task**: Change how files are viewed/downloaded.
- **Reasoning**: Currently, `getFileBytes` pulls the entire file into RAM (Node.js buffer) -> IPC -> Renderer RAM (ArrayBuffer). This crashes or lags on large files.
- **Action**:
  - Update `canvasClient.ts` to stream the download to a temporary file on disk.
  - Return the file path (or a `canvas-file://` protocol URL) to the renderer.
  - Renderer loads the file from the local path/URL instead of a memory buffer.

### 2.2 Code Splitting for Heavy Viewers - **DONE** ✅
- **Task**: Lazy load heavy dependencies in `FileViewer.tsx`.
- **Reasoning**: `xlsx`, `docx-preview`, `pdfjs-dist`, and `marked` are large libraries. Loading them all at startup slows down the app.
- **Action**:
  - Use `React.lazy` or dynamic `import()` for the specific viewer components.
  - Only load `xlsx` when the user actually opens a spreadsheet.

### 2.3 Refactor Dashboard Component - **DONE** ✅
- **Task**: Break `Dashboard.tsx` into smaller components.
- **Reasoning**: The file is ~500 lines and handles data fetching, rendering, and logic.
- **Action**:
  - Create `src/components/dashboard/CourseCard.tsx`.
  - Create `src/components/dashboard/AssignmentList.tsx`.
  - Create `src/components/dashboard/AnnouncementList.tsx`.
  - Move complex data transformation logic into custom hooks (`useDashboardData`, `useCourseImages`).

---

## Phase 3: Quality of Life & Maintainability 🧹

Focus on code health, testing, and accessibility.

### 3.1 Type Safety
- **Task**: Reduce usage of `any`.
- **Reasoning**: There are ~270 usages of `any` which defeats the purpose of TypeScript.
- **Action**:
  - Define proper Zod schemas for IPC responses where missing.
  - Replace `any` in `useCanvasQueries.ts` with strict types.

### 3.2 Accessibility (a11y)
- **Task**: Improve semantic HTML.
- **Reasoning**: Many interactive elements are `div`s with `onClick`.
- **Action**:
  - Replace interactive `div`s with `<button>` or standard anchor tags.
  - Ensure focus states are visible.
  - Verify keyboard navigation works for the main dashboard grid.

### 3.3 Unit Testing
- **Task**: Add tests for critical logic.
- **Reasoning**: Minimal test coverage exists.
- **Action**:
  - Add unit tests for `src/utils/gradeCalc.ts` (grade calculation is critical).
  - Add unit tests for `src/hooks/useCanvasQueries.ts` (mocking the IPC layer).
