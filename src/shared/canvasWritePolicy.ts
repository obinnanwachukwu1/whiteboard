export const FORCE_READ_ONLY_CANVAS_HOSTS: string[] = [
  // Add Canvas hostnames here for launch-time enforced read-only mode.
  // Example: 'school.instructure.com',
]

export const CANVAS_WRITE_BLOCKED_ERROR =
  'Canvas write actions are disabled for this school (read-only mode). Open in Canvas instead.'

export type CanvasWriteEnabledByHost = Record<string, boolean>

function normalizeHost(host: string): string {
  return host.trim().toLowerCase()
}

export function getCanvasHostFromBaseUrl(baseUrl?: string | null): string | null {
  const raw = String(baseUrl || '').trim()
  if (!raw) return null
  try {
    return normalizeHost(new URL(raw).hostname)
  } catch {
    return null
  }
}

export function isCanvasWriteForcedOffForHost(host?: string | null): boolean {
  if (!host) return false
  const normalized = normalizeHost(host)
  return FORCE_READ_ONLY_CANVAS_HOSTS.map(normalizeHost).includes(normalized)
}

export function isCanvasWriteForcedOffForBaseUrl(baseUrl?: string | null): boolean {
  return isCanvasWriteForcedOffForHost(getCanvasHostFromBaseUrl(baseUrl))
}

export function isCanvasWriteEnabledForBaseUrl(
  baseUrl?: string | null,
  byHostPrefs?: CanvasWriteEnabledByHost | null,
): boolean {
  const host = getCanvasHostFromBaseUrl(baseUrl)
  if (!host) return true
  if (isCanvasWriteForcedOffForHost(host)) return false
  const pref = byHostPrefs?.[host]
  return typeof pref === 'boolean' ? pref : true
}

export function withCanvasWriteEnabledForBaseUrl(
  baseUrl: string | null | undefined,
  byHostPrefs: CanvasWriteEnabledByHost | null | undefined,
  enabled: boolean,
): CanvasWriteEnabledByHost {
  const next = { ...(byHostPrefs || {}) }
  const host = getCanvasHostFromBaseUrl(baseUrl)
  if (!host) return next
  next[host] = enabled
  return next
}
