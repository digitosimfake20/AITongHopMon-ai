/** Labels for TRUE_FALSE_GROUP sub-items (matches editor / quiz-taker). */
export const TF_SUB_LABELS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

/**
 * Partial credit for multi-statement Đ/S groups.
 * Compares by fixed label order (a,b,c,…), not Object.keys order.
 */
export function scoreTrueFalseGroup(
  studentAnswers: Record<string, boolean>,
  correctStr: string | null,
  maxPoints: number,
): number {
  if (!correctStr) return 0
  const correct = correctStr.split(',').map((s) => s.trim().toUpperCase() === 'T')
  const labels = TF_SUB_LABELS.slice(0, correct.length)
  const numCorrect = labels.filter(
    (label, i) => studentAnswers[label] === correct[i],
  ).length
  const total = correct.length

  if (total === 0) return 0
  if (numCorrect === total) return maxPoints
  if (numCorrect === 3) return maxPoints * 0.5
  if (numCorrect === 2) return maxPoints * 0.25
  if (numCorrect === 1) return maxPoints * 0.1
  return 0
}
