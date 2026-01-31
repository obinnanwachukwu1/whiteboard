import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { useAppFlags, useAppSettings } from '../../context/AppContext'

export function FeaturesSettings() {
  const { embeddingsEnabled, aiEnabled } = useAppFlags()
  const { setEmbeddingsEnabled, setAiEnabled } = useAppSettings()
  const isMac = window.platform?.isMac ?? false

  return (
    <SettingsSection title="Features">
      <SettingsRow
        label="Deep Search"
        description="Semantic search and embeddings for finding content"
      >
        <Toggle
          checked={embeddingsEnabled}
          onChange={(checked) => setEmbeddingsEnabled(checked).catch(() => {})}
        />
      </SettingsRow>

      {isMac ? (
        <SettingsRow
          label="Apple Intelligence"
          description="Local AI features (macOS 26.1+). Runs on-device."
          disabled={!embeddingsEnabled}
        >
          <Toggle
            checked={aiEnabled}
            onChange={(checked) => setAiEnabled(checked).catch(() => {})}
            disabled={!embeddingsEnabled}
          />
        </SettingsRow>
      ) : null}
    </SettingsSection>
  )
}
