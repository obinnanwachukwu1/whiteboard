export async function openExternal(rawUrl: string | undefined | null): Promise<boolean> {
  try {
    if (!rawUrl) return false
    let href = String(rawUrl).trim()
    // Ensure absolute URL
    try {
      new URL(href)
    } catch {
      try {
        const cfg = await window.settings?.get?.()
        const base = cfg?.ok ? (cfg.data as any)?.baseUrl : undefined
        if (base) {
          href = new URL(href.replace(/^\/+/, ''), base.endsWith('/') ? base : base + '/').toString()
        }
      } catch {}
    }
    // Try Electron bridge first
    try {
      const res = await window.system?.openExternal?.(href)
      if (res && (res as any).ok) return true
    } catch {}
    // Fallback to window.open (works in dev and some environments)
    const w = window.open(href, '_blank', 'noopener,noreferrer')
    return !!w
  } catch {
    return false
  }
}

