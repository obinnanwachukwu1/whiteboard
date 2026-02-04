import React from 'react'
import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useAppFlags, useAppSettings } from '../../context/AppContext'
import { isEncryptionSupported } from '../../utils/secureStorage'

export function PrivacySettings() {
  const { privateModeEnabled, privateModeAcknowledged, encryptionEnabled } = useAppFlags()
  const { setPrivateModeEnabled, setEncryptionEnabled } = useAppSettings()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const encryptionAvailable = isEncryptionSupported()
  const encryptionDisabledReason = privateModeEnabled
    ? 'Enabled by Private Mode.'
    : !encryptionAvailable
      ? 'Encryption not available on this device.'
      : undefined

  const onToggle = async () => {
    if (privateModeEnabled) {
      await setPrivateModeEnabled(false)
      return
    }
    if (!privateModeAcknowledged) {
      setConfirmOpen(true)
      return
    }
    await setPrivateModeEnabled(true)
  }

  const onConfirmEnable = async () => {
    await setPrivateModeEnabled(true)
    setConfirmOpen(false)
  }

  const onToggleEncryption = async () => {
    if (privateModeEnabled) return
    await setEncryptionEnabled(!encryptionEnabled)
  }

  return (
    <SettingsSection title="Privacy">
      <SettingsRow
        label="Private Mode"
        description="Minimize local data storage on this device"
      >
        <Toggle checked={privateModeEnabled} onChange={onToggle} />
      </SettingsRow>

      <SettingsRow
        label="Encrypt Local Cache"
        description="Protect local cache data using OS keychain encryption"
        disabled={privateModeEnabled || !encryptionAvailable}
        disabledReason={encryptionDisabledReason}
      >
        <Toggle
          checked={encryptionEnabled}
          onChange={onToggleEncryption}
          disabled={privateModeEnabled || !encryptionAvailable}
        />
      </SettingsRow>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Enable Private Mode?"
        width="max-w-lg"
      >
        <div className="space-y-3 text-sm text-slate-600 dark:text-neutral-400">
          <p>
            Private Mode reduces the amount of Canvas data stored on this device. Enabling it will:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Disable background prefetching</li>
            <li>Disable Deep Search and embeddings</li>
            <li>Disable AI features</li>
            <li>Force encryption for any local caches</li>
          </ul>
          <p>You can turn this off anytime in Settings.</p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirmEnable}>
            Enable Private Mode
          </Button>
        </div>
      </Modal>
    </SettingsSection>
  )
}
