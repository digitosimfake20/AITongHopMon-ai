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

  it('maps completed standard quiz with stripped difficulty suffix and score', () => {
    const items: QuizBankItem[] = [
      {
        testId: 'std-1',
        packageId: null,
        classTestId: null,
        title: 'Đề ôn — TB (Trung bình)',
        subject: 'Toán',
        topic: '',
        timeLimitMinutes: 30,
        questionCount: 8,
        totalPoints: 8,
        difficultyLevel: 'MEDIUM',
        packageMode: 'STANDARD',
        startTime: null,
        endTime: null,
        maxAttempts: null,
        allowReview: true,
        attemptCount: 1,
        availability: 'open',
        latestSubmission: {
          id: 'sub-1',
          score: 8.5,
          attemptNumber: 1,
          submittedAt: new Date('2026-03-01T00:00:00Z'),
        },
      },
    ]

    const [row] = assignmentsFromQuizBank(items)
    expect(row).toMatchObject({
      kind: 'standard',
      title: 'Đề ôn',
      subtitle: 'Bài kiểm tra',
      status: 'completed',
      score: '8.5/10',
      submissionId: 'sub-1',
    })
  })

  it('uses time-limit deadline when endTime is absent', () => {
    const items: QuizBankItem[] = [
      {
        testId: 'std-2',
        packageId: 'pkg',
        classTestId: null,
        title: 'Gói đơn',
        subject: 'Toán',
        topic: '',
        timeLimitMinutes: 20,
        questionCount: 5,
        totalPoints: 5,
        difficultyLevel: 'EASY',
        packageMode: 'ADAPTIVE_PACKAGE',
        startTime: null,
        endTime: null,
        maxAttempts: null,
        allowReview: true,
        attemptCount: 0,
        availability: 'open',
        latestSubmission: null,
      },
    ]

    const [row] = assignmentsFromQuizBank(items)
    expect(row.deadline).toBe('20 phút / bài')
    expect(row.subtitle).toBe('Gói bài (một đề)')
    expect(row.status).toBe('pending')
  })

  it('marks completed adaptive assignment from progress status', () => {
    const items: QuizBankItem[] = [
      {
        testId: 'adaptive-done',
        packageId: null,
        classTestId: 'ct-2',
        title: 'Adaptive done',
        subject: 'Toán',
        topic: '',
        timeLimitMinutes: 45,
        questionCount: 10,
        totalPoints: 10,
        difficultyLevel: 'MEDIUM',
        packageMode: null,
        startTime: null,
        endTime: null,
        maxAttempts: 2,
        allowReview: true,
        attemptCount: 2,
        availability: 'open',
        latestSubmission: null,
        isAdaptiveGroup: true,
        adaptiveProgress: {
          status: 'completed',
          nextTestId: null,
          round1SubmissionId: 'r1',
          round2SubmissionId: 'r2',
          round1Score: 8,
          round2Score: 9,
          round2Difficulty: 'HARD',
          round2TestId: 'hard',
        },
      },
    ]

    const [row] = assignmentsFromQuizBank(items)
    expect(row).toMatchObject({
      kind: 'adaptive',
      status: 'completed',
      score: 'Lượt 1: 8.0/10 | Lượt 2: 9.0/10',
      classTestId: 'ct-2',
    })
  })
})
