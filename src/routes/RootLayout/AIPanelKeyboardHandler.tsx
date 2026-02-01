import { useEffect } from 'react'
import { useAIPanel } from '../../context/AIPanelContext'
import { AIPanel } from '../../components/AIPanel'

export function AIPanelKeyboardHandler() {
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

  return <AIPanel />
}
