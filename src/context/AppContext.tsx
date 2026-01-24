import React from 'react'
import type { SidebarConfig } from '../components/Sidebar'

export type AppContextValue = {
  baseUrl: string
  courses: any[]
  due: any[]
  profile: any
  loading: boolean
  sidebar: SidebarConfig
  setSidebar: (next: SidebarConfig) => Promise<void>
  courseImages: Record<string, string>
  setCourseImages: (map: Record<string, string>) => Promise<void>
  prefetchEnabled: boolean
  setPrefetchEnabled: (v: boolean) => Promise<void>
  pdfGestureZoomEnabled: boolean
  setPdfGestureZoomEnabled: (v: boolean) => Promise<void>
  embeddingsEnabled: boolean
  setEmbeddingsEnabled: (v: boolean) => Promise<void>
  aiEnabled: boolean
  setAiEnabled: (v: boolean) => Promise<void>
  verbose: boolean
  setVerbose: (v: boolean) => Promise<void>
  saveUserSettings: (partial: Record<string, any>) => Promise<void>
  onOpenCourse: (id: string | number) => void
  onOpenAssignment: (courseId: string | number, restId: string | number, title?: string) => void
  onOpenAnnouncement: (courseId: string | number, topicId: string | number, title?: string) => void
  onOpenDiscussion: (courseId: string | number, topicId: string | number, title?: string) => void
  onOpenPage: (courseId: string | number, pageUrlOrSlug: string, title?: string) => void
  onOpenFile: (courseId: string | number, fileId: string | number, title?: string) => void
  onOpenModules: (courseId: string | number) => void
  onSignOut: () => Promise<void>
  onOpenSettings: () => void
}

export const AppContext = React.createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export function AppProvider({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
