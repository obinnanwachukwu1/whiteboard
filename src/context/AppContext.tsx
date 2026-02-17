import React from 'react'
import type { SidebarConfig } from '../components/Sidebar'
import type { ThemeSettings } from '../utils/theme'

export type AIAvailabilityStatus = 'available' | 'unsupported' | 'disabled' | 'error'

export type AIAvailability = {
  status: AIAvailabilityStatus
  detail?: string
}

export type AppFlagsValue = {
  aiEnabled: boolean
  aiAvailable: boolean
  aiAvailability: AIAvailability | null
  canvasWriteEnabled: boolean
  canvasWriteForcedBySchool: boolean
  showcaseModeEnabled: boolean
  embeddingsEnabled: boolean
  privateModeEnabled: boolean
  privateModeAcknowledged: boolean
  encryptionEnabled: boolean
  prefetchEnabled: boolean
  reduceEffectsEnabled: boolean
  externalEmbedsEnabled: boolean
  externalMediaEnabled: boolean
  pdfGestureZoomEnabled: boolean
  verbose: boolean
}

export const AppFlagsContext = React.createContext<AppFlagsValue | null>(null)

export function useAppFlags(): AppFlagsValue {
  const ctx = React.useContext(AppFlagsContext)
  if (!ctx) throw new Error('useAppFlags must be used within AppFlagsContext.Provider')
  return ctx
}

export type AppSettingsValue = {
  setCanvasWriteEnabled: (v: boolean) => Promise<void>
  setPrefetchEnabled: (v: boolean) => Promise<void>
  setReduceEffectsEnabled: (v: boolean) => Promise<void>
  setExternalEmbedsEnabled: (v: boolean) => Promise<void>
  setExternalMediaEnabled: (v: boolean) => Promise<void>
  setPdfGestureZoomEnabled: (v: boolean) => Promise<void>
  setEmbeddingsEnabled: (v: boolean) => Promise<void>
  setAiEnabled: (v: boolean) => Promise<void>
  setPrivateModeEnabled: (v: boolean) => Promise<void>
  setEncryptionEnabled: (v: boolean) => Promise<void>
  setVerbose: (v: boolean) => Promise<void>
}

export const AppSettingsContext = React.createContext<AppSettingsValue | null>(null)

export function useAppSettings(): AppSettingsValue {
  const ctx = React.useContext(AppSettingsContext)
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsContext.Provider')
  return ctx
}

export type AppActionsValue = {
  onOpenCourse: (id: string | number) => void
  onOpenAssignment: (courseId: string | number, restId: string | number, title?: string) => void
  onOpenQuiz: (courseId: string | number, quizId: string | number, title?: string) => void
  onOpenAnnouncement: (courseId: string | number, topicId: string | number, title?: string) => void
  onOpenDiscussion: (courseId: string | number, topicId: string | number, title?: string) => void
  onOpenPage: (courseId: string | number, pageUrlOrSlug: string, title?: string) => void
  onOpenFile: (courseId: string | number, fileId: string | number, title?: string) => void
  onOpenModules: (courseId: string | number) => void
  onOpenSearch: () => void
  onSignOut: () => Promise<void>
  onOpenSettings: () => void
  pinItem: (item: {
    id: string
    type: 'course' | 'assignment' | 'quiz' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
    title: string
    subtitle?: string
    url?: string
    courseId?: string | number
    contentId?: string | number
  }) => void
  unpinItem: (id: string) => void
}

export const AppActionsContext = React.createContext<AppActionsValue | null>(null)

export function useAppActions(): AppActionsValue {
  const ctx = React.useContext(AppActionsContext)
  if (!ctx) throw new Error('useAppActions must be used within AppActionsContext.Provider')
  return ctx
}

export type AppDataValue = {
  baseUrl: string
  courses: any[]
  due: any[]
  profile: any
  loading: boolean
  sidebar: SidebarConfig
  courseImages: Record<string, string>
  pinnedItems: Array<{
    id: string
    type: 'course' | 'assignment' | 'quiz' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
    title: string
    subtitle?: string
    url?: string
    courseId?: string | number
    contentId?: string | number
  }>
}

export const AppDataContext = React.createContext<AppDataValue | null>(null)

export function useAppData(): AppDataValue {
  const ctx = React.useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataContext.Provider')
  return ctx
}

export type AppDataActionsValue = {
  setSidebar: (next: SidebarConfig) => Promise<void>
  setCourseImages: (map: Record<string, string>) => Promise<void>
}

export const AppDataActionsContext = React.createContext<AppDataActionsValue | null>(null)

export function useAppDataActions(): AppDataActionsValue {
  const ctx = React.useContext(AppDataActionsContext)
  if (!ctx) throw new Error('useAppDataActions must be used within AppDataActionsContext.Provider')
  return ctx
}

export type NotificationSettings = {
  enabled: boolean
  notifyDueAssignments: boolean
  notifyNewGrades: boolean
  notifyNewAnnouncements: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyDueAssignments: true,
  notifyNewGrades: true,
  notifyNewAnnouncements: true,
}

export type GpaRow = { min: number; gpa: number }

export const DEFAULT_GPA_MAPPING: GpaRow[] = [
  { min: 90, gpa: 4.0 },
  { min: 80, gpa: 3.0 },
  { min: 70, gpa: 2.0 },
  { min: 60, gpa: 1.0 },
  { min: 0, gpa: 0.0 },
]

export type GpaSettings = {
  priorTotals: { credits: string; gpa: string }
  mapping: GpaRow[]
}

export const DEFAULT_GPA_SETTINGS: GpaSettings = {
  priorTotals: { credits: '', gpa: '' },
  mapping: DEFAULT_GPA_MAPPING,
}

export type AppPreferencesValue = {
  themeSettings: ThemeSettings
  notificationSettings: NotificationSettings
  setNotificationSettings: (partial: Partial<NotificationSettings>) => Promise<void>
  gpaSettings: GpaSettings
  setGpaSettings: (partial: Partial<GpaSettings>) => Promise<void>
}

export const AppPreferencesContext = React.createContext<AppPreferencesValue | null>(null)

export function useAppPreferences(): AppPreferencesValue {
  const ctx = React.useContext(AppPreferencesContext)
  if (!ctx)
    throw new Error('useAppPreferences must be used within AppPreferencesContext.Provider')
  return ctx
}
