import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { useAppPreferences } from '../../context/AppContext'

export function NotificationSettings() {
  const { notificationSettings: settings, setNotificationSettings } = useAppPreferences()

  const update = (partial: Partial<typeof settings>) => {
    setNotificationSettings(partial).catch(() => {})
    // Request permission when enabling
    if (partial.enabled && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  return (
    <SettingsSection title="Notifications">
      <SettingsRow
        label="Desktop Notifications"
        description="Receive alerts for important updates"
      >
        <Toggle
          checked={settings.enabled}
          onChange={(checked) => update({ enabled: checked })}
        />
      </SettingsRow>

      <SettingsRow
        label="Due Assignments"
        description="24 hours before deadline"
        indent
        disabled={!settings.enabled}
      >
        <Toggle
          checked={settings.notifyDueAssignments}
          onChange={(checked) => update({ notifyDueAssignments: checked })}
          disabled={!settings.enabled}
        />
      </SettingsRow>

      <SettingsRow
        label="New Grades"
        indent
        disabled={!settings.enabled}
      >
        <Toggle
          checked={settings.notifyNewGrades}
          onChange={(checked) => update({ notifyNewGrades: checked })}
          disabled={!settings.enabled}
        />
      </SettingsRow>

      <SettingsRow
        label="New Announcements"
        indent
        disabled={!settings.enabled}
      >
        <Toggle
          checked={settings.notifyNewAnnouncements}
          onChange={(checked) => update({ notifyNewAnnouncements: checked })}
          disabled={!settings.enabled}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
