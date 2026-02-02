// Minimal Canvas types used in the renderer

export type CanvasProfile = {
  id: number | string
  name?: string
  short_name?: string
  primary_email?: string
  avatar_url?: string
}

export type CanvasCourse = {
  id: number | string
  name: string
  course_code?: string
}

export type CanvasAssignment = {
  id?: string | number
  _id?: string | number
  name: string
  dueAt?: string | null
  due_at?: string | null
  state?: string
  pointsPossible?: number | null
  points_possible?: number | null
  htmlUrl?: string
  html_url?: string
  description?: string
  submission?: {
    submitted_at?: string | null
    workflow_state?: string
    grade?: string
    score?: number
  }
}

export type SubmissionComment = {
  comment: string
  author_name?: string
  created_at?: string
  author?: {
    display_name?: string
    avatar_image_url?: string
  }
}

export type SubmissionDetail = {
  score?: number | null
  grade?: string | null
  graded_at?: string | null
  submitted_at?: string | null
  workflow_state?: string
  excused?: boolean
  late?: boolean
  missing?: boolean
  submission_comments?: SubmissionComment[]
}

export type AssignmentRestDetail = {
  id?: string | number
  name?: string
  description?: string
  html_url?: string
  points_possible?: number | null
  due_at?: string | null
  submission_types?: string[]
  allowed_extensions?: string[]
  submission?: SubmissionDetail
  external_tool_tag_attributes?: {
    url?: string
    new_tab?: boolean
  }
  locked_for_user?: boolean
  lock_explanation?: string
}

export type CanvasModuleItem = {
  id: string | number
  _id: string
  __typename: string
  title?: string
  htmlUrl?: string
  contentId?: string | number
  pageUrl?: string
}

export type CanvasModule = {
  id: string | number
  _id: string
  name: string
  position?: number
  moduleItemsConnection?: {
    nodes?: CanvasModuleItem[]
  }
}

export type UpcomingEvent = {
  title?: string
  start_at?: string
  html_url?: string
  context_name?: string
  assignment?: { name?: string; due_at?: string }
}

export type TodoItem = {
  title?: string
  html_url?: string
  context_name?: string
  assignment?: { name?: string }
}

export type DueItem = {
  course_id: number | string
  course_name?: string
  name: string
  dueAt: string
  pointsPossible?: number
  htmlUrl?: string
  assignment_rest_id?: string | number
  submission?: {
    submittedAt?: string
    state?: string
    workflowState?: string
  }
}

export type CanvasTab = {
  id?: string
  label?: string
  type?: string // 'internal' | 'external'
  hidden?: boolean
  visibility?: string
  position?: number
  html_url?: string
}

export type ActivityAnnouncement = {
  type?: string
  title?: string
  message?: string
  created_at?: string
  html_url?: string
  course_id?: string | number
}

// Discussion Topics
export type DiscussionTopic = {
  id: string | number
  title: string
  message?: string // HTML body of the discussion prompt
  html_url?: string
  posted_at?: string
  last_reply_at?: string
  discussion_subentry_count?: number // Total reply count
  read_state?: 'read' | 'unread'
  unread_count?: number
  subscribed?: boolean
  user_name?: string // Author name
  user_id?: string | number
  locked?: boolean
  pinned?: boolean
  require_initial_post?: boolean // Must post before seeing others
  discussion_type?: 'side_comment' | 'threaded'
  assignment_id?: string | number // If graded discussion
  delayed_post_at?: string
  lock_at?: string
  author?: {
    id: string | number
    display_name?: string
    avatar_image_url?: string
  }
}

export type DiscussionEntry = {
  id: string | number
  user_id: string | number
  user_name?: string
  message: string // HTML content
  created_at: string
  updated_at?: string
  read_state?: 'read' | 'unread'
  forced_read_state?: boolean
  replies?: DiscussionEntry[] // Nested replies (threaded discussions)
  recent_replies?: DiscussionEntry[] // For side_comment type
  has_more_replies?: boolean
  attachment?: {
    id: string | number
    display_name?: string
    url?: string
  }
}

export type DiscussionParticipant = {
  id: string | number
  display_name?: string
  avatar_image_url?: string
}

export type DiscussionView = {
  participants: DiscussionParticipant[]
  unread_entries: (string | number)[]
  view: DiscussionEntry[] // Top-level entries
}

// Legacy alias for backward compatibility
export type CourseDiscussion = DiscussionTopic

export type CourseInfo = {
  id?: string | number
  name?: string
  default_view?: string
  syllabus_body?: string
  image_url?: string
  image_download_url?: string
}

// Minimal file/folder types used in Files view
export type CanvasFolder = {
  id: string | number
  name?: string
  full_name?: string
  parent_folder_id?: string | number | null
}

export type CanvasFile = {
  id: string | number
  display_name?: string
  filename?: string
  content_type?: string
  size?: number
  updated_at?: string
  url?: string
}

export type AnnouncementDetail = {
  id?: string | number
  title?: string
  message?: string
  posted_at?: string
  html_url?: string
}

export type CanvasPage = {
  page_id?: string | number
  url?: string
  title?: string
  body?: string
  created_at?: string
  updated_at?: string
  html_url?: string
  published?: boolean
  front_page?: boolean
}

export type CourseFrontPage = CanvasPage | null

export type CanvasEnrollment = {
  type?: string
  role?: string
  enrollment_state?: string
  course_id?: string | number
}

export type CanvasUser = {
  id: string | number
  name?: string
  short_name?: string
  sortable_name?: string
  avatar_url?: string
  email?: string
  enrollments?: CanvasEnrollment[]
}

export type CanvasGroup = {
  id: string | number
  name?: string
  description?: string
  members_count?: number
  context_type?: 'Course' | 'Account'
  course_id?: string | number
  avatar_url?: string
  users?: CanvasUser[]
}

// Conversations (Inbox)
export type ConversationParticipant = {
  id: string | number
  name?: string
  full_name?: string
  avatar_url?: string
}

export type ConversationMessage = {
  id: string | number
  author_id: string | number
  created_at: string
  body: string
  generated?: boolean
  media_comment?: {
    content_type?: string
    url?: string
  }
  forwarded_messages?: ConversationMessage[]
  attachments?: Array<{
    id: string | number
    display_name?: string
    filename?: string
    url?: string
    content_type?: string
    size?: number
  }>
}

export type Conversation = {
  id: string | number
  subject?: string
  workflow_state: 'read' | 'unread' | 'archived'
  last_message?: string
  last_message_at?: string
  last_authored_message?: string
  last_authored_message_at?: string
  message_count: number
  subscribed: boolean
  private: boolean
  starred: boolean
  properties?: string[]
  audience?: (string | number)[]
  audience_contexts?: Record<string, { roles?: string[] }>
  avatar_url?: string
  participants?: ConversationParticipant[]
  visible: boolean
  context_code?: string
  context_name?: string
  // Full conversation includes messages
  messages?: ConversationMessage[]
}

export type ConversationScope = 'inbox' | 'unread' | 'starred' | 'sent' | 'archived'

export type Recipient = {
  id: string
  name: string
  full_name?: string
  avatar_url?: string
  type: 'user' | 'context'
  user_count?: number // For group/context recipients
  common_courses?: Record<string, string[]>
  common_groups?: Record<string, string[]>
}
