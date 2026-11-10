/**
 * Whole-monitor displaySurface gate for getDisplayMedia.
 *
 * Client checks track settings after grant. Tests inject getDisplayMedia —
 * never call the real picker in CI.
 */

export const MONITOR_REQUIRED = 'monitor_required' as const

/** Clear Vietnamese copy when the shared surface is not a whole monitor. */
export const MONITOR_REQUIRED_MESSAGE =
  'Vui lòng chia sẻ toàn bộ màn hình (không phải cửa sổ hay tab trình duyệt) để bật giám sát. Điểm số không bị ảnh hưởng — bạn vẫn có thể làm bài.'

export type GetDisplayMediaFn = (
  constraints?: DisplayMediaStreamConstraints,
) => Promise<MediaStream>

export type AssertMonitorResult =
  | {
      ok: true
      displaySurface: 'monitor'
      stream: MediaStream
    }
  | {
      ok: false
      reason: typeof MONITOR_REQUIRED
      displaySurface: string
      stream?: MediaStream
      message: string
    }

/** Read `displaySurface` from the first video track (empty if missing). */
export function readDisplaySurface(
  stream: MediaStream | null | undefined,
): string {
  const track = stream?.getVideoTracks?.()?.[0]
  if (!track || typeof track.getSettings !== 'function') return ''
  const settings = track.getSettings() || {}
  return typeof settings.displaySurface === 'string'
    ? settings.displaySurface
    : ''
}

/** Stop every track on a stream (best-effort). */
export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream?.getTracks) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // ignore
    }
  }
}

/**
 * Require displaySurface === "monitor". Non-monitor → stop tracks + refuse.
 */
export function assertWholeMonitor(stream: MediaStream): AssertMonitorResult {
  const displaySurface = readDisplaySurface(stream)
  if (displaySurface !== 'monitor') {
    stopStream(stream)
    return {
      ok: false,
      reason: MONITOR_REQUIRED,
      displaySurface,
      stream,
      message: MONITOR_REQUIRED_MESSAGE,
    }
  }
  return { ok: true, displaySurface: 'monitor', stream }
}

/**
 * Request a display share (inject getDisplayMedia in tests) and enforce monitor.
 */
export async function requestMonitorShare(opts: {
  getDisplayMedia?: GetDisplayMediaFn
  constraints?: DisplayMediaStreamConstraints
} = {}): Promise<AssertMonitorResult> {
  const gdm =
    opts.getDisplayMedia ??
    (typeof globalThis.navigator !== 'undefined'
      ? globalThis.navigator.mediaDevices?.getDisplayMedia?.bind(
          globalThis.navigator.mediaDevices,
        )
      : undefined)

  if (typeof gdm !== 'function') {
    return {
      ok: false,
      reason: MONITOR_REQUIRED,
      displaySurface: '',
      message: MONITOR_REQUIRED_MESSAGE,
    }
  }

  const stream = await gdm(opts.constraints ?? { video: true, audio: false })
  return assertWholeMonitor(stream)
}
