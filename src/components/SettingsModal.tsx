import { Modal } from './ui/Modal'
import {
  AppearanceSettings,
  FeaturesSettings,
  PrivacySettings,
  NotificationSettings,
  GradesSettings,
  AccountSettings,
  AboutSettings,
  AdvancedSettings,
} from './settings'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: Props) {
  return (
    <Modal open={isOpen} onClose={onClose} title="Settings" width="max-w-2xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1 pb-1">
        <AppearanceSettings />
        <FeaturesSettings />
        <PrivacySettings />
        <NotificationSettings />
        <GradesSettings />
        <AccountSettings />
        <AboutSettings />
        <AdvancedSettings />
      </div>
    </Modal>
  )
}
