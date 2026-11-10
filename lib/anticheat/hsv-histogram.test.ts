import { describe, expect, it } from 'vitest'
import {
  HIST_BINS,
  computeHsvHistogram,
  histogramL1,
  rgbToHsv,
} from './hsv-histogram'
import type { FramePixels } from './phash'

function solid(
  r: number,
  g: number,
  b: number,
  width = 16,
  height = 16,
): FramePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = r
    data[o + 1] = g
    data[o + 2] = b
    data[o + 3] = 255
  }
  return { data, width, height }
}

describe('rgbToHsv', () => {
  it('maps pure red / green / blue to expected hues', () => {
    expect(rgbToHsv(255, 0, 0).h).toBeCloseTo(0, 5)
    expect(rgbToHsv(0, 255, 0).h).toBeCloseTo(120, 5)
    expect(rgbToHsv(0, 0, 255).h).toBeCloseTo(240, 5)
  })

  it('maps black to V=0 and white to S=0 V=1', () => {
    expect(rgbToHsv(0, 0, 0)).toMatchObject({ s: 0, v: 0 })
    const white = rgbToHsv(255, 255, 255)
    expect(white.s).toBeCloseTo(0, 10)
    expect(white.v).toBeCloseTo(1, 10)
  })
})

describe('computeHsvHistogram / histogramL1', () => {
  it('near-identical frames → low HSV L1', () => {
    // Same neutral gray family (S=0) with V staying in the same coarse bin,
    // plus a copy that only flips a few pixels — not a full solid recolor.
    const aFrame = solid(100, 100, 100, 32, 32)
    const bFrame: FramePixels = {
      data: new Uint8ClampedArray(aFrame.data),
      width: aFrame.width,
      height: aFrame.height,
    }
    for (let i = 0; i < 8; i++) {
      const o = i * 4
      bFrame.data[o] = 105
      bFrame.data[o + 1] = 105
      bFrame.data[o + 2] = 105
    }
    const a = computeHsvHistogram(aFrame)
    const b = computeHsvHistogram(bFrame)
    expect(a).toHaveLength(HIST_BINS)
    expect(histogramL1(a, b)).toBeLessThan(0.25)
  })

  it('identical solids → L1 ≈ 0 and histogram sums to 1', () => {
    const h = computeHsvHistogram(solid(200, 50, 50))
    let sum = 0
    for (let i = 0; i < h.length; i++) sum += h[i]!
    expect(sum).toBeCloseTo(1, 10)
    expect(histogramL1(h, h)).toBeCloseTo(0, 12)
  })

  it('solid color swap → high HSV L1', () => {
    const red = computeHsvHistogram(solid(255, 0, 0))
    const blue = computeHsvHistogram(solid(0, 0, 255))
    const dist = histogramL1(red, blue)
    // Disjoint unit-mass histograms → L1 = 2
    expect(dist).toBeGreaterThanOrEqual(1.0)
    expect(dist).toBeCloseTo(2, 10)
  })

  it('black vs white also yields high L1 (value axis)', () => {
    const black = computeHsvHistogram(solid(0, 0, 0))
    const white = computeHsvHistogram(solid(255, 255, 255))
    expect(histogramL1(black, white)).toBeGreaterThanOrEqual(1.0)
  })
})
