export function shouldUseHashHistory(protocol?: string | null): boolean {
  return protocol === 'file:'
}
