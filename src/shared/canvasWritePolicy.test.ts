import { describe, expect, it } from 'vitest'

import {
  FORCE_READ_ONLY_CANVAS_HOSTS,
  getCanvasHostFromBaseUrl,
  isCanvasWriteEnabledForBaseUrl,
  withCanvasWriteEnabledForBaseUrl,
} from './canvasWritePolicy'

describe('canvasWritePolicy', () => {
  it('normalizes host from base URL', () => {
    expect(getCanvasHostFromBaseUrl('https://Foo.Instructure.com/path')).toBe(
      'foo.instructure.com',
    )
  })

  it('returns null for invalid base URL', () => {
    expect(getCanvasHostFromBaseUrl('not-a-url')).toBeNull()
  })

  it('defaults to enabled when no preference exists', () => {
    expect(isCanvasWriteEnabledForBaseUrl('https://foo.instructure.com', {})).toBe(true)
  })

  it('uses host preference when present', () => {
    expect(
      isCanvasWriteEnabledForBaseUrl('https://foo.instructure.com', {
        'foo.instructure.com': false,
      }),
    ).toBe(false)
  })

  it('forced host precedence wins over host preference', () => {
    const forcedHost = 'forced.example.edu'
    FORCE_READ_ONLY_CANVAS_HOSTS.push(forcedHost)
    try {
      expect(
        isCanvasWriteEnabledForBaseUrl(`https://${forcedHost}`, {
          [forcedHost]: true,
        }),
      ).toBe(false)
    } finally {
      FORCE_READ_ONLY_CANVAS_HOSTS.pop()
    }
  })

  it('updates host preference immutably', () => {
    const next = withCanvasWriteEnabledForBaseUrl(
      'https://foo.instructure.com',
      { 'bar.instructure.com': false },
      false,
    )

    expect(next).toEqual({
      'bar.instructure.com': false,
      'foo.instructure.com': false,
    })
  })
})
