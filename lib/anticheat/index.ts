/**
 * Client-side anticheat: Phase 0 math + Phase 2 capture helpers.
 *
 * Math (pHash / HSV / triggers) stays portable. Capture helpers accept injected
 * getDisplayMedia / grabFrame so unit tests never open a real picker.
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

export {
  MONITOR_REQUIRED,
  MONITOR_REQUIRED_MESSAGE,
  readDisplaySurface,
  stopStream,
  assertWholeMonitor,
  requestMonitorShare,
  type GetDisplayMediaFn,
  type AssertMonitorResult,
} from './display-surface'

export {
  CAPTURE_WIDTH,
  CAPTURE_HEIGHT,
  CAPTURE_INTERVAL_MS,
  HASH_WINDOW_MAX,
  HASH_HEARTBEAT_MS,
  MONITOR_CAPTURE_CONSTRAINTS,
  phashToHex,
  toServerTrigger,
  openMonitorCapture,
  createVideoGrabber,
  createCaptureLoop,
  type ServerDecidingTrigger,
  type HashWindowSample,
  type CaptureFrame,
  type CaptureReportResult,
  type ReportCaptureFlagFn,
  type CaptureLoopOpts,
} from './capture-loop'
