import { SettingsSection } from './SettingsSection'
import { SettingsRow, Toggle } from './SettingsRow'
import { useAppContext } from '../../context/AppContext'

export function FeaturesSettings() {
  const { embeddingsEnabled, setEmbeddingsEnabled, aiEnabled, setAiEnabled } = useAppContext()

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
    </SettingsSection>
  )
}
