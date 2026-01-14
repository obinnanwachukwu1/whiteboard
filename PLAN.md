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

## Phase 5: Dashboard Redesign 🎯

Transform the dashboard from a redundant content dump into a **smart command center** that answers: "What should I focus on right now?"

### 5.1 Problem Statement

**Current issues:**
- StatCards (Due/Courses/Avg Grade) are redundant — info is either obvious or available elsewhere
- Assignment/Announcement lists replicate dedicated tabs
- Course grid duplicates sidebar functionality
- No prioritization — everything is equally weighted
- Vertical layout wastes horizontal space

**User needs:**
- See the most important things at a glance
- Understand *why* something matters (grade impact, urgency)
- Discover things they might not know about (new announcements)
- Two-column scanning (left-to-right), not vertical scrolling

---

### 5.2 New Dashboard Layout

**Two-column layout: 60% Priority / 40% Activity**

```
┌──────────────────── 60% ────────────────────┬───────── 40% ─────────┐
│ 🎯 Priority                    [7 days ▾]   │ 📌 Activity           │
│                                             │                       │
│ [●] Midterm Exam                            │ 📣 Week 5 Recap  [✓]  │
│     CS 101 · 2 days · High stakes           │    BIO 150 · 2h ago   │
│                                             │                       │
│ [●] Lab Report 3                            │ 📅 Office Hours       │
│     CHEM 101 · 3 days · 8% of grade         │    CS 101 · Tmrw 2pm  │
│                                             │                       │
│ [●] Problem Set 5                           │ 📣 Lab Rescheduled    │
│     MATH 200 · 5 days · 15 pts              │    CHEM 101 · 5h ago  │
│                                             │                       │
│ [●] Reading Response                        │ 📅 Quiz 3             │
│     BIO 150 · 6 days · 10 pts               │    MATH · Thu 10am    │
│                                             │                       │
│ [●] Homework 7                              │                       │
│     CS 101 · 7 days · 5 pts                 │                       │
│                                             │                       │
│  ▸ 2 more due later                         │                       │
└─────────────────────────────────────────────┴───────────────────────┘
```

---

### 5.3 Section Specifications

#### Left Column: Priority (60%)

**Purpose:** Top 5 assignments ranked by smart priority score

**Priority Score Formula:**
```
priority = (effectiveWeight × urgencyMultiplier) + statusWeight

Where:
- effectiveWeight = assignment's % of final grade (0-100)
- urgencyMultiplier = 3 (≤24h), 2 (≤48h), 1.5 (≤72h), 1 (>72h)
- statusWeight = 0 if submitted, 100 if not submitted
```

**Display per item:**
| Element | Description |
|---------|-------------|
| Course avatar | Color dot or image from course |
| Title | Assignment name (truncated if needed) |
| Course + Time | "CS 101 · 2 days" |
| Weight indicator | Contextual text based on impact |

**Weight Display Logic:**
| Effective Weight | Display |
|------------------|---------|
| ≥15% | **"High stakes"** (emphasized) |
| 5-14% | "X% of grade" |
| <5% | Just show points: "15 pts" |

**"Also Due" (Collapsed):**
- Single line below priority items
- Shows count of items beyond selected time horizon
- Format: "▸ 2 more due later"
- Expandable on click to show list

**Time Horizon Dropdown:**
- Located in section header: `[7 days ▾]`
- Options: 3 days, 7 days, 14 days, 30 days
- Persisted to localStorage

---

#### Right Column: Activity (40%)

**Purpose:** Mixed feed of announcements and calendar events

**Content types:**
| Type | Icon | Source |
|------|------|--------|
| Announcement | 📣 | Activity stream (type: Announcement) |
| Calendar Event | 📅 | `/users/self/upcoming_events` |
| Discussion Reply | 💬 | Future: Activity stream (type: DiscussionTopic) |

**Display per item:**
| Element | Description |
|---------|-------------|
| Type icon | 📣, 📅, or 💬 |
| Title | Announcement title or event name |
| Course + Time | "BIO 150 · 2h ago" or "CS 101 · Tomorrow 2pm" |
| Mark as read | [✓] button for announcements |

**Mark as Read Feature:**
- Click [✓] to mark announcement as read
- Stored in localStorage: `whiteboard:read-announcements` (array of IDs)
- Read announcements hidden from dashboard
- Still visible (grayed out) on `/announcements` page

**Empty State:**
- "All caught up! ✨" when no unread announcements and no upcoming events

---

### 5.4 Components to Remove

| Component | Action |
|-----------|--------|
| `src/components/dashboard/StatCards.tsx` | **Delete** |
| `src/components/dashboard/AssignmentList.tsx` | Keep (used elsewhere), remove from Dashboard |
| `src/components/dashboard/AnnouncementList.tsx` | Keep (used elsewhere), remove from Dashboard |
| `src/components/dashboard/CourseCard.tsx` | Keep (potential reuse), remove from Dashboard |
| Course grid in `Dashboard.tsx` | Remove |

---

### 5.5 Files to Create

#### Utilities

| File | Purpose |
|------|---------|
| `src/utils/assignmentWeight.ts` | Calculate effective % of grade for an assignment |
| `src/utils/priorityScore.ts` | Calculate priority score for ranking |
| `src/utils/readAnnouncements.ts` | localStorage helpers for marking announcements read |

#### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/usePriorityAssignments.ts` | Fetch + rank top N assignments by priority |
| `src/hooks/useUpcomingEvents.ts` | Fetch calendar events via `listUpcoming()` |
| `src/hooks/useUnreadAnnouncements.ts` | Filter announcements excluding read ones |
| `src/hooks/useDashboardSettings.ts` | Time horizon preference (localStorage) |
| `src/hooks/useActivityFeed.ts` | Merge announcements + events into unified feed |

#### Components

| File | Purpose |
|------|---------|
| `src/components/dashboard/PriorityList.tsx` | Left column container |
| `src/components/dashboard/PriorityItem.tsx` | Single priority row |
| `src/components/dashboard/AlsoDue.tsx` | Collapsible "X more due later" section |
| `src/components/dashboard/ActivityPanel.tsx` | Right column container |
| `src/components/dashboard/ActivityItem.tsx` | Single activity row (announcement or event) |
| `src/components/dashboard/TimeHorizonDropdown.tsx` | Dropdown for time filter |

---

### 5.6 Files to Modify

| File | Changes |
|------|---------|
| `src/components/Dashboard.tsx` | Complete rewrite with two-column layout |
| `src/hooks/useDashboardData.ts` | Simplify — remove course grid logic, add priority calculation |
| `src/routes/AnnouncementsPage.tsx` | Show read announcements as grayed out |
| `src/routes/SettingsPage.tsx` | Add Dashboard section with default time horizon |

---

### 5.7 Canvas API Usage

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /users/self/upcoming_events` | Calendar events | ✅ Already implemented in `canvasClient.ts` |
| `GET /users/self/activity_stream` | Announcements | ✅ Already implemented |
| `GET /courses/:id/assignment_groups` | Grade weights | ✅ Already implemented |
| `GET /courses/:id/assignments` | Assignment data | ✅ Already implemented |

No new API endpoints needed.

---

### 5.8 Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop (≥1024px) | Two columns: 60/40 |
| Tablet (768-1023px) | Two columns: 55/45 |
| Mobile (<768px) | Single column, Priority stacked above Activity |

---

### 5.9 Implementation Checklist

**Phase 1: Utilities & Data Layer**
- [ ] Create `src/utils/assignmentWeight.ts` - Calculate effective weight
- [ ] Create `src/utils/priorityScore.ts` - Priority ranking algorithm
- [ ] Create `src/utils/readAnnouncements.ts` - localStorage helpers
- [ ] Create `src/hooks/useDashboardSettings.ts` - Time horizon state
- [ ] Create `src/hooks/useUpcomingEvents.ts` - Calendar events hook
- [ ] Create `src/hooks/useUnreadAnnouncements.ts` - Filtered announcements
- [ ] Create `src/hooks/usePriorityAssignments.ts` - Ranked assignments
- [ ] Create `src/hooks/useActivityFeed.ts` - Merged activity feed

**Phase 2: UI Components**
- [ ] Create `src/components/dashboard/PriorityItem.tsx`
- [ ] Create `src/components/dashboard/PriorityList.tsx`
- [ ] Create `src/components/dashboard/AlsoDue.tsx`
- [ ] Create `src/components/dashboard/ActivityItem.tsx`
- [ ] Create `src/components/dashboard/ActivityPanel.tsx`
- [ ] Create `src/components/dashboard/TimeHorizonDropdown.tsx`

**Phase 3: Dashboard Refactor**
- [ ] Rewrite `src/components/Dashboard.tsx` with new layout
- [ ] Update `src/hooks/useDashboardData.ts`
- [ ] Delete `src/components/dashboard/StatCards.tsx`
- [ ] Update `src/routes/AnnouncementsPage.tsx` to show read items grayed

**Phase 4: Settings & Polish**
- [ ] Add Dashboard settings to `src/routes/SettingsPage.tsx`
- [ ] Add skeleton loading states
- [ ] Add empty states
- [ ] Test responsive behavior
- [ ] Persist preferences to localStorage

---

### 5.10 Future Enhancements

- [ ] Discussion replies in Activity feed (requires discussion API)
- [ ] "Mark all as read" for announcements
- [ ] Drag-to-reorder priority items (manual override)
- [ ] Priority notifications for high-stakes items
- [ ] Weekly summary view
- [ ] Sync read state across devices (if user auth added)

---

### Dependencies to Add

```bash
pnpm add flexsearch
```
