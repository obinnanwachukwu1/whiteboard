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
  id?: string
  _id?: string | number
  name: string
  dueAt?: string
  state?: string
  pointsPossible?: number
  htmlUrl?: string
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
