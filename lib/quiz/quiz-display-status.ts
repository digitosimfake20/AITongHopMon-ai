import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'

export type QuizStatusLabel =
  | 'Đã hoàn thành'
  | 'Quá hạn'
  | 'Chưa làm'
  | 'Đang tiến hành'
  | 'Chưa mở'
  | 'Đã hết lượt'

export interface ResolvedQuizStatus {
  statusLabel: QuizStatusLabel
  showOverdueBanner: boolean
  showNotStartedBanner: boolean
  showCompletedBanner: boolean
  showMaxAttemptsBanner: boolean
  progressLine: string | null
  canTake: boolean
  isDone: boolean
}

export function formatAdaptiveProgressLine(quiz: QuizBankItem): string | null {
  const p = quiz.adaptiveProgress
  if (!p) return null

  const parts: string[] = []
  if (p.round1Score != null) {
    parts.push(`Lượt 1: ${p.round1Score.toFixed(1)}/10`)
  }
  if (p.round2Score != null) {
    parts.push(`Lượt 2: ${p.round2Score.toFixed(1)}/10`)
  }
  return parts.length > 0 ? parts.join(' | ') : null
}

export function resolveStandardQuizStatus(quiz: QuizBankItem): ResolvedQuizStatus {
  const isDone = !!quiz.latestSubmission || quiz.attemptCount > 0
  const expired = quiz.availability === 'expired'
  const notStarted = quiz.availability === 'not_started'
  const maxAttempts = quiz.availability === 'max_attempts'

  if (isDone) {
    return {
      statusLabel: 'Đã hoàn thành',
      showOverdueBanner: false,
      showNotStartedBanner: false,
      showCompletedBanner: expired || maxAttempts,
      showMaxAttemptsBanner: maxAttempts && !expired,
      progressLine: quiz.latestSubmission
        ? `${quiz.latestSubmission.score.toFixed(1)}/10`
        : null,
      canTake: quiz.availability === 'open',
      isDone: true,
    }
  }

  if (expired) {
    return {
      statusLabel: 'Quá hạn',
      showOverdueBanner: true,
      showNotStartedBanner: false,
      showCompletedBanner: false,
      showMaxAttemptsBanner: false,
      progressLine: null,
      canTake: false,
      isDone: false,
    }
  }

  if (notStarted) {
    return {
      statusLabel: 'Chưa mở',
      showOverdueBanner: false,
      showNotStartedBanner: true,
      showCompletedBanner: false,
      showMaxAttemptsBanner: false,
      progressLine: null,
      canTake: false,
      isDone: false,
    }
  }

  if (maxAttempts) {
    return {
      statusLabel: 'Đã hết lượt',
      showOverdueBanner: false,
      showNotStartedBanner: false,
      showCompletedBanner: false,
      showMaxAttemptsBanner: true,
      progressLine: null,
      canTake: false,
      isDone: false,
    }
  }

  return {
    statusLabel: 'Chưa làm',
    showOverdueBanner: false,
    showNotStartedBanner: false,
    showCompletedBanner: false,
    showMaxAttemptsBanner: false,
    progressLine: null,
    canTake: true,
    isDone: false,
  }
}

export function resolveAdaptiveQuizStatus(quiz: QuizBankItem): ResolvedQuizStatus {
  const p = quiz.adaptiveProgress!
  const progressLine = formatAdaptiveProgressLine(quiz)
  const hasAnySubmission = !!p.round1SubmissionId || !!p.round2SubmissionId
  const isComplete = p.status === 'completed'
  const expired = quiz.availability === 'expired'
  const notStarted = quiz.availability === 'not_started'
  const canTake = quiz.availability === 'open' && p.nextTestId != null && !isComplete

  if (hasAnySubmission || isComplete) {
    return {
      statusLabel: isComplete ? 'Đã hoàn thành' : 'Đang tiến hành',
      showOverdueBanner: false,
      showNotStartedBanner: false,
      showCompletedBanner: isComplete || (expired && hasAnySubmission),
      showMaxAttemptsBanner: false,
      progressLine,
      canTake,
      isDone: isComplete,
    }
  }

  if (expired) {
    return {
      statusLabel: 'Quá hạn',
      showOverdueBanner: true,
      showNotStartedBanner: false,
      showCompletedBanner: false,
      showMaxAttemptsBanner: false,
      progressLine: null,
      canTake: false,
      isDone: false,
    }
  }

  if (notStarted) {
    return {
      statusLabel: 'Chưa mở',
      showOverdueBanner: false,
      showNotStartedBanner: true,
      showCompletedBanner: false,
      showMaxAttemptsBanner: false,
      progressLine: null,
      canTake: false,
      isDone: false,
    }
  }

  return {
    statusLabel: 'Chưa làm',
    showOverdueBanner: false,
    showNotStartedBanner: false,
    showCompletedBanner: false,
    showMaxAttemptsBanner: false,
    progressLine: null,
    canTake,
    isDone: false,
  }
}

export function isPracticeQuizItem(quiz: QuizBankItem): boolean {
  return quiz.title.startsWith('Luyện tập cá nhân hóa')
}
