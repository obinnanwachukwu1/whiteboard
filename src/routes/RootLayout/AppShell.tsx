import { Outlet } from '@tanstack/react-router'
import {
  AppFlagsContext,
  AppSettingsContext,
  AppActionsContext,
  AppDataContext,
  AppDataActionsContext,
  type AppFlagsValue,
  type AppSettingsValue,
  type AppActionsValue,
  type AppDataValue,
  type AppDataActionsValue,
} from '../../context/AppContext'
import { AIPanelProvider } from '../../context/AIPanelContext'
import { BackgroundLayer } from '../../components/BackgroundLayer'
import { Header } from '../../components/Header'
import { Sidebar, type SidebarConfig } from '../../components/Sidebar'
import { SearchModal } from '../../components/SearchModal'
import { InboxPanel } from '../../components/InboxPanel'
import { SettingsModal } from '../../components/SettingsModal'
import { NotificationManager } from '../../components/NotificationManager'
import type { ThemeSettings } from '../../utils/theme'
import { AIPanelKeyboardHandler } from './AIPanelKeyboardHandler'

type CurrentView =
  | 'dashboard'
  | 'announcements'
  | 'assignments'
  | 'grades'
  | 'discussions'
  | 'course'
  | 'allCourses'

type Props = {
  embeddingsEnabled: boolean
  aiEnabled: boolean
  aiDueAssignments: any[]
  aiCourses: any[]
  flagsContext: AppFlagsValue
  settingsContext: AppSettingsValue
  actionsContext: AppActionsValue
  dataContext: AppDataValue
  dataActionsContext: AppDataActionsValue
  isEmbeddedContent: boolean
  themeSettings: ThemeSettings
  profile: any
  searchOpen: boolean
  settingsOpen: boolean
  inboxOpen: boolean
  onCloseSearch: () => void
  onCloseSettings: () => void
  onCloseInbox: () => void
  onOpenSearch: () => void
  onOpenInbox: () => void
  visibleCourses: any[]
  currentView: CurrentView
  derivedCourseId: string | null
  activeCourseId: string | number | null
  sidebarCfg: SidebarConfig
  onSelectDashboard: () => void
  onSelectAnnouncements: () => void
  onSelectAssignments: () => void
  onSelectGrades: () => void
  onSelectDiscussions: () => void
  onSelectCourse: (id: string | number) => void
  onOpenAllCourses: () => void
  onHideCourse: (id: string | number) => void
  onPrefetchCourse: (id: string | number) => void
  onPrefetchNav: (tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions') => void
  onReorder: (nextOrder: Array<string | number>) => void
}

export function AppShell({
  embeddingsEnabled,
  aiEnabled,
  aiDueAssignments,
  aiCourses,
  flagsContext,
  settingsContext,
  actionsContext,
  dataContext,
  dataActionsContext,
  isEmbeddedContent,
  themeSettings,
  profile,
  searchOpen,
  settingsOpen,
  inboxOpen,
  onCloseSearch,
  onCloseSettings,
  onCloseInbox,
  onOpenSearch,
  onOpenInbox,
  visibleCourses,
  currentView,
  derivedCourseId,
  activeCourseId,
  sidebarCfg,
  onSelectDashboard,
  onSelectAnnouncements,
  onSelectAssignments,
  onSelectGrades,
  onSelectDiscussions,
  onSelectCourse,
  onOpenAllCourses,
  onHideCourse,
  onPrefetchCourse,
  onPrefetchNav,
  onReorder,
}: Props) {
  return (
    <AIPanelProvider
      embeddingsEnabled={embeddingsEnabled}
      aiEnabled={aiEnabled}
      dueAssignments={aiDueAssignments}
      courses={aiCourses}
    >
      <AppFlagsContext.Provider value={flagsContext}>
        <AppSettingsContext.Provider value={settingsContext}>
          <AppActionsContext.Provider value={actionsContext}>
            <AppDataContext.Provider value={dataContext}>
              <AppDataActionsContext.Provider value={dataActionsContext}>
                {isEmbeddedContent ? (
                  <div className="h-screen w-screen bg-gray-50 dark:bg-neutral-950">
                    <main className="h-full w-full overflow-hidden">
                      <div className="h-full w-full">
                        <Outlet />
                      </div>
                    </main>
                  </div>
                ) : (
                  <>
                    <BackgroundLayer settings={themeSettings} />
                    {/* Global glass layer - provides consistent blur/tint across entire app */}
                    <div
                      className="fixed inset-0 z-[5] pointer-events-none"
                      style={{ backgroundColor: 'var(--app-accent-bg)' }}
                      aria-hidden="true"
                    />
                    <div className="h-screen flex flex-col relative z-10">
                      <Header
                        profile={profile}
                        onOpenSearch={onOpenSearch}
                        onOpenInbox={onOpenInbox}
                      />
                      <div className="flex flex-1 overflow-hidden">
                        <Sidebar
                          courses={visibleCourses}
                          activeCourseId={
                            currentView === 'course' ? (derivedCourseId ?? activeCourseId) : null
                          }
                          sidebar={sidebarCfg}
                          current={currentView}
                          onSelectDashboard={onSelectDashboard}
                          onSelectAnnouncements={onSelectAnnouncements}
                          onSelectAssignments={onSelectAssignments}
                          onSelectGrades={onSelectGrades}
                          onSelectDiscussions={onSelectDiscussions}
                          onSelectCourse={onSelectCourse}
                          onOpenAllCourses={onOpenAllCourses}
                          onHideCourse={onHideCourse}
                          onPrefetchCourse={onPrefetchCourse}
                          onPrefetchNav={onPrefetchNav}
                          onReorder={onReorder}
                        />
                        <main className="flex-1 flex flex-col overflow-hidden bg-white/50 dark:bg-neutral-900/50 rounded-tl-xl">
                          <div
                            className={`flex-1 flex flex-col min-h-0 p-6 ${currentView === 'course' ? 'pt-24 overflow-hidden' : 'overflow-y-auto'}`}
                          >
                            <div
                              className={`max-w-6xl w-full mx-auto ${currentView === 'course' ? 'flex-1 flex flex-col min-h-0' : ''}`}
                            >
                              <Outlet />
                            </div>
                          </div>
                        </main>
                      </div>
                    </div>
                    <SearchModal isOpen={searchOpen} onClose={onCloseSearch} />
                    <SettingsModal isOpen={settingsOpen} onClose={onCloseSettings} />
                    <InboxPanel isOpen={inboxOpen} onClose={onCloseInbox} />
                    <AIPanelKeyboardHandler />
                    <NotificationManager />
                  </>
                )}
              </AppDataActionsContext.Provider>
            </AppDataContext.Provider>
          </AppActionsContext.Provider>
        </AppSettingsContext.Provider>
      </AppFlagsContext.Provider>
    </AIPanelProvider>
  )
}
