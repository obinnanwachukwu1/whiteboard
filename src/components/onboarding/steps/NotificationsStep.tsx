import type { StepProps } from '../OnboardingWizard'
import { useAppPreferences } from '../../../context/AppContext'
import { Toggle } from '../../settings/SettingsRow'

const NOTIFICATION_OPTIONS = [
  {
    key: 'notifyDueAssignments' as const,
    label: 'Due Assignments',
    desc: '24 hours before deadline',
  },
  {
    key: 'notifyNewGrades' as const,
    label: 'New Grades',
    desc: 'When grades are posted',
  },
  {
    key: 'notifyNewAnnouncements' as const,
    label: 'New Announcements',
    desc: 'Course announcements',
  },
]

export function NotificationsStep(_props: StepProps) {
  const { notificationSettings: settings, setNotificationSettings } = useAppPreferences()

  const update = (partial: Partial<typeof settings>) => {
    setNotificationSettings(partial).catch(() => {})
    if (partial.enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="text-center mb-8">
        <h2 className="animate-oobe-fade-up text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Stay in the loop
        </h2>
        <p className="animate-oobe-fade-up-1 mt-2 text-sm md:text-base text-slate-500 dark:text-neutral-400">
          Choose which notifications you&rsquo;d like to receive.
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full animate-oobe-fade-up-1">
        <div className="border-y border-gray-200/70 dark:border-neutral-700/70">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                Turn on notifications
              </p>
              <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                Receive alerts for important updates.
              </p>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={(checked) => update({ enabled: checked })}
            />
          </div>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
              settings.enabled ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}
            aria-hidden={!settings.enabled}
          >
            {NOTIFICATION_OPTIONS.map((item, index) => (
              <div
                key={item.key}
                className={`flex items-center justify-between gap-4 border-t border-gray-200/70 dark:border-neutral-700/70 py-3 transition-all duration-300 ${
                  settings.enabled
                    ? 'translate-y-0 opacity-100'
                    : '-translate-y-1.5 opacity-0 pointer-events-none'
                }`}
                style={{ transitionDelay: settings.enabled ? `${index * 45}ms` : '0ms' }}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <Toggle
                  checked={settings[item.key]}
                  onChange={(checked) => update({ [item.key]: checked })}
                  disabled={!settings.enabled}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
