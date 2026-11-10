/**
 * Continuous capture → local hash → rolling window → Flag+Evidence on trigger.
 *
 * Spec: getDisplayMedia whole-monitor only, ideal 1280×720 @ 1fps, audio: false.
 * CI / unit tests inject getDisplayMedia / grabFrame — never hang on a real picker.
 */

import type { FramePixels, PHash } from './phash'
import {
  TriggerEvaluator,
  extractFeatures,
  type DecidingTrigger,
  type SoftHint,
} from './triggers'
import type { AnticheatThresholds } from './thresholds'
import {
  MONITOR_REQUIRED,
  assertWholeMonitor,
  requestMonitorShare,
  stopStream,
  type GetDisplayMediaFn,
  type AssertMonitorResult,
} from './display-surface'

export const CAPTURE_WIDTH = 1280
export const CAPTURE_HEIGHT = 720
export const CAPTURE_INTERVAL_MS = 1000
export const HASH_WINDOW_MAX = 16
/** Optional lightweight hash heartbeat interval (no second scoring path). */
export const HASH_HEARTBEAT_MS = 5_000

/** Ideal getDisplayMedia constraints for 720p @ 1fps (browser may approximate). */
export const MONITOR_CAPTURE_CONSTRAINTS: DisplayMediaStreamConstraints =
  Object.freeze({
    video: {
      width: { ideal: CAPTURE_WIDTH },
      height: { ideal: CAPTURE_HEIGHT },
      frameRate: { ideal: 1, max: 1 },
    },
    audio: false,
  })

/** Prisma / server trigger names (underscore). */
export type ServerDecidingTrigger =
  | 'frozen'
  | 'tab_switch'
  | 'histogram_delta'

export type HashWindowSample = {
  at: string
  phash: string
}

export type CaptureFrame = FramePixels & {
  /** JPEG evidence as base64 (no data: URL prefix). Optional until a trigger fires. */
  jpegBase64?: string
}

export type CaptureReportResult = {
  success: boolean
  data?: {
    flagId?: string
    evidenceId?: string
    framePath?: string
    capped?: boolean
  }
  error?: string
}

export type ReportCaptureFlagFn = (input: {
  trigger: ServerDecidingTrigger
  clientAt: string
  hashWindow: HashWindowSample[]
  jpegBase64: string
}) => Promise<CaptureReportResult>

export type CaptureLoopOpts = {
  grabFrame?: () => Promise<CaptureFrame>
  stream?: MediaStream | null
  reportFlag?: ReportCaptureFlagFn
  thresholds?: Partial<AnticheatThresholds>
  intervalMs?: number
  hashWindowMax?: number
  setInterval?: typeof setInterval
  clearInterval?: typeof clearInterval
  now?: () => string
  /** Soft hints attached to the next frame evaluation (e.g. visibility). */
  softHintsForNext?: () => SoftHint[] | undefined
  onFlag?: (
    result: CaptureReportResult,
    trigger: ServerDecidingTrigger,
  ) => void
  onError?: (err: unknown) => void
  /** Called once when server returns evidence_capped — soft-stop further uploads. */
  onEvidenceCapped?: () => void
}

export function phashToHex(phash: PHash): string {
  return phash.toString(16).padStart(16, '0')
}

/** Map lib deciding trigger → server AnticheatTrigger enum value. */
export function toServerTrigger(
  trigger: DecidingTrigger,
): ServerDecidingTrigger {
  switch (trigger) {
    case 'frozen':
      return 'frozen'
    case 'tab-switch':
      return 'tab_switch'
    case 'histogram-delta':
      return 'histogram_delta'
    default: {
      const _exhaustive: never = trigger
      return _exhaustive
    }
  }
}

/**
 * Request a whole-monitor share at capture constraints.
 */
export async function openMonitorCapture(opts: {
  getDisplayMedia?: GetDisplayMediaFn
  constraints?: DisplayMediaStreamConstraints
} = {}): Promise<AssertMonitorResult> {
  return requestMonitorShare({
    getDisplayMedia: opts.getDisplayMedia,
    constraints: opts.constraints ?? MONITOR_CAPTURE_CONSTRAINTS,
  })
}

/**
 * Build a grabber that paints the video track onto a 1280×720 canvas.
 * Browser-only; Node tests inject `grabFrame` instead.
 */
export async function createVideoGrabber(
  stream: MediaStream,
): Promise<() => Promise<CaptureFrame>> {
  if (typeof document === 'undefined') {
    throw new Error(
      'createVideoGrabber: document required (inject grabFrame in Node)',
    )
  }
  const track = stream.getVideoTracks?.()?.[0]
  if (!track) throw new Error('createVideoGrabber: no video track')

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.srcObject = stream
  await video.play()

  const canvas = document.createElement('canvas')
  canvas.width = CAPTURE_WIDTH
  canvas.height = CAPTURE_HEIGHT
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('createVideoGrabber: 2d context unavailable')

  return async () => {
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT)
    const imageData = ctx.getImageData(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.85,
      )
    })
    const jpegBase64 = await blobToBase64(blob)
    return {
      data: imageData.data,
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
      jpegBase64,
    }
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Stateful ~1fps capture loop. Call `tick()` directly in tests; `start()` arms
 * the interval for production.
 */
export function createCaptureLoop(opts: CaptureLoopOpts) {
  const intervalMs =
    typeof opts.intervalMs === 'number' && opts.intervalMs > 0
      ? opts.intervalMs
      : CAPTURE_INTERVAL_MS
  const hashWindowMax =
    typeof opts.hashWindowMax === 'number' && opts.hashWindowMax > 0
      ? Math.floor(opts.hashWindowMax)
      : HASH_WINDOW_MAX
  const schedule = opts.setInterval ?? globalThis.setInterval.bind(globalThis)
  const unschedule =
    opts.clearInterval ?? globalThis.clearInterval.bind(globalThis)
  const now = opts.now ?? (() => new Date().toISOString())

  const evaluator = new TriggerEvaluator(opts.thresholds)
  let hashWindow: HashWindowSample[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false
  let ticking = false
  let uploadsStopped = false
  let grabFrame: (() => Promise<CaptureFrame>) | null = opts.grabFrame ?? null
  let stream: MediaStream | null = opts.stream ?? null
  let grabberReady = !!grabFrame

  async function ensureGrabber() {
    if (grabberReady && grabFrame) return
    if (!stream) {
      throw new Error('createCaptureLoop: stream or grabFrame required')
    }
    const gated = assertWholeMonitor(stream)
    if (!gated.ok) {
      throw Object.assign(new Error(MONITOR_REQUIRED), {
        reason: MONITOR_REQUIRED,
        displaySurface: gated.displaySurface,
        message: gated.message,
      })
    }
    grabFrame = await createVideoGrabber(stream)
    grabberReady = true
  }

  /**
   * Sample one frame: hash → window → evaluate → maybe Flag+Evidence.
   */
  async function tick(): Promise<{
    enqueued: boolean
    triggers: DecidingTrigger[]
    reported: CaptureReportResult | null
  }> {
    if (ticking) {
      return { enqueued: false, triggers: [], reported: null }
    }
    ticking = true
    try {
      await ensureGrabber()
      if (!grabFrame) {
        throw new Error('createCaptureLoop: grabFrame unavailable')
      }

      const frame = await grabFrame()
      const at = now()
      const softHints = opts.softHintsForNext?.()
      const pixels: FramePixels = {
        data: frame.data,
        width: frame.width,
        height: frame.height,
      }
      const features = extractFeatures(pixels)
      hashWindow.push({ at, phash: phashToHex(features.phash) })
      if (hashWindow.length > hashWindowMax) {
        hashWindow = hashWindow.slice(hashWindow.length - hashWindowMax)
      }

      const evaluation = evaluator.evaluate({ features, softHints })
      const triggers = evaluation.triggers
      if (triggers.length === 0 || uploadsStopped) {
        return { enqueued: true, triggers, reported: null }
      }

      const jpegBase64 = frame.jpegBase64
      if (!jpegBase64 || !opts.reportFlag) {
        return { enqueued: true, triggers, reported: null }
      }

      const trigger = toServerTrigger(triggers[0]!)
      const reported = await opts.reportFlag({
        trigger,
        clientAt: at,
        hashWindow: hashWindow.slice(),
        jpegBase64,
      })

      // One Flag per detection event — reset so a still streak does not spam.
      evaluator.reset()

      if (
        reported.data?.capped === true ||
        reported.error === 'evidence_capped'
      ) {
        uploadsStopped = true
        opts.onEvidenceCapped?.()
      }

      opts.onFlag?.(reported, trigger)
      return { enqueued: true, triggers, reported }
    } catch (err) {
      opts.onError?.(err)
      throw err
    } finally {
      ticking = false
    }
  }

  function start() {
    if (running) return
    running = true
    timer = schedule(() => {
      tick().catch((err) => opts.onError?.(err))
    }, intervalMs)
  }

  function stop() {
    running = false
    if (timer != null) {
      unschedule(timer)
      timer = null
    }
  }

  /** Stop the timer and release MediaStream tracks (if any). */
  function dispose() {
    stop()
    stopStream(stream)
    stream = null
    grabFrame = null
    grabberReady = false
    hashWindow = []
    uploadsStopped = false
    evaluator.reset()
  }

  return {
    tick,
    start,
    stop,
    dispose,
    hashWindow: () => hashWindow.slice(),
    running: () => running,
    uploadsStopped: () => uploadsStopped,
    /** Soft-stop further evidence uploads (e.g. after evidence_capped). */
    stopUploads() {
      uploadsStopped = true
    },
    /** Attach / replace the live stream (must already be whole-monitor). */
    setStream(next: MediaStream | null) {
      stream = next
      if (!opts.grabFrame) {
        grabFrame = null
        grabberReady = false
      }
    },
  }
}

export { MONITOR_REQUIRED, assertWholeMonitor, stopStream }
