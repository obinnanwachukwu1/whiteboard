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
  prefetchEnabled: boolean
  setPrefetchEnabled: (v: boolean) => Promise<void>
  onOpenCourse: (id: string | number) => void
  onOpenAssignment: (courseId: string | number, restId: string | number, title?: string) => void
  onOpenAnnouncement: (courseId: string | number, topicId: string | number, title?: string) => void
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

