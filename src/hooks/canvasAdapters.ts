import type { CanvasAssignment, Conversation, DiscussionEntry, DiscussionTopic, DiscussionView } from '../types/canvas'

type AnyRecord = Record<string, unknown>
type ConversationParticipant = NonNullable<Conversation['participants']>[number]
type ConversationMessage = NonNullable<Conversation['messages']>[number]
type ConversationAttachment = NonNullable<ConversationMessage['attachments']>[number]

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null
}

function toId(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  return undefined
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function toNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function toBooleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function toIdArray(value: unknown): Array<string | number> {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
}

function adaptAssignmentSubmission(value: unknown): CanvasAssignment['submission'] | undefined {
  if (!isRecord(value)) return undefined

  const submittedAt = toStringValue(value.submitted_at) ?? toStringValue(value.submittedAt)
  const workflowState = toStringValue(value.workflow_state) ?? toStringValue(value.workflowState)
  const grade = toStringValue(value.grade)
  const score = toNumberValue(value.score)

  if (!submittedAt && !workflowState && !grade && score == null) return undefined

  return {
    submitted_at: submittedAt ?? null,
    workflow_state: workflowState,
    grade,
    score,
  }
}

export function adaptCanvasAssignment(value: unknown): CanvasAssignment | null {
  if (!isRecord(value)) return null

  const id = toId(value.id) ?? toId(value._id)
  const name = toStringValue(value.name) ?? ''
  const dueAt = toStringValue(value.due_at) ?? toStringValue(value.dueAt) ?? null
  const pointsPossible =
    toNumberValue(value.points_possible) ?? toNumberValue(value.pointsPossible) ?? null
  const htmlUrl = toStringValue(value.html_url) ?? toStringValue(value.htmlUrl) ?? null
  const state = toStringValue(value.state) ?? toStringValue(value.workflow_state)
  const description = toStringValue(value.description)
  const submissionTypes = toStringArray(value.submission_types ?? value.submissionTypes)
  const submission = adaptAssignmentSubmission(value.submission)

  return {
    ...(id != null ? { id, _id: id } : {}),
    name,
    due_at: dueAt,
    dueAt,
    points_possible: pointsPossible,
    pointsPossible,
    html_url: htmlUrl ?? undefined,
    htmlUrl: htmlUrl ?? undefined,
    state,
    description,
    ...(submissionTypes.length > 0 ? { submission_types: submissionTypes } : {}),
    ...(submission ? { submission } : {}),
  }
}

export function adaptCanvasAssignments(value: unknown): CanvasAssignment[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => adaptCanvasAssignment(item))
    .filter((item): item is CanvasAssignment => item != null)
}

function adaptDiscussionParticipant(value: unknown): DiscussionView['participants'][number] | null {
  if (!isRecord(value)) return null
  const id = toId(value.id)
  if (id == null) return null
  return {
    id,
    display_name: toStringValue(value.display_name) ?? toStringValue(value.name),
    avatar_image_url: toStringValue(value.avatar_image_url),
  }
}

function adaptDiscussionAttachment(value: unknown): DiscussionEntry['attachment'] | undefined {
  if (!isRecord(value)) return undefined
  const id = toId(value.id)
  if (id == null) return undefined
  return {
    id,
    display_name: toStringValue(value.display_name),
    url: toStringValue(value.url),
  }
}

function adaptDiscussionEntry(value: unknown): DiscussionEntry | null {
  if (!isRecord(value)) return null

  const id = toId(value.id)
  const userId = toId(value.user_id) ?? toId(value.userId)
  if (id == null || userId == null) return null

  const message = toStringValue(value.message) ?? ''
  const createdAt = toStringValue(value.created_at) ?? toStringValue(value.createdAt) ?? ''
  const readState = toStringValue(value.read_state)

  return {
    id,
    user_id: userId,
    user_name: toStringValue(value.user_name),
    message,
    created_at: createdAt,
    updated_at: toStringValue(value.updated_at),
    ...(readState === 'read' || readState === 'unread' ? { read_state: readState } : {}),
    forced_read_state: toBooleanValue(value.forced_read_state),
    replies: Array.isArray(value.replies)
      ? value.replies
          .map((entry) => adaptDiscussionEntry(entry))
          .filter((entry): entry is DiscussionEntry => entry != null)
      : undefined,
    recent_replies: Array.isArray(value.recent_replies)
      ? value.recent_replies
          .map((entry) => adaptDiscussionEntry(entry))
          .filter((entry): entry is DiscussionEntry => entry != null)
      : undefined,
    has_more_replies: toBooleanValue(value.has_more_replies),
    attachment: adaptDiscussionAttachment(value.attachment),
  }
}

export function adaptDiscussionTopic(value: unknown): DiscussionTopic | null {
  if (!isRecord(value)) return null

  const id = toId(value.id)
  if (id == null) return null

  const readState = toStringValue(value.read_state)
  const discussionType = toStringValue(value.discussion_type)

  return {
    id,
    title: toStringValue(value.title) ?? '',
    message: toStringValue(value.message),
    html_url: toStringValue(value.html_url),
    posted_at: toStringValue(value.posted_at),
    last_reply_at: toStringValue(value.last_reply_at),
    discussion_subentry_count: toNumberValue(value.discussion_subentry_count),
    ...(readState === 'read' || readState === 'unread' ? { read_state: readState } : {}),
    unread_count: toNumberValue(value.unread_count),
    subscribed: toBooleanValue(value.subscribed),
    user_name: toStringValue(value.user_name),
    user_id: toId(value.user_id),
    locked: toBooleanValue(value.locked),
    pinned: toBooleanValue(value.pinned),
    require_initial_post: toBooleanValue(value.require_initial_post),
    ...(discussionType === 'side_comment' || discussionType === 'threaded'
      ? { discussion_type: discussionType }
      : {}),
    assignment_id: toId(value.assignment_id),
    delayed_post_at: toStringValue(value.delayed_post_at),
    lock_at: toStringValue(value.lock_at),
    author: (() => {
      if (!isRecord(value.author)) return undefined
      const authorId = toId(value.author.id)
      if (authorId == null) return undefined
      return {
        id: authorId,
        display_name: toStringValue(value.author.display_name),
        avatar_image_url: toStringValue(value.author.avatar_image_url),
      }
    })(),
  }
}

export function adaptDiscussionTopics(value: unknown): DiscussionTopic[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => adaptDiscussionTopic(item))
    .filter((item): item is DiscussionTopic => item != null)
}

export function adaptDiscussionView(value: unknown): DiscussionView {
  if (!isRecord(value)) {
    return { participants: [], unread_entries: [], view: [] }
  }

  const participants = Array.isArray(value.participants)
    ? value.participants
        .map((item) => adaptDiscussionParticipant(item))
        .filter((item): item is NonNullable<ReturnType<typeof adaptDiscussionParticipant>> => item != null)
    : []

  const unreadEntries = toIdArray(value.unread_entries)
  const view = Array.isArray(value.view)
    ? value.view
        .map((item) => adaptDiscussionEntry(item))
        .filter((item): item is DiscussionEntry => item != null)
    : []

  return {
    participants,
    unread_entries: unreadEntries,
    view,
  }
}

function adaptConversationParticipant(
  value: unknown,
): ConversationParticipant | null {
  if (!isRecord(value)) return null
  const id = toId(value.id)
  if (id == null) return null

  return {
    id,
    name: toStringValue(value.name),
    full_name: toStringValue(value.full_name),
    avatar_url: toStringValue(value.avatar_url),
  }
}

function adaptConversationAttachment(
  value: unknown,
): ConversationAttachment | null {
  if (!isRecord(value)) return null
  const id = toId(value.id)
  if (id == null) return null
  return {
    id,
    display_name: toStringValue(value.display_name),
    filename: toStringValue(value.filename),
    url: toStringValue(value.url),
    content_type: toStringValue(value.content_type),
    size: toNumberValue(value.size),
  }
}

function adaptConversationMessage(
  value: unknown,
): ConversationMessage | null {
  if (!isRecord(value)) return null
  const id = toId(value.id)
  const authorId = toId(value.author_id) ?? toId(value.authorId)
  if (id == null || authorId == null) return null

  const forwardedMessages = Array.isArray(value.forwarded_messages)
    ? value.forwarded_messages
        .map((msg) => adaptConversationMessage(msg))
        .filter((msg): msg is ConversationMessage => msg != null)
    : undefined

  const attachments = Array.isArray(value.attachments)
    ? value.attachments
        .map((attachment) => adaptConversationAttachment(attachment))
        .filter((attachment): attachment is ConversationAttachment => attachment != null)
    : undefined

  return {
    id,
    author_id: authorId,
    created_at: toStringValue(value.created_at) ?? '',
    body: toStringValue(value.body) ?? '',
    generated: toBooleanValue(value.generated),
    media_comment: isRecord(value.media_comment)
      ? {
          content_type: toStringValue(value.media_comment.content_type),
          url: toStringValue(value.media_comment.url),
        }
      : undefined,
    forwarded_messages: forwardedMessages,
    attachments,
  }
}

export function adaptConversation(
  value: unknown,
  fallbackId?: string | number,
): Conversation | null {
  if (!isRecord(value)) return null

  const id = toId(value.id) ?? fallbackId
  if (id == null) return null

  const workflowState = toStringValue(value.workflow_state)
  const safeWorkflowState =
    workflowState === 'read' || workflowState === 'unread' || workflowState === 'archived'
      ? workflowState
      : 'read'

  const messages = Array.isArray(value.messages)
    ? value.messages
        .map((msg) => adaptConversationMessage(msg))
        .filter((msg): msg is ConversationMessage => msg != null)
    : undefined

  const participants = Array.isArray(value.participants)
    ? value.participants
        .map((participant) => adaptConversationParticipant(participant))
        .filter((participant): participant is NonNullable<Conversation['participants']>[number] => participant != null)
    : undefined

  return {
    id,
    subject: toStringValue(value.subject),
    workflow_state: safeWorkflowState,
    last_message: toStringValue(value.last_message),
    last_message_at: toStringValue(value.last_message_at),
    last_authored_message: toStringValue(value.last_authored_message),
    last_authored_message_at: toStringValue(value.last_authored_message_at),
    message_count: toNumberValue(value.message_count) ?? messages?.length ?? 0,
    subscribed: toBooleanValue(value.subscribed) ?? false,
    private: toBooleanValue(value.private) ?? false,
    starred: toBooleanValue(value.starred) ?? false,
    properties: toStringArray(value.properties),
    audience: toIdArray(value.audience),
    audience_contexts: isRecord(value.audience_contexts)
      ? (value.audience_contexts as Record<string, { roles?: string[] }>)
      : undefined,
    avatar_url: toStringValue(value.avatar_url),
    participants,
    visible: toBooleanValue(value.visible) ?? true,
    context_code: toStringValue(value.context_code),
    context_name: toStringValue(value.context_name),
    messages,
  }
}

export type AdaptedConversationsPage = {
  items: Conversation[]
  nextPageUrl: string | null
}

export function adaptConversationsPage(value: unknown): AdaptedConversationsPage {
  if (Array.isArray(value)) {
    return {
      items: value
        .map((conversation) => adaptConversation(conversation))
        .filter((conversation): conversation is Conversation => conversation != null),
      nextPageUrl: null,
    }
  }

  if (!isRecord(value)) return { items: [], nextPageUrl: null }

  const items = Array.isArray(value.items)
    ? value.items
        .map((conversation) => adaptConversation(conversation))
        .filter((conversation): conversation is Conversation => conversation != null)
    : []

  return {
    items,
    nextPageUrl: toStringValue(value.nextPageUrl) ?? null,
  }
}
