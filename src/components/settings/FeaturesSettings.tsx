import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { useAppFlags, useAppSettings } from '../../context/AppContext'

export function FeaturesSettings() {
  const { embeddingsEnabled, aiEnabled, aiAvailability, privateModeEnabled } =
    useAppFlags()
  const { setEmbeddingsEnabled, setAiEnabled } = useAppSettings()
  const isMac = window.platform?.isMac ?? false
  const privateDisabledReason = privateModeEnabled
    ? 'Disabled because Private Mode is on.'
    : undefined
  const aiAvailabilityStatus = aiAvailability?.status
  const showAppleIntelligence = isMac && aiAvailabilityStatus !== 'unsupported'
  const aiDisabledBySystem = aiAvailabilityStatus === 'disabled'
  const aiDisabledByError = aiAvailabilityStatus === 'error'
  const aiDisabled = privateModeEnabled || !embeddingsEnabled || aiDisabledBySystem || aiDisabledByError
  const aiToggleChecked = aiDisabledBySystem || aiDisabledByError ? false : aiEnabled
  const aiDisabledReason = (() => {
    if (privateModeEnabled) return privateDisabledReason
    if (!embeddingsEnabled) return 'Enable Deep Search to use Apple Intelligence.'
    if (aiDisabledBySystem)
      return 'Enable Apple Intelligence in System Settings to use this feature.'
    if (aiDisabledByError) return 'Apple Intelligence availability could not be verified.'
    return undefined
  })()

  return (
    <SettingsSection title="Features">
      <SettingsRow
        label="Deep Search"
        description="Semantic search and embeddings for finding content"
        disabled={privateModeEnabled}
        disabledReason={privateDisabledReason}
      >
        <Toggle
          checked={embeddingsEnabled}
          onChange={(checked) => setEmbeddingsEnabled(checked).catch(() => {})}
          disabled={privateModeEnabled}
        />
      </SettingsRow>

      {showAppleIntelligence ? (
        <SettingsRow
          label="Apple Intelligence"
          description="Local AI features (macOS 26.1+). Runs on-device."
          disabled={aiDisabled}
          disabledReason={aiDisabledReason}
        >
          <Toggle
            checked={aiToggleChecked}
            onChange={(checked) => setAiEnabled(checked).catch(() => {})}
            disabled={aiDisabled}
          />
        </SettingsRow>
      ) : null}
    </SettingsSection>
  )
}
