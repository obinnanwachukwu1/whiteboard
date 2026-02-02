import { useEffect } from 'react'
import { useAIPanel } from '../../context/AIPanelContext'

/**
 * Keyboard handler for toggling the AI side panel.
 * Cmd+I (Mac) or Ctrl+I (Windows/Linux) toggles the panel.
 */
export function AISidePanelKeyboardHandler() {
  const aiPanel = useAIPanel()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+I (Mac) or Ctrl+I (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        aiPanel.toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [aiPanel.toggle])

  // This component only handles keyboard events
  // The AISidePanel is rendered directly in AppShell layout
  return null
}
