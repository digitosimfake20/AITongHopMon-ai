/**
 * Wall-clock time from attempt start to submit.
 * `timeLimitSeconds` is a cap, never a substitute for missing start time.
 */
export interface ResolveElapsedInput {
  startedAtMs: number | null
  nowMs: number
  timeLimitSeconds: number
  /** Client-reported total. Used only when it is strictly inside the limit and start is unusable. */
  reportedSeconds?: number | null
}

export interface ResolveElapsedResult {
  seconds: number
  source: 'wall_clock' | 'reported' | 'unknown'
}

export function resolveElapsedSeconds(input: ResolveElapsedInput): ResolveElapsedResult {
  const limit = Math.max(0, input.timeLimitSeconds)

  if (input.startedAtMs != null && input.startedAtMs > 0) {
    const elapsed = Math.floor((input.nowMs - input.startedAtMs) / 1000)
    if (elapsed >= 0) {
      return { seconds: Math.min(limit, elapsed), source: 'wall_clock' }
    }
  }

  const reported = input.reportedSeconds
  if (reported != null && reported >= 0 && reported < limit) {
    return { seconds: Math.floor(reported), source: 'reported' }
  }

  return { seconds: 0, source: 'unknown' }
}
