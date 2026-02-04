import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { useAppFlags, useAppSettings } from '../../context/AppContext'

export function FeaturesSettings() {
  const { embeddingsEnabled, aiEnabled, privateModeEnabled } = useAppFlags()
  const { setEmbeddingsEnabled, setAiEnabled } = useAppSettings()
  const isMac = window.platform?.isMac ?? false
  const privateDisabledReason = privateModeEnabled
    ? 'Disabled because Private Mode is on.'
    : undefined
  const aiDisabled = privateModeEnabled || !embeddingsEnabled
  const aiDisabledReason = privateModeEnabled ? privateDisabledReason : undefined

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

      {isMac ? (
        <SettingsRow
          label="Apple Intelligence"
          description="Local AI features (macOS 26.1+). Runs on-device."
          disabled={aiDisabled}
          disabledReason={aiDisabledReason}
        >
          <Toggle
            checked={aiEnabled}
            onChange={(checked) => setAiEnabled(checked).catch(() => {})}
            disabled={aiDisabled}
          />
        </SettingsRow>
      ) : null}
    </SettingsSection>
  )
}
