import { Eye, EyeOff, ExternalLink } from 'lucide-react'

type Props = {
  baseUrl: string
  token: string
  showToken: boolean
  loading: boolean
  onBaseUrlChange: (next: string) => void
  onBaseUrlBlur: () => void
  onTokenChange: (next: string) => void
  onToggleShow: () => void
  onOpenTokenHelp: () => void
  onConnect: () => void
}

export function SignInScreen({
  baseUrl,
  token,
  showToken,
  loading,
  onBaseUrlChange,
  onBaseUrlBlur,
  onTokenChange,
  onToggleShow,
  onOpenTokenHelp,
  onConnect,
}: Props) {
  return (
    <div className="h-screen w-screen relative overflow-hidden flex flex-col">
      {/* Transparent draggable bar (doesn't affect layout) */}
      <div
        className="absolute inset-x-0 top-0 h-14 app-drag titlebar-left-inset titlebar-right-inset z-50 bg-transparent"
        aria-hidden
      />
      {/* Animated gradient ribbon overlay */}
      <div className="absolute inset-x-0 -top-1/3 h-1/2 -z-10 bg-gradient-to-r from-sky-400 via-violet-500 to-rose-400 opacity-40 blur-3xl animate-gradient" />
      {/* Ambient orbs */}
      <div
        className="absolute -z-10 -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-25 animate-float"
        style={{
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), transparent)',
        }}
      />
      <div
        className="absolute -z-10 -bottom-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-20 animate-float-delayed"
        style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.5), transparent)' }}
      />

      <div className="flex-1 w-full flex flex-col items-center justify-center p-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Brand + Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full ring-1 ring-black/10 dark:ring-white/10 bg-white/40 dark:bg-neutral-900/40 text-xs tracking-wide uppercase text-slate-700 dark:text-neutral-200">
              Welcome
            </div>
            <h1 className="mt-3 mb-3 text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-violet-500 to-rose-500 animate-gradient">
              Whiteboard
            </h1>
            <p className="text-slate-700 dark:text-neutral-300 text-base md:text-lg max-w-prose">
              Your fast, focused companion for Canvas. Stay on top of assignments, files, and
              announcements without the noise.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-700 dark:text-neutral-300">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40">
                ⚡ Fast navigation
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40">
                📂 Clean file browsing
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-card ring-1 ring-black/10 dark:ring-white/10 bg-white/50 dark:bg-neutral-900/40">
                🔔 Upcoming at a glance
              </span>
            </div>
          </div>

          {/* Right: Connect form (no gradient on box) */}
          <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 p-6 shadow-card bg-white/85 dark:bg-neutral-900/85">
            <h2 className="mt-0 mb-4 text-slate-900 dark:text-slate-100 text-lg font-semibold">
              Connect to Canvas
            </h2>
            <div className="grid gap-4">
              <label className="text-sm">
                <div className="mb-1">Base URL</div>
                <input
                  className="w-full rounded-control border px-3 py-2 bg-white/90 dark:bg-neutral-900"
                  value={baseUrl}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  onBlur={onBaseUrlBlur}
                  placeholder="https://your.school.instructure.com"
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>Token</span>
                  <button
                    type="button"
                    className="text-xs text-slate-600 dark:text-neutral-300 hover:underline inline-flex items-center gap-1"
                    onClick={onOpenTokenHelp}
                    title="Open Canvas token settings"
                  >
                    <ExternalLink className="w-3 h-3" /> How to get a token
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="w-full rounded-control border pl-3 pr-9 py-2 bg-white/90 dark:bg-neutral-900"
                    value={token}
                    onChange={(e) => onTokenChange(e.target.value)}
                    placeholder="Paste token (stored securely)"
                    type={showToken ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    onClick={onToggleShow}
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
              <div className="text-xs text-slate-600 dark:text-neutral-300">
                We store your token securely with the system keychain when available.
              </div>
              <div className="pt-1 flex items-center justify-end">
                <button
                  className="px-4 py-2 rounded-control bg-slate-900 text-white disabled:opacity-50 hover:opacity-95"
                  onClick={onConnect}
                  disabled={loading || !token.trim()}
                >
                  {loading ? 'Connecting…' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
