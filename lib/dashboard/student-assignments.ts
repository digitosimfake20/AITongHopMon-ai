import type { Assignment } from '@/lib/dashboard-types'
import type { QuizBankItem } from '@/lib/quiz/quiz-bank-queries'
import {
  isPracticeQuizItem,
  resolveAdaptiveQuizStatus,
  resolveStandardQuizStatus,
} from '@/lib/quiz/quiz-display-status'

function formatDeadline(quiz: QuizBankItem): string | undefined {
  if (quiz.endTime) {
    return `Hạn: ${new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(quiz.endTime)}`
  }
  if (quiz.timeLimitMinutes > 0) {
    return `${quiz.timeLimitMinutes} phút / bài`
  }
  return undefined
}

/** One row per teacher assignment — adaptive clusters collapsed to a single card. */
export function assignmentsFromQuizBank(items: QuizBankItem[]): Assignment[] {
  return items
    .filter((q) => !isPracticeQuizItem(q))
    .map((quiz): Assignment => {
      if (quiz.isAdaptiveGroup) {
        const resolved = resolveAdaptiveQuizStatus(quiz)
        const done = resolved.isDone
        return {
          id: quiz.testId,
          classTestId: quiz.classTestId ?? undefined,
          kind: 'adaptive',
          title: quiz.title,
          subtitle: 'Phân hóa 2 lượt · Lượt 1 (TB) → Lượt 2 (Dễ hoặc Khó)',
          deadline: formatDeadline(quiz),
          status: done ? 'completed' : 'pending',
          score: resolved.progressLine ?? undefined,
          submissionId: quiz.latestSubmission?.id,
          statusHint: resolved.statusLabel,
        }
      }

      const resolved = resolveStandardQuizStatus(quiz)
      const done = !!quiz.latestSubmission
      return {
        id: quiz.testId,
        kind: 'standard',
        title: quiz.title.replace(/\s*—\s*(Dễ|TB|Trung bình|Khó)\s*\([^)]*\)\s*$/i, '').trim() || quiz.title,
        subtitle:
          quiz.packageMode === 'ADAPTIVE_PACKAGE'
            ? 'Gói bài (một đề)'
            : quiz.packageMode === 'STANDARD'
              ? 'Bài kiểm tra'
              : undefined,
        deadline: formatDeadline(quiz),
        status: done ? 'completed' : 'pending',
        score: done && quiz.latestSubmission
          ? `${quiz.latestSubmission.score.toFixed(1)}/10`
          : undefined,
        submissionId: quiz.latestSubmission?.id,
        statusHint: resolved.statusLabel,
      }
    })
}
