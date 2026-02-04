import { Skeleton } from '../../components/Skeleton'
import { BackgroundLayer, useBackgroundSettings } from '../../components/BackgroundLayer'

function SkeletonNavItem({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`py-2 px-3 rounded-lg ${
        active
          ? 'bg-[var(--accent-200)] dark:bg-[var(--accent-50)] ring-1 ring-[var(--accent-300)] dark:ring-[var(--accent-300)] shadow-sm'
          : ''
      }`}
    >
      <Skeleton height="h-4" width={active ? 'w-20' : 'w-24'} />
    </div>
  )
}

function SkeletonCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white/70 dark:bg-neutral-900/70 rounded-2xl p-5 ring-1 ring-gray-200/80 dark:ring-neutral-700/80 ${className}`}
    >
      {children}
    </div>
  )
}

function SkeletonCourseRow() {
  return (
    <div className="py-2 px-3">
      <Skeleton height="h-4" width="w-28" />
    </div>
  )
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton width="w-10" height="h-10" variant="circular" />
      <div className="flex-1 space-y-2">
        <Skeleton height="h-4" width="w-3/4" />
        <Skeleton height="h-3" width="w-1/2" />
      </div>
    </div>
  )
}

export function AuthLoadingScreen() {
  const themeSettings = useBackgroundSettings()

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 relative">
      {/* Background layer - shows pattern/image if theme settings loaded */}
      {themeSettings && <BackgroundLayer settings={themeSettings} />}
      {/* Glass layer - picks up accent color if theme is loaded */}
      <div
        data-glass-layer
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{ backgroundColor: 'var(--app-accent-bg, transparent)' }}
        aria-hidden="true"
      />
      {/* Transparent draggable bar on startup */}
      <div
        className="absolute inset-x-0 top-0 h-14 app-drag titlebar-left-inset titlebar-right-inset z-50 bg-transparent"
        aria-hidden
      />

      {/* Skeleton Header - matches actual Header layout */}
      <header className="h-14 flex items-center justify-end px-5 gap-3 titlebar-left-inset relative z-10">
        {/* Search button skeleton */}
        <div className="hidden sm:flex items-center gap-2 rounded-md px-2.5 py-1.5 ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50">
          <Skeleton width="w-4" height="h-4" variant="rounded" />
          <Skeleton width="w-12" height="h-4" />
          <Skeleton width="w-8" height="h-5" variant="rounded" />
        </div>
        {/* Inbox button skeleton */}
        <div className="w-9 h-9 rounded-md ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-neutral-800/50 flex items-center justify-center">
          <Skeleton width="w-4" height="h-4" variant="rounded" />
        </div>
        {/* Account button skeleton */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1">
          <Skeleton width="w-8" height="h-8" variant="circular" />
          <div className="flex flex-col items-end gap-1">
            <Skeleton width="w-20" height="h-4" />
            <Skeleton width="w-32" height="h-3" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Skeleton Sidebar - matches actual Sidebar layout */}
        <aside className="w-64 min-w-[16rem] p-4 flex flex-col hidden md:flex">
          {/* At A Glance section */}
          <div className="mb-4">
            <div className="mb-2 px-3">
              <Skeleton height="h-3" width="w-20" />
            </div>
            <nav className="flex flex-col">
              <SkeletonNavItem active />
              <SkeletonNavItem />
              <SkeletonNavItem />
              <SkeletonNavItem />
              <SkeletonNavItem />
            </nav>
          </div>

          {/* Courses section */}
          <div className="mb-2">
            <div className="mb-2 px-3">
              <Skeleton height="h-3" width="w-16" />
            </div>
            <nav className="flex flex-col gap-1">
              <SkeletonCourseRow />
              <SkeletonCourseRow />
              <SkeletonCourseRow />
              <SkeletonCourseRow />
            </nav>
          </div>

          {/* All Courses at bottom */}
          <div className="mt-auto pt-2">
            <SkeletonNavItem />
          </div>
        </aside>

        {/* Skeleton Main Content - matches actual main content styling */}
        <main className="flex-1 flex overflow-hidden bg-white/50 dark:bg-neutral-900/50 rounded-tl-xl">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-6xl w-full mx-auto space-y-5">
              {/* Page title */}
              <Skeleton height="h-8" width="w-32" className="mb-2" />

              {/* First row of cards (Priority + Activity) */}
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
                {/* Priority card skeleton */}
                <SkeletonCard className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton width="w-7" height="h-7" variant="circular" />
                      <Skeleton width="w-16" height="h-5" />
                    </div>
                    <Skeleton width="w-20" height="h-8" variant="rounded" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonListItem />
                    <SkeletonListItem />
                    <SkeletonListItem />
                    <SkeletonListItem />
                  </div>
                </SkeletonCard>

                {/* Activity card skeleton */}
                <SkeletonCard className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton width="w-7" height="h-7" variant="circular" />
                    <Skeleton width="w-16" height="h-5" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonListItem />
                    <SkeletonListItem />
                    <SkeletonListItem />
                  </div>
                </SkeletonCard>
              </div>

              {/* Second row of cards (Feedback + Pinned) */}
              <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
                {/* Recent Feedback card skeleton */}
                <SkeletonCard className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton width="w-7" height="h-7" variant="circular" />
                      <Skeleton width="w-28" height="h-5" />
                    </div>
                    <Skeleton width="w-8" height="h-5" variant="rounded" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonListItem />
                    <SkeletonListItem />
                    <SkeletonListItem />
                  </div>
                </SkeletonCard>

                {/* Pinned Pages card skeleton */}
                <SkeletonCard className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton width="w-7" height="h-7" variant="circular" />
                    <Skeleton width="w-24" height="h-5" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonListItem />
                    <SkeletonListItem />
                  </div>
                </SkeletonCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
