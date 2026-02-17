type ApiResult<T = unknown> = { ok: boolean; data?: T; error?: string }

type ShowcaseContext = {
  baseUrl: string
}

type ShowcaseCourse = {
  id: string
  name: string
  course_code: string
}

type ShowcaseBundle = {
  assignmentGroups: Array<Record<string, unknown>>
  assignments: Array<Record<string, unknown>>
  quizzes: Array<Record<string, unknown>>
  announcements: Array<Record<string, unknown>>
  discussions: Array<Record<string, unknown>>
  discussionViews: Record<string, Record<string, unknown>>
  pages: Array<Record<string, unknown>>
  frontPage: Record<string, unknown>
  info: Record<string, unknown>
  tabs: Array<Record<string, unknown>>
  modules: Array<Record<string, unknown>>
  folders: Array<Record<string, unknown>>
  files: Array<Record<string, unknown>>
  enrollments: Array<Record<string, unknown>>
  moduleItemTargets: Record<string, string>
}

const CANVAS_DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="31" fill="#2e2825"/>
  <circle cx="32" cy="32" r="27" fill="#4b433f"/>
  <path
    fill="#d1d3d6"
    d="M32 17c-6.15 0-11.14 4.99-11.14 11.14 0 5.33 3.75 9.78 8.75 10.88A15.6 15.6 0 0 0 16 54h32a15.6 15.6 0 0 0-13.61-14.98c5-1.1 8.75-5.55 8.75-10.88C43.14 21.99 38.15 17 32 17z"
  />
</svg>
`.trim()

const CANVAS_DEFAULT_AVATAR_URL =
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CANVAS_DEFAULT_AVATAR_SVG)}`

const SHOWCASE_USER = {
  id: 'showcase-user',
  name: 'Jon Doe',
  short_name: 'Jon',
  primary_email: 'jon.doe@example.edu',
  avatar_url: CANVAS_DEFAULT_AVATAR_URL,
} as const

const SHOWCASE_COURSES: ShowcaseCourse[] = [
  { id: '201', name: 'Product Design Studio', course_code: 'DESN 301' },
  { id: '202', name: 'Applied Machine Learning', course_code: 'CS 467' },
  { id: '203', name: 'Technical Writing', course_code: 'ENG 212' },
]

const BASE_TS = Date.UTC(2026, 1, 17, 15, 0, 0)
const DAY_MS = 24 * 60 * 60 * 1000

function isoInDays(days: number): string {
  return new Date(BASE_TS + days * DAY_MS).toISOString()
}

function toId(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = String(baseUrl || '').trim()
  return trimmed ? trimmed.replace(/\/$/, '') : 'https://example.instructure.com'
}

function withBaseUrl(baseUrl: string, path: string): string {
  const normalized = normalizeBaseUrl(baseUrl)
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${normalized}${suffix}`
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildBundle(course: ShowcaseCourse, index: number): ShowcaseBundle {
  const groupProjectId = `${course.id}-g1`
  const groupHomeworkId = `${course.id}-g2`

  const assignProjectId = `${course.id}01`
  const assignHomeworkId = `${course.id}02`
  const assignQuizPrepId = `${course.id}03`
  const assignReadingId = `${course.id}04`
  const assignDraftId = `${course.id}05`
  const quizId = `${course.id}q1`

  const ann1Id = `${course.id}a1`
  const ann2Id = `${course.id}a2`
  const discussion1Id = `${course.id}d1`
  const discussion2Id = `${course.id}d2`

  const module1Id = `${course.id}m1`
  const moduleItemPageId = `${course.id}mi1`
  const moduleItemAssignmentId = `${course.id}mi2`
  const moduleItemDiscussionId = `${course.id}mi3`
  const moduleItemFileId = `${course.id}mi4`

  const pageSlug = `week-${index + 1}-overview`
  const rootFolderId = `${course.id}-root`
  const refsFolderId = `${course.id}-refs`

  const file1Id = `${course.id}-file-1`
  const file2Id = `${course.id}-file-2`
  const file3Id = `${course.id}-file-3`

  const assignmentGroups = [
    {
      id: groupProjectId,
      name: 'Projects',
      group_weight: 60,
      rules: { drop_lowest: 0, drop_highest: 0, never_drop: [] },
    },
    {
      id: groupHomeworkId,
      name: 'Homework',
      group_weight: 40,
      rules: { drop_lowest: 1, drop_highest: 0, never_drop: [] },
    },
  ]

  const assignments = [
    {
      id: assignProjectId,
      name: 'Project Brief',
      assignment_group_id: groupProjectId,
      points_possible: 100,
      due_at: isoInDays(index + 2),
      published: true,
      submission: {
        score: 88 + index,
        submitted_at: isoInDays(index - 1),
        graded_at: isoInDays(index),
        workflow_state: 'graded',
        missing: false,
        late: false,
      },
      description: `<p>Draft a proposal for <strong>${course.name}</strong>.</p>`,
      submission_types: ['online_text_entry'],
      allowed_extensions: [],
    },
    {
      id: assignHomeworkId,
      name: 'Weekly Reflection',
      assignment_group_id: groupHomeworkId,
      points_possible: 25,
      due_at: isoInDays(index + 4),
      published: true,
      submission: {
        score: 22 + index,
        submitted_at: isoInDays(index + 1),
        graded_at: isoInDays(index + 2),
        workflow_state: 'graded',
        missing: false,
        late: false,
      },
      description: '<p>Submit a short reflection on this week\'s material.</p>',
      submission_types: ['online_text_entry'],
      allowed_extensions: [],
    },
    {
      id: assignQuizPrepId,
      name: 'Quiz Practice Set',
      assignment_group_id: groupHomeworkId,
      points_possible: 10,
      due_at: isoInDays(index + 6),
      published: true,
      submission: {
        workflow_state: 'unsubmitted',
      },
      description: '<p>Optional prep before the quiz.</p>',
      submission_types: ['online_text_entry'],
      allowed_extensions: [],
    },
    {
      id: assignReadingId,
      name: 'Reading Notes',
      assignment_group_id: groupHomeworkId,
      points_possible: 15,
      due_at: isoInDays(index + 1),
      published: true,
      submission: {
        workflow_state: 'unsubmitted',
      },
      description: '<p>Summarize two key ideas from this week&apos;s readings.</p>',
      submission_types: ['online_text_entry'],
      allowed_extensions: [],
    },
    {
      id: assignDraftId,
      name: 'Draft Outline',
      assignment_group_id: groupProjectId,
      points_possible: 35,
      due_at: isoInDays(index + 3),
      published: true,
      submission: {
        workflow_state: 'unsubmitted',
      },
      description: '<p>Upload a one-page outline for the next deliverable.</p>',
      submission_types: ['online_text_entry'],
      allowed_extensions: [],
    },
  ]

  const quizzes = [
    {
      id: quizId,
      assignment_id: assignQuizPrepId,
      title: 'Checkpoint Quiz',
      description: '<p>Short checkpoint quiz.</p>',
      due_at: isoInDays(index + 7),
      points_possible: 15,
      published: true,
      isNewQuiz: false,
    },
  ]

  const announcements = [
    {
      id: ann1Id,
      title: 'Week Kickoff',
      message: `<p>Welcome back to <strong>${course.name}</strong>. Please review this week's objectives.</p>`,
      posted_at: isoInDays(index - 2),
      last_reply_at: isoInDays(index - 1),
      discussion_subentry_count: 4,
      unread_count: 1,
      read_state: 'unread',
      pinned: true,
      locked: false,
      is_announcement: true,
      author: { id: `teacher-${course.id}`, display_name: 'Prof. Avery Chen' },
    },
    {
      id: ann2Id,
      title: 'Office Hours Update',
      message: '<p>Office hours moved to Thursday 3:30 PM.</p>',
      posted_at: isoInDays(index),
      last_reply_at: isoInDays(index + 1),
      discussion_subentry_count: 2,
      unread_count: 0,
      read_state: 'read',
      pinned: false,
      locked: false,
      is_announcement: true,
      author: { id: `teacher-${course.id}`, display_name: 'Prof. Avery Chen' },
    },
  ]

  const discussions = [
    {
      id: discussion1Id,
      title: 'Design Critique Thread',
      message: '<p>Share one design decision and ask for feedback.</p>',
      posted_at: isoInDays(index - 1),
      last_reply_at: isoInDays(index + 2),
      discussion_subentry_count: 6,
      unread_count: 2,
      read_state: 'unread',
      pinned: false,
      locked: false,
      is_announcement: false,
      author: { id: `teacher-${course.id}`, display_name: 'Prof. Avery Chen' },
    },
    {
      id: discussion2Id,
      title: 'Resource Recommendations',
      message: '<p>Post one useful reference and why it helped.</p>',
      posted_at: isoInDays(index - 3),
      last_reply_at: isoInDays(index),
      discussion_subentry_count: 3,
      unread_count: 0,
      read_state: 'read',
      pinned: false,
      locked: false,
      is_announcement: false,
      author: { id: `teacher-${course.id}`, display_name: 'Prof. Avery Chen' },
    },
  ]

  const discussionViews: Record<string, Record<string, unknown>> = {
    [discussion1Id]: {
      participants: [
        { id: SHOWCASE_USER.id, display_name: SHOWCASE_USER.name },
        { id: `teacher-${course.id}`, display_name: 'Prof. Avery Chen' },
        { id: `peer-${course.id}`, display_name: 'Sam Patel' },
      ],
      unread_entries: [`${discussion1Id}-entry-2`],
      view: [
        {
          id: `${discussion1Id}-entry-1`,
          user_id: `teacher-${course.id}`,
          user_name: 'Prof. Avery Chen',
          message: '<p>Start with your strongest design assumption.</p>',
          created_at: isoInDays(index - 1),
          read_state: 'read',
          replies: [
            {
              id: `${discussion1Id}-reply-1`,
              user_id: SHOWCASE_USER.id,
              user_name: SHOWCASE_USER.name,
              message: '<p>I focused on simplifying navigation flow.</p>',
              created_at: isoInDays(index),
              read_state: 'read',
            },
          ],
        },
        {
          id: `${discussion1Id}-entry-2`,
          user_id: `peer-${course.id}`,
          user_name: 'Sam Patel',
          message: '<p>How are you measuring success for the first iteration?</p>',
          created_at: isoInDays(index + 1),
          read_state: 'unread',
        },
      ],
    },
    [discussion2Id]: {
      participants: [
        { id: SHOWCASE_USER.id, display_name: SHOWCASE_USER.name },
        { id: `peer-${course.id}`, display_name: 'Morgan Lee' },
      ],
      unread_entries: [],
      view: [
        {
          id: `${discussion2Id}-entry-1`,
          user_id: `peer-${course.id}`,
          user_name: 'Morgan Lee',
          message: '<p>This article on note-taking strategies was helpful.</p>',
          created_at: isoInDays(index - 2),
          read_state: 'read',
        },
      ],
    },
  }

  const pages = [
    {
      page_id: pageSlug,
      title: 'Week Overview',
      url: pageSlug,
      published: true,
      updated_at: isoInDays(index - 1),
    },
  ]

  const frontPage = {
    page_id: pageSlug,
    title: 'Course Home',
    url: pageSlug,
    body: `<h2>${course.name}</h2><p>This is Showcase Mode content for recording and demos.</p>`,
    updated_at: isoInDays(index),
  }

  const info = {
    id: course.id,
    name: course.name,
    default_view: 'wiki',
    syllabus_body:
      '<h3>Syllabus</h3><p>Use this course shell to track deliverables and weekly objectives.</p>',
  }

  const tabs = [
    { id: 'announcements', label: 'Announcements', hidden: false, html_url: `/courses/${course.id}/announcements` },
    { id: 'discussion_topics', label: 'Discussions', hidden: false, html_url: `/courses/${course.id}/discussion_topics` },
    { id: 'modules', label: 'Modules', hidden: false, html_url: `/courses/${course.id}/modules` },
    { id: 'files', label: 'Files', hidden: false, html_url: `/courses/${course.id}/files` },
    { id: 'assignments', label: 'Assignments', hidden: false, html_url: `/courses/${course.id}/assignments` },
    { id: 'quizzes', label: 'Quizzes', hidden: false, html_url: `/courses/${course.id}/quizzes` },
    { id: 'grades', label: 'Grades', hidden: false, html_url: `/courses/${course.id}/grades` },
  ]

  const modules = [
    {
      id: module1Id,
      _id: module1Id,
      name: 'Week 1',
      position: 1,
      moduleItemsConnection: {
        nodes: [
          {
            id: moduleItemPageId,
            _id: moduleItemPageId,
            __typename: 'PageModuleItem',
            title: 'Week Overview',
            pageUrl: pageSlug,
            htmlUrl: `/courses/${course.id}/pages/${pageSlug}`,
          },
          {
            id: moduleItemAssignmentId,
            _id: moduleItemAssignmentId,
            __typename: 'AssignmentModuleItem',
            title: 'Project Brief',
            contentId: assignProjectId,
            htmlUrl: `/courses/${course.id}/assignments/${assignProjectId}`,
          },
          {
            id: moduleItemDiscussionId,
            _id: moduleItemDiscussionId,
            __typename: 'DiscussionModuleItem',
            title: 'Design Critique Thread',
            contentId: discussion1Id,
            htmlUrl: `/courses/${course.id}/discussion_topics/${discussion1Id}`,
          },
          {
            id: moduleItemFileId,
            _id: moduleItemFileId,
            __typename: 'FileModuleItem',
            title: 'Sample Notes',
            contentId: file1Id,
            htmlUrl: `/courses/${course.id}/files/${file1Id}`,
          },
        ],
      },
    },
  ]

  const moduleItemTargets: Record<string, string> = {
    [moduleItemPageId]: `/courses/${course.id}/pages/${pageSlug}`,
    [moduleItemAssignmentId]: `/courses/${course.id}/assignments/${assignProjectId}`,
    [moduleItemDiscussionId]: `/courses/${course.id}/discussion_topics/${discussion1Id}`,
    [moduleItemFileId]: `/courses/${course.id}/files/${file1Id}`,
  }

  const folders = [
    { id: rootFolderId, name: 'course files', full_name: 'course files', parent_folder_id: null },
    { id: refsFolderId, name: 'references', full_name: 'course files/references', parent_folder_id: rootFolderId },
  ]

  const files = [
    {
      id: file1Id,
      folder_id: rootFolderId,
      display_name: 'lecture-notes.md',
      filename: 'lecture-notes.md',
      content_type: 'text/markdown',
      size: 2100,
      updated_at: isoInDays(index),
    },
    {
      id: file2Id,
      folder_id: rootFolderId,
      display_name: 'project-rubric.txt',
      filename: 'project-rubric.txt',
      content_type: 'text/plain',
      size: 980,
      updated_at: isoInDays(index - 1),
    },
    {
      id: file3Id,
      folder_id: refsFolderId,
      display_name: 'resource-links.csv',
      filename: 'resource-links.csv',
      content_type: 'text/csv',
      size: 620,
      updated_at: isoInDays(index - 2),
    },
  ]

  const enrollments = [
    {
      course_id: course.id,
      type: 'StudentEnrollment',
      computed_current_score: 90 - index,
      computed_current_grade: index === 0 ? 'A-' : index === 1 ? 'B+' : 'A',
    },
  ]

  return {
    assignmentGroups,
    assignments,
    quizzes,
    announcements,
    discussions,
    discussionViews,
    pages,
    frontPage,
    info,
    tabs,
    modules,
    folders,
    files,
    enrollments,
    moduleItemTargets,
  }
}

const SHOWCASE_BUNDLES: Record<string, ShowcaseBundle> = Object.fromEntries(
  SHOWCASE_COURSES.map((course, index) => [course.id, buildBundle(course, index)]),
)

const SHOWCASE_FILE_CONTENT: Record<string, string> = (() => {
  const entries: Array<[string, string]> = []
  for (const course of SHOWCASE_COURSES) {
    entries.push([
      `${course.id}-file-1`,
      `# ${course.name}\n\nThis markdown file is generated by Showcase Mode.\n\n- Safe for recordings\n- No live Canvas data\n`,
    ])
    entries.push([
      `${course.id}-file-2`,
      `Project rubric for ${course.course_code}\n\n1) Clarity\n2) Completeness\n3) Iteration quality\n`,
    ])
    entries.push([
      `${course.id}-file-3`,
      'title,url\nSyllabus Guide,https://example.edu/syllabus\nProject Planning,https://example.edu/planning\n',
    ])
  }
  return Object.fromEntries(entries)
})()

const WRITE_CHANNELS = new Set<string>([
  'canvas:submitAssignment',
  'canvas:submitAssignmentUpload',
  'canvas:postDiscussionEntry',
  'canvas:postDiscussionReply',
  'canvas:markDiscussionEntriesRead',
  'canvas:createConversation',
  'canvas:addMessage',
  'canvas:updateConversation',
  'canvas:deleteConversation',
  'canvas:cacheCourseImage',
])

const UNSUPPORTED_CHANNELS = new Set<string>([
  'canvas:listCourseUsers',
  'canvas:listCourseGroups',
  'canvas:listMyGroups',
  'canvas:listGroupUsers',
  'canvas:listConversations',
  'canvas:getConversation',
  'canvas:getUnreadCount',
  'canvas:searchRecipients',
])

export const SHOWCASE_READ_ONLY_ERROR =
  'This action is read-only in Showcase Mode.'

export const SHOWCASE_UNAVAILABLE_ERROR =
  'This action is unavailable in Showcase Mode.'

function getBundle(courseIdRaw: unknown): ShowcaseBundle | null {
  const courseId = toId(courseIdRaw)
  return SHOWCASE_BUNDLES[courseId] || null
}

function baseCourseInfo(baseUrl: string, course: ShowcaseCourse, bundle: ShowcaseBundle) {
  return {
    ...bundle.info,
    id: course.id,
    name: course.name,
    html_url: withBaseUrl(baseUrl, `/courses/${course.id}`),
  }
}

function withCourseUrls(baseUrl: string, courseId: string, rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const next = { ...row }
    if (typeof next.html_url !== 'string') {
      const inferredId = toId(next.id)
      if (inferredId) {
        next.html_url = withBaseUrl(baseUrl, `/courses/${courseId}/discussion_topics/${inferredId}`)
      }
    } else {
      next.html_url = withBaseUrl(baseUrl, String(next.html_url))
    }
    return next
  })
}

function fileDataUrl(fileId: string): string | null {
  const body = SHOWCASE_FILE_CONTENT[fileId]
  if (!body) return null
  return `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`
}

function listAllAnnouncements(baseUrl: string): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  for (const course of SHOWCASE_COURSES) {
    const bundle = SHOWCASE_BUNDLES[course.id]
    for (const ann of bundle.announcements) {
      rows.push({
        type: 'Announcement',
        title: ann.title,
        message: ann.message,
        created_at: ann.posted_at,
        html_url: withBaseUrl(baseUrl, `/courses/${course.id}/announcements/${toId(ann.id)}`),
        course_id: course.id,
      })
    }
  }
  rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  return rows
}

function listAllDue(baseUrl: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  for (const course of SHOWCASE_COURSES) {
    const bundle = SHOWCASE_BUNDLES[course.id]
    for (const assignment of bundle.assignments) {
      const assignmentId = toId(assignment.id)
      if (!assignmentId) continue
      const linkedQuiz = bundle.quizzes.find((quiz) => toId(quiz.assignment_id) === assignmentId)
      if (linkedQuiz) continue
      const submission = (assignment.submission as Record<string, unknown>) || {}
      out.push({
        course_id: course.id,
        course_name: course.name,
        name: assignment.name,
        dueAt: assignment.due_at,
        pointsPossible: assignment.points_possible,
        htmlUrl: withBaseUrl(baseUrl, `/courses/${course.id}/assignments/${assignmentId}`),
        assignment_rest_id: assignment.id,
        contentType: 'assignment',
        submission: {
          submittedAt: submission.submitted_at || null,
          workflowState: submission.workflow_state || 'unsubmitted',
        },
      })
    }

    for (const quiz of bundle.quizzes) {
      const assignment = bundle.assignments.find(
        (item) => toId(item.id) === toId(quiz.assignment_id),
      )
      const assignmentSubmission = ((assignment?.submission as Record<string, unknown>) || {})
      out.push({
        course_id: course.id,
        course_name: course.name,
        name: quiz.title || 'Quiz',
        dueAt: quiz.due_at || assignment?.due_at || null,
        pointsPossible: quiz.points_possible || null,
        htmlUrl: withBaseUrl(baseUrl, `/courses/${course.id}/quizzes/${toId(quiz.id)}`),
        assignment_rest_id: quiz.assignment_id || null,
        quiz_id: quiz.id,
        contentType: 'quiz',
        submission: {
          submittedAt: assignmentSubmission.submitted_at || null,
          workflowState: assignmentSubmission.workflow_state || 'unsubmitted',
        },
      })
    }
  }
  out.sort((a, b) => String(a.dueAt || '').localeCompare(String(b.dueAt || '')))
  return out
}

function asCourseIdPath(value: unknown): string {
  return toId(value)
}

export function handleShowcaseCanvasCall(
  channel: string,
  args: unknown[],
  ctx: ShowcaseContext,
): ApiResult | undefined {
  if (channel === 'canvas:init' || channel === 'canvas:clearToken') {
    return undefined
  }

  const baseUrl = normalizeBaseUrl(ctx.baseUrl)

  if (WRITE_CHANNELS.has(channel)) {
    return { ok: false, error: SHOWCASE_READ_ONLY_ERROR }
  }

  if (UNSUPPORTED_CHANNELS.has(channel)) {
    return { ok: false, error: SHOWCASE_UNAVAILABLE_ERROR }
  }

  switch (channel) {
    case 'canvas:getProfile':
      return { ok: true, data: deepClone(SHOWCASE_USER) }

    case 'canvas:getRateLimit':
      return { ok: true, data: null }

    case 'canvas:listCourses': {
      const data = SHOWCASE_COURSES.map((course) => ({
        id: course.id,
        name: course.name,
        course_code: course.course_code,
      }))
      return { ok: true, data }
    }

    case 'canvas:listDueAssignments':
      return { ok: true, data: listAllDue(baseUrl) }

    case 'canvas:listCourseAssignments': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.assignments.map((assignment) => ({
        ...assignment,
        html_url: withBaseUrl(baseUrl, `/courses/${courseId}/assignments/${toId(assignment.id)}`),
      }))
      return { ok: true, data }
    }

    case 'canvas:listAssignmentsWithSubmission': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.assignments.map((assignment) => ({
        ...assignment,
        html_url: withBaseUrl(baseUrl, `/courses/${courseId}/assignments/${toId(assignment.id)}`),
      }))
      return { ok: true, data }
    }

    case 'canvas:listAssignmentGroups': {
      const bundle = getBundle(args[0])
      return { ok: true, data: deepClone(bundle?.assignmentGroups || []) }
    }

    case 'canvas:listMyEnrollmentsForCourse': {
      const bundle = getBundle(args[0])
      return { ok: true, data: deepClone(bundle?.enrollments || []) }
    }

    case 'canvas:listCourseTabs': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const data = bundle.tabs.map((tab) => ({
        ...tab,
        html_url:
          typeof tab.html_url === 'string' ? withBaseUrl(baseUrl, String(tab.html_url)) : tab.html_url,
      }))
      return { ok: true, data }
    }

    case 'canvas:listCourseQuizzes': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.quizzes.map((quiz) => ({
        ...quiz,
        html_url: withBaseUrl(baseUrl, `/courses/${courseId}/quizzes/${toId(quiz.id)}`),
      }))
      return { ok: true, data }
    }

    case 'canvas:getCourseQuiz': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Quiz not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const quizId = toId(args[1])
      const quiz = bundle.quizzes.find(
        (item) => toId(item.id) === quizId || toId(item.assignment_id) === quizId,
      )
      if (!quiz) return { ok: false, error: 'Quiz not found in Showcase Mode.' }
      return {
        ok: true,
        data: {
          ...quiz,
          html_url: withBaseUrl(baseUrl, `/courses/${courseId}/quizzes/${toId(quiz.id)}`),
        },
      }
    }

    case 'canvas:listActivityStream': {
      const opts = (args[0] || {}) as Record<string, unknown>
      const perPage = Number(opts.perPage || 100)
      const rows = listAllAnnouncements(baseUrl)
      return { ok: true, data: rows.slice(0, Math.max(1, Math.min(100, perPage || 100))) }
    }

    case 'canvas:listAccountNotifications': {
      const data = [
        {
          id: 'notice-1',
          subject: 'Showcase Mode Notice',
          message: 'These notifications are synthetic and safe for recording.',
          start_at: isoInDays(-1),
          end_at: null,
          icon: 'information',
          is_closed: false,
        },
      ]
      return { ok: true, data }
    }

    case 'canvas:listCourseAnnouncements': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const perPage = Number(args[1] || 50)
      const data = withCourseUrls(baseUrl, courseId, bundle.announcements).slice(
        0,
        Math.max(1, Math.min(100, perPage || 50)),
      )
      return { ok: true, data }
    }

    case 'canvas:listCourseAnnouncementsPage': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const page = Math.max(1, Number(args[1] || 1))
      const perPage = Math.max(1, Math.min(100, Number(args[2] || 10)))
      const rows = withCourseUrls(baseUrl, courseId, bundle.announcements)
      const start = (page - 1) * perPage
      return { ok: true, data: rows.slice(start, start + perPage) }
    }

    case 'canvas:getAnnouncement': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Announcement not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const topicId = toId(args[1])
      const topic = bundle.announcements.find((item) => toId(item.id) === topicId)
      if (!topic) return { ok: false, error: 'Announcement not found in Showcase Mode.' }
      return {
        ok: true,
        data: {
          ...topic,
          html_url: withBaseUrl(baseUrl, `/courses/${courseId}/announcements/${topicId}`),
        },
      }
    }

    case 'canvas:listCourseDiscussions': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const params = (args[1] || {}) as Record<string, unknown>
      const searchTerm = String(params.searchTerm || '').trim().toLowerCase()
      const filterBy = String(params.filterBy || 'all')
      const scope = String(params.scope || 'all')
      const orderBy = String(params.orderBy || 'recent_activity')
      const perPage = Math.max(1, Math.min(100, Number(params.perPage || 50)))
      const maxPages = params.maxPages == null ? null : Math.max(1, Number(params.maxPages))

      let rows = withCourseUrls(baseUrl, courseId, bundle.discussions)

      if (searchTerm) {
        rows = rows.filter((item) => {
          const title = String(item.title || '').toLowerCase()
          const message = String(item.message || '').toLowerCase()
          return title.includes(searchTerm) || message.includes(searchTerm)
        })
      }

      if (filterBy === 'unread') {
        rows = rows.filter((item) => Number(item.unread_count || 0) > 0)
      }

      if (scope === 'pinned') rows = rows.filter((item) => Boolean(item.pinned))
      if (scope === 'unpinned') rows = rows.filter((item) => !item.pinned)
      if (scope === 'locked') rows = rows.filter((item) => Boolean(item.locked))
      if (scope === 'unlocked') rows = rows.filter((item) => !item.locked)

      if (orderBy === 'title') {
        rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
      } else if (orderBy === 'position') {
        rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
      } else {
        rows.sort((a, b) =>
          String(b.last_reply_at || b.posted_at || '').localeCompare(
            String(a.last_reply_at || a.posted_at || ''),
          ),
        )
      }

      const limit = maxPages == null ? perPage : perPage * maxPages
      return { ok: true, data: rows.slice(0, limit) }
    }

    case 'canvas:getDiscussion': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Discussion not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const topicId = toId(args[1])
      const topic = bundle.discussions.find((item) => toId(item.id) === topicId)
      if (!topic) return { ok: false, error: 'Discussion not found in Showcase Mode.' }
      return {
        ok: true,
        data: {
          ...topic,
          html_url: withBaseUrl(baseUrl, `/courses/${courseId}/discussion_topics/${topicId}`),
        },
      }
    }

    case 'canvas:getDiscussionView': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Discussion view not found in Showcase Mode.' }
      const topicId = toId(args[1])
      const view = bundle.discussionViews[topicId]
      if (!view) return { ok: false, error: 'Discussion view not found in Showcase Mode.' }
      return { ok: true, data: deepClone(view) }
    }

    case 'canvas:listCourseModulesGql': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.modules.map((module) => ({
        ...module,
        moduleItemsConnection: {
          nodes: ((module.moduleItemsConnection as Record<string, unknown>)?.nodes as Array<Record<string, unknown>>).map(
            (node) => ({
              ...node,
              htmlUrl:
                typeof node.htmlUrl === 'string' ? withBaseUrl(baseUrl, String(node.htmlUrl)) : node.htmlUrl,
              html_url:
                typeof node.htmlUrl === 'string' ? withBaseUrl(baseUrl, String(node.htmlUrl)) : node.html_url,
              course_id: courseId,
            }),
          ),
        },
      }))
      return { ok: true, data }
    }

    case 'canvas:getCourseModuleItem': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: null }
      const itemId = toId(args[1])
      for (const module of bundle.modules) {
        const connection = module.moduleItemsConnection as Record<string, unknown>
        const nodes = (connection?.nodes || []) as Array<Record<string, unknown>>
        const found = nodes.find((item) => toId(item.id) === itemId)
        if (found) {
          return {
            ok: true,
            data: {
              ...found,
              htmlUrl:
                typeof found.htmlUrl === 'string'
                  ? withBaseUrl(baseUrl, String(found.htmlUrl))
                  : found.htmlUrl,
            },
          }
        }
      }
      return { ok: true, data: null }
    }

    case 'canvas:listUpcoming': {
      const due = listAllDue(baseUrl)
      const data = due.slice(0, 6).map((item) => ({
        title: item.name,
        start_at: item.dueAt,
        html_url: item.htmlUrl,
        context_name: item.course_name,
        assignment: { name: item.name, due_at: item.dueAt },
      }))
      return { ok: true, data }
    }

    case 'canvas:listTodo': {
      const due = listAllDue(baseUrl)
      const data = due.slice(0, 5).map((item) => ({
        title: item.name,
        html_url: item.htmlUrl,
        context_name: item.course_name,
        assignment: { name: item.name },
      }))
      return { ok: true, data }
    }

    case 'canvas:getMySubmission': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: { workflow_state: 'unsubmitted' } }
      const assignmentId = toId(args[1])
      const assignment = bundle.assignments.find((item) => toId(item.id) === assignmentId)
      if (!assignment) return { ok: true, data: { workflow_state: 'unsubmitted' } }
      const submission = (assignment.submission as Record<string, unknown>) || {}
      return {
        ok: true,
        data: {
          score: submission.score ?? null,
          grade: submission.score == null ? null : String(submission.score),
          graded_at: submission.graded_at || null,
          submitted_at: submission.submitted_at || null,
          workflow_state: submission.workflow_state || 'unsubmitted',
          excused: false,
          late: Boolean(submission.late),
          missing: Boolean(submission.missing),
          submission_comments: [
            {
              comment: 'Great structure. Add one more concrete example.',
              author_name: 'Prof. Avery Chen',
              created_at: isoInDays(1),
              author: { display_name: 'Prof. Avery Chen' },
            },
          ],
        },
      }
    }

    case 'canvas:listCoursePages': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.pages.map((page) => ({
        ...page,
        html_url: withBaseUrl(baseUrl, `/courses/${courseId}/pages/${toId(page.url)}`),
      }))
      return { ok: true, data }
    }

    case 'canvas:getCoursePage': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Page not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const slugOrUrl = String(args[1] || '')
      let slug = slugOrUrl
      try {
        const parsed = new URL(slugOrUrl)
        const parts = parsed.pathname.split('/')
        const idx = parts.indexOf('pages')
        if (idx >= 0 && parts[idx + 1]) slug = parts[idx + 1]
      } catch {
        // keep raw slug
      }
      const page = bundle.pages.find((item) => toId(item.url) === toId(slug))
      if (!page) return { ok: false, error: 'Page not found in Showcase Mode.' }
      return {
        ok: true,
        data: {
          ...page,
          body: `<h2>${courseId} Week Overview</h2><p>This page is generated by Showcase Mode.</p>`,
          html_url: withBaseUrl(baseUrl, `/courses/${courseId}/pages/${toId(page.url)}`),
        },
      }
    }

    case 'canvas:getCourseInfo': {
      const courseId = toId(args[0])
      const course = SHOWCASE_COURSES.find((item) => item.id === courseId)
      const bundle = getBundle(courseId)
      if (!course || !bundle) return { ok: false, error: 'Course not found in Showcase Mode.' }
      return { ok: true, data: baseCourseInfo(baseUrl, course, bundle) }
    }

    case 'canvas:getCourseFrontPage': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Front page not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const data = {
        ...bundle.frontPage,
        html_url: withBaseUrl(baseUrl, `/courses/${courseId}/pages/${toId(bundle.frontPage.url)}`),
      }
      return { ok: true, data }
    }

    case 'canvas:getAssignmentRest': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: false, error: 'Assignment not found in Showcase Mode.' }
      const courseId = asCourseIdPath(args[0])
      const assignmentId = toId(args[1])
      const assignment = bundle.assignments.find((item) => toId(item.id) === assignmentId)
      if (!assignment) return { ok: false, error: 'Assignment not found in Showcase Mode.' }
      return {
        ok: true,
        data: {
          ...assignment,
          html_url: withBaseUrl(baseUrl, `/courses/${courseId}/assignments/${assignmentId}`),
        },
      }
    }

    case 'canvas:listCourseFiles': {
      const bundle = getBundle(args[0])
      if (!bundle) return { ok: true, data: [] }
      const courseId = asCourseIdPath(args[0])
      const data = bundle.files.map((file) => ({
        ...file,
        url: withBaseUrl(baseUrl, `/courses/${courseId}/files/${toId(file.id)}`),
      }))
      return { ok: true, data }
    }

    case 'canvas:listCourseFolders': {
      const bundle = getBundle(args[0])
      return { ok: true, data: deepClone(bundle?.folders || []) }
    }

    case 'canvas:listFolderFiles': {
      const folderId = toId(args[0])
      const files: Array<Record<string, unknown>> = []
      for (const course of SHOWCASE_COURSES) {
        const bundle = SHOWCASE_BUNDLES[course.id]
        for (const file of bundle.files) {
          if (toId(file.folder_id) !== folderId) continue
          files.push({
            ...file,
            url: withBaseUrl(baseUrl, `/courses/${course.id}/files/${toId(file.id)}`),
          })
        }
      }
      return { ok: true, data: files }
    }

    case 'canvas:getFile': {
      const fileId = toId(args[0])
      for (const course of SHOWCASE_COURSES) {
        const bundle = SHOWCASE_BUNDLES[course.id]
        const file = bundle.files.find((item) => toId(item.id) === fileId)
        if (!file) continue
        return {
          ok: true,
          data: {
            ...file,
            url: withBaseUrl(baseUrl, `/courses/${course.id}/files/${fileId}`),
          },
        }
      }
      return { ok: false, error: 'File not found in Showcase Mode.' }
    }

    case 'canvas:getFileBytes': {
      const fileId = toId(args[0])
      const url = fileDataUrl(fileId)
      if (!url) return { ok: false, error: 'File bytes not found in Showcase Mode.' }
      return { ok: true, data: url }
    }

    case 'canvas:resolveUrl': {
      const rawUrl = String(args[0] || '')
      if (!rawUrl) return { ok: false, error: 'Invalid URL' }
      try {
        const parsed = new URL(rawUrl)
        const parts = parsed.pathname.split('/').filter(Boolean)
        const idx = parts.indexOf('items')
        const itemId = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null
        if (!itemId) return { ok: true, data: rawUrl }

        for (const course of SHOWCASE_COURSES) {
          const bundle = SHOWCASE_BUNDLES[course.id]
          const target = bundle.moduleItemTargets[itemId]
          if (!target) continue
          return { ok: true, data: withBaseUrl(baseUrl, target) }
        }
      } catch {
        return { ok: false, error: 'Invalid URL' }
      }
      return { ok: true, data: rawUrl }
    }

    default:
      return { ok: false, error: SHOWCASE_UNAVAILABLE_ERROR }
  }
}
