import { contributesToMasteryUpdate } from '@/lib/knowledge/mastery-evidence'

/** Official counts persisted on Submission (includes ESSAY in totalQuestions). */
export interface SubmissionOfficialStats {
  correctCount: number
  totalQuestions: number
  /** Questions that participate in auto-scoring (excludes ESSAY). */
  scoredQuestionCount: number
}

export function submissionOfficialStatsFromDetails(
  details: ReadonlyArray<{ type: string; isCorrect?: boolean }>,
  fallbackCorrectCount: number,
  totalQuestions: number,
): SubmissionOfficialStats {
  const scoredDetails = details.filter((d) => contributesToMasteryUpdate(d.type))
  const scoredQuestionCount = scoredDetails.length
  const scoredCorrectCount =
    scoredQuestionCount > 0 && scoredDetails.every((d) => typeof d.isCorrect === 'boolean')
      ? scoredDetails.filter((d) => d.isCorrect).length
      : fallbackCorrectCount
  return {
    correctCount: scoredCorrectCount,
    totalQuestions,
    scoredQuestionCount,
  }
}

/** One-line factual summary — use in AI feedback to avoid hallucinated counts. */
export function formatOfficialScoreLine(stats: SubmissionOfficialStats): string {
  const { correctCount, totalQuestions, scoredQuestionCount } = stats
  if (scoredQuestionCount < totalQuestions) {
    return `Kết quả chấm tự động: ${correctCount}/${totalQuestions} câu đúng (${totalQuestions - scoredQuestionCount} câu tự luận chưa chấm, không tính vào điểm tự động).`
  }
  return `Kết quả: ${correctCount}/${totalQuestions} câu đúng.`
}
