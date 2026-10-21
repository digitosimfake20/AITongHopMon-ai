import { describe, expect, it } from 'vitest'
import { assignmentsFromQuizBank } from '@/lib/dashboard/student-assignments'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'

describe('assignmentsFromQuizBank', () => {
  it('excludes practice quizzes and collapses adaptive to one row', () => {
    const items: QuizBankItem[] = [
      {
        testId: 'easy-id',
        packageId: null,
        classTestId: null,
        title: 'Gói — Dễ (Dễ)',
        subject: 'Toán',
        topic: '',
        timeLimitMinutes: 45,
        questionCount: 10,
        totalPoints: 10,
        difficultyLevel: 'EASY',
        packageMode: null,
        startTime: null,
        endTime: null,
        maxAttempts: null,
        allowReview: true,
        attemptCount: 0,
        availability: 'open',
        latestSubmission: null,
      },
      {
        testId: 'medium-next',
        packageId: null,
        classTestId: 'ct-1',
        title: 'Bài 13 Đường tròn',
        subject: 'Toán',
        topic: 'Hình',
        timeLimitMinutes: 45,
        questionCount: 10,
        totalPoints: 10,
        difficultyLevel: 'MEDIUM',
        packageMode: null,
        startTime: null,
        endTime: null,
        maxAttempts: 2,
        allowReview: true,
        attemptCount: 0,
        availability: 'open',
        latestSubmission: null,
        isAdaptiveGroup: true,
        adaptiveProgress: {
          status: 'not_started',
          nextTestId: 'medium-next',
          round1SubmissionId: null,
          round2SubmissionId: null,
          round1Score: null,
          round2Score: null,
          round2Difficulty: null,
          round2TestId: null,
        },
      },
      {
        testId: 'p1',
        packageId: null,
        classTestId: null,
        title: 'Luyện tập cá nhân hóa — X',
        subject: 'Toán',
        topic: 'X',
        timeLimitMinutes: 15,
        questionCount: 6,
        totalPoints: 6,
        difficultyLevel: 'EASY',
        packageMode: null,
        startTime: null,
        endTime: null,
        maxAttempts: null,
        allowReview: true,
        attemptCount: 0,
        availability: 'open',
        latestSubmission: null,
      },
    ]

    const rows = assignmentsFromQuizBank(items)
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.kind === 'adaptive' && r.title === 'Bài 13 Đường tròn')).toBe(true)
    expect(rows.some((r) => r.title.includes('Luyện tập'))).toBe(false)
  })
})
