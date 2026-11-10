/**
 * AC-1 default thresholds for portable anticheat trigger evaluation.
 * Pure math defaults — no UI / capture coupling.
 */
export type AnticheatThresholds = {
  /** Max Hamming distance (of 63 pHash bits) that still counts as a "still" pair. */
  frozenMaxHamming: number
  /** Consecutive still pairs required before `frozen` fires. */
  frozenConsecutivePairs: number
  /** Min Hamming distance that can contribute to a `tab-switch` decision. */
  tabSwitchMinHamming: number
  /** Min HSV L1 (normalized histograms, range [0, 2]) for `histogram-delta`. */
  histogramDeltaMin: number
}

export const DEFAULT_THRESHOLDS: Readonly<AnticheatThresholds> = {
  frozenMaxHamming: 4,
  frozenConsecutivePairs: 4,
  tabSwitchMinHamming: 20,
  histogramDeltaMin: 1.0,
}

export function resolveThresholds(
  overrides?: Partial<AnticheatThresholds>,
): AnticheatThresholds {
  return { ...DEFAULT_THRESHOLDS, ...overrides }
}
