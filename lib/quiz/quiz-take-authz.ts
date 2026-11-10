export type QuizTakeAdaptiveSession = {
  round1SubmissionId: string | null
  round2TestId: string | null
  round2SubmissionId: string | null
}

export type QuizTakeClassTest = {
  id: string
  startTime: Date
  endTime: Date
  isAdaptive: boolean
  testId: string | null
  easyTestId: string | null
  mediumTestId: string | null
  hardTestId: string | null
  maxAttempts: number
  session: QuizTakeAdaptiveSession | null
}

export type QuizTakeAuthzInput = {
  hasMembership: boolean
  testId: string
  previousCompletedAttempts: number
  classTest: QuizTakeClassTest | null
  now?: Date
}

export type QuizTakeAuthzDeniedReason =
  | 'not_member'
  | 'outside_window'
  | 'max_attempts'
  | 'adaptive_locked'
  | 'not_assigned'

export type QuizTakeAdaptiveContext = {
  classTestId: string
  round: 1 | 2
  roundLabel: string
}

export type QuizTakeAuthzResult =
  | { ok: true; adaptiveContext?: QuizTakeAdaptiveContext }
  | { ok: false; reason: QuizTakeAuthzDeniedReason }

/**
 * Shared membership / schedule / attempt / adaptive sequencing gate used by
 * getQuizForTaking and submitQuizAction.
 */
export function authorizeQuizTake(input: QuizTakeAuthzInput): QuizTakeAuthzResult {
  if (!input.hasMembership) return { ok: false, reason: 'not_member' }

  const { classTest, testId } = input
  if (!classTest) return { ok: true }

  const now = input.now ?? new Date()
  if (now < classTest.startTime || now > classTest.endTime) {
    return { ok: false, reason: 'outside_window' }
  }

  if (classTest.isAdaptive) {
    const session = classTest.session
    const isMedium = testId === classTest.mediumTestId
    const isRound2 =
      testId === classTest.easyTestId || testId === classTest.hardTestId

    if (isMedium) {
      if (session?.round1SubmissionId) {
        return { ok: false, reason: 'adaptive_locked' }
      }
      return {
        ok: true,
        adaptiveContext: {
          classTestId: classTest.id,
          round: 1,
          roundLabel: 'Lượt 1 — Trung bình',
        },
      }
    }

    if (isRound2) {
      if (!session?.round1SubmissionId) return { ok: false, reason: 'adaptive_locked' }
      if (session.round2TestId !== testId) return { ok: false, reason: 'adaptive_locked' }
      if (session.round2SubmissionId) return { ok: false, reason: 'adaptive_locked' }
      return {
        ok: true,
        adaptiveContext: {
          classTestId: classTest.id,
          round: 2,
          roundLabel:
            testId === classTest.hardTestId ? 'Lượt 2 — Khó' : 'Lượt 2 — Dễ',
        },
      }
    }

    return { ok: false, reason: 'not_assigned' }
  }

  if (classTest.testId === testId) {
    if (
      classTest.maxAttempts !== -1 &&
      input.previousCompletedAttempts >= classTest.maxAttempts
    ) {
      return { ok: false, reason: 'max_attempts' }
    }
    return { ok: true }
  }

  return { ok: false, reason: 'not_assigned' }
}

export function quizTakeDeniedMessage(reason: QuizTakeAuthzDeniedReason): string {
  switch (reason) {
    case 'not_member':
      return 'Bạn không thuộc lớp của đề này'
    case 'outside_window':
      return 'Đề chưa mở hoặc đã hết hạn'
    case 'max_attempts':
      return 'Bạn đã hết số lần làm bài'
    case 'adaptive_locked':
      return 'Bạn chưa đến lượt làm đề này hoặc đã hoàn thành'
    case 'not_assigned':
      return 'Đề không được giao cho lớp của bạn'
  }
}
