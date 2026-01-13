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

---

## Phase 4: New Features 🚀

Three major features to implement:

1. **Inbox** - Conversations with compose/reply, accessed via mail icon in header (slide-over panel)
2. **Groups** - Integrated into the People tab
3. **Global Search** - Fuzzy search with Cmd+K, extensible for AI later

---

### 4.1 Groups in People Tab

**Priority:** High (easiest, quick win)
**Estimated Time:** 30-45 minutes

#### Goal
Add a "My Groups" section at the top of the People tab showing course groups the user belongs to.

#### Canvas API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/courses/:id/groups` | List all groups in a course |
| `GET` | `/users/self/groups` | List groups current user belongs to |
| `GET` | `/groups/:id/users` | Get members of a specific group |

#### Files to Modify

**Electron Layer:**
- `electron/canvasClient.ts` - Add methods:
  - `listCourseGroups(courseId, perPage)`
  - `listMyGroups(contextType?)`
  - `listGroupUsers(groupId, perPage)`
- `electron/main.ts` - Add IPC handlers
- `electron/preload.ts` - Expose methods

**Types:**
- `src/types/canvas.ts` - Add `CanvasGroup` type
- `src/vite-env.d.ts` - Add type declarations

**Hooks:**
- `src/hooks/useCanvasQueries.ts` - Add hooks

**Components:**
- `src/components/CoursePeople.tsx` - Modify to add Groups section at top

#### Implementation Checklist
- [ ] Add Canvas client methods for groups
- [ ] Add IPC handlers in `main.ts`
- [ ] Expose in `preload.ts`
- [ ] Add `CanvasGroup` type
- [ ] Add type declarations to `vite-env.d.ts`
- [ ] Add hooks: `useCourseGroups`, `useMyGroups`
- [ ] Modify `CoursePeople.tsx` to fetch and display groups
- [ ] Add collapsible group cards with member preview
- [ ] Add prefetching for groups data

---

### 4.2 Global Search (Fuzzy, Extensible)

**Priority:** High
**Estimated Time:** 1-2 hours

#### Goal
Implement Cmd+K global search across all courses with fuzzy matching. Architecture should be extensible for future AI/embedding-based search.

#### Library
**FlexSearch** - Fast, memory-efficient, handles large datasets well.

```bash
pnpm add flexsearch
```

#### Searchable Content

| Type | Source Cache Key | Fields to Index |
|------|------------------|-----------------|
| Courses | `courses` | name, course_code |
| Assignments | `course-assignments` | name |
| Announcements | `course-announcements` | title |
| Files | `course-files` | display_name |
| Modules | `course-modules` | name, item titles |

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SearchManager                            │
├─────────────────────────────────────────────────────────────┤
│  - providers: SearchProvider[]                               │
│  - search(query): Promise<SearchResult[]>                    │
│  - addProvider(provider)                                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ FuzzyProvider   │ │ EmbeddingProvider│ │ Future Provider │
│ (FlexSearch)    │ │ (Future - AI)    │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

#### Files to Create
- `src/utils/searchIndex.ts` - SearchManager and FuzzySearchProvider
- `src/components/SearchModal.tsx` - Cmd+K search modal UI
- `src/hooks/useGlobalSearch.ts` - React hook for search

#### Files to Modify
- `src/routes/RootLayout.tsx` - Add Cmd+K keyboard listener, index building
- `src/components/Header.tsx` - Add search icon

#### Search Index Building Strategy
**Build in background after startup:**
1. App starts, shows UI immediately
2. After initial render + 2 second delay, start building index
3. Index builds incrementally from React Query cache
4. Search available once index is ready (show loading state if searched before ready)

#### Implementation Checklist
- [ ] Install FlexSearch: `pnpm add flexsearch`
- [ ] Create `src/utils/searchIndex.ts` with SearchManager
- [ ] Create `src/hooks/useGlobalSearch.ts`
- [ ] Create `src/components/SearchModal.tsx` with keyboard navigation
- [ ] Add Cmd+K listener in `RootLayout.tsx`
- [ ] Add search icon to `Header.tsx`
- [ ] Wire up navigation on result selection

---

### 4.3 Inbox / Conversations

**Priority:** High
**Estimated Time:** 2-3 hours

#### Goal
Add messaging capability via a slide-over panel accessible from a mail icon in the header. Support viewing, composing, and replying to conversations.

#### Canvas API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/conversations` | List conversations (paginated) |
| `GET` | `/conversations/unread_count` | Get unread count for badge |
| `GET` | `/conversations/:id` | Get full conversation with messages |
| `POST` | `/conversations` | Create new conversation |
| `POST` | `/conversations/:id/add_message` | Reply to conversation |
| `PUT` | `/conversations/:id` | Mark read/unread/archived, star |
| `GET` | `/search/recipients` | Find users/courses/groups to message |

#### Files to Create

**Components:**
- `src/components/InboxButton.tsx` - Header mail icon with unread badge
- `src/components/InboxPanel.tsx` - Slide-over panel container
- `src/components/ConversationList.tsx` - List of conversations
- `src/components/ConversationThread.tsx` - Message thread view
- `src/components/ComposeMessage.tsx` - New message / reply form
- `src/components/RecipientPicker.tsx` - Searchable recipient selector

#### Files to Modify

**Electron Layer:**
- `electron/canvasClient.ts` - Add conversation methods
- `electron/main.ts` - Add IPC handlers
- `electron/preload.ts` - Expose methods

**Types:**
- `src/types/canvas.ts` - Add Conversation, Message, Recipient types
- `src/vite-env.d.ts` - Add type declarations

**Hooks:**
- `src/hooks/useCanvasQueries.ts` - Add query hooks
- `src/hooks/useCanvasMutations.ts` (new) - Add mutation hooks

**Layout:**
- `src/components/Header.tsx` - Add InboxButton
- `src/routes/RootLayout.tsx` - Add InboxPanel state management

#### UI Design

**Slide-over Panel:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Inbox                                    [+ Compose]  [✕]      │
├──────────────────────────────────────────────────────────────────┤
│  [All] [Unread] [Starred] [Sent] [Archived]                     │
├─────────────────────────┬────────────────────────────────────────┤
│  ● Dr. Smith       2h   │  Re: Question about HW3               │
│    Re: Question ab...   │  ─────────────────────────────         │
│  ○ Study Group     1d   │  Dr. Smith • 2 hours ago              │
│    Meeting tomorrow     │  The answer is 42.                     │
│                         ├────────────────────────────────────────┤
│                         │  [Type a reply...]           [Send]   │
└─────────────────────────┴────────────────────────────────────────┘
```

#### Implementation Checklist

**Phase 1: Read-only + Reply**
- [ ] Add Canvas client methods for conversations
- [ ] Add IPC handlers in `main.ts`
- [ ] Expose in `preload.ts`
- [ ] Add types to `canvas.ts` and `vite-env.d.ts`
- [ ] Add query hooks
- [ ] Create `InboxButton.tsx` with unread badge
- [ ] Create `InboxPanel.tsx` slide-over container
- [ ] Create `ConversationList.tsx`
- [ ] Create `ConversationThread.tsx`
- [ ] Add reply functionality
- [ ] Add to `Header.tsx`
- [ ] Add panel state to `RootLayout.tsx`

**Phase 2: Compose New Messages**
- [ ] Add `searchRecipients` to Canvas client
- [ ] Add `useRecipientSearch` hook
- [ ] Create `RecipientPicker.tsx`
- [ ] Create `ComposeMessage.tsx`
- [ ] Add `useCreateConversation` mutation

**Phase 3: Polish**
- [ ] Mark as read/unread functionality
- [ ] Star/unstar functionality
- [ ] Archive functionality
- [ ] Conversation filtering
- [ ] Loading states and error handling
- [ ] Prefetching for unread count

---

### Implementation Order

**Recommended sequence:**

1. **Groups in People Tab** (~45 min) - Quick win
2. **Global Search** (~1.5 hours) - High value
3. **Inbox Read-only** (~1.5 hours) - Core messaging
4. **Inbox Compose/Reply** (~1 hour) - Full messaging

---

### Future Enhancements

**Search:**
- [ ] AI/Embedding-based semantic search (Transformers.js or OpenAI)
- [ ] Search within file contents (PDFs, docs)
- [ ] Recent searches history
- [ ] Search filters (by course, type, date)

**Inbox:**
- [ ] Desktop notifications for new messages
- [ ] Attachment support
- [ ] Message drafts (auto-save)
- [ ] Bulk actions

**Groups:**
- [ ] Group discussion links
- [ ] Group file access

---

### Dependencies to Add

```bash
pnpm add flexsearch
```
