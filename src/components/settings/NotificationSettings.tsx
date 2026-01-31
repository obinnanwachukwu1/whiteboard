import React from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'

type NotifSettings = {
  enabled: boolean
  notifyDueAssignments: boolean
  notifyNewGrades: boolean
  notifyNewAnnouncements: boolean
}

export function NotificationSettings() {
  const [settings, setSettings] = React.useState<NotifSettings>({
    enabled: true,
    notifyDueAssignments: true,
    notifyNewGrades: true,
    notifyNewAnnouncements: true,
  })

  // Load saved settings
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
        const notif = data.userSettings?.notifications || {}
        if (!mounted) return
        setSettings({
          enabled: notif.enabled ?? true,
          notifyDueAssignments: notif.notifyDueAssignments ?? true,
          notifyNewGrades: notif.notifyNewGrades ?? true,
          notifyNewAnnouncements: notif.notifyNewAnnouncements ?? true,
        })
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  const persist = React.useCallback(async (partial: Partial<NotifSettings>) => {
    try {
      const cfg = await window.settings.get?.()
      const data = (cfg?.ok ? (cfg.data as any) : {}) || {}
      const currentAll = data.userSettings || {}
      const currentNotif = currentAll.notifications || {}
      const next = { ...currentNotif, ...partial }
      await window.settings.set?.({
        userSettings: {
          ...currentAll,
          notifications: next,
        },
      })
    } catch {}
  }, [])

  const update = (partial: Partial<NotifSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
    persist(partial)
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
