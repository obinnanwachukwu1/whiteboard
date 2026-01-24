import { describe, expect, it } from 'vitest'
import { shouldUseHashHistory } from './utils/history'

describe('shouldUseHashHistory', () => {
  it('uses hash history for file protocol', () => {
    expect(shouldUseHashHistory('file:')).toBe(true)
  })

  it('uses hash history for http protocol', () => {
    expect(shouldUseHashHistory('http:')).toBe(true)
  })

  it('uses hash history for https protocol', () => {
    expect(shouldUseHashHistory('https:')).toBe(true)
  })

  it('returns true when protocol is undefined', () => {
    expect(shouldUseHashHistory(undefined)).toBe(true)
  })
})
