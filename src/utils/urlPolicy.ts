export function tryParseUrl(rawUrl: string | undefined | null): URL | null {
  if (!rawUrl) return null
  try {
    return new URL(String(rawUrl))
  } catch {
    return null
  }
}

const DEFAULT_TRUSTED_MEDIA_HOSTS = ['inscloudgate.net']

function normalizeHosts(list: string[]): string[] {
  return list.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
}

function hostAllowed(host: string, allowlist: string[]): boolean {
  const h = String(host || '').toLowerCase()
  return allowlist.some((entry) => h === entry || h.endsWith(`.${entry}`))
}

export function isSafeMediaSrc(
  rawUrl: string | undefined | null,
  baseUrl: string | undefined | null,
  allowExternalMedia: boolean,
  trustedHosts: string[] = DEFAULT_TRUSTED_MEDIA_HOSTS,
): boolean {
  if (!rawUrl) return false
  let u = tryParseUrl(rawUrl)
  if (!u && baseUrl) {
    try {
      u = new URL(String(rawUrl), String(baseUrl))
    } catch {
      u = null
    }
  }
  if (!u) return false

  // Always allow local/opaque sources.
  if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'canvas-file:') {
    return true
  }

  // Only allow web URLs when either same-origin Canvas, trusted host, or the user opted in.
  if (u.protocol === 'http:' || u.protocol === 'https:') {
    const base = tryParseUrl(baseUrl || '')
    if (base && u.origin === base.origin) return true
    if (trustedHosts.length && hostAllowed(u.hostname, normalizeHosts(trustedHosts))) return true
    return allowExternalMedia
  }

  return false
}
