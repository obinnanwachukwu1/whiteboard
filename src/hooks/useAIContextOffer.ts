import { useEffect, useMemo } from 'react'
import type { AIAttachment } from '../context/AIPanelContext'
import { useOptionalAIPanelActions } from '../context/AIPanelContext'
import { useAppFlags } from '../context/AppContext'

export function useAIContextOffer(key: string, offer: AIAttachment | null) {
  const aiPanel = useOptionalAIPanelActions()
  const registerContextOffer = aiPanel?.registerContextOffer
  const unregisterContextOffer = aiPanel?.unregisterContextOffer
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
    if (!registerContextOffer || !unregisterContextOffer) return
    if (!key) return
    if (privateModeEnabled || !offer) {
      unregisterContextOffer(key)
      return () => {
        unregisterContextOffer(key)
      }
    }
    if (offer) {
      registerContextOffer(key, offer)
    } else {
      unregisterContextOffer(key)
    }
    return () => {
      unregisterContextOffer(key)
    }
  }, [key, signature, privateModeEnabled, registerContextOffer, unregisterContextOffer])
}
