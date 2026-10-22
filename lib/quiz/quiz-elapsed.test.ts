import { describe, expect, it } from 'vitest'
import { resolveElapsedSeconds } from '@/lib/quiz/quiz-elapsed'
import { assessQuestionTiming } from '@/lib/quiz/question-timing'
import { formatDurationMs, formatDurationSeconds } from '@/lib/time/format-duration'
import {
  decideRound2Difficulty,
  explainAdaptiveRound2Decision,
  ROUND2_SLOW_MEDIAN_MS,
} from '@/lib/adaptive/adaptive-round2-decision'

const LIMIT = 20 * 60

describe('resolveElapsedSeconds', () => {
  it('20-minute quiz finished in 5 minutes is about 300 seconds', () => {
    const started = Date.parse('2026-10-22T14:00:00Z')
    const now = started + 5 * 60 * 1000
    const result = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: now,
      timeLimitSeconds: LIMIT,
    })
    expect(result.seconds).toBe(300)
    expect(result.source).toBe('wall_clock')
    expect(result.seconds).not.toBe(LIMIT)
  })

  it('near the end of 20 minutes stays near 1200 and never above the limit', () => {
    const started = 1_000_000
    const almost = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: started + 1190 * 1000,
      timeLimitSeconds: LIMIT,
    })
    expect(almost.seconds).toBe(1190)
    const overtime = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: started + 1300 * 1000,
      timeLimitSeconds: LIMIT,
    })
    expect(overtime.seconds).toBe(LIMIT)
  })

  it('auto-submit at the deadline records the limit, not more', () => {
    const started = 5_000
    const result = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: started + LIMIT * 1000 + 4000,
      timeLimitSeconds: LIMIT,
    })
    expect(result.seconds).toBe(LIMIT)
  })

  it('same start timestamp does not reset after a later read (refresh)', () => {
    const started = 10_000
    const first = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: started + 120_000,
      timeLimitSeconds: LIMIT,
    })
    const afterRefresh = resolveElapsedSeconds({
      startedAtMs: started,
      nowMs: started + 180_000,
      timeLimitSeconds: LIMIT,
    })
    expect(first.seconds).toBe(120)
    expect(afterRefresh.seconds).toBe(180)
  })

  it('retry with the same timestamps does not change the locked duration', () => {
    const input = {
      startedAtMs: 50_000,
      nowMs: 50_000 + 300_000,
      timeLimitSeconds: LIMIT,
    }
    expect(resolveElapsedSeconds(input)).toEqual(resolveElapsedSeconds(input))
  })

  it('missing start does not assign the full time limit', () => {
    const result = resolveElapsedSeconds({
      startedAtMs: null,
      nowMs: Date.now(),
      timeLimitSeconds: LIMIT,
      reportedSeconds: LIMIT,
    })
    expect(result.seconds).toBe(0)
    expect(result.source).toBe('unknown')
  })
})

describe('assessQuestionTiming', () => {
  it('no per-question times is insufficient and has no median', () => {
    const result = assessQuestionTiming({
      perQuestionSeconds: [0, 0, 0, 0],
      totalSeconds: 300,
      questionCount: 4,
    })
    expect(result.quality).toBe('insufficient')
    expect(result.medianMs).toBeNull()
    expect(result.reliable).toBe(false)
  })

  it('even split of the total is estimated and not reliable', () => {
    const result = assessQuestionTiming({
      perQuestionSeconds: [75, 75, 75, 75],
      totalSeconds: 300,
      questionCount: 4,
    })
    expect(result.quality).toBe('estimated')
    expect(result.reliable).toBe(false)
    expect(result.medianMs).toBeNull()
  })
})

describe('adaptive routing ignores unreliable timing', () => {
  const threshold = 8

  it('score below threshold is EASY', () => {
    expect(decideRound2Difficulty(7.9, threshold)).toBe('EASY')
  })

  it('passing score with a fast measured median is HARD', () => {
    expect(
      decideRound2Difficulty(8.5, threshold, {
        medianResponseMs: 20_000,
        reliable: true,
      }),
    ).toBe('HARD')
  })

  it('passing score with a slow measured median is EASY', () => {
    expect(
      decideRound2Difficulty(8.5, threshold, {
        medianResponseMs: ROUND2_SLOW_MEDIAN_MS + 1000,
        reliable: true,
      }),
    ).toBe('EASY')
  })

  it('a slow but unreliable median falls back to HARD', () => {
    const trace = explainAdaptiveRound2Decision(8.5, threshold, {
      medianResponseMs: 120_000,
      reliable: false,
    })
    expect(trace.difficulty).toBe('HARD')
    expect(trace.branches.find((b) => b.taken)?.id).toBe('score_pass_fast')
    expect(trace.summaryVi).toContain('không đủ tin cậy')
    expect(trace.summaryVi).not.toContain('ms')
  })
})

describe('formatDuration', () => {
  it('does not show raw milliseconds', () => {
    expect(formatDurationMs(79_500, { perQuestion: true })).toBe('79,5 giây/câu')
    expect(formatDurationMs(120_000, { perQuestion: true })).toBe('2 phút/câu')
    expect(formatDurationMs(113_500, { perQuestion: true })).toBe('113,5 giây/câu')
    expect(formatDurationSeconds(45)).toBe('45 giây')
    expect(formatDurationSeconds(75)).toBe('1 phút 15 giây')
    expect(formatDurationMs(45_000, { perQuestion: true })).not.toMatch(/ms/)
  })
})
