import { describe, expect, it } from 'vitest'
import {
  formatAdaptiveProgressLine,
  isPracticeQuizItem,
  resolveAdaptiveQuizStatus,
  resolveStandardQuizStatus,
} from '@/lib/quiz/quiz-display-status'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'
import type { AdaptiveProgress } from '@/lib/adaptive/adaptive-logic'

function baseQuiz(overrides: Partial<QuizBankItem> = {}): QuizBankItem {
  return {
    testId: 't1',
    packageId: null,
    classTestId: null,
    title: 'Bài kiểm tra',
    subject: 'Toán',
    topic: '',
    timeLimitMinutes: 45,
    questionCount: 10,
    totalPoints: 10,
    difficultyLevel: 'MEDIUM',
    packageMode: 'STANDARD',
    startTime: null,
    endTime: null,
    maxAttempts: null,
    allowReview: true,
    attemptCount: 0,
    availability: 'open',
    latestSubmission: null,
    ...overrides,
  }
}

function adaptiveProgress(overrides: Partial<AdaptiveProgress> = {}): AdaptiveProgress {
  return {
    status: 'not_started',
    round1Score: null,
    round1SubmissionId: null,
    round2Difficulty: null,
    round2TestId: null,
    round2Score: null,
    round2SubmissionId: null,
    nextTestId: 'med',
    ...overrides,
  }
}

describe('isPracticeQuizItem', () => {
  it('detects personalized practice title prefix', () => {
    expect(isPracticeQuizItem(baseQuiz({ title: 'Luyện tập cá nhân hóa — PT' }))).toBe(true)
    expect(isPracticeQuizItem(baseQuiz({ title: 'Bài 1' }))).toBe(false)
  })
})

describe('formatAdaptiveProgressLine', () => {
  it('returns null without progress or scores', () => {
    expect(formatAdaptiveProgressLine(baseQuiz())).toBeNull()
    expect(
      formatAdaptiveProgressLine(
        baseQuiz({ adaptiveProgress: adaptiveProgress() }),
      ),
    ).toBeNull()
  })

  it('joins round scores when present', () => {
    expect(
      formatAdaptiveProgressLine(
        baseQuiz({
          adaptiveProgress: adaptiveProgress({
            round1Score: 8,
            round2Score: 9.5,
          }),
        }),
      ),
    ).toBe('Lượt 1: 8.0/10 | Lượt 2: 9.5/10')
  })
})

describe('resolveStandardQuizStatus', () => {
  it('marks completed with score line', () => {
    const status = resolveStandardQuizStatus(
      baseQuiz({
        latestSubmission: {
          id: 'sub',
          score: 7.5,
          attemptNumber: 1,
          submittedAt: new Date(),
        },
      }),
    )
    expect(status.statusLabel).toBe('Đã hoàn thành')
    expect(status.progressLine).toBe('7.5/10')
    expect(status.isDone).toBe(true)
    expect(status.canTake).toBe(true)
  })

  it('handles expired / not_started / max_attempts / open', () => {
    expect(resolveStandardQuizStatus(baseQuiz({ availability: 'expired' })).statusLabel).toBe(
      'Quá hạn',
    )
    expect(
      resolveStandardQuizStatus(baseQuiz({ availability: 'not_started' })).statusLabel,
    ).toBe('Chưa mở')
    expect(
      resolveStandardQuizStatus(baseQuiz({ availability: 'max_attempts' })).statusLabel,
    ).toBe('Đã hết lượt')
    expect(resolveStandardQuizStatus(baseQuiz()).statusLabel).toBe('Chưa làm')
  })

  it('treats attemptCount > 0 as done even without latestSubmission', () => {
    const status = resolveStandardQuizStatus(baseQuiz({ attemptCount: 1 }))
    expect(status.isDone).toBe(true)
    expect(status.statusLabel).toBe('Đã hoàn thành')
    expect(status.progressLine).toBeNull()
  })
})

describe('resolveAdaptiveQuizStatus', () => {
  it('in-progress when round1 submitted but not complete', () => {
    const status = resolveAdaptiveQuizStatus(
      baseQuiz({
        isAdaptiveGroup: true,
        adaptiveProgress: adaptiveProgress({
          status: 'round2_pending',
          round1SubmissionId: 's1',
          round1Score: 8,
          nextTestId: 'hard',
        }),
      }),
    )
    expect(status.statusLabel).toBe('Đang tiến hành')
    expect(status.isDone).toBe(false)
    expect(status.canTake).toBe(true)
    expect(status.progressLine).toBe('Lượt 1: 8.0/10')
  })

  it('completed when adaptive status is completed', () => {
    const status = resolveAdaptiveQuizStatus(
      baseQuiz({
        adaptiveProgress: adaptiveProgress({
          status: 'completed',
          round1SubmissionId: 's1',
          round2SubmissionId: 's2',
          round1Score: 8,
          round2Score: 9,
          nextTestId: null,
        }),
      }),
    )
    expect(status.statusLabel).toBe('Đã hoàn thành')
    expect(status.isDone).toBe(true)
    expect(status.canTake).toBe(false)
  })

  it('expired without submissions shows quá hạn', () => {
    expect(
      resolveAdaptiveQuizStatus(
        baseQuiz({
          availability: 'expired',
          adaptiveProgress: adaptiveProgress({ nextTestId: 'med' }),
        }),
      ).statusLabel,
    ).toBe('Quá hạn')
  })
})
