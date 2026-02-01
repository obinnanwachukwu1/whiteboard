import { Skeleton, SkeletonList, SkeletonStats } from '../../components/Skeleton'

export function AuthLoadingScreen() {
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Transparent draggable bar on startup */}
      <div
        className="absolute inset-x-0 top-0 h-14 app-drag titlebar-left-inset titlebar-right-inset z-50 bg-transparent"
        aria-hidden
      />

      {/* Skeleton Header */}
      <div className="h-14 flex items-center justify-end px-4 gap-4">
        <Skeleton height="h-4" width="w-32" />
        <Skeleton width="w-8" height="h-8" variant="circular" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Skeleton Sidebar */}
        <div className="w-64 p-4 space-y-6 hidden md:block">
          <div className="space-y-3">
            <Skeleton height="h-4" width="w-20" />
            <SkeletonList count={3} variant="row" />
          </div>
        </div>

        {/* Skeleton Main Content */}
        <main className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-neutral-950">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            <Skeleton height="h-8" width="w-48" />
            <SkeletonStats count={3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Skeleton height="h-64" width="w-full" variant="rounded" />
              <Skeleton height="h-64" width="w-full" variant="rounded" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
