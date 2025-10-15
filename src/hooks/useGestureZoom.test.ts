import { describe, expect, it } from 'vitest'
import { clampScale, wheelDeltaToScaleFactor } from './useGestureZoom'

describe('wheelDeltaToScaleFactor', () => {
  it('returns 1 for zero delta', () => {
    expect(wheelDeltaToScaleFactor(0)).toBe(1)
  })

  it('produces a factor greater than 1 for negative deltas (zoom in)', () => {
    const factor = wheelDeltaToScaleFactor(-120)
    expect(factor).toBeGreaterThan(1)
    expect(factor).toBeLessThan(2)
  })

  it('produces a factor less than 1 for positive deltas (zoom out)', () => {
    const factor = wheelDeltaToScaleFactor(120)
    expect(factor).toBeGreaterThan(0)
    expect(factor).toBeLessThan(1)
  })

  it('normalizes delta modes expressed in lines', () => {
    const pixelFactor = wheelDeltaToScaleFactor(64, 0)
    const lineFactor = wheelDeltaToScaleFactor(2, 1)
    expect(Math.abs(pixelFactor - lineFactor)).toBeLessThan(0.05)
  })
})

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
})
