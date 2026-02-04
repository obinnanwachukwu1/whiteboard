import React from 'react'
import type { SidebarConfig } from '../components/Sidebar'

export type AppFlagsValue = {
  aiEnabled: boolean
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
    type: 'course' | 'assignment' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
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
    type: 'course' | 'assignment' | 'page' | 'discussion' | 'announcement' | 'file' | 'url'
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
