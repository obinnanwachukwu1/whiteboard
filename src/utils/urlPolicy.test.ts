import { describe, expect, it } from 'vitest'
import { isSafeMediaSrc } from './urlPolicy'

describe('isSafeMediaSrc', () => {
  it('allows canvas-file URLs', () => {
    expect(isSafeMediaSrc('canvas-file:///tmp/foo.png', 'https://canvas.test', false)).toBe(true)
  })

  it('allows same-origin https URLs even when external media is disabled', () => {
    expect(isSafeMediaSrc('https://canvas.test/files/1', 'https://canvas.test', false)).toBe(true)
  })

  it('blocks cross-origin https URLs when external media is disabled', () => {
    expect(isSafeMediaSrc('https://example.com/x.png', 'https://canvas.test', false)).toBe(false)
  })

  it('allows cross-origin https URLs when external media is enabled', () => {
    expect(isSafeMediaSrc('https://example.com/x.png', 'https://canvas.test', true)).toBe(true)
  })

  it('blocks javascript: URLs', () => {
    expect(isSafeMediaSrc('javascript:alert(1)', 'https://canvas.test', true)).toBe(false)
  })

  it('allows relative URLs when a base origin is provided', () => {
    expect(isSafeMediaSrc('/foo.png', 'https://canvas.test', false)).toBe(true)
  })

  it('blocks relative URLs without a base origin', () => {
    expect(isSafeMediaSrc('/foo.png', '', true)).toBe(false)
  })
})
