import { describe, expect, it } from 'vitest'
import { shouldUseHashHistory } from './utils/history'

describe('shouldUseHashHistory', () => {
  it('uses hash history for file protocol', () => {
    expect(shouldUseHashHistory('file:')).toBe(true)
  })

  it('does not use hash history for http protocol', () => {
    expect(shouldUseHashHistory('http:')).toBe(false)
  })

  it('does not use hash history for https protocol', () => {
    expect(shouldUseHashHistory('https:')).toBe(false)
  })

  it('returns false when protocol is undefined', () => {
    expect(shouldUseHashHistory(undefined)).toBe(false)
  })
})
