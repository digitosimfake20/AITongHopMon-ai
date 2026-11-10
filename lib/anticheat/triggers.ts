/**
 * Trigger evaluation over consecutive frame features (AC-1).
 *
 * Deciding triggers: `frozen` | `tab-switch` | `histogram-delta`
 * Soft signals (`hint` / `visibilitychange`) are recorded but NEVER decide alone.
 */

import {
  DEFAULT_THRESHOLDS,
  resolveThresholds,
  type AnticheatThresholds,
} from './thresholds'
import { computePHash, hammingDistance, type FramePixels, type PHash } from './phash'
import {
  computeHsvHistogram,
  histogramL1,
  type HsvHistogram,
} from './hsv-histogram'

export type DecidingTrigger = 'frozen' | 'tab-switch' | 'histogram-delta'

/** Soft / contextual signals — never sufficient on their own. */
export type SoftHint = 'hint' | 'visibilitychange' | 'blur' | 'focus'

export type FrameFeatures = {
  phash: PHash
  histogram: HsvHistogram
}

export type FrameObservation = {
  features: FrameFeatures
  /** Soft signals attached to this observation (recorded, non-deciding). */
  softHints?: SoftHint[]
}

export type TriggerEvaluation = {
  /** Triggers that fired based on frame distances / streak rules. */
  triggers: DecidingTrigger[]
  hamming: number | null
  histogramL1: number | null
  /** Current consecutive still-pair count after this observation. */
  frozenStreak: number
  /** Soft hints observed on this step (never appear in `triggers`). */
  softHintsRecorded: SoftHint[]
}

export function extractFeatures(frame: FramePixels): FrameFeatures {
  return {
    phash: computePHash(frame),
    histogram: computeHsvHistogram(frame),
  }
}

/**
 * Stateful evaluator: compare each new observation to the previous one.
 *
 * Rules (defaults from {@link DEFAULT_THRESHOLDS}):
 * - `frozen`: Hamming ≤ frozenMaxHamming for frozenConsecutivePairs consecutive pairs
 * - `tab-switch`: Hamming ≥ tabSwitchMinHamming
 *   (soft hints may accompany it, but Hamming is what decides)
 * - `histogram-delta`: HSV L1 ≥ histogramDeltaMin
 * - Soft hints alone → empty `triggers`
 */
export class TriggerEvaluator {
  private readonly thresholds: AnticheatThresholds
  private prev: FrameFeatures | null = null
  private frozenStreak = 0

  constructor(thresholds?: Partial<AnticheatThresholds>) {
    this.thresholds = resolveThresholds(thresholds)
  }

  getThresholds(): Readonly<AnticheatThresholds> {
    return this.thresholds
  }

  getFrozenStreak(): number {
    return this.frozenStreak
  }

  reset(): void {
    this.prev = null
    this.frozenStreak = 0
  }

  evaluate(observation: FrameObservation): TriggerEvaluation {
    const softHintsRecorded = [...(observation.softHints ?? [])]

    if (!this.prev) {
      this.prev = observation.features
      return {
        triggers: [],
        hamming: null,
        histogramL1: null,
        frozenStreak: this.frozenStreak,
        softHintsRecorded,
      }
    }

    const hamming = hammingDistance(this.prev.phash, observation.features.phash)
    const histL1 = histogramL1(
      this.prev.histogram,
      observation.features.histogram,
    )

    const triggers: DecidingTrigger[] = []
    const t = this.thresholds

    if (hamming <= t.frozenMaxHamming) {
      this.frozenStreak += 1
    } else {
      this.frozenStreak = 0
    }

    if (this.frozenStreak >= t.frozenConsecutivePairs) {
      triggers.push('frozen')
    }

    if (hamming >= t.tabSwitchMinHamming) {
      triggers.push('tab-switch')
    }

    if (histL1 >= t.histogramDeltaMin) {
      triggers.push('histogram-delta')
    }

    this.prev = observation.features

    return {
      triggers,
      hamming,
      histogramL1: histL1,
      frozenStreak: this.frozenStreak,
      softHintsRecorded,
    }
  }

  /** Convenience: extract features from pixels then evaluate. */
  evaluateFrame(
    frame: FramePixels,
    softHints?: SoftHint[],
  ): TriggerEvaluation {
    return this.evaluate({
      features: extractFeatures(frame),
      softHints,
    })
  }
}

export { DEFAULT_THRESHOLDS }
