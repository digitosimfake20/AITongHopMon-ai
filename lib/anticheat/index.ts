/**
 * Portable client-side anticheat math (Phase 0).
 *
 * Pure TypeScript: pHash + HSV histogram + trigger evaluation.
 * No UI, Prisma, or getDisplayMedia.
 */

export {
  DEFAULT_THRESHOLDS,
  resolveThresholds,
  type AnticheatThresholds,
} from './thresholds'

export {
  PHASH_SIZE,
  PHASH_DCT_LOW,
  PHASH_BITS,
  computePHash,
  hammingDistance,
  resizeBilinearGray,
  dct1d,
  dct2d,
  type FramePixels,
  type PHash,
} from './phash'

export {
  HIST_H_BINS,
  HIST_S_BINS,
  HIST_V_BINS,
  HIST_BINS,
  rgbToHsv,
  computeHsvHistogram,
  histogramL1,
  type HsvHistogram,
} from './hsv-histogram'

export {
  TriggerEvaluator,
  extractFeatures,
  type DecidingTrigger,
  type SoftHint,
  type FrameFeatures,
  type FrameObservation,
  type TriggerEvaluation,
} from './triggers'
