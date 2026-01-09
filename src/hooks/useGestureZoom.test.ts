import { describe, expect, it } from 'vitest'
import { clampScale } from './useGestureZoom'

describe('clampScale', () => {
  it('clamps values below the minimum', () => {
    expect(clampScale(0.1, 0.5, 3)).toBe(0.5)
  })

  it('clamps values above the maximum', () => {
    expect(clampScale(5, 0.5, 3)).toBe(3)
  })

  it('returns the value when within bounds', () => {
    expect(clampScale(1.2, 0.5, 3)).toBeCloseTo(1.2)
  })

  it('returns min for NaN', () => {
    expect(clampScale(NaN, 0.5, 3)).toBe(0.5)
  })
})
