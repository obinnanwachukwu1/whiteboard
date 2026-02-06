import type { StepProps } from '../OnboardingWizard'
import { useAppData } from '../../../context/AppContext'

export function WelcomeStep({ onNext }: StepProps) {
  const data = useAppData()
  const rawName = ((data?.profile as any)?.short_name || (data?.profile as any)?.name || '').trim()
  const firstName = rawName.split(/\s+/)[0] || ''
  const greeting = firstName ? `Welcome, ${firstName}` : 'Welcome'

  return (
    <div className="flex-1 flex items-center px-6 py-10 md:px-10 md:py-12">
      <div className="w-full max-w-3xl mx-auto">
        <div className="animate-oobe-fade-up flex justify-center">
          <img
            src="/icon.png"
            alt="Whiteboard"
            className="w-16 h-16 rounded-2xl object-cover shadow-lg"
          />
        </div>

        <h2 className="animate-oobe-fade-up-1 mt-5 text-center text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {greeting}
        </h2>

        <p className="animate-oobe-fade-up-2 mt-4 max-w-2xl mx-auto text-center text-base md:text-lg text-slate-600 dark:text-neutral-300 leading-relaxed">
          Let&rsquo;s make Whiteboard feel right from day one. You can change everything later,
          but this gets your defaults in place now.
        </p>

        <div className="mt-10 flex justify-center">
          <button
            onClick={onNext}
            className="animate-oobe-fade-up-3 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
            }}
          >
            Continue
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
