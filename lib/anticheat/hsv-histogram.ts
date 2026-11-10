/**
 * HSV color histogram for RGBA frames (AC-1).
 *
 * Layout: H×S×V = 16×4×4 = 256 bins.
 * Distances: L1 on L1-normalized histograms → range [0, 2].
 */

import type { FramePixels } from './phash'

export const HIST_H_BINS = 16
export const HIST_S_BINS = 4
export const HIST_V_BINS = 4
export const HIST_BINS = HIST_H_BINS * HIST_S_BINS * HIST_V_BINS // 256

export type HsvHistogram = Float64Array

/** Convert sRGB byte triple to HSV with H∈[0,360), S∈[0,1], V∈[0,1]. */
export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6)
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2)
    } else {
      h = 60 * ((rn - gn) / delta + 4)
    }
  }
  if (h < 0) h += 360

  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s, v }
}

function binIndex(h: number, s: number, v: number): number {
  const hBin = Math.min(
    HIST_H_BINS - 1,
    Math.max(0, Math.floor((h / 360) * HIST_H_BINS)),
  )
  // Map [0,1] → 0..BINS-1; value 1.0 lands in the last bin.
  const sBin = Math.min(HIST_S_BINS - 1, Math.max(0, Math.floor(s * HIST_S_BINS)))
  const vBin = Math.min(HIST_V_BINS - 1, Math.max(0, Math.floor(v * HIST_V_BINS)))
  return hBin * (HIST_S_BINS * HIST_V_BINS) + sBin * HIST_V_BINS + vBin
}

/**
 * Build an L1-normalized HSV histogram (sums to 1 when the frame has pixels).
 * Empty / zero-size frames yield an all-zero histogram.
 */
export function computeHsvHistogram(frame: FramePixels): HsvHistogram {
  const hist = new Float64Array(HIST_BINS)
  const { data, width, height } = frame
  const pixels = width * height
  if (pixels <= 0) return hist

  for (let p = 0; p < pixels; p++) {
    const i = p * 4
    const { h, s, v } = rgbToHsv(data[i]!, data[i + 1]!, data[i + 2]!)
    hist[binIndex(h, s, v)]! += 1
  }

  for (let i = 0; i < HIST_BINS; i++) {
    hist[i]! /= pixels
  }
  return hist
}

/**
 * L1 distance between two normalized histograms.
 * For unit-mass histograms the theoretical range is [0, 2].
 */
export function histogramL1(a: HsvHistogram, b: HsvHistogram): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.abs(a[i]! - b[i]!)
  }
  return sum
}
