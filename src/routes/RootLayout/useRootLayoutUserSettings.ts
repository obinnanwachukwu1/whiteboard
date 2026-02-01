import { useEffect } from 'react'
import type { SidebarConfig } from '../../components/Sidebar'

type Params = {
  userKey: string | null
  setSidebarCfg: (next: SidebarConfig) => void
  setPrefetchEnabledState: (next: boolean) => void
  setPdfGestureZoomEnabledState: (next: boolean) => void
}

export function useRootLayoutUserSettings({
  userKey,
  setSidebarCfg,
  setPrefetchEnabledState,
  setPdfGestureZoomEnabledState,
}: Params) {
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
          if (typeof perSettings.pdfGestureZoomEnabled === 'boolean')
            setPdfGestureZoomEnabledState(!!perSettings.pdfGestureZoomEnabled)
        } else {
          const next: any = {}
          if (typeof data?.prefetchEnabled === 'boolean') {
            next.prefetchEnabled = !!data.prefetchEnabled
            setPrefetchEnabledState(!!data.prefetchEnabled)
          }
          if (typeof data?.pdfGestureZoomEnabled === 'boolean') {
            next.pdfGestureZoomEnabled = !!data.pdfGestureZoomEnabled
            setPdfGestureZoomEnabledState(!!data.pdfGestureZoomEnabled)
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
      } catch {}
    })()
  }, [userKey])
}
