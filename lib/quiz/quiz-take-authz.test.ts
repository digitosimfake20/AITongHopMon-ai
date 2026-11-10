import { describe, expect, it } from 'vitest'
import {
  authorizeQuizTake,
  quizTakeDeniedMessage,
  type QuizTakeClassTest,
} from '@/lib/quiz/quiz-take-authz'

const baseClassTest = (overrides: Partial<QuizTakeClassTest> = {}): QuizTakeClassTest => ({
  id: 'ct-1',
  startTime: new Date('2026-01-01T00:00:00Z'),
  endTime: new Date('2026-12-31T23:59:59Z'),
  isAdaptive: false,
  testId: 'test-1',
  easyTestId: null,
  mediumTestId: null,
  hardTestId: null,
  maxAttempts: 2,
  session: null,
  ...overrides,
})

describe('authorizeQuizTake', () => {
  it('denies non-members', () => {
    expect(
      authorizeQuizTake({
        hasMembership: false,
        testId: 'test-1',
        previousCompletedAttempts: 0,
        classTest: null,
      }),
    ).toEqual({ ok: false, reason: 'not_member' })
  })

  it('allows members for practice tests without ClassTest', () => {
    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'practice-1',
        previousCompletedAttempts: 3,
        classTest: null,
      }),
    ).toEqual({ ok: true })
  })

  it('enforces schedule window', () => {
    const ct = baseClassTest({
      startTime: new Date('2026-06-01T00:00:00Z'),
      endTime: new Date('2026-06-02T00:00:00Z'),
    })
    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'test-1',
        previousCompletedAttempts: 0,
        classTest: ct,
        now: new Date('2026-05-01T00:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'outside_window' })
  })

  it('enforces maxAttempts for standard assignments', () => {
    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'test-1',
        previousCompletedAttempts: 2,
        classTest: baseClassTest({ maxAttempts: 2 }),
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'max_attempts' })
  })

  it('allows unlimited attempts when maxAttempts is -1', () => {
    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'test-1',
        previousCompletedAttempts: 99,
        classTest: baseClassTest({ maxAttempts: -1 }),
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toEqual({ ok: true })
  })

  it('gates adaptive round sequencing', () => {
    const adaptive = baseClassTest({
      isAdaptive: true,
      testId: null,
      mediumTestId: 'med',
      easyTestId: 'easy',
      hardTestId: 'hard',
      session: null,
    })

    const round1 = authorizeQuizTake({
      hasMembership: true,
      testId: 'med',
      previousCompletedAttempts: 0,
      classTest: adaptive,
      now: new Date('2026-06-01T12:00:00Z'),
    })
    expect(round1).toMatchObject({
      ok: true,
      adaptiveContext: { round: 1, classTestId: 'ct-1' },
    })

    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'easy',
        previousCompletedAttempts: 0,
        classTest: adaptive,
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'adaptive_locked' })

    const afterRound1 = baseClassTest({
      ...adaptive,
      session: {
        round1SubmissionId: 'sub-1',
        round2TestId: 'hard',
        round2SubmissionId: null,
      },
    })

    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'med',
        previousCompletedAttempts: 1,
        classTest: afterRound1,
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'adaptive_locked' })

    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'easy',
        previousCompletedAttempts: 1,
        classTest: afterRound1,
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toEqual({ ok: false, reason: 'adaptive_locked' })

    expect(
      authorizeQuizTake({
        hasMembership: true,
        testId: 'hard',
        previousCompletedAttempts: 1,
        classTest: afterRound1,
        now: new Date('2026-06-01T12:00:00Z'),
      }),
    ).toMatchObject({ ok: true, adaptiveContext: { round: 2 } })
  })

  it('maps denied reasons to student-facing copy', () => {
    expect(quizTakeDeniedMessage('not_member')).toMatch(/không thuộc lớp/i)
    expect(quizTakeDeniedMessage('max_attempts')).toMatch(/hết số lần/i)
  })
})
