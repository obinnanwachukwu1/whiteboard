import type { StepProps } from '../OnboardingWizard'

export function AllSetStep({ onSkip }: StepProps) {
  return (
    <div className="flex-1 flex items-center px-6 py-10 md:px-10 md:py-12">
      <div className="w-full max-w-3xl mx-auto">
        <h2 className="animate-oobe-fade-up text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          You&rsquo;re ready to go.
        </h2>

        <p className="animate-oobe-fade-up-1 mt-4 max-w-2xl text-base md:text-lg text-slate-600 dark:text-neutral-300 leading-relaxed">
          Whiteboard is configured and ready. You can revisit everything later in Settings.
        </p>

        <button
          onClick={onSkip}
          className="animate-oobe-fade-up-2 mt-10 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
          }}
        >
          Open Dashboard
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
