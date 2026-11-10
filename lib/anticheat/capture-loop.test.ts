/**
 * Capture loop unit tests — stubbed grabFrame / getDisplayMedia only.
 * Never call the real picker in CI.
 */

import { describe, expect, it } from 'vitest'
import {
  CAPTURE_HEIGHT,
  CAPTURE_INTERVAL_MS,
  CAPTURE_WIDTH,
  HASH_WINDOW_MAX,
  MONITOR_CAPTURE_CONSTRAINTS,
  MONITOR_REQUIRED,
  createCaptureLoop,
  openMonitorCapture,
  phashToHex,
  toServerTrigger,
  type CaptureReportResult,
} from './capture-loop'
import { computePHash, type FramePixels } from './phash'

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

function stubStream(surface: string) {
  let stopped = 0
  const track = {
    getSettings: () => ({ displaySurface: surface }),
    stop: () => {
      stopped += 1
    },
  }
  return {
    stream: {
      getVideoTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream,
    stopped: () => stopped,
  }
}

describe('capture-loop', () => {
  it('exports 720p @ 1fps capture constants', () => {
    expect(CAPTURE_WIDTH).toBe(1280)
    expect(CAPTURE_HEIGHT).toBe(720)
    expect(CAPTURE_INTERVAL_MS).toBe(1000)
    expect(HASH_WINDOW_MAX).toBe(16)
    expect(
      (MONITOR_CAPTURE_CONSTRAINTS.video as MediaTrackConstraints).frameRate,
    ).toEqual({ ideal: 1, max: 1 })
    expect(MONITOR_CAPTURE_CONSTRAINTS.audio).toBe(false)
  })

  it('maps deciding triggers to server enum names', () => {
    expect(toServerTrigger('frozen')).toBe('frozen')
    expect(toServerTrigger('tab-switch')).toBe('tab_switch')
    expect(toServerTrigger('histogram-delta')).toBe('histogram_delta')
  })

  it('openMonitorCapture refuses non-monitor and stops tracks', async () => {
    const { stream, stopped } = stubStream('browser')
    const result = await openMonitorCapture({
      getDisplayMedia: async () => stream,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe(MONITOR_REQUIRED)
    expect(stopped()).toBe(1)
  })

  it('openMonitorCapture accepts monitor stub (never real GDM)', async () => {
    const { stream, stopped } = stubStream('monitor')
    let calls = 0
    const result = await openMonitorCapture({
      getDisplayMedia: async (constraints) => {
        calls += 1
        const video = constraints?.video as MediaTrackConstraints | undefined
        expect((video?.width as ConstrainULongRange | undefined)?.ideal).toBe(
          CAPTURE_WIDTH,
        )
        return stream
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.displaySurface).toBe('monitor')
    expect(calls).toBe(1)
    expect(stopped()).toBe(0)
  })

  it('tick keeps a rolling hash window from injected grabFrame', async () => {
    const rgba = solid(200, 40, 40, 64, 64)
    const expectedHex = phashToHex(computePHash(rgba))
    let n = 0
    const loop = createCaptureLoop({
      grabFrame: async () => {
        n += 1
        return { ...rgba, jpegBase64: 'ZmFrZQ==' }
      },
      now: () => `t${n}`,
      hashWindowMax: 3,
    })

    const a = await loop.tick()
    const b = await loop.tick()
    expect(a.enqueued).toBe(true)
    expect(b.enqueued).toBe(true)
    expect(a.triggers).toEqual([])
    expect(loop.hashWindow()).toEqual([
      { at: 't1', phash: expectedHex },
      { at: 't2', phash: expectedHex },
    ])

    await loop.tick()
    await loop.tick()
    expect(loop.hashWindow()).toHaveLength(3)
  })

  it('synthetic tab-switch reports Flag via reportFlag', async () => {
    const red = solid(255, 0, 0)
    const blue = solid(0, 0, 255)
    const frames = [
      { ...red, jpegBase64: 'cmVk' },
      { ...blue, jpegBase64: 'Ymx1ZQ==' },
    ]
    let i = 0
    const reported: unknown[] = []
    const loop = createCaptureLoop({
      grabFrame: async () => frames[Math.min(i++, frames.length - 1)]!,
      reportFlag: async (opts) => {
        reported.push(opts)
        return {
          success: true,
          data: { flagId: 'f1', evidenceId: 'e1' },
        } satisfies CaptureReportResult
      },
      thresholds: {
        tabSwitchMinHamming: 1,
        histogramDeltaMin: 0.1,
        frozenMaxHamming: 0,
        frozenConsecutivePairs: 99,
      },
    })

    expect((await loop.tick()).triggers).toEqual([])
    const second = await loop.tick()
    expect(second.triggers.length).toBeGreaterThan(0)
    expect(second.reported?.success).toBe(true)
    expect(reported).toHaveLength(1)
    const first = reported[0] as {
      trigger: string
      hashWindow: unknown[]
      jpegBase64: string
    }
    expect(
      first.trigger === 'tab_switch' || first.trigger === 'histogram_delta',
    ).toBe(true)
    expect(first.hashWindow).toHaveLength(2)
    expect(first.jpegBase64).toBe('Ymx1ZQ==')
  })

  it('soft-stops uploads after evidence_capped', async () => {
    const red = solid(255, 0, 0)
    const blue = solid(0, 0, 255)
    const green = solid(0, 255, 0)
    const frames = [
      { ...red, jpegBase64: 'a' },
      { ...blue, jpegBase64: 'b' },
      { ...green, jpegBase64: 'c' },
    ]
    let i = 0
    let uploads = 0
    let capped = 0
    const loop = createCaptureLoop({
      grabFrame: async () => frames[Math.min(i++, frames.length - 1)]!,
      reportFlag: async () => {
        uploads += 1
        return { success: false, error: 'evidence_capped' }
      },
      onEvidenceCapped: () => {
        capped += 1
      },
      thresholds: {
        tabSwitchMinHamming: 1,
        histogramDeltaMin: 0.1,
        frozenMaxHamming: 0,
        frozenConsecutivePairs: 99,
      },
    })

    await loop.tick()
    await loop.tick()
    expect(uploads).toBe(1)
    expect(capped).toBe(1)
    expect(loop.uploadsStopped()).toBe(true)

    await loop.tick()
    expect(uploads).toBe(1)
  })

  it('start/stop arm an injectable interval without calling GDM', () => {
    const callbacks: Array<() => void> = []
    let cleared = 0
    const loop = createCaptureLoop({
      grabFrame: async () => solid(10, 10, 10, 8, 8),
      intervalMs: 50,
      setInterval: ((fn: () => void) => {
        callbacks.push(fn)
        return 1 as unknown as ReturnType<typeof setInterval>
      }) as typeof setInterval,
      clearInterval: (() => {
        cleared += 1
      }) as typeof clearInterval,
    })
    loop.start()
    expect(loop.running()).toBe(true)
    expect(callbacks).toHaveLength(1)
    loop.stop()
    expect(loop.running()).toBe(false)
    expect(cleared).toBe(1)
  })

  it('dispose stops tracks on an attached stream', () => {
    const { stream, stopped } = stubStream('monitor')
    const loop = createCaptureLoop({
      stream,
      grabFrame: async () => solid(1, 2, 3, 4, 4),
    })
    loop.dispose()
    expect(stopped()).toBe(1)
    expect(loop.running()).toBe(false)
  })
})
