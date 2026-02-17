import { describe, expect, it } from 'vitest'

import { isShowcaseModeActive, sanitizeShowcaseModeConfig } from './runtime'

describe('showcaseMode/runtime', () => {
  it('disables showcase mode when runtime disallows it', () => {
    const next = sanitizeShowcaseModeConfig(
      { baseUrl: 'https://canvas.example.edu', showcaseModeEnabled: true },
      false,
    )

    expect(next.showcaseModeEnabled).toBe(false)
  })

  it('preserves showcase mode when runtime allows it', () => {
    const next = sanitizeShowcaseModeConfig(
      { baseUrl: 'https://canvas.example.edu', showcaseModeEnabled: true },
      true,
    )

    expect(next.showcaseModeEnabled).toBe(true)
  })

  it('reports showcase mode active only when allowed and enabled', () => {
    expect(
      isShowcaseModeActive(
        { baseUrl: 'https://canvas.example.edu', showcaseModeEnabled: true },
        false,
      ),
    ).toBe(false)
    expect(
      isShowcaseModeActive(
        { baseUrl: 'https://canvas.example.edu', showcaseModeEnabled: true },
        true,
      ),
    ).toBe(true)
  })
})
