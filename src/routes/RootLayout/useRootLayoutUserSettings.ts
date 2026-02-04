import { useEffect, useRef } from 'react'
import type { SidebarConfig } from '../../components/Sidebar'

type Params = {
  userKey: string | null
  setSidebarCfg: (next: SidebarConfig) => void
  setPrefetchEnabledState: (next: boolean) => void
  setReduceEffectsEnabledState: (next: boolean) => void
  setExternalEmbedsEnabledState: (next: boolean) => void
  setExternalMediaEnabledState: (next: boolean) => void
  setPdfGestureZoomEnabledState: (next: boolean) => void
  setPrivateModeEnabledState: (next: boolean) => void
  setPrivateModeAcknowledgedState: (next: boolean) => void
  onHydrated?: () => void
}

export function useRootLayoutUserSettings({
  userKey,
  setSidebarCfg,
  setPrefetchEnabledState,
  setReduceEffectsEnabledState,
  setExternalEmbedsEnabledState,
  setExternalMediaEnabledState,
  setPdfGestureZoomEnabledState,
  setPrivateModeEnabledState,
  setPrivateModeAcknowledgedState,
  onHydrated,
}: Params) {
  const hydratedRef = useRef(false)

  useEffect(() => {
    hydratedRef.current = false
  }, [userKey])

  useEffect(() => {
    ;(async () => {
      if (!userKey) return
      try {
        const cfg = await window.settings.get?.()
        const data = (cfg?.ok ? (cfg.data as any) : {}) as any
        const perSidebar = data?.userSidebars?.[userKey]
        if (perSidebar) {
          setSidebarCfg(perSidebar)
        } else if (data?.sidebar) {
          const map = { ...(data.userSidebars || {}), [userKey]: data.sidebar }
          await window.settings.set?.({ userSidebars: map })
          setSidebarCfg(data.sidebar)
        }

        const perSettings = data?.userSettings?.[userKey]
        if (perSettings) {
          if (typeof perSettings.prefetchEnabled === 'boolean')
            setPrefetchEnabledState(!!perSettings.prefetchEnabled)
          if (typeof perSettings.reduceEffectsEnabled === 'boolean')
            setReduceEffectsEnabledState(!!perSettings.reduceEffectsEnabled)
          if (typeof perSettings.externalEmbedsEnabled === 'boolean')
            setExternalEmbedsEnabledState(!!perSettings.externalEmbedsEnabled)
          if (typeof perSettings.externalMediaEnabled === 'boolean')
            setExternalMediaEnabledState(!!perSettings.externalMediaEnabled)
          if (typeof perSettings.pdfGestureZoomEnabled === 'boolean')
            setPdfGestureZoomEnabledState(!!perSettings.pdfGestureZoomEnabled)
          if (typeof perSettings.privateModeEnabled === 'boolean')
            setPrivateModeEnabledState(!!perSettings.privateModeEnabled)
          if (typeof perSettings.privateModeAcknowledged === 'boolean')
            setPrivateModeAcknowledgedState(!!perSettings.privateModeAcknowledged)
        } else {
          const next: any = {}
          if (typeof data?.prefetchEnabled === 'boolean') {
            next.prefetchEnabled = !!data.prefetchEnabled
            setPrefetchEnabledState(!!data.prefetchEnabled)
          }
          if (typeof data?.reduceEffectsEnabled === 'boolean') {
            next.reduceEffectsEnabled = !!data.reduceEffectsEnabled
            setReduceEffectsEnabledState(!!data.reduceEffectsEnabled)
          }
          if (typeof data?.externalEmbedsEnabled === 'boolean') {
            next.externalEmbedsEnabled = !!data.externalEmbedsEnabled
            setExternalEmbedsEnabledState(!!data.externalEmbedsEnabled)
          } else {
            next.externalEmbedsEnabled = false
            setExternalEmbedsEnabledState(false)
          }
          if (typeof data?.externalMediaEnabled === 'boolean') {
            next.externalMediaEnabled = !!data.externalMediaEnabled
            setExternalMediaEnabledState(!!data.externalMediaEnabled)
          } else {
            next.externalMediaEnabled = false
            setExternalMediaEnabledState(false)
          }
          if (typeof data?.pdfGestureZoomEnabled === 'boolean') {
            next.pdfGestureZoomEnabled = !!data.pdfGestureZoomEnabled
            setPdfGestureZoomEnabledState(!!data.pdfGestureZoomEnabled)
          }
          if (typeof data?.privateModeEnabled === 'boolean') {
            next.privateModeEnabled = !!data.privateModeEnabled
            setPrivateModeEnabledState(!!data.privateModeEnabled)
          }
          if (typeof data?.privateModeAcknowledged === 'boolean') {
            next.privateModeAcknowledged = !!data.privateModeAcknowledged
            setPrivateModeAcknowledgedState(!!data.privateModeAcknowledged)
          }
          if (data?.pdfZoom && typeof data.pdfZoom === 'object') next.pdfZoom = data.pdfZoom
          if (Object.keys(next).length) {
            const mapS = { ...(data.userSettings || {}) }
            mapS[userKey] = { ...(mapS[userKey] || {}), ...next }
            await window.settings.set?.({ userSettings: mapS })
          }
        }

        const uid = userKey.split('|')[1]
        if (uid) window.settings.set({ lastUserId: uid }).catch(() => {})
        if (!hydratedRef.current) {
          hydratedRef.current = true
          onHydrated?.()
        }
      } catch {}
    })()
  }, [userKey])
}
