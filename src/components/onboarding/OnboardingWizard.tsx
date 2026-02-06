import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAppFlags } from '../../context/AppContext'
import { WelcomeStep } from './steps/WelcomeStep'
import { AppearanceStep } from './steps/AppearanceStep'
import { NotificationsStep } from './steps/NotificationsStep'
import { GradesStep } from './steps/GradesStep'
import {
  DashboardTourStep,
  SearchTourStep,
  AssignmentsTourStep,
} from './steps/FeatureTourStep'
import { DeepSearchStep } from './steps/DeepSearchStep'
import { AIStep } from './steps/AIStep'
import { AllSetStep } from './steps/AllSetStep'

export type StepProps = {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  isFirst: boolean
  isLast: boolean
  stepIndex: number
  totalSteps: number
}

type StepDef = {
  id: string
  title: string
  description: string
  component: React.ComponentType<StepProps>
}

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingWizard({ isOpen, onClose }: Props) {
  const { aiAvailability } = useAppFlags()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const steps = useMemo<StepDef[]>(() => {
    const isMac = window.platform?.isMac ?? false
    const showAI = isMac && aiAvailability?.status !== 'unsupported'

    const list: StepDef[] = [
      {
        id: 'welcome',
        title: 'Welcome',
        description: 'Get Whiteboard tuned for your workflow.',
        component: WelcomeStep,
      },
      {
        id: 'appearance',
        title: 'Appearance',
        description: 'Set your theme and accent.',
        component: AppearanceStep,
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Choose what should interrupt you.',
        component: NotificationsStep,
      },
      {
        id: 'grades',
        title: 'GPA',
        description: 'Configure grade mapping and prior record.',
        component: GradesStep,
      },
      {
        id: 'tour-dashboard',
        title: 'Dashboard Tour',
        description: 'See your priorities and activity at a glance.',
        component: DashboardTourStep,
      },
      {
        id: 'tour-assignments',
        title: 'Assignments Tour',
        description: 'Track work in kanban and calendar views.',
        component: AssignmentsTourStep,
      },
      {
        id: 'tour-search',
        title: 'Search Tour',
        description: 'Find content across your courses quickly.',
        component: SearchTourStep,
      },
      {
        id: 'deep-search',
        title: 'Deep Search',
        description: 'Search by meaning across your courses.',
        component: DeepSearchStep,
      },
    ]

    if (showAI) {
      list.push({
        id: 'ai',
        title: 'Whiteboard AI',
        description: 'Enable local AI assistance.',
        component: AIStep,
      })
    }

      list.push({
        id: 'all-set',
        title: 'Done',
        description: '',
        component: AllSetStep,
      })

    return list
  }, [aiAvailability])

  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setDirection('forward')
      setIsClosing(false)
      setIsVisible(true)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 200)
  }, [onClose])

  useEffect(() => {
    if (!isVisible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [isVisible, handleClose])

  const onNext = useCallback(() => {
    if (step < steps.length - 1) {
      setDirection('forward')
      setStep((s) => s + 1)
    }
  }, [step, steps.length])

  const onBack = useCallback(() => {
    if (step > 0) {
      setDirection('backward')
      setStep((s) => s - 1)
    }
  }, [step])

  if (!isOpen && !isVisible) return null

  const currentStep = steps[step]
  if (!currentStep) return null

  const StepComponent = currentStep.component
  const progress = ((step + 1) / steps.length) * 100

  const stepProps: StepProps = {
    onNext,
    onBack,
    onSkip: handleClose,
    isFirst: step === 0,
    isLast: step === steps.length - 1,
    stepIndex: step,
    totalSteps: steps.length,
  }

  return (
    <div
      className={`fixed inset-0 z-[200] overflow-hidden ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      style={{ backgroundColor: 'var(--app-accent-root)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        />
        <div
          className="absolute -bottom-28 right-0 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: 'var(--accent-400)' }}
        />
      </div>

      <div className="relative h-full w-full">
        <div
          className={`relative h-full w-full overflow-hidden bg-[var(--glass-bg)] backdrop-blur-xl flex flex-col ${
            isClosing ? 'animate-oobe-out' : 'animate-oobe-in'
          }`}
        >
          <div className="h-14 app-drag titlebar-left-inset titlebar-right-inset border-b border-gray-200/60 dark:border-neutral-800/80">
            <div className="h-full" />
          </div>

          <header className="border-b border-gray-200/60 dark:border-neutral-800/80 px-5 md:px-8 py-4 md:py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">
                  Onboarding
                </p>
                <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {currentStep.title}
                </h1>
              </div>
            </div>

            <div className="mt-4 h-1 rounded-full bg-gray-200/60 dark:bg-neutral-700/70">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, backgroundColor: 'var(--accent-primary)' }}
              />
            </div>
          </header>

          <div className="flex-1 min-h-0">
            <section className="min-h-0 overflow-y-auto">
              <div
                key={currentStep.id}
                className={`min-h-full flex flex-col ${
                  direction === 'forward' ? 'animate-oobe-slide-in-right' : 'animate-oobe-slide-in-left'
                }`}
              >
                <StepComponent {...stepProps} />
              </div>
            </section>
          </div>

          {step !== 0 && step !== steps.length - 1 && (
            <footer className="border-t border-gray-200/60 dark:border-neutral-800/80 px-5 md:px-8 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-neutral-300 hover:bg-white/70 dark:hover:bg-neutral-800/70 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-180">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>

              <div className="hidden sm:flex gap-1.5">
                {steps.map((stepDef, i) => (
                  <div
                    key={stepDef.id}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === step
                        ? 'w-6'
                        : i < step
                          ? 'w-2 opacity-70'
                          : 'w-2 bg-slate-300 dark:bg-neutral-600 opacity-60'
                    }`}
                    style={i <= step ? { backgroundColor: 'var(--accent-primary)' } : undefined}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
                  }}
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}
