import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLDS } from './thresholds'
import { computePHash, hammingDistance, type FramePixels } from './phash'
import { computeHsvHistogram, histogramL1 } from './hsv-histogram'
import {
  TriggerEvaluator,
  extractFeatures,
  type SoftHint,
} from './triggers'

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

function checkerboard(
  width = 64,
  height = 64,
  cell = 8,
): FramePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0
      const v = on ? 255 : 0
      const o = (y * width + x) * 4
      data[o] = v
      data[o + 1] = v
      data[o + 2] = v
      data[o + 3] = 255
    }
  }
  return { data, width, height }
}

describe('DEFAULT_THRESHOLDS (AC-1)', () => {
  it('matches the published defaults', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      frozenMaxHamming: 4,
      frozenConsecutivePairs: 4,
      tabSwitchMinHamming: 20,
      histogramDeltaMin: 1.0,
    })
  })
})

describe('TriggerEvaluator', () => {
  it('fires frozen after N consecutive still pairs', () => {
    const evaluator = new TriggerEvaluator()
    const frame = solid(80, 90, 100)
    const n = DEFAULT_THRESHOLDS.frozenConsecutivePairs

    // First frame seeds state — no pair yet
    const seed = evaluator.evaluateFrame(frame)
    expect(seed.triggers).toEqual([])
    expect(seed.hamming).toBeNull()

    const results = []
    for (let i = 0; i < n; i++) {
      results.push(evaluator.evaluateFrame(frame))
    }

    // Pairs 1..n-1: streak growing, frozen not yet
    for (let i = 0; i < n - 1; i++) {
      expect(results[i]!.frozenStreak).toBe(i + 1)
      expect(results[i]!.triggers).not.toContain('frozen')
      expect(results[i]!.hamming).toBeLessThanOrEqual(
        DEFAULT_THRESHOLDS.frozenMaxHamming,
      )
    }

    // Nth still pair fires frozen
    expect(results[n - 1]!.frozenStreak).toBe(n)
    expect(results[n - 1]!.triggers).toContain('frozen')
  })

  it('hint / visibilitychange alone never decide', () => {
    const evaluator = new TriggerEvaluator()
    const frame = solid(10, 20, 30)

    evaluator.evaluateFrame(frame)

    const softOnly: SoftHint[] = ['hint', 'visibilitychange']
    // Same frame → still pair may eventually freeze, so use a single soft-only
    // observation on the *first* comparison after seed with soft hints and
    // assert soft hints are recorded but are not members of `triggers`.
    const result = evaluator.evaluateFrame(frame, softOnly)

    expect(result.softHintsRecorded).toEqual(softOnly)
    expect(result.triggers).not.toContain('hint' as never)
    expect(result.triggers).not.toContain('visibilitychange' as never)
    // Soft hints must never appear as deciding trigger strings
    for (const t of result.triggers) {
      expect(['frozen', 'tab-switch', 'histogram-delta']).toContain(t)
    }
  })

  it('soft hints on the seed observation do not invent a trigger', () => {
    const evaluator = new TriggerEvaluator()
    const result = evaluator.evaluateFrame(solid(1, 2, 3), [
      'hint',
      'visibilitychange',
      'blur',
    ])
    expect(result.triggers).toEqual([])
    expect(result.softHintsRecorded).toEqual(['hint', 'visibilitychange', 'blur'])
    expect(result.hamming).toBeNull()
  })

  it('abrupt content change can fire tab-switch and histogram-delta', () => {
    const evaluator = new TriggerEvaluator()
    evaluator.evaluateFrame(solid(0, 0, 0))
    const result = evaluator.evaluateFrame(checkerboard())

    expect(result.hamming!).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.tabSwitchMinHamming,
    )
    expect(result.triggers).toContain('tab-switch')
    // Checkerboard vs black also shifts the value distribution heavily
    expect(result.histogramL1!).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.histogramDeltaMin,
    )
    expect(result.triggers).toContain('histogram-delta')
    expect(result.frozenStreak).toBe(0)
  })

  it('solid color swap fires histogram-delta', () => {
    const evaluator = new TriggerEvaluator()
    evaluator.evaluateFrame(solid(255, 0, 0))
    const result = evaluator.evaluateFrame(solid(0, 0, 255))

    expect(result.histogramL1!).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.histogramDeltaMin,
    )
    expect(result.triggers).toContain('histogram-delta')
  })

  it('extractFeatures agrees with direct phash/histogram helpers', () => {
    const frame = solid(64, 128, 192)
    const features = extractFeatures(frame)
    expect(features.phash).toBe(computePHash(frame))
    expect(histogramL1(features.histogram, computeHsvHistogram(frame))).toBe(0)
    expect(hammingDistance(features.phash, features.phash)).toBe(0)
  })
})
