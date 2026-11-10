import { describe, expect, it } from 'vitest'
import {
  MONITOR_REQUIRED,
  MONITOR_REQUIRED_MESSAGE,
  assertWholeMonitor,
  readDisplaySurface,
  requestMonitorShare,
  stopStream,
} from './display-surface'

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

describe('display-surface gate', () => {
  it('reads displaySurface from the first video track', () => {
    const { stream } = stubStream('monitor')
    expect(readDisplaySurface(stream)).toBe('monitor')
    expect(readDisplaySurface(null)).toBe('')
  })

  it('allows monitor and leaves tracks running', () => {
    const { stream, stopped } = stubStream('monitor')
    const result = assertWholeMonitor(stream)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.displaySurface).toBe('monitor')
    expect(stopped()).toBe(0)
  })

  it('refuses browser/window/missing with monitor_required and stops tracks', () => {
    for (const surface of ['browser', 'window', '']) {
      const { stream, stopped } = stubStream(surface)
      const result = assertWholeMonitor(stream)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe(MONITOR_REQUIRED)
        expect(result.displaySurface).toBe(surface)
        expect(result.message).toBe(MONITOR_REQUIRED_MESSAGE)
      }
      expect(stopped()).toBe(1)
    }
  })

  it('requestMonitorShare uses injected getDisplayMedia (never hangs)', async () => {
    const { stream } = stubStream('monitor')
    const ok = await requestMonitorShare({
      getDisplayMedia: async () => stream,
    })
    expect(ok.ok).toBe(true)

    const { stream: bad, stopped } = stubStream('browser')
    const refused = await requestMonitorShare({
      getDisplayMedia: async () => bad,
    })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.reason).toBe(MONITOR_REQUIRED)
    expect(stopped()).toBe(1)
  })

  it('stopStream is idempotent', () => {
    const { stream, stopped } = stubStream('window')
    stopStream(stream)
    stopStream(stream)
    expect(stopped()).toBe(2)
  })
})
