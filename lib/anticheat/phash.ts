/**
 * Perceptual hash (pHash) for RGBA frames.
 *
 * Pipeline (AC-1):
 *   RGBA → bilinear resize 64×64 → BT.601 grayscale → 2D DCT-II
 *   → top-left 8×8 → drop DC → 63 bits vs median
 *
 * Math notes:
 * - Uses the orthonormal 2D DCT-II (separable). α-scaling does not change
 *   median-thresholded bits for a single frame, but keeps coefficients in a
 *   well-defined basis so Phase 2 can swap `dct2d` / `computePHash` without
 *   changing callers.
 * - Hash is stored as a BigInt with bits 0..62 (bit i set when coeff > median).
 */

export const PHASH_SIZE = 64
export const PHASH_DCT_LOW = 8
/** Bits kept after dropping DC from the 8×8 block. */
export const PHASH_BITS = PHASH_DCT_LOW * PHASH_DCT_LOW - 1 // 63

/** Minimal frame buffer: RGBA packed row-major (matches ImageData). */
export type FramePixels = {
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}

export type PHash = bigint

const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114

function clampByte(n: number): number {
  if (n < 0) return 0
  if (n > 255) return 255
  return n
}

/**
 * Sample a single channel via bilinear interpolation over the source RGBA
 * frame, returning BT.601 luma in [0, 255].
 */
function sampleLumaBilinear(
  frame: FramePixels,
  x: number,
  y: number,
): number {
  const { data, width, height } = frame
  if (width <= 0 || height <= 0) return 0

  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)))
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)))
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1))
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1))
  const fx = x - Math.floor(x)
  const fy = y - Math.floor(y)

  const lumaAt = (px: number, py: number): number => {
    const i = (py * width + px) * 4
    return LUMA_R * data[i]! + LUMA_G * data[i + 1]! + LUMA_B * data[i + 2]!
  }

  const v00 = lumaAt(x0, y0)
  const v10 = lumaAt(x1, y0)
  const v01 = lumaAt(x0, y1)
  const v11 = lumaAt(x1, y1)

  const top = v00 * (1 - fx) + v10 * fx
  const bot = v01 * (1 - fx) + v11 * fx
  return top * (1 - fy) + bot * fy
}

/**
 * Bilinear-resize an RGBA frame to `size×size` grayscale (row-major Float64).
 * Exported so Phase 2 / tests can inspect the pre-DCT plane.
 */
export function resizeBilinearGray(
  frame: FramePixels,
  size: number = PHASH_SIZE,
): Float64Array {
  const out = new Float64Array(size * size)
  if (frame.width <= 0 || frame.height <= 0 || size <= 0) return out

  const xScale = frame.width / size
  const yScale = frame.height / size

  for (let y = 0; y < size; y++) {
    const srcY = (y + 0.5) * yScale - 0.5
    for (let x = 0; x < size; x++) {
      const srcX = (x + 0.5) * xScale - 0.5
      out[y * size + x] = clampByte(sampleLumaBilinear(frame, srcX, srcY))
    }
  }
  return out
}

/**
 * Orthonormal 1D DCT-II of length N (in-place friendly via copy).
 * Y[k] = α(k) Σ_n x[n] cos(π(2n+1)k / (2N))
 * α(0)=√(1/N), α(k)=√(2/N) for k>0
 */
export function dct1d(input: ArrayLike<number>, n: number): Float64Array {
  const out = new Float64Array(n)
  const alpha0 = Math.sqrt(1 / n)
  const alphaK = Math.sqrt(2 / n)
  for (let k = 0; k < n; k++) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += input[i]! * Math.cos((Math.PI * (2 * i + 1) * k) / (2 * n))
    }
    out[k] = (k === 0 ? alpha0 : alphaK) * sum
  }
  return out
}

/**
 * Separable 2D DCT-II on a row-major `size×size` matrix.
 * Returns a new Float64Array of the same layout.
 *
 * Phase 2 may replace this implementation; keep the `(matrix, size) → Float64Array`
 * signature stable.
 */
export function dct2d(matrix: Float64Array, size: number): Float64Array {
  const tmp = new Float64Array(size * size)
  const row = new Float64Array(size)

  // DCT along rows
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) row[x] = matrix[y * size + x]!
    const transformed = dct1d(row, size)
    for (let x = 0; x < size; x++) tmp[y * size + x] = transformed[x]!
  }

  // DCT along columns
  const col = new Float64Array(size)
  const out = new Float64Array(size * size)
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) col[y] = tmp[y * size + x]!
    const transformed = dct1d(col, size)
    for (let y = 0; y < size; y++) out[y * size + x] = transformed[y]!
  }
  return out
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2
  }
  return sorted[mid]!
}

/**
 * Compute a 63-bit perceptual hash for an RGBA frame.
 */
export function computePHash(frame: FramePixels): PHash {
  const gray = resizeBilinearGray(frame, PHASH_SIZE)
  const coeffs = dct2d(gray, PHASH_SIZE)

  // Top-left 8×8, skip DC at (0,0)
  const low: number[] = []
  for (let v = 0; v < PHASH_DCT_LOW; v++) {
    for (let u = 0; u < PHASH_DCT_LOW; u++) {
      if (u === 0 && v === 0) continue
      low.push(coeffs[v * PHASH_SIZE + u]!)
    }
  }

  const med = medianOf(low)
  let hash = 0n
  for (let i = 0; i < low.length; i++) {
    if (low[i]! > med) {
      hash |= 1n << BigInt(i)
    }
  }
  return hash
}

/** Hamming distance between two pHashes (popcount of XOR, 0..63). */
export function hammingDistance(a: PHash, b: PHash): number {
  let x = a ^ b
  let count = 0
  while (x !== 0n) {
    // clear lowest set bit
    x &= x - 1n
    count++
  }
  return count
}
