import { describe, expect, it } from 'vitest'
import {
  ROUND2_SLOW_MEDIAN_MS,
  decideRound2Difficulty,
  explainAdaptiveRound2Decision,
  medianResponseMsFromTimeSpentSeconds,
} from '@/lib/adaptive/adaptive-round2-decision'

const T = 8

describe('medianResponseMsFromTimeSpentSeconds', () => {
  it('returns null when no positive times', () => {
    expect(medianResponseMsFromTimeSpentSeconds([0, 0])).toBeNull()
    expect(medianResponseMsFromTimeSpentSeconds([])).toBeNull()
  })

  it('computes median in ms', () => {
    expect(medianResponseMsFromTimeSpentSeconds([10, 20, 30])).toBe(20_000)
  })
})

describe('decideRound2Difficulty — score threshold', () => {
  it('below pass → EASY', () => {
    expect(decideRound2Difficulty(7.9, T)).toBe('EASY')
    expect(decideRound2Difficulty(0, T)).toBe('EASY')
  })

  it('equal to pass → HARD without slow timing', () => {
    expect(decideRound2Difficulty(8, T, { medianResponseMs: 10_000 })).toBe('HARD')
  })

  it('above pass → HARD when fast', () => {
    expect(decideRound2Difficulty(9.5, T, { medianResponseMs: 5_000 })).toBe('HARD')
  })
})

describe('decideRound2Difficulty — response time (ms)', () => {
  it('missing timing: pass → HARD (score-only fallback)', () => {
    expect(decideRound2Difficulty(9, T)).toBe('HARD')
    expect(decideRound2Difficulty(9, T, { medianResponseMs: null })).toBe('HARD')
  })

  it('pass + slow median → EASY', () => {
    expect(
      decideRound2Difficulty(9, T, {
        medianResponseMs: ROUND2_SLOW_MEDIAN_MS + 1,
      }),
    ).toBe('EASY')
  })

  it('pass + median exactly at threshold → HARD (not slow)', () => {
    expect(
      decideRound2Difficulty(9, T, { medianResponseMs: ROUND2_SLOW_MEDIAN_MS }),
    ).toBe('HARD')
  })

  it('fail + slow still → EASY', () => {
    expect(
      decideRound2Difficulty(5, T, { medianResponseMs: ROUND2_SLOW_MEDIAN_MS + 60_000 }),
    ).toBe('EASY')
  })
})

describe('explainAdaptiveRound2Decision', () => {
  it('marks exactly one branch taken', () => {
    const trace = explainAdaptiveRound2Decision(9, T, { medianResponseMs: 12_000 })
    expect(trace.branches.filter((b) => b.taken)).toHaveLength(1)
    expect(trace.branches.find((b) => b.taken)?.id).toBe('score_pass_fast')
  })

  it('slow pass takes score_pass_slow branch', () => {
    const trace = explainAdaptiveRound2Decision(9, T, {
      medianResponseMs: ROUND2_SLOW_MEDIAN_MS + 1000,
    })
    expect(trace.difficulty).toBe('EASY')
    expect(trace.branches.find((b) => b.taken)?.id).toBe('score_pass_slow')
  })
})
