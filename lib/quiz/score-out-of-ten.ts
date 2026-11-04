/**
 * Map raw earned points onto the product's 0–10 scale.
 *
 * Teacher packages usually set per-question points that already sum to 10
 * (identity). Practice / weakness mixes often use 1 point per item — without
 * normalizing, 6/6 correct stores as 6/10.
 */
export function scoreOutOfTen(earnedPoints: number, maxPoints: number): number {
  if (!Number.isFinite(earnedPoints) || earnedPoints <= 0) return 0
  if (!Number.isFinite(maxPoints) || maxPoints <= 0) return 0
  const scaled = (earnedPoints / maxPoints) * 10
  return Math.min(10, Math.round(scaled * 100) / 100)
}

/** Sum of per-question max points for the graded set (skip missing rows). */
export function maxPointsFromQuestions(
  questions: ReadonlyArray<{ points: number | null | undefined } | null | undefined>,
): number {
  let total = 0
  for (const q of questions) {
    if (!q) continue
    const pts = q.points
    total += typeof pts === 'number' && pts > 0 ? pts : 1
  }
  return total
}
