import { useEffect } from 'react'
import { useOptionalAIPanelActions } from '../../context/AIPanelContext'
import { useAppFlags } from '../../context/AppContext'

/**
 * Keyboard handler for toggling the AI side panel.
 * Cmd+I (Mac) or Ctrl+I (Windows/Linux) toggles the panel.
 */
export function AISidePanelKeyboardHandler() {
  const aiPanel = useOptionalAIPanelActions()
  const { aiEnabled, aiAvailable, embeddingsEnabled, privateModeEnabled } = useAppFlags()
  const canUseAI = aiEnabled && aiAvailable && embeddingsEnabled && !privateModeEnabled

  useEffect(() => {
    if (!aiPanel || !canUseAI) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+I (Mac) or Ctrl+I (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        aiPanel.toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [aiPanel, canUseAI])

  // This component only handles keyboard events
  // The AISidePanel is rendered directly in AppShell layout
  return null
}
