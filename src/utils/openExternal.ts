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
    // Protocol check
    try {
      const u = new URL(href)
      // Only allow safe protocols
      if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) {
        console.warn('[openExternal] Blocked unsafe protocol:', u.protocol)
        return false
      }
    } catch {
      return false
    }

    // Try Electron bridge first
    try {
      const res = await window.system?.openExternal?.(href)
      if (res && (res as any).ok) return true
    } catch {}
    
    return false
  } catch {
    return false
  }
}

