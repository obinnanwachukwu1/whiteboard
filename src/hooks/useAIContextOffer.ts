import { useEffect, useMemo } from 'react'
import type { AIAttachment } from '../context/AIPanelContext'
import { useOptionalAIPanelActions } from '../context/AIPanelContext'
import { useAppFlags } from '../context/AppContext'

export function useAIContextOffer(key: string, offer: AIAttachment | null) {
  const aiPanel = useOptionalAIPanelActions()
  const { privateModeEnabled } = useAppFlags()
  const signature = useMemo(() => {
    if (!offer) return ''
    return [
      offer.id,
      offer.kind,
      offer.title,
      offer.courseId,
      offer.courseName || '',
      offer.contentText || '',
    ].join('|')
  }, [offer])

  useEffect(() => {
    if (!aiPanel) return
    if (!key) return
    if (privateModeEnabled || !offer) {
      aiPanel.unregisterContextOffer(key)
      return () => {
        aiPanel.unregisterContextOffer(key)
      }
    }
    if (offer) {
      aiPanel.registerContextOffer(key, offer)
    } else {
      aiPanel.unregisterContextOffer(key)
    }
    return () => {
      aiPanel.unregisterContextOffer(key)
    }
  }, [aiPanel, key, signature, offer, privateModeEnabled])
}
