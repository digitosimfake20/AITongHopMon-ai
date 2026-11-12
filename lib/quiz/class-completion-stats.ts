/** Distinct (student × test) completion — multi-submit same test counts once. */
export function computeClassCompletionDetail(
  studentCount: number,
  testCount: number,
  completedDistinctPairs: number,
): { completedSlots: number; expectedSlots: number; completionRate: number } {
  const expectedSlots = studentCount * Math.max(testCount, 1)
  const completedSlots = Math.max(0, completedDistinctPairs)
  const completionRate =
    expectedSlots > 0 ? Math.round((completedSlots / expectedSlots) * 100) : 0
  return { completedSlots, expectedSlots, completionRate }
}

/**
 * Teacher “tuần này” rate. `weekTestCount` must be tests assigned/active in the
 * window — never the class’s all-time test count.
 */
export function computeWeeklyCompletionRate(
  studentCount: number,
  weekTestCount: number,
  weekCompletedSlots: number,
): number {
  const { completionRate } = computeClassCompletionDetail(
    studentCount,
    weekTestCount,
    weekCompletedSlots,
  )
  return Math.min(100, completionRate)
}
