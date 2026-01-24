export function shouldUseHashHistory(_protocol?: string | null): boolean {
  // Force hash history in all environments (http/https/file) for Electron behavior parity.
  // This ensures deep-linking via hash fragments works in dev mode.
  return true
}
