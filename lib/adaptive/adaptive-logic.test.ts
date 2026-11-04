import { describe, expect, it } from 'vitest'
import {
  buildAdaptiveEvaluation,
  computeAdaptiveProgress,
  difficultyLabel,
  recommendRound2Difficulty,
  resolveRound2TestId,
  type AdaptiveClassTestRef,
  type AdaptiveSessionRef,
} from '@/lib/adaptive/adaptive-logic'
import { ROUND2_SLOW_MEDIAN_MS } from '@/lib/adaptive/adaptive-round2-decision'

const ct: AdaptiveClassTestRef = {
  mediumTestId: 'med',
  easyTestId: 'easy',
  hardTestId: 'hard',
  passScoreThreshold: 8,
}

describe('difficultyLabel', () => {
  it('maps DifficultyLevel to Vietnamese labels', () => {
    expect(difficultyLabel('EASY')).toBe('Dễ')
    expect(difficultyLabel('MEDIUM')).toBe('Trung bình')
    expect(difficultyLabel('HARD')).toBe('Khó')
  })
})

describe('recommendRound2Difficulty', () => {
  it('delegates score + timing rules', () => {
    expect(recommendRound2Difficulty(7.5, 8)).toBe('EASY')
    expect(recommendRound2Difficulty(8, 8)).toBe('HARD')
    expect(
      recommendRound2Difficulty(9, 8, { medianResponseMs: ROUND2_SLOW_MEDIAN_MS + 1 }),
    ).toBe('EASY')
  })
})

describe('resolveRound2TestId', () => {
  it('routes HARD to hardTestId and everything else to easyTestId', () => {
    expect(resolveRound2TestId(ct, 'HARD')).toBe('hard')
    expect(resolveRound2TestId(ct, 'EASY')).toBe('easy')
    expect(resolveRound2TestId(ct, 'MEDIUM')).toBe('easy')
  })
})

describe('computeAdaptiveProgress', () => {
  it('not_started when no round1 submission', () => {
    expect(computeAdaptiveProgress(ct, null, null, null)).toMatchObject({
      status: 'not_started',
      nextTestId: 'med',
      round1SubmissionId: null,
    })
  })

  it('round2_pending derives difficulty and test id when session lacks them', () => {
    const session: AdaptiveSessionRef = {
      round1SubmissionId: 's1',
      round2TestId: null,
      round2Difficulty: null,
      round2SubmissionId: null,
    }
    const progress = computeAdaptiveProgress(ct, session, 9, null)
    expect(progress.status).toBe('round2_pending')
    expect(progress.round2Difficulty).toBe('HARD')
    expect(progress.round2TestId).toBe('hard')
    expect(progress.nextTestId).toBe('hard')
  })

  it('round2_pending keeps session difficulty when already stored', () => {
    const session: AdaptiveSessionRef = {
      round1SubmissionId: 's1',
      round2TestId: 'easy',
      round2Difficulty: 'EASY',
      round2SubmissionId: null,
    }
    const progress = computeAdaptiveProgress(ct, session, 9, null)
    expect(progress.round2Difficulty).toBe('EASY')
    expect(progress.round2TestId).toBe('easy')
    expect(progress.nextTestId).toBe('easy')
  })

  it('completed clears nextTestId', () => {
    const session: AdaptiveSessionRef = {
      round1SubmissionId: 's1',
      round2TestId: 'hard',
      round2Difficulty: 'HARD',
      round2SubmissionId: 's2',
    }
    const progress = computeAdaptiveProgress(ct, session, 9, 8.5)
    expect(progress.status).toBe('completed')
    expect(progress.round2Score).toBe(8.5)
    expect(progress.nextTestId).toBeNull()
  })
})

describe('buildAdaptiveEvaluation', () => {
  it('describes not started / waiting / improved / needs review', () => {
    expect(buildAdaptiveEvaluation(null, null, null, 8)).toMatch(/Chưa bắt đầu/)
    expect(buildAdaptiveEvaluation(9, 'HARD', null, 8)).toMatch(/Đang chờ lượt 2 \(Khó\)/)
    expect(buildAdaptiveEvaluation(7, 'EASY', null, 8)).toMatch(/đề dễ hơn/)
    expect(buildAdaptiveEvaluation(7, 'EASY', 8.5, 8)).toMatch(/cải thiện/)
    expect(buildAdaptiveEvaluation(9, 'HARD', 8, 8)).toMatch(/cần ôn thêm/)
  })
})
