import { SettingsSection } from './SettingsSection'
import { ActionButton } from './SettingsRow'
import { useAppContext } from '../../context/AppContext'

export function AccountSettings() {
  const ctx = useAppContext()

  return (
    <SettingsSection title="Account">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
            {ctx.profile?.name || 'Signed in'}
          </div>
          {ctx.profile?.primary_email && (
            <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              {ctx.profile.primary_email}
            </div>
          )}
        </div>
        <ActionButton variant="danger" onClick={() => ctx.onSignOut()}>
          Sign Out
        </ActionButton>
      </div>
    </SettingsSection>
  )
}
