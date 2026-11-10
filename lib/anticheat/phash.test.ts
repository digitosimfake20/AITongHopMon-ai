import { describe, expect, it } from 'vitest'
import {
  computePHash,
  dct1d,
  dct2d,
  hammingDistance,
  resizeBilinearGray,
  PHASH_BITS,
  PHASH_SIZE,
  type FramePixels,
} from './phash'

/** Solid RGBA frame. */
function solid(
  r: number,
  g: number,
  b: number,
  width = 32,
  height = 32,
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

/** Two-tone vertical split (left color A, right color B). */
function verticalSplit(
  left: [number, number, number],
  right: [number, number, number],
  width = 64,
  height = 64,
): FramePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  const mid = Math.floor(width / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = x < mid ? left : right
      const o = (y * width + x) * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = 255
    }
  }
  return { data, width, height }
}

/** Checkerboard for high-frequency content. */
function checkerboard(
  c0: [number, number, number],
  c1: [number, number, number],
  cell = 8,
  width = 64,
  height = 64,
): FramePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0
      const [r, g, b] = on ? c0 : c1
      const o = (y * width + x) * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = 255
    }
  }
  return { data, width, height }
}

describe('resizeBilinearGray', () => {
  it('produces a 64×64 plane from a solid frame', () => {
    const gray = resizeBilinearGray(solid(200, 100, 50, 16, 16), PHASH_SIZE)
    expect(gray).toHaveLength(PHASH_SIZE * PHASH_SIZE)
    // All samples should be roughly the same BT.601 luma
    const expected = 0.299 * 200 + 0.587 * 100 + 0.114 * 50
    for (let i = 0; i < gray.length; i++) {
      expect(gray[i]).toBeCloseTo(expected, 0)
    }
  })
})

describe('dct1d / dct2d', () => {
  it('maps a constant 1D signal energy into DC', () => {
    const n = 4
    const input = new Float64Array([1, 1, 1, 1])
    const y = dct1d(input, n)
    // Orthonormal DCT-II of constant c → Y[0] = c * √N, others ~0
    expect(y[0]).toBeCloseTo(Math.sqrt(n), 10)
    for (let k = 1; k < n; k++) {
      expect(Math.abs(y[k]!)).toBeLessThan(1e-10)
    }
  })

  it('keeps DC dominant for a flat 2D plane', () => {
    const size = 8
    const plane = new Float64Array(size * size).fill(128)
    const coeffs = dct2d(plane, size)
    expect(Math.abs(coeffs[0]!)).toBeGreaterThan(100)
    // AC energy should be tiny
    let ac = 0
    for (let i = 1; i < coeffs.length; i++) ac += Math.abs(coeffs[i]!)
    expect(ac).toBeLessThan(1e-6)
  })
})

describe('computePHash / hammingDistance', () => {
  it('near-identical frames → low Hamming', () => {
    // Low-frequency structure (large block on a flat bg) keeps 8×8 AC coeffs
    // away from a near-zero median, so tiny pixel noise stays low-Hamming.
    // Fine checkerboards / flat solids are numerically brittle at the median.
    const width = 64
    const height = 64
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inBlock = x > 16 && x < 48 && y > 16 && y < 48
        const o = (y * width + x) * 4
        data[o] = inBlock ? 220 : 40
        data[o + 1] = inBlock ? 80 : 50
        data[o + 2] = inBlock ? 40 : 60
        data[o + 3] = 255
      }
    }
    const a: FramePixels = { data, width, height }
    const b: FramePixels = {
      data: new Uint8ClampedArray(data),
      width,
      height,
    }
    for (let y = 30; y < 34; y++) {
      for (let x = 30; x < 34; x++) {
        const o = (y * width + x) * 4
        b.data[o] = Math.min(255, b.data[o]! + 5)
      }
    }
    expect(hammingDistance(computePHash(a), computePHash(b))).toBeLessThanOrEqual(4)
  })

  it('identical frames → Hamming 0', () => {
    const frame = solid(10, 20, 30)
    expect(hammingDistance(computePHash(frame), computePHash(frame))).toBe(0)
  })

  it('abrupt content change → high Hamming', () => {
    const a = solid(0, 0, 0)
    const b = checkerboard([255, 255, 255], [0, 0, 0])
    const dist = hammingDistance(computePHash(a), computePHash(b))
    expect(dist).toBeGreaterThanOrEqual(20)
    expect(dist).toBeLessThanOrEqual(PHASH_BITS)
  })

  it('structurally different layouts differ substantially', () => {
    const a = verticalSplit([255, 0, 0], [0, 0, 255])
    const b = verticalSplit([0, 255, 0], [255, 255, 0])
    // Color-only change on a similar layout may be moderate; use layout flip
    const c = checkerboard([0, 0, 0], [255, 255, 255], 4)
    expect(hammingDistance(computePHash(a), computePHash(c))).toBeGreaterThanOrEqual(
      15,
    )
  })
})
