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

## Phase 2: Performance & Architecture ⚡ - **COMPLETE** ✅

Focus on application responsiveness and memory usage, particularly for large files and the main dashboard.

### 2.1 Optimize File Downloads - **DONE** ✅
- **Task**: Change how files are viewed/downloaded.
- **Reasoning**: `getFileBytes` pulls the entire file into RAM (Node.js buffer) -> IPC -> Renderer RAM (ArrayBuffer). This crashes or lags on large files.
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

### 4.2 Global Search (Fuzzy, Extensible) - **COMPLETE** ✅

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
- [x] Install FlexSearch: `pnpm add flexsearch`
- [x] Create `src/utils/searchIndex.ts` with SearchManager
- [x] Create `src/hooks/useGlobalSearch.ts`
- [x] Create `src/components/SearchModal.tsx` with keyboard navigation
- [x] Add Cmd+K listener in `RootLayout.tsx`
- [x] Add search icon to `Header.tsx`
- [x] Wire up navigation on result selection

---

### 4.3 Inbox / Conversations - **COMPLETE** ✅

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
- [x] Add Canvas client methods for conversations
- [x] Add IPC handlers in `main.ts`
- [x] Expose in `preload.ts`
- [x] Add types to `canvas.ts` and `vite-env.d.ts`
- [x] Add query hooks
- [x] Create `InboxButton.tsx` with unread badge
- [x] Create `InboxPanel.tsx` slide-over container
- [x] Create `ConversationList.tsx`
- [x] Create `ConversationThread.tsx`
- [x] Add reply functionality
- [x] Add to `Header.tsx`
- [x] Add panel state to `RootLayout.tsx`

**Phase 2: Compose New Messages**
- [x] Add `searchRecipients` to Canvas client
- [x] Add `useRecipientSearch` hook
- [x] Create `RecipientPicker.tsx`
- [x] Create `ComposeMessage.tsx`
- [x] Add `useCreateConversation` mutation

**Phase 3: Polish**
- [x] Mark as read/unread functionality
- [x] Star/unstar functionality
- [x] Archive functionality
- [x] Conversation filtering
- [x] Loading states and error handling
- [x] Prefetching for unread count

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
- [x] AI/Embedding-based semantic search (Transformers.js or OpenAI)
- [ ] Search within file contents (PDFs, docs)
- [ ] Recent searches history
- [ ] Search filters (by course, type, date)

**AI Chat:**
- [x] Few-shot examples for better on-device model responses
- [x] Conversation memory (session-based, last 3 exchanges)
- [x] Dynamic response length based on query intent
- [ ] Context from currently open file (pass viewed content to AI)

**Inbox:**
- [ ] Desktop notifications for new messages
- [ ] Attachment support
- [ ] Message drafts (auto-save)
- [ ] Bulk actions

**Groups:**
- [ ] Group discussion links
- [ ] Group file access

---

## Phase 5: Dashboard Redesign 🎯 - **COMPLETE** ✅

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
- [x] Create `src/utils/assignmentWeight.ts` - Calculate effective weight
- [x] Create `src/utils/priorityScore.ts` - Priority ranking algorithm
- [x] Create `src/utils/readAnnouncements.ts` - localStorage helpers
- [x] Create `src/hooks/useDashboardSettings.ts` - Time horizon state
- [x] Create `src/hooks/useUpcomingEvents.ts` - Calendar events hook
- [x] Create `src/hooks/useUnreadAnnouncements.ts` - Filtered announcements
- [x] Create `src/hooks/usePriorityAssignments.ts` - Ranked assignments
- [x] Create `src/hooks/useActivityFeed.ts` - Merged activity feed

**Phase 2: UI Components**
- [x] Create `src/components/dashboard/PriorityItem.tsx`
- [x] Create `src/components/dashboard/PriorityList.tsx`
- [x] Create `src/components/dashboard/AlsoDue.tsx`
- [x] Create `src/components/dashboard/ActivityItem.tsx`
- [x] Create `src/components/dashboard/ActivityPanel.tsx`
- [x] Create `src/components/dashboard/TimeHorizonDropdown.tsx`

**Phase 3: Dashboard Refactor**
- [x] Rewrite `src/components/Dashboard.tsx` with new layout
- [x] Update `src/hooks/useDashboardData.ts`
- [x] Delete `src/components/dashboard/StatCards.tsx`
- [x] Update `src/routes/AnnouncementsPage.tsx` to show read items grayed

**Phase 4: Settings & Polish**
- [x] Add Dashboard settings to `src/routes/SettingsPage.tsx`
- [x] Add skeleton loading states
- [x] Add empty states
- [x] Test responsive behavior
- [x] Persist preferences to localStorage

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

---

## Phase 6: Intelligence 2.0 (Smart Assistant & Semantic Search) 🧠 - **COMPLETE** ✅

Implement a robust, agent-driven search and assistance architecture that avoids "garbage in, garbage out" by using a multi-pass coordination layer.

### 6.1 Core Concept: The "Coordinator" Pattern

We decouple "understanding" from "retrieving". A lightweight, fast LLM pass (the Coordinator) analyzes the user's intent first, then constructs a precise execution plan.

```
User Query: "Next homework for combo"
       │
       ▼
┌──────────────┐
│ Coordinator  │ ──▶ Intent: "due_date"
│ (Fast LLM)   │ ──▶ Filters: { course: "math3012", type: "assignment" }
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Executor     │ ──▶ Fetches specific assignments from cache (not vector search)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Synthesizer  │ ──▶ Generates final answer using ONLY the curated data
└──────────────┘
```

---

### 6.2 Architecture

#### 6.2.1 Unified Search Modal (Cmd+K)
- **Standard Search:** Fast fuzzy matching (FlexSearch) - Default.
- **Deep Search:** Semantic vector search, powered by the Coordinator.
  - Activated by clicking "Deep Search" in the modal footer.
  - **Results:** Displayed *inside* the modal, replacing the fuzzy results list.
  - **Behavior:**
    - If AI enabled: Coordinator optimizes query + filters before vector search.
    - If AI disabled: Raw embedding search (fallback).

#### 6.2.2 AI Chat Panel (Cmd+I)
- **Role:** Pure conversational assistant (Ask AI).
- **No "Deep Search" tab:** Deep Search lives in the Search Modal now.
- **Workflow:** Always uses the Coordinator to determine context needs before answering.

---

### 6.3 Implementation Steps

#### Step 1: The Coordinator
- **File:** `src/utils/coordinator.ts`
- **Logic:**
  - System prompt with course alias map.
  - Output JSON: `{ intent, rewrittenQuery, filters, searchDisabled }`.
  - Intents: `planning`, `due_date`, `content_qa`, `general`.

#### Step 2: Refactor SearchModal (Deep Search)
- **UI:** Add "Deep Search" button to footer (always visible).
- **State:** Add `isDeepSearching` mode.
- **Logic:**
  - On "Deep Search" click:
    - Run Coordinator (if AI enabled).
    - Execute `window.embedding.search` with optimized query/filters.
    - Render results in the existing list view.

#### Step 3: Refactor AI Panel (Ask AI)
- **UI:** Remove "Deep Search" toggle/mode.
- **Logic:**
  - On submit: Run Coordinator.
  - Fetch context based on intent (Structured Due Data vs. Vector Search).
  - Generate answer.

#### Step 4: Refactor Context/Hooks
- **`AIPanelContext`:** Remove Deep Search state; focus on Chat state.
- **`useGlobalSearch`:** Expose Deep Search execution helper for the modal.

---

### 6.4 Implementation Checklist

**Phase 1: Coordinator & Utils**
- [x] Create `src/utils/coordinator.ts` with system prompt.
- [x] Update `src/vite-env.d.ts` if needed for new types.

**Phase 2: SearchModal (Deep Search)**
- [x] Modify `SearchModal.tsx`:
  - Add `Deep Search` action to footer.
  - Implement `handleDeepSearch`.
  - Render semantic results in-place.

**Phase 3: AI Panel (Chat)**
- [x] Modify `AIPanelContext.tsx`:
  - Remove `mode` (deep-search vs ask-ai).
  - Implement 2-pass `submit` flow using Coordinator.
- [ ] Modify `AIPanel.tsx`:
  - Remove tabs (header just says "Ask AI").
  - Clean up UI.

**Phase 4: Routing & Polish**
- [ ] Ensure "Ask AI" action in SearchModal opens AIPanel with auto-submit.
- [ ] Verify click navigation from all results.

---

### 6.5 Estimated Effort

| Task | Estimate |
|------|----------|
| Coordinator Setup | 1 hour |
| SearchModal Refactor | 1-2 hours |
| AI Panel Refactor | 1-2 hours |
| Testing & Tuning | 1 hour |

**Total:** ~4-6 hours

---

## Phase 7: Smart File Indexing 📄

Transform file search from metadata-only to full content extraction with budget-aware, tiered indexing that handles everything from syllabi to 700-page reference manuals.

### 7.1 Problem Statement

**Current state:**
- Files are indexed by **metadata only** (filename, size, type, date)
- The AI cannot answer questions about file contents (e.g., "What's the attendance policy?")
- Users find the file via search but get empty snippets

**Constraints:**
- Large files (700+ page PDFs) would consume excessive storage and RAM
- Indexing everything upfront slows initial sync
- Storage budget: **100MB cap** for embeddings

**User needs:**
- AI should be able to explain file contents when asked
- Indexing should happen automatically for small files
- Large files should be partially indexed (first 50 pages)
- Unpinned courses should release their storage

---

### 7.2 Tiered Indexing Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         SMART INDEXING PIPELINE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐     ┌───────────────┐     ┌──────────────────┐          │
│  │  Tier 1      │     │  Tier 2       │     │  Tier 3          │          │
│  │  Auto-Index  │     │  On-Open      │     │  Large Files     │          │
│  ├──────────────┤     ├───────────────┤     ├──────────────────┤          │
│  │ • .txt files │     │ User opens    │     │ Files > 50 pages │          │
│  │ • PDF ≤10pg  │     │ a file in UI  │     │ Index first 50   │          │
│  │ • DOCX ≤20KB │     │ → queue it    │     │ pages only       │          │
│  └──────┬───────┘     └───────┬───────┘     └────────┬─────────┘          │
│         │                     │                      │                     │
│         └─────────────────────┼──────────────────────┘                     │
│                               ▼                                            │
│                    ┌──────────────────────┐                                │
│                    │   INDEXING QUEUE     │                                │
│                    │   (Background)       │                                │
│                    │   • 1 file at a time │                                │
│                    │   • Low priority     │                                │
│                    │   • Survives restart │                                │
│                    │   • Batch chunking   │                                │
│                    └──────────┬───────────┘                                │
│                               ▼                                            │
│         ┌─────────────────────────────────────────────┐                    │
│         │              BUDGET MANAGER                 │                    │
│         │  • Tracks: courseId → bytes used            │                    │
│         │  • Enforces 100MB global cap                │                    │
│         │  • LRU eviction when over budget            │                    │
│         │  • Course prune on unpin                    │                    │
│         └─────────────────────────────────────────────┘                    │
│                               ▼                                            │
│                    ┌──────────────────────┐                                │
│                    │    VECTOR STORE      │                                │
│                    │    embeddings.bin    │                                │
│                    └──────────────────────┘                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.3 File Classification Rules

| File Type | Size Threshold | Indexing Tier | Max Pages |
|-----------|----------------|---------------|-----------|
| `.txt` | Any | Tier 1 (Auto) | N/A |
| `.pdf` | ≤ 500KB (~10 pages) | Tier 1 (Auto) | 10 |
| `.pdf` | 500KB - 5MB (~50 pages) | Tier 2 (On-Open) | 50 |
| `.pdf` | > 5MB | Tier 3 (Large) | 50 (truncate) |
| `.docx` | ≤ 50KB | Tier 1 (Auto) | N/A |
| `.docx` | > 50KB | Tier 2 (On-Open) | N/A |
| Images, video, audio | Any | Skip | N/A |
| Archives (.zip) | Any | Skip | N/A |
| Files > 50MB | Any | Skip entirely | N/A |

---

### 7.4 Storage Budget

| Metric | Value |
|--------|-------|
| **Global Cap** | 100MB |
| **Per-entry size** | ~1.7KB (384 dims × 4 bytes + metadata) |
| **Max entries (approx)** | ~58,000 chunks |
| **Persistence** | `{userData}/embedding-budget.json` |

**Pruning triggers:**
1. **Course unpin** → Immediately remove all entries for that course
2. **Budget exceeded** → LRU eviction (remove oldest accessed entries first)
3. **Manual clear** → User clicks "Clear Index" in Settings

---

### 7.5 Memory Safety

| Mechanism | Purpose |
|-----------|---------|
| **Streaming PDF Parse** | Don't load all pages into RAM at once |
| **Chunk Batching** | Embed 10 chunks at a time, yield between batches |
| **Page Limit** | Hard cap at 50 pages for any single file |
| **File Size Cap** | Skip files > 50MB entirely |
| **Queue Throttling** | Process 1 file at a time, low priority |

---

### 7.6 Files to Create

| File | Purpose |
|------|---------|
| `electron/embedding/fileIndexer.ts` | PDF/DOCX text extraction + chunking |
| `electron/embedding/indexingQueue.ts` | Background queue with persistence |
| `electron/embedding/budgetManager.ts` | Storage tracking + pruning logic |

---

### 7.7 Files to Modify

| File | Changes |
|------|---------|
| `electron/embedding/vectorStore.ts` | Add `removeByCourseId()`, `getStorageStats()` |
| `electron/embedding/manager.ts` | Integrate queue + budget, add `indexFile()` method |
| `electron/main.ts` | Add IPC handlers: `embedding:indexFile`, `embedding:pruneCourse`, `embedding:getStorageStats`, `embedding:getQueueStatus` |
| `electron/preload.ts` | Expose new methods to renderer |
| `src/hooks/useGlobalSearch.ts` | Add Tier 1 auto-index logic for small files |
| `src/routes/RootLayout.tsx` | Watch `hiddenCourseIds` changes → trigger `pruneCourse()` |
| `src/components/CanvasContentView.tsx` | Trigger Tier 2 indexing when user opens a file |
| `src/routes/SettingsPage.tsx` | Add storage budget UI with per-course breakdown |

---

### 7.8 Detailed Specifications

#### 7.8.1 `electron/embedding/fileIndexer.ts`

```typescript
interface FileIndexOptions {
  maxPages?: number           // Default: 50
  maxFileSizeBytes?: number   // Default: 50MB
  chunkSize?: number          // Default: 2000 chars (~500 tokens)
  chunkOverlap?: number       // Default: 100 chars
}

interface FileChunk {
  id: string                  // "file:{fileId}:chunk:{n}"
  text: string
  pageRange: [number, number]
  chunkIndex: number
  totalChunks: number
}

interface FileIndexResult {
  chunks: FileChunk[]
  pageCount: number
  truncated: boolean
  extractedChars: number
}

// Main functions:
function classifyFile(file: CanvasFile): 'auto' | 'on-open' | 'skip'
async function extractFileContent(filePath: string, options: FileIndexOptions): Promise<{
  text: string
  pageCount: number
  truncated: boolean
}>
function chunkContent(text: string, chunkSize: number, overlap: number): string[]
async function indexFile(fileId: string, courseId: string, options?: FileIndexOptions): Promise<FileIndexResult>
```

**Text Extraction:**
- **PDF:** Use `pdfjs-dist` (already installed) — move to main process or use existing `pdfTextExtract.ts` pattern
- **DOCX:** Use `mammoth` (lightweight, text-only extraction)
- **TXT:** Direct `fs.readFile` with encoding detection

**Chunking:**
- Chunk size: ~2000 characters (≈500 tokens)
- Overlap: 100 characters between chunks
- Split on sentence boundaries when possible

---

#### 7.8.2 `electron/embedding/indexingQueue.ts`

```typescript
interface QueueItem {
  fileId: string
  courseId: string
  courseName: string
  fileName: string
  priority: 'high' | 'normal' | 'low'
  addedAt: number
  source: 'auto' | 'on-open' | 'manual'
}

interface QueueStatus {
  length: number
  processing: boolean
  currentItem: QueueItem | null
  processedCount: number
}

class IndexingQueue {
  private queue: QueueItem[] = []
  private processing = false
  private processedCount = 0
  
  // Queue management
  enqueue(item: Omit<QueueItem, 'addedAt'>): void
  dequeue(): QueueItem | undefined
  remove(fileId: string): boolean
  clear(): void
  
  // Background processing
  start(): void
  stop(): void
  
  // Status
  getStatus(): QueueStatus
  
  // Persistence (survives app restart)
  private persistPath: string  // {userData}/indexing-queue.json
  async save(): Promise<void>
  async load(): Promise<void>
}
```

**Processing behavior:**
- Process 1 file at a time
- Yield between files (low priority, non-blocking)
- Priority ordering: `high` (on-open) > `normal` (auto) > `low` (background)
- Silent processing (no toasts/notifications)
- Resume queue on app restart

---

#### 7.8.3 `electron/embedding/budgetManager.ts`

```typescript
interface StorageEntry {
  courseId: string
  bytes: number
  lastAccessed: number
}

interface StorageBudget {
  maxBytes: number                          // 100MB default
  entries: Map<string, StorageEntry>        // entryId → metadata
}

interface StorageStats {
  used: number
  max: number
  percent: number
  byCourse: Record<string, { entries: number; bytes: number }>
}

class BudgetManager {
  private maxBytes: number
  private entries: Map<string, StorageEntry>
  private persistPath: string  // {userData}/embedding-budget.json
  
  constructor(maxMB: number = 100)
  
  // Track storage
  recordEntry(entryId: string, courseId: string, bytes: number): void
  removeEntry(entryId: string): void
  touchEntry(entryId: string): void  // Update lastAccessed
  
  // Pruning
  pruneCourse(courseId: string): string[]      // Returns removed entry IDs
  pruneToFit(bytesNeeded: number): string[]    // LRU eviction
  
  // Stats
  getStats(): StorageStats
  getCourseUsage(courseId: string): number
  
  // Persistence
  async save(): Promise<void>
  async load(): Promise<void>
}
```

---

#### 7.8.4 VectorStore Modifications

Add to `electron/embedding/vectorStore.ts`:

```typescript
/**
 * Remove all entries for a specific course.
 * Used when a course is unpinned.
 */
removeByCourseId(courseId: string): number {
  let removed = 0
  for (const [id, entry] of this.entries) {
    if (entry.metadata.courseId === courseId) {
      this.entries.delete(id)
      removed++
    }
  }
  if (removed > 0) this.dirty = true
  return removed
}

/**
 * Get storage breakdown by course and type.
 */
getStorageStats(): {
  totalEntries: number
  totalBytes: number
  byCourse: Record<string, { entries: number; bytes: number }>
  byType: Record<ContentType, { entries: number; bytes: number }>
} {
  const byCourse: Record<string, { entries: number; bytes: number }> = {}
  const byType: Record<ContentType, { entries: number; bytes: number }> = {}
  let totalBytes = 0
  
  for (const entry of this.entries.values()) {
    const bytes = entry.embedding.length * 4 + JSON.stringify(entry.metadata).length * 2 + 100
    totalBytes += bytes
    
    // By course
    if (!byCourse[entry.metadata.courseId]) {
      byCourse[entry.metadata.courseId] = { entries: 0, bytes: 0 }
    }
    byCourse[entry.metadata.courseId].entries++
    byCourse[entry.metadata.courseId].bytes += bytes
    
    // By type
    if (!byType[entry.metadata.type]) {
      byType[entry.metadata.type] = { entries: 0, bytes: 0 }
    }
    byType[entry.metadata.type].entries++
    byType[entry.metadata.type].bytes += bytes
  }
  
  return { totalEntries: this.entries.size, totalBytes, byCourse, byType }
}
```

---

#### 7.8.5 Course Unpin Cleanup

Add to `src/routes/RootLayout.tsx`:

```typescript
// Track previous hidden course IDs
const prevHiddenRef = useRef<Set<string | number>>(new Set())

useEffect(() => {
  const prevHidden = prevHiddenRef.current
  const currHidden = new Set(sidebarCfg.hiddenCourseIds || [])
  
  // Find newly hidden courses
  for (const courseId of currHidden) {
    if (!prevHidden.has(courseId)) {
      // Course was just unpinned → purge its embeddings
      console.log(`[Cleanup] Course ${courseId} unpinned, pruning embeddings...`)
      window.embedding?.pruneCourse?.(String(courseId)).then((removed) => {
        console.log(`[Cleanup] Removed ${removed} entries for course ${courseId}`)
      })
    }
  }
  
  prevHiddenRef.current = currHidden
}, [sidebarCfg.hiddenCourseIds])
```

---

#### 7.8.6 Settings UI Updates

Add to `src/routes/SettingsPage.tsx`:

```tsx
// Intelligence section additions
<Section title="Index Storage">
  <div className="storage-overview">
    <div className="storage-bar">
      <div 
        className="storage-used" 
        style={{ width: `${storageStats.percent}%` }}
      />
    </div>
    <span className="storage-label">
      {formatBytes(storageStats.used)} / {formatBytes(storageStats.max)}
    </span>
  </div>
  
  {Object.keys(storageStats.byCourse).length > 0 && (
    <div className="course-breakdown">
      <h4>By Course</h4>
      {Object.entries(storageStats.byCourse)
        .sort((a, b) => b[1].bytes - a[1].bytes)
        .map(([courseId, { entries, bytes }]) => (
          <div key={courseId} className="course-storage-row">
            <span>{courseNames[courseId] || courseId}</span>
            <span>{entries} items · {formatBytes(bytes)}</span>
          </div>
        ))}
    </div>
  )}
  
  <div className="queue-status">
    <h4>Indexing Queue</h4>
    {queueStatus.processing ? (
      <span>Processing: {queueStatus.currentItem?.fileName}</span>
    ) : queueStatus.length > 0 ? (
      <span>{queueStatus.length} files pending</span>
    ) : (
      <span>Idle</span>
    )}
  </div>
</Section>
```

---

### 7.9 IPC API

New methods to expose:

| Method | Direction | Purpose |
|--------|-----------|---------|
| `embedding:indexFile` | Renderer → Main | Queue a file for indexing |
| `embedding:pruneCourse` | Renderer → Main | Remove all entries for a course |
| `embedding:getStorageStats` | Renderer → Main | Get storage breakdown |
| `embedding:getQueueStatus` | Renderer → Main | Get queue length and current item |
| `embedding:clearQueue` | Renderer → Main | Clear pending queue items |

---

### 7.10 Dependencies

```bash
# For DOCX text extraction (lightweight, ~200KB)
pnpm add mammoth
```

**Note:** `pdfjs-dist` is already installed and used in `src/utils/pdfTextExtract.ts`.

---

### 7.11 Implementation Checklist

**Phase 1: Core Infrastructure**
- [ ] Create `electron/embedding/fileIndexer.ts` with PDF/DOCX extraction
- [ ] Create `electron/embedding/indexingQueue.ts` with persistence
- [ ] Create `electron/embedding/budgetManager.ts` with LRU eviction
- [ ] Add `removeByCourseId()` and `getStorageStats()` to VectorStore

**Phase 2: Main Process Integration**
- [ ] Add `indexFile()` method to EmbeddingManager
- [ ] Add IPC handlers in `electron/main.ts`
- [ ] Expose APIs in `electron/preload.ts`
- [ ] Update type declarations in `electron/electron-env.d.ts`

**Phase 3: Renderer Integration**
- [ ] Add Tier 1 auto-indexing to `useGlobalSearch.ts`
- [ ] Add Tier 2 on-open indexing to `CanvasContentView.tsx`
- [ ] Add course unpin cleanup to `RootLayout.tsx`

**Phase 4: Settings UI**
- [ ] Add storage budget display to `SettingsPage.tsx`
- [ ] Add per-course breakdown
- [ ] Add queue status indicator
- [ ] Add "Clear Index" button

**Phase 5: Testing & Polish**
- [ ] Test with small PDFs (auto-index)
- [ ] Test with large PDFs (50 page truncation)
- [ ] Test course unpin → prune flow
- [ ] Test queue persistence across restart
- [ ] Test budget enforcement (LRU eviction)

---

### 7.12 Original Estimated Effort (SUPERSEDED)

> **Note:** This section contains the original estimates. See Section 7.16 for revised estimates based on the critical review.

| Task | Complexity | Time |
|------|------------|------|
| `fileIndexer.ts` | Medium | 2-3 hours |
| `indexingQueue.ts` | Medium | 1-2 hours |
| `budgetManager.ts` | Medium | 1-2 hours |
| VectorStore modifications | Low | 30 min |
| Main process IPC wiring | Low | 1 hour |
| Renderer integration | Medium | 1-2 hours |
| Settings UI updates | Low | 1 hour |
| Testing & polish | Medium | 1-2 hours |
| **Total** | | **~9-13 hours** (revised to 20-25 hours) |

---

### 7.13 Critical Review (Gemini + Codex)

Before implementation, the plan was reviewed by two AI reviewers who identified critical issues that must be addressed.

#### 🚨 Critical Issues

| Issue | Impact | Required Fix |
|-------|--------|--------------|
| **`index()` prunes everything** | Calling `index()` with file chunks deletes all other embeddings (announcements, assignments, etc.) | Create separate `upsertEntries()` API for incremental indexing |
| **Dedupe breaks file chunks** | `dedupe: true` uses `type\|courseId\|title` — only 1 chunk per file survives search | Add `fileId` + `chunkIndex` to metadata; skip dedupe for files |
| **Main thread blocking** | PDF parsing + ONNX + sync `writeFileSync` freezes entire UI | Use `worker_threads` for text extraction |
| **IPC accepts file paths** | Security risk: compromised renderer could index `~/.ssh/id_rsa` | Accept `(fileId, courseId)` only, never paths |
| **`canvas-file://` protocol** | Reads any local file path renderer asks for | Restrict to `app.getPath('temp')` directory only |
| **Chunking too large** | Model uses `MAX_SEQ_LENGTH=256` (~200 tokens); 2000 chars is heavily truncated | Reduce to ~800 chars with 200 char overlap |

#### ⚠️ Architecture Issues

| Issue | Fix |
|-------|-----|
| **No file versioning** | `downloadFile()` caches forever; need `updated_at`/`md5` check before indexing |
| **Race condition on unpin** | Queue may re-add entries after prune; need course cancellation in queue |
| **Temp file buildup** | Downloads never deleted; need cache eviction strategy |
| **Linear search O(N)** | 58k chunks = slow search; acceptable for MVP, consider FTS5 later |
| **100MB cap ambiguous** | Clarify: this is **disk size** of `embeddings.bin`, not RAM |
| **pdfjs-dist in Node** | Current renderer code uses Vite `?url` pattern; need `pdfjs-dist/legacy/build/pdf.mjs` or `pdf-parse` for Node |

#### 📊 Revised Estimates

| Reviewer | Original | Revised |
|----------|----------|---------|
| Gemini | 9-13 hours | 16-20 hours |
| Codex | 9-13 hours | 18-30 hours |
| **Adopted** | | **20-25 hours** |

---

### 7.14 Corrected Architecture

Based on the review, here are the required changes to the original plan:

#### 7.14.1 Split EmbeddingManager API

**Current:** Single `index(items)` that prunes stale entries.

**New:**
```typescript
// Keep for full rebuild (announcements, assignments, pages, modules)
rebuildIndex(items: IndexableItem[]): Promise<number>

// NEW: Incremental upsert for file chunks (NO pruning)
upsertEntries(entries: VectorEntry[]): Promise<number>

// NEW: Remove all chunks for a specific file before re-indexing
removeByFileId(fileId: string): number

// NEW: Remove all entries for a course (on unpin)
removeByCourseId(courseId: string): number
```

#### 7.14.2 Worker Thread Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    MAIN PROCESS                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ EmbeddingManager                                         │     │
│  │  • Manages queue                                         │     │
│  │  • Coordinates with worker                               │     │
│  │  • Runs ONNX embedding (already optimized)               │     │
│  └───────────────────────────────┬─────────────────────────┘     │
│                                  │                                │
│                          spawn / message                          │
│                                  │                                │
│  ┌───────────────────────────────▼─────────────────────────┐     │
│  │ extractionWorker.ts (Worker Thread)                      │     │
│  │  • Downloads file via canvasClient                       │     │
│  │  • Parses PDF/DOCX (CPU-intensive)                       │     │
│  │  • Chunks text                                           │     │
│  │  • Returns extracted chunks to main thread               │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

**Why:** PDF parsing is CPU-intensive and would freeze the main Electron process. Worker threads run in parallel without blocking UI.

#### 7.14.3 Corrected Chunking

| Parameter | Original | Corrected | Reason |
|-----------|----------|-----------|--------|
| Chunk size | 2000 chars | **800 chars** | Model `MAX_SEQ_LENGTH=256` tokens (~800 chars) |
| Overlap | 100 chars | **200 chars** | Better context preservation at boundaries |
| Split strategy | Arbitrary | **Sentence boundaries** | Cleaner semantic units |

#### 7.14.4 Extended VectorMetadata

Add these fields to support file chunks:

```typescript
interface VectorMetadata {
  // Existing fields...
  type: ContentType
  courseId: string
  courseName: string
  title: string
  snippet: string
  url?: string
  contentHash: string
  
  // NEW: File-specific fields
  fileId?: string           // For removing all chunks of a file
  chunkIndex?: number       // 0, 1, 2... for ordering
  totalChunks?: number      // Total chunks in this file
  pageRange?: [number, number]  // e.g., [1, 5] for pages 1-5
}
```

#### 7.14.5 File Version Tracking

Store file metadata to detect when re-indexing is needed:

```typescript
// Persisted to {userData}/file-index-meta.json
interface FileIndexMeta {
  [fileId: string]: {
    contentHash: string      // MD5 of file content
    updatedAt: string        // Canvas file.updated_at
    indexedAt: number        // When we indexed it
    chunkCount: number       // How many chunks created
    truncated: boolean       // Was it truncated (>50 pages)?
  }
}
```

#### 7.14.6 Security Hardening

**IPC Signature (corrected):**
```typescript
// WRONG (security risk):
'embedding:indexFile': (filePath: string) => Promise<void>

// CORRECT:
'embedding:indexFile': (fileId: string, courseId: string) => Promise<void>
```

**canvas-file:// Protocol (add to main.ts):**
```typescript
protocol.handle('canvas-file', async (request) => {
  const filePath = decodeURIComponent(new URL(request.url).pathname)
  
  // SECURITY: Only allow files in our temp directory
  const tempDir = app.getPath('temp')
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(tempDir)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  return net.fetch(pathToFileURL(resolved).href)
})
```

---

### 7.15 Updated Implementation Checklist

**Phase 1: Core Infrastructure** (8-10 hours)
- [ ] Create `electron/embedding/extractionWorker.ts` (worker thread for PDF/DOCX)
- [ ] Create `electron/embedding/fileIndexer.ts` (orchestrates extraction + chunking)
- [ ] Create `electron/embedding/indexingQueue.ts` with persistence + cancellation
- [ ] Create `electron/embedding/budgetManager.ts` with LRU eviction
- [ ] Add `upsertEntries()`, `removeByFileId()`, `removeByCourseId()` to manager
- [ ] Add `getStorageStats()` to VectorStore
- [ ] Create file version tracking (`file-index-meta.json`)

**Phase 2: Security Hardening** (1-2 hours)
- [ ] Restrict `canvas-file://` protocol to temp directory
- [ ] Ensure IPC accepts `(fileId, courseId)` only
- [ ] Add temp file cleanup (evict after 7 days)

**Phase 3: Main Process Integration** (2-3 hours)
- [ ] Add IPC handlers in `electron/main.ts`
- [ ] Expose APIs in `electron/preload.ts`
- [ ] Update type declarations in `electron/electron-env.d.ts`
- [ ] Fix chunking parameters (800 chars, 200 overlap)

**Phase 4: Renderer Integration** (2-3 hours)
- [ ] Add Tier 1 auto-indexing to `useGlobalSearch.ts`
- [ ] Add Tier 2 on-open indexing to `CanvasContentView.tsx`
- [ ] Add course unpin cleanup to `RootLayout.tsx`
- [ ] Handle queue cancellation on unpin

**Phase 5: Settings UI** (2-3 hours)
- [ ] Add storage budget display to `SettingsPage.tsx`
- [ ] Add per-course breakdown
- [ ] Add queue status indicator
- [ ] Add "Clear Index" button

**Phase 6: Testing & Polish** (3-4 hours)
- [ ] Test with small PDFs (auto-index)
- [ ] Test with large PDFs (50 page truncation)
- [ ] Test course unpin → prune + cancel flow
- [ ] Test queue persistence across restart
- [ ] Test budget enforcement (LRU eviction)
- [ ] Test security restrictions (path injection)

---

### 7.16 Revised Estimated Effort

| Task | Complexity | Time |
|------|------------|------|
| Worker thread setup + PDF extraction | High | 4-5 hours |
| `fileIndexer.ts` + chunking | Medium | 2-3 hours |
| `indexingQueue.ts` with cancellation | Medium | 2-3 hours |
| `budgetManager.ts` | Medium | 1-2 hours |
| VectorStore + Manager modifications | Medium | 2-3 hours |
| Security hardening | Low | 1-2 hours |
| Main process IPC wiring | Low | 1-2 hours |
| Renderer integration | Medium | 2-3 hours |
| Settings UI updates | Low | 2-3 hours |
| Testing & polish | Medium | 3-4 hours |
| **Total** | | **20-25 hours** |

---

### 7.17 Future Enhancements

- [ ] OCR for scanned PDFs (Tesseract.js)
- [ ] PowerPoint (.pptx) extraction
- [ ] Excel (.xlsx) table extraction
- [ ] Image-based content (diagrams with alt-text)
- [ ] "Index this file" context menu for skipped files
- [ ] Cross-device sync for index state
- [ ] Smarter chunking (by section/heading)
- [ ] Hybrid search: FTS5 + embeddings for better performance at scale
- [ ] ANN index (HNSW) if linear search becomes too slow
