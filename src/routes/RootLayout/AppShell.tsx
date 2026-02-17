import { useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import {
  AppFlagsContext,
  AppSettingsContext,
  AppActionsContext,
  AppDataContext,
  AppDataActionsContext,
  AppPreferencesContext,
  type AppFlagsValue,
  type AppSettingsValue,
  type AppActionsValue,
  type AppDataValue,
  type AppDataActionsValue,
  type AppPreferencesValue,
} from '../../context/AppContext'
import { AIPanelProvider } from '../../context/AIPanelContext'
import { BackgroundLayer } from '../../components/BackgroundLayer'
import { Header } from '../../components/Header'
import { Sidebar, type SidebarConfig } from '../../components/Sidebar'
import { SearchModal } from '../../components/SearchModal'
import { InboxPanel } from '../../components/InboxPanel'
import { PinnedPanel } from '../../components/PinnedPanel'
import { SettingsModal } from '../../components/SettingsModal'
import { NotificationManager } from '../../components/NotificationManager'
import type { ThemeSettings } from '../../utils/theme'
import { AISidePanelKeyboardHandler } from './AISidePanelKeyboardHandler'
import { AISidePanel } from '../../components/AISidePanel'
import { OnboardingWizard } from '../../components/onboarding/OnboardingWizard'
import { useDashboardData } from '../../hooks/useDashboardData'

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
  preferencesContext: AppPreferencesValue
  actionsContext: AppActionsValue
  dataContext: AppDataValue
  dataActionsContext: AppDataActionsValue
  isEmbeddedContent: boolean
  themeSettings: ThemeSettings
  profile: any
  searchOpen: boolean
  settingsOpen: boolean
  pinnedOpen: boolean
  inboxOpen: boolean
  oobeOpen: boolean
  onCloseSearch: () => void
  onCloseSettings: () => void
  onClosePinned: () => void
  onCloseInbox: () => void
  onCloseOobe: () => void
  onOpenSearch: () => void
  onOpenPinned: () => void
  onOpenInbox: () => void
  pinnedCount: number
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
  onPrefetchNav: (
    tab: 'dashboard' | 'announcements' | 'assignments' | 'grades' | 'discussions',
  ) => void
  onReorder: (nextOrder: Array<string | number>) => void
}

function AppShellInner(props: Props) {
  const dashboard = useDashboardData({
    courses: props.aiEnabled ? (props.aiCourses as any[]) : [],
    sidebar: props.sidebarCfg,
    due: props.dataContext.due as any,
    loading: props.dataContext.loading,
  })

  const aiUserName = props.profile?.name || props.profile?.short_name || ''

  const aiPinnedCourses = useMemo(() => {
    const list = props.visibleCourses || []
    return list
      .slice(0, 8)
      .map((c: any) => {
        try {
          return dashboard.labelFor?.(c) || c?.name || c?.course_code || 'Course'
        } catch {
          return c?.name || c?.course_code || 'Course'
        }
      })
      .filter(Boolean)
  }, [props.visibleCourses, dashboard.labelFor])

  const aiCourseGrades = useMemo(() => {
    if (!props.aiEnabled) return []
    const list = dashboard.orderedVisibleCourses || []
    return list.slice(0, 30).map((c: any) => ({
      courseId: c.id,
      courseName: dashboard.labelFor(c),
      grade: dashboard.gradeForCourse(c.id),
    }))
  }, [
    props.aiEnabled,
    dashboard.orderedVisibleCourses,
    dashboard.labelFor,
    dashboard.gradeForCourse,
  ])

  const aiRecentSubmissions = useMemo(() => {
    if (!props.aiEnabled) return []
    const list = dashboard.recentFeedback || []
    return list.map((s: any) => ({
      courseId: s.courseId,
      courseName: s.courseName,
      assignmentId: s.id,
      name: s.name,
      score: s.score,
      pointsPossible: s.pointsPossible,
      gradedAt: s.gradedAt,
      htmlUrl: s.htmlUrl,
    }))
  }, [props.aiEnabled, dashboard.recentFeedback])

  return (
    <AIPanelProvider
      embeddingsEnabled={props.embeddingsEnabled}
      aiEnabled={props.aiEnabled}
      userName={aiUserName}
      pinnedCourses={aiPinnedCourses}
      dueAssignments={props.aiDueAssignments}
      courses={props.aiCourses}
      courseGrades={aiCourseGrades}
      recentSubmissions={aiRecentSubmissions}
    >
      {props.isEmbeddedContent ? (
        <>
          <BackgroundLayer settings={props.themeSettings} />
          <div
            data-glass-layer
            className="fixed inset-0 z-[5] pointer-events-none"
            style={{ backgroundColor: 'var(--app-accent-bg)' }}
            aria-hidden="true"
          />
          <div className="h-screen w-screen bg-[var(--app-accent-root)] relative z-10">
            <main className="h-full w-full overflow-hidden">
              <div className="h-full w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
          <BackgroundLayer settings={props.themeSettings} />
          {/* Global glass layer - provides consistent blur/tint across entire app */}
          <div
            data-glass-layer
            className="fixed inset-0 z-[5] pointer-events-none"
            style={{ backgroundColor: 'var(--app-accent-bg)' }}
            aria-hidden="true"
          />
          <div className="h-screen flex flex-col relative z-10">
            <Header
              profile={props.profile}
              onOpenSearch={props.onOpenSearch}
              onOpenPinned={props.onOpenPinned}
              pinnedCount={props.pinnedCount}
              onOpenInbox={props.onOpenInbox}
            />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                courses={props.visibleCourses}
                activeCourseId={
                  props.currentView === 'course'
                    ? (props.derivedCourseId ?? props.activeCourseId)
                    : null
                }
                sidebar={props.sidebarCfg}
                current={props.currentView}
                onSelectDashboard={props.onSelectDashboard}
                onSelectAnnouncements={props.onSelectAnnouncements}
                onSelectAssignments={props.onSelectAssignments}
                onSelectGrades={props.onSelectGrades}
                onSelectDiscussions={props.onSelectDiscussions}
                onSelectCourse={props.onSelectCourse}
                onOpenAllCourses={props.onOpenAllCourses}
                onHideCourse={props.onHideCourse}
                onPrefetchCourse={props.onPrefetchCourse}
                onPrefetchNav={props.onPrefetchNav}
                onReorder={props.onReorder}
              />
              <main className="flex-1 flex overflow-hidden bg-white/50 dark:bg-neutral-900/50 rounded-tl-xl">
                {/* Content area - shrinks when AI panel is open */}
                <div
                  className={`flex-1 flex flex-col min-h-0 min-w-0 p-6 ${props.currentView === 'course' ? 'pt-24 overflow-hidden' : 'overflow-y-auto scrollbar-overlay'}`}
                >
                  <div
                    className={`max-w-6xl w-full mx-auto ${props.currentView === 'course' ? 'flex-1 flex flex-col min-h-0' : ''}`}
                  >
                    <Outlet />
                  </div>
                </div>

                {/* AI Side Panel - flex sibling, content shrinks to accommodate */}
                <AISidePanel />
              </main>
            </div>
          </div>
          <SearchModal isOpen={props.searchOpen} onClose={props.onCloseSearch} />
          <SettingsModal isOpen={props.settingsOpen} onClose={props.onCloseSettings} />
          <PinnedPanel isOpen={props.pinnedOpen} onClose={props.onClosePinned} />
          <InboxPanel isOpen={props.inboxOpen} onClose={props.onCloseInbox} />
          <OnboardingWizard isOpen={props.oobeOpen} onClose={props.onCloseOobe} />
          <AISidePanelKeyboardHandler />
          <NotificationManager paused={props.oobeOpen} />
        </>
      )}
    </AIPanelProvider>
  )
}

export function AppShell(props: Props) {
  return (
    <AppFlagsContext.Provider value={props.flagsContext}>
      <AppSettingsContext.Provider value={props.settingsContext}>
        <AppPreferencesContext.Provider value={props.preferencesContext}>
          <AppActionsContext.Provider value={props.actionsContext}>
            <AppDataContext.Provider value={props.dataContext}>
              <AppDataActionsContext.Provider value={props.dataActionsContext}>
                <AppShellInner {...props} />
              </AppDataActionsContext.Provider>
            </AppDataContext.Provider>
          </AppActionsContext.Provider>
        </AppPreferencesContext.Provider>
      </AppSettingsContext.Provider>
    </AppFlagsContext.Provider>
  )
}
